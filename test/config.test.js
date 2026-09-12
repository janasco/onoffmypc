'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { resolveApiBaseUrl, resolveWsBaseUrl } = require('../src/main/config')

test('dev (unpackaged) build keeps the existing unrestricted override, including plain http', () => {
  assert.equal(resolveApiBaseUrl('http://localhost:8787', false), 'http://localhost:8787')
  assert.equal(resolveApiBaseUrl(undefined, false), 'https://api.onoffmypc.com')
})

test('packaged build honors an explicit https override', () => {
  assert.equal(resolveApiBaseUrl('https://staging.onoffmypc.com', true), 'https://staging.onoffmypc.com')
})

test('packaged build ignores a plaintext http override and falls back to the production endpoint', () => {
  assert.equal(resolveApiBaseUrl('http://evil.example.com', true), 'https://api.onoffmypc.com')
})

test('packaged build ignores a malformed override and falls back to the production endpoint', () => {
  assert.equal(resolveApiBaseUrl('not a url', true), 'https://api.onoffmypc.com')
  assert.equal(resolveApiBaseUrl('', true), 'https://api.onoffmypc.com')
})

test('packaged build with no override uses the production endpoint', () => {
  assert.equal(resolveApiBaseUrl(undefined, true), 'https://api.onoffmypc.com')
})

test('dev build derives ws:// from an http:// API override', () => {
  assert.equal(resolveWsBaseUrl(undefined, 'http://localhost:8787', false), 'ws://localhost:8787')
})

test('packaged build honors an explicit wss override', () => {
  assert.equal(resolveWsBaseUrl('wss://staging.onoffmypc.com', 'https://staging.onoffmypc.com', true), 'wss://staging.onoffmypc.com')
})

test('packaged build ignores a plaintext ws override and derives wss from the (secure) API base URL', () => {
  assert.equal(
    resolveWsBaseUrl('ws://evil.example.com', 'https://api.onoffmypc.com', true),
    'wss://api.onoffmypc.com',
  )
})
