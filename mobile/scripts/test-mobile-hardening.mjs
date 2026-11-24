#!/usr/bin/env node
/**
 * Tests for the mobile hardening gate helpers.
 *
 * The SDK fixture proves that an Adjust dependency is rejected through the
 * same discovery/matching path the gate uses, while the current tree must stay
 * clean. XML parsing checks cover single quotes, whitespace, attribute order,
 * and `uses-permission-sdk-23`, which the old exact-substring checks missed.
 */
import assert from 'node:assert/strict'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  denylistFixturePasses,
  findDeniedSdkTokens,
  scanAndroidSdkSources,
} from './lib/mobile-hardening-sdk-denylist.mjs'
import {
  attr,
  findAll,
  findDirect,
  isTrueAttr,
  parseXml,
} from './lib/mobile-hardening-xml.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Negative SDK fixture: Adjust must fail, including through a version catalog-
// style declaration. Boundary matching should not flag benign lookalikes.
assert.equal(denylistFixturePasses(root), true, 'Adjust fixture was not detected')
assert.deepEqual(
  findDeniedSdkTokens(
    '[versions]\nadjust = "4.38.0"\n[libraries]\nadjust = { group = "com.adjust.sdk", name = "adjust-android", version.ref = "adjust" }',
  ),
  ['adjust'],
  'version-catalog Adjust declaration was not detected',
)
assert.deepEqual(
  findDeniedSdkTokens(
    'implementation("com.example:adjusting-tools:1.0")\n// notadjust is not an SDK',
  ),
  [],
  'boundary matching produced a false positive',
)

const currentScan = scanAndroidSdkSources(root)
assert.deepEqual(currentScan.missing, [], 'required Gradle sources are missing')
assert.deepEqual(
  currentScan.hits,
  [],
  `current tree contains a denylisted SDK: ${currentScan.hits
    .map((hit) => `${hit.file}:${hit.token}`)
    .join(', ')}`,
)

// XML parser variants: attribute order, whitespace around `=`, both quote
// styles, and the alternate permission tag must all be understood.
const manifest = parseXml(`
<manifest xmlns:android='http://schemas.android.com/apk/res/android'>
  <!-- <uses-permission android:name="android.permission.CAMERA" /> -->
  <uses-permission-sdk-23
      android:maxSdkVersion = '32'
      android:name = 'android.permission.READ_CONTACTS' />
  <application android:allowBackup = 'false' android:exported ="true" />
</manifest>
`)
const permission = findAll(manifest, 'uses-permission-sdk-23')[0]
assert.equal(attr(permission, 'android:name'), 'android.permission.READ_CONTACTS')
assert.equal(attr(permission, 'android:maxSdkVersion'), '32')
const application = findDirect(
  manifest.children.find((node) => node.name === 'manifest'),
  'application',
)
assert.equal(attr(application, 'android:allowBackup'), 'false')
assert.equal(isTrueAttr(application, 'android:exported'), true)
assert.deepEqual(findAll(manifest, 'uses-permission'), [], 'comment tags leaked into the parse')

// Backup rule variant: hyphenated section names and whitespace before `/>`.
const backup = parseXml(`
<data-extraction-rules>
  <cloud-backup>
    <exclude domain = 'root'/>
    <exclude domain="database" />
  </cloud-backup>
  <device-transfer>
    <exclude domain = "sharedpref"/>
  </device-transfer>
</data-extraction-rules>
`)
const cloud = findDirect(backup.children[0], 'cloud-backup')
assert.equal(findAll(cloud, 'exclude').length, 2)
assert.equal(findAll(backup, 'exclude')[0].attributes.domain, 'root')

console.log('mobile hardening helper tests passed')
