'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { clampOrNull } = require('../src/main/telemetry')

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
