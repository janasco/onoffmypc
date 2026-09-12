'use strict'

const { EventEmitter } = require('node:events')
const WebSocket = require('ws')

const RECONNECT_MIN_MS = 2_000
const RECONNECT_MAX_MS = 60_000

// Matches the server's MAX_RELAY_FRAME_BYTES (onoffmypc-app/src/relay/protocol.ts)
// — an inbound frame larger than this is dropped rather than parsed.
const MAX_FRAME_BYTES = 16 * 1024

// How many recently-acted-on command IDs to remember so a redelivered or
// replayed push (e.g. on reconnect, or from a misbehaving/malicious relay)
// cannot trigger the destructive action a second time. Bounded and FIFO so
// this can never grow without limit across a long-lived connection.
const COMMAND_DEDUPE_CAPACITY = 200

const HEARTBEAT_INTERVAL_MS = 30_000
const HEARTBEAT_TIMEOUT_MS = 10_000

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Bytes for a string frame (utf-8) or a Buffer/ArrayBuffer frame, without
// assuming Buffer is always what `ws` hands back.
function frameByteLength(data) {
  if (typeof data === 'string') return Buffer.byteLength(data, 'utf8')
  if (Buffer.isBuffer(data)) return data.length
  if (data instanceof ArrayBuffer) return data.byteLength
  return Infinity // unknown shape — treat as oversized, fail closed
}

// Validates and narrows an inbound frame to a known, well-shaped message, or
// null. No side effects — directly unit-testable without a real socket.
function parseInboundFrame(raw) {
  let msg
  try {
    msg = JSON.parse(raw)
  } catch {
    return null
  }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return null

  if (msg.type === 'settings') return { kind: 'settings', settings: msg }

  if (typeof msg.command_id === 'string' && UUID_V4_RE.test(msg.command_id) && typeof msg.type === 'string') {
    return { kind: 'command', commandId: msg.command_id, commandType: msg.type }
  }
  return null
}

// Speaks the exact same wire protocol as the ESP32 firmware relay
// (onoffmypc-app/src/relay/DeviceRelay.ts): connect to /ws/:deviceId with an
// X-Device-Token header, send {type:'telemetry', ...} on an interval and
// {type:'ack', command_id} on completion, receive {command_id, type} pushes.
class DeviceRelayClient extends EventEmitter {
  constructor({ wsBaseUrl, deviceId, token }) {
    super()
    this.wsBaseUrl = wsBaseUrl
    this.deviceId = deviceId
    this.token = token
    this.ws = null
    this.reconnectDelay = RECONNECT_MIN_MS
    this.stopped = false
    this._seenCommandIds = []
    this._seenCommandIdSet = new Set()
    this._heartbeatTimer = null
    this._heartbeatTimeoutTimer = null
  }

  connect() {
    this.stopped = false
    this._open()
  }

  stop() {
    this.stopped = true
    this._stopHeartbeat()
    if (this.ws) this.ws.close(1000, 'agent stopping')
  }

  // True if this command_id was already acted on recently — the caller should
  // not emit/execute it again. Recording is bounded (FIFO eviction) so a
  // long-lived connection's memory use cannot grow without limit.
  _isReplay(commandId) {
    if (this._seenCommandIdSet.has(commandId)) return true
    this._seenCommandIdSet.add(commandId)
    this._seenCommandIds.push(commandId)
    if (this._seenCommandIds.length > COMMAND_DEDUPE_CAPACITY) {
      const evicted = this._seenCommandIds.shift()
      this._seenCommandIdSet.delete(evicted)
    }
    return false
  }

  // The full inbound-frame pipeline (size cap -> parse/validate -> dedupe ->
  // emit), split out from the 'message' listener so it's directly callable
  // in tests without a real socket.
  _handleMessage(data) {
    if (frameByteLength(data) > MAX_FRAME_BYTES) return

    const parsed = parseInboundFrame(data.toString())
    if (!parsed) return

    if (parsed.kind === 'settings') {
      this.emit('settings', parsed.settings)
      return
    }
    if (this._isReplay(parsed.commandId)) return
    this.emit('command', { command_id: parsed.commandId, type: parsed.commandType })
  }

  _open() {
    if (this.stopped) return
    const url = `${this.wsBaseUrl}/ws/${this.deviceId}`
    this.ws = new WebSocket(url, { headers: { 'X-Device-Token': this.token } })

    this.ws.on('open', () => {
      this.reconnectDelay = RECONNECT_MIN_MS
      this._startHeartbeat()
      this.emit('connected')
    })

    this.ws.on('pong', () => {
      if (this._heartbeatTimeoutTimer) {
        clearTimeout(this._heartbeatTimeoutTimer)
        this._heartbeatTimeoutTimer = null
      }
    })

    this.ws.on('message', (data) => this._handleMessage(data))

    this.ws.on('close', () => {
      this._stopHeartbeat()
      this.emit('disconnected')
      this._scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      this.emit('error', err)
    })
  }

  // Detects a half-dead connection (TCP session stuck open with no traffic
  // and no close event, e.g. after a network partition) so it gets torn down
  // and reconnected instead of silently going stale.
  _startHeartbeat() {
    this._stopHeartbeat()
    this._heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return
      try {
        this.ws.ping()
      } catch {
        return
      }
      this._heartbeatTimeoutTimer = setTimeout(() => {
        this.ws?.terminate()
      }, HEARTBEAT_TIMEOUT_MS)
    }, HEARTBEAT_INTERVAL_MS)
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer)
    if (this._heartbeatTimeoutTimer) clearTimeout(this._heartbeatTimeoutTimer)
    this._heartbeatTimer = null
    this._heartbeatTimeoutTimer = null
  }

  _scheduleReconnect() {
    if (this.stopped) return
    // Full jitter: spreads reconnect attempts out after something (e.g. a
    // server restart) disconnects many agents at once, instead of every agent
    // retrying in lockstep.
    const jittered = Math.floor(Math.random() * this.reconnectDelay)
    setTimeout(() => this._open(), jittered)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS)
  }

  _send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload))
      return true
    }
    return false
  }

  sendTelemetry(reading) {
    return this._send({ type: 'telemetry', ...reading })
  }

  sendAck(commandId) {
    return this._send({ type: 'ack', command_id: commandId })
  }
}

module.exports = { DeviceRelayClient, parseInboundFrame, frameByteLength, MAX_FRAME_BYTES }
