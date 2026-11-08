import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeAge, describeConnection, describePcState, isStale, STALE_AFTER_MS } from '../src/lib/freshness.ts'

const NOW = Date.parse('2026-03-01T12:00:00.000Z')
const isoAgo = (ms: number) => new Date(NOW - ms).toISOString()

test('describeAge covers the useful ranges', () => {
  assert.equal(describeAge(null, NOW), 'never')
  assert.equal(describeAge('not-a-date', NOW), 'at an unknown time')
  assert.equal(describeAge(isoAgo(5_000), NOW), 'just now')
  assert.equal(describeAge(isoAgo(60_000), NOW), 'a minute ago')
  assert.equal(describeAge(isoAgo(5 * 60_000), NOW), '5 minutes ago')
  assert.equal(describeAge(isoAgo(2 * 3600_000), NOW), '2 hours ago')
  assert.equal(describeAge(isoAgo(3 * 86400_000), NOW), '3 days ago')
})

test('a future timestamp does not produce a negative age', () => {
  assert.equal(describeAge(new Date(NOW + 60_000).toISOString(), NOW), 'just now')
})

test('isStale treats missing and old readings as stale', () => {
  assert.equal(isStale(null, NOW), true)
  assert.equal(isStale(isoAgo(STALE_AFTER_MS - 1000), NOW), false)
  assert.equal(isStale(isoAgo(STALE_AFTER_MS + 1000), NOW), true)
})

test('pc_on without an observation time is Unknown, not On', () => {
  const s = describePcState(1, null, NOW)
  assert.equal(s.state, 'On')
  // It may still show On, but it must be flagged stale and say the time is unknown.
  assert.equal(s.stale, true)
  assert.match(s.ageLabel, /unknown/i)
})

test('pc_on null is Unknown rather than Off', () => {
  const s = describePcState(null, isoAgo(1000), NOW)
  assert.equal(s.state, 'Unknown')
  assert.match(s.ageLabel, /no reading/i)
})

test('a fresh reading is On and not stale', () => {
  const s = describePcState(1, isoAgo(30_000), NOW)
  assert.equal(s.state, 'On')
  assert.equal(s.stale, false)
  assert.match(s.ageLabel, /observed just now/)
})

test('an old reading is On but stale, so the UI can qualify it', () => {
  const s = describePcState(0, isoAgo(3 * 86400_000), NOW)
  assert.equal(s.state, 'Off')
  assert.equal(s.stale, true)
  assert.match(s.ageLabel, /3 days ago/)
})

test('connection presence is separate from PC state', () => {
  const online = describeConnection(isoAgo(10_000), NOW)
  assert.equal(online.online, true)
  assert.equal(online.label, 'Online')

  const offline = describeConnection(isoAgo(10 * 60_000), NOW)
  assert.equal(offline.online, false)
  assert.equal(offline.label, 'Offline')

  const never = describeConnection(null, NOW)
  assert.equal(never.online, false)
  assert.equal(never.label, 'Never connected')
})
