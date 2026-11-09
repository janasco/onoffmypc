import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeUserAgent, formatWhen } from '../src/lib/sessions.ts'

test('describeUserAgent recognises the desktop and mobile clients', () => {
  assert.equal(
    describeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'),
    'Chrome on Windows',
  )
  assert.equal(
    describeUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'),
    'Safari on macOS',
  )
  assert.equal(describeUserAgent('Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/128.0'), 'Firefox on Linux')
  assert.equal(describeUserAgent('okhttp/4.12.0'), 'Android app')
  assert.equal(describeUserAgent('OnOffMyPC/0.4.4 CFNetwork/1490 Darwin/23.0.0'), 'iOS app')
})

test('describeUserAgent handles missing and unrecognised agents', () => {
  assert.equal(describeUserAgent(null), 'Unknown device')
  assert.equal(describeUserAgent(''), 'Unknown device')
  assert.equal(describeUserAgent('curl/8.14.1'), 'Browser')
})

test('describeUserAgent prefers Edge over Chrome when both tokens appear', () => {
  assert.equal(
    describeUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0'),
    'Edge on Windows',
  )
})

test('formatWhen renders useful relative times', () => {
  const now = Date.parse('2026-03-01T12:00:00Z')
  const ago = (ms: number) => new Date(now - ms).toISOString()
  assert.equal(formatWhen(ago(10_000), now), 'just now')
  assert.equal(formatWhen(ago(5 * 60_000), now), '5 min ago')
  assert.equal(formatWhen(ago(3 * 3600_000), now), '3 h ago')
  assert.equal(formatWhen(ago(2 * 86400_000), now), '2 d ago')
})

test('formatWhen tolerates missing and invalid timestamps', () => {
  assert.equal(formatWhen(null), 'unknown')
  assert.equal(formatWhen('not-a-date'), 'unknown')
})
