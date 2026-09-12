'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { DeviceRelayClient, parseInboundFrame, frameByteLength, MAX_FRAME_BYTES } = require('../src/main/relay')

const COMMAND_ID = '11111111-1111-4111-8111-111111111111'

test('parseInboundFrame accepts a well-formed settings frame', () => {
  const parsed = parseInboundFrame(JSON.stringify({ type: 'settings', reportCpu: true }))
  assert.deepEqual(parsed, { kind: 'settings', settings: { type: 'settings', reportCpu: true } })
})

test('parseInboundFrame accepts a well-formed command push with a canonical command_id', () => {
  const parsed = parseInboundFrame(JSON.stringify({ command_id: COMMAND_ID, type: 'power_off' }))
  assert.deepEqual(parsed, { kind: 'command', commandId: COMMAND_ID, commandType: 'power_off' })
})

test('parseInboundFrame rejects a command push whose command_id is not a UUIDv4', () => {
  assert.equal(parseInboundFrame(JSON.stringify({ command_id: 'not-a-uuid', type: 'power_off' })), null)
  assert.equal(parseInboundFrame(JSON.stringify({ command_id: 12345, type: 'power_off' })), null)
})

test('parseInboundFrame rejects malformed JSON, arrays, and primitives without throwing', () => {
  assert.equal(parseInboundFrame('{not json'), null)
  assert.equal(parseInboundFrame('[1,2,3]'), null)
  assert.equal(parseInboundFrame('42'), null)
  assert.equal(parseInboundFrame('null'), null)
})

test('parseInboundFrame rejects an unrecognized message shape', () => {
  assert.equal(parseInboundFrame(JSON.stringify({ hello: 'world' })), null)
})

test('frameByteLength measures a string frame in utf-8 bytes and flags huge frames', () => {
  assert.equal(frameByteLength('abc'), 3)
  const huge = 'x'.repeat(MAX_FRAME_BYTES + 1)
  assert.ok(frameByteLength(huge) > MAX_FRAME_BYTES)
})

function makeClient() {
  return new DeviceRelayClient({ wsBaseUrl: 'wss://example.invalid', deviceId: 'dev1', token: 'tok' })
}

test('DeviceRelayClient._handleMessage drops an oversized inbound frame before it is even parsed', () => {
  const client = makeClient()
  let commandEvents = 0
  client.on('command', () => { commandEvents++ })

  const oversized = Buffer.from(JSON.stringify({ command_id: COMMAND_ID, type: 'power_off' }) + 'x'.repeat(MAX_FRAME_BYTES))
  client._handleMessage(oversized)

  assert.equal(commandEvents, 0)
})

test('DeviceRelayClient._handleMessage emits a well-formed command push exactly once, then dedupes a replay', () => {
  const client = makeClient()
  const commands = []
  client.on('command', (cmd) => commands.push(cmd))

  const frame = Buffer.from(JSON.stringify({ command_id: COMMAND_ID, type: 'power_off' }))
  client._handleMessage(frame)
  client._handleMessage(frame) // simulated redelivery on reconnect

  assert.equal(commands.length, 1)
  assert.deepEqual(commands[0], { command_id: COMMAND_ID, type: 'power_off' })
})

test('DeviceRelayClient._handleMessage emits settings pushes (not subject to command dedupe)', () => {
  const client = makeClient()
  const settingsEvents = []
  client.on('settings', (s) => settingsEvents.push(s))

  const frame = Buffer.from(JSON.stringify({ type: 'settings', reportCpu: false }))
  client._handleMessage(frame)
  client._handleMessage(frame)

  assert.equal(settingsEvents.length, 2)
})

test('DeviceRelayClient _isReplay only lets each command_id through once', () => {
  const client = new DeviceRelayClient({ wsBaseUrl: 'wss://example.invalid', deviceId: 'dev1', token: 'tok' })
  assert.equal(client._isReplay(COMMAND_ID), false)
  assert.equal(client._isReplay(COMMAND_ID), true)
  assert.equal(client._isReplay(COMMAND_ID), true)
})

test('DeviceRelayClient _isReplay evicts the oldest ID once past capacity (bounded memory)', () => {
  const client = new DeviceRelayClient({ wsBaseUrl: 'wss://example.invalid', deviceId: 'dev1', token: 'tok' })
  const capacity = 200
  for (let i = 0; i < capacity; i++) {
    client._isReplay(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
  }
  assert.equal(client._seenCommandIds.length, capacity)
  // One more pushes the FIFO past capacity; the very first ID should be
  // evicted and therefore treated as "new" again if it reappeared.
  client._isReplay(`00000000-0000-4000-8000-${String(capacity).padStart(12, '0')}`)
  assert.equal(client._seenCommandIds.length, capacity)
  assert.equal(client._isReplay('00000000-0000-4000-8000-000000000000'), false)
})
