'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { clampOrNull, pickNetworkIdentity } = require('../src/main/telemetry')

test('passes through in-range values', () => {
  assert.equal(clampOrNull(42, 0, 100), 42)
  assert.equal(clampOrNull(0, 0, 100), 0)
  assert.equal(clampOrNull(100, 0, 100), 100)
})

test('nulls out-of-range values', () => {
  assert.equal(clampOrNull(-1, 0, 100), null)
  assert.equal(clampOrNull(101, 0, 100), null)
})

test('nulls non-finite and wrong-typed values', () => {
  assert.equal(clampOrNull(NaN, 0, 100), null)
  assert.equal(clampOrNull(Infinity, 0, 100), null)
  assert.equal(clampOrNull(null, 0, 100), null)
  assert.equal(clampOrNull('42', 0, 100), null)
})

test('prefers the default non-internal IPv4 interface', () => {
  const picked = pickNetworkIdentity([
    { iface: 'lo', ip4: '127.0.0.1', mac: '00:00:00:00:00:00', internal: true, default: false },
    { iface: 'eth0', ip4: '192.168.1.10', mac: 'AA:BB:CC:DD:EE:01', internal: false, default: false },
    { iface: 'wlan0', ip4: '192.168.1.20', mac: 'AA:BB:CC:DD:EE:02', internal: false, default: true },
  ])
  assert.deepEqual(picked, { local_ip: '192.168.1.20', mac_address: 'AA:BB:CC:DD:EE:02' })
})

test('ignores internal, macless, and all-zero interfaces', () => {
  const picked = pickNetworkIdentity([
    { iface: 'lo', ip4: '127.0.0.1', mac: 'AA:BB:CC:DD:EE:01', internal: true },
    { iface: 'eth0', ip4: '192.168.1.10', mac: '', internal: false },
    { iface: 'eth1', ip4: '192.168.1.11', mac: '00:00:00:00:00:00', internal: false },
  ])
  assert.deepEqual(picked, { local_ip: null, mac_address: null })
})

test('finds an interface when systeminformation returns a single object', () => {
  const picked = pickNetworkIdentity({ iface: 'eth0', ip4: '10.0.0.5', mac: 'AA:BB:CC:DD:EE:03', internal: false })
  assert.deepEqual(picked, { local_ip: '10.0.0.5', mac_address: 'AA:BB:CC:DD:EE:03' })
})

test('prefers a physical interface over a virtual one', () => {
  const picked = pickNetworkIdentity([
    { iface: 'docker0', ip4: '172.17.0.1', mac: 'AA:BB:CC:DD:EE:10', internal: false, virtual: true },
    { iface: 'wlan0', ip4: '192.168.1.20', mac: 'AA:BB:CC:DD:EE:11', internal: false, virtual: false },
  ])
  assert.deepEqual(picked, { local_ip: '192.168.1.20', mac_address: 'AA:BB:CC:DD:EE:11' })
})

test('ignores IPv4 link-local addresses', () => {
  const picked = pickNetworkIdentity([
    { iface: 'eth0', ip4: '169.254.10.20', mac: 'AA:BB:CC:DD:EE:12', internal: false },
  ])
  assert.deepEqual(picked, { local_ip: null, mac_address: null })
})
