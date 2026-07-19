'use strict'

const { EventEmitter } = require('node:events')
const WebSocket = require('ws')

const RECONNECT_MIN_MS = 2_000
const RECONNECT_MAX_MS = 60_000

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
  }

  connect() {
    this.stopped = false
    this._open()
  }

  stop() {
    this.stopped = true
    if (this.ws) this.ws.close(1000, 'agent stopping')
  }

  _open() {
    if (this.stopped) return
    const url = `${this.wsBaseUrl}/ws/${this.deviceId}`
    this.ws = new WebSocket(url, { headers: { 'X-Device-Token': this.token } })

    this.ws.on('open', () => {
      this.reconnectDelay = RECONNECT_MIN_MS
      this.emit('connected')
    })

    this.ws.on('message', (data) => {
      let msg
      try {
        msg = JSON.parse(data.toString())
      } catch {
        return
      }
      if (msg.type === 'settings') {
        this.emit('settings', msg)
      } else if (msg.command_id && msg.type) {
        this.emit('command', msg)
      }
    })

    this.ws.on('close', () => {
      this.emit('disconnected')
      this._scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      this.emit('error', err)
    })
  }

  _scheduleReconnect() {
    if (this.stopped) return
    setTimeout(() => this._open(), this.reconnectDelay)
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

module.exports = { DeviceRelayClient }
