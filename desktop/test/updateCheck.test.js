'use strict'

// The updater used to read GitHub Releases, which no longer exist. It now reads
// the R2 release manifest that the web downloads page also uses.
const test = require('node:test')
const assert = require('node:assert')

const {
  compareVersions,
  latestDesktopVersion,
  RELEASES_MANIFEST_URL,
} = require('../src/main/updateCheck')

test('compareVersions orders by numeric segment, not lexically', () => {
  assert.equal(compareVersions('0.1.4', '0.1.3'), 1)
  assert.equal(compareVersions('0.1.3', '0.1.4'), -1)
  assert.equal(compareVersions('0.1.4', '0.1.4'), 0)
  // "0.1.10" must be newer than "0.1.9" (a string compare would say otherwise).
  assert.equal(compareVersions('0.1.10', '0.1.9'), 1)
})

test('compareVersions tolerates a leading v and missing segments', () => {
  assert.equal(compareVersions('v1.0.0', '1.0.0'), 0)
  assert.equal(compareVersions('1.1', '1.0.9'), 1)
  assert.equal(compareVersions('1', '1.0.0'), 0)
})

test('latestDesktopVersion reads the desktop family from the manifest', () => {
  assert.equal(
    latestDesktopVersion({ families: { desktop: { version: '0.1.4' } } }),
    '0.1.4',
  )
})

test('latestDesktopVersion returns null for missing or malformed manifests', () => {
  assert.equal(latestDesktopVersion(null), null)
  assert.equal(latestDesktopVersion({}), null)
  assert.equal(latestDesktopVersion({ families: {} }), null)
  assert.equal(latestDesktopVersion({ families: { desktop: {} } }), null)
  assert.equal(latestDesktopVersion({ families: { desktop: { version: '' } } }), null)
  assert.equal(latestDesktopVersion({ families: { android: { version: '0.4.3' } } }), null)
})

test('the updater targets Cloudflare R2, not the retired GitHub repo', () => {
  assert.equal(RELEASES_MANIFEST_URL, 'https://releases.onoffmypc.com/releases/manifest.json')
  assert.ok(!RELEASES_MANIFEST_URL.includes('github'))
})
