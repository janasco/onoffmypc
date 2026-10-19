'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { isTrustedLinuxBackend } = require('../src/main/tokenStore')

test('trusts real OS keyrings (gnome-keyring, the KWallet generations)', () => {
  assert.equal(isTrustedLinuxBackend('gnome_libsecret'), true)
  assert.equal(isTrustedLinuxBackend('kwallet'), true)
  assert.equal(isTrustedLinuxBackend('kwallet5'), true)
  assert.equal(isTrustedLinuxBackend('kwallet6'), true)
})

test('rejects basic_text — Electron\'s no-real-protection fallback backend', () => {
  assert.equal(isTrustedLinuxBackend('basic_text'), false)
})

test('rejects unknown and any unrecognized future backend name (fails closed)', () => {
  assert.equal(isTrustedLinuxBackend('unknown'), false)
  assert.equal(isTrustedLinuxBackend('some_future_backend_v2'), false)
  assert.equal(isTrustedLinuxBackend(''), false)
  assert.equal(isTrustedLinuxBackend(undefined), false)
})
