'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { shouldConfirmExistingPairing } = require('../src/main/startup')

test('does not prompt when there are no saved credentials', () => {
  assert.equal(shouldConfirmExistingPairing({
    hasCredentials: false,
    markerVersion: null,
    appVersion: '0.1.6',
  }), false)
})

test('does not prompt on a normal restart after acknowledgement', () => {
  assert.equal(shouldConfirmExistingPairing({
    hasCredentials: true,
    markerVersion: '0.1.6',
    appVersion: '0.1.6',
  }), false)
})

test('prompts when saved credentials were never acknowledged', () => {
  assert.equal(shouldConfirmExistingPairing({
    hasCredentials: true,
    markerVersion: null,
    appVersion: '0.1.6',
  }), true)
})

test('prompts once after an app version change', () => {
  assert.equal(shouldConfirmExistingPairing({
    hasCredentials: true,
    markerVersion: '0.1.5',
    appVersion: '0.1.6',
  }), true)
})
