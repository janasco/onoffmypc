import { test } from 'node:test'
import assert from 'node:assert/strict'
import { commandProgress, progressFromSendResult } from '../src/lib/commandLifecycle.ts'

const NOW = Date.parse('2026-03-01T12:00:00.000Z')
const past = '2026-03-01T11:50:00.000Z'
const future = '2026-03-01T12:10:00.000Z'

test('a fresh pending command is queued, not sent', () => {
  const p = commandProgress({ status: 'pending', delivery_state: null, expires_at: future }, NOW)
  assert.equal(p.stage, 'queued')
  assert.equal(p.terminal, false)
})

test('a socket write is "sent", never a success', () => {
  const p = commandProgress({ status: 'sent', delivery_state: 'socket_written' }, NOW)
  assert.equal(p.stage, 'sent')
  assert.notEqual(p.tone, 'success')
  assert.match(p.detail, /does not confirm|not confirmed|has not confirmed/i)
})

test('acknowledgement is informational and explicitly not a state confirmation', () => {
  const p = commandProgress({ status: 'delivered', delivery_state: 'acknowledged' }, NOW)
  assert.equal(p.stage, 'acknowledged')
  assert.equal(p.tone, 'info')
  assert.match(p.detail, /does not confirm the PC/i)
})

test('an acknowledgement is not converted to expired just because the deadline passed', () => {
  const p = commandProgress({ status: 'delivered', delivery_state: 'acknowledged', expires_at: past }, NOW)
  assert.equal(p.stage, 'acknowledged')
})

test('explicit expired status wins', () => {
  assert.equal(commandProgress({ status: 'expired', delivery_state: 'expired' }, NOW).stage, 'expired')
})

test('a pending command past its deadline reads as expired, not queued forever', () => {
  const p = commandProgress({ status: 'pending', delivery_state: 'queued', expires_at: past }, NOW)
  assert.equal(p.stage, 'expired')
  assert.equal(p.terminal, true)
})

test('a failed ambiguous send is dangerous and warns against blind retry', () => {
  const p = commandProgress({ status: 'sent', delivery_state: 'failed_ambiguous' }, NOW)
  assert.equal(p.stage, 'uncertain')
  assert.equal(p.tone, 'danger')
  assert.match(p.detail, /before retrying/i)
})

test('sending/dispatching is in progress', () => {
  assert.equal(commandProgress({ status: 'sent', delivery_state: 'sending' }, NOW).stage, 'sending')
})

test('unknown shapes do not become success', () => {
  assert.equal(commandProgress({}, NOW).stage, 'unknown')
  assert.equal(commandProgress({ status: 'something_new' }, NOW).stage, 'unknown')
})

test('send result: legacy delivered-only response maps to sent, not acknowledged', () => {
  assert.equal(progressFromSendResult({ delivered: true }, NOW).stage, 'sent')
})

test('send result: delivered false maps to queued', () => {
  assert.equal(progressFromSendResult({ delivered: false, reason: 'device_offline' }, NOW).stage, 'queued')
})

test('send result: a full response uses its status fields', () => {
  const p = progressFromSendResult(
    { status: 'delivered', delivery_state: 'acknowledged', delivered: true },
    NOW,
  )
  assert.equal(p.stage, 'acknowledged')
})

test('only the confirmed stage uses the success tone', () => {
  const stages = [
    { status: 'pending' }, { status: 'sent', delivery_state: 'socket_written' },
    { status: 'sent', delivery_state: 'sending' }, { status: 'delivered', delivery_state: 'acknowledged' },
    { status: 'expired' }, { status: 'sent', delivery_state: 'failed_ambiguous' }, {},
  ]
  for (const s of stages) {
    assert.notEqual(commandProgress(s, NOW).tone, 'success', JSON.stringify(s))
  }
})
