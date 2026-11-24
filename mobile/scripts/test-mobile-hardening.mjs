#!/usr/bin/env node
/**
 * Tests for the mobile hardening gate helpers.
 *
 * The SDK fixture proves that an Adjust dependency is rejected through the
 * same discovery/matching path the gate uses, while the current tree must stay
 * clean. XML parsing checks cover single quotes, whitespace, attribute order,
 * and `uses-permission-sdk-23`, which the old exact-substring checks missed.
 * API-origin fixtures cover cleartext URLs, stray Gradle property overrides,
 * and duplicate or undeclared iOS `API_BASE_URL` YAML keys.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  discoverGradleApiOverrideSources,
  findCleartextApiBaseUrlLines,
  findGradleApiBaseUrlOverrides,
  productionApiBaseUrl,
  stagingApiBaseUrl,
  validateIosApiBaseUrlEntries,
} from './lib/mobile-hardening-api-origin.mjs'
import {
  validateIosSessionConsumers,
  validateIosSessionStorage,
} from './lib/mobile-hardening-ios-session.mjs'
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

// API origin gate: Gradle property and root/init build files are discovered,
// and the current iOS YAML must have exactly the reviewed production, staging,
// and Info.plist entries.
const gradleSources = discoverGradleApiOverrideSources(join(root, 'android'))
assert.ok(
  gradleSources.includes(join(root, 'android', 'gradle.properties')),
  'android/gradle.properties is not scanned for API_BASE_URL overrides',
)
assert.ok(
  gradleSources.includes(join(root, 'android', 'build.gradle.kts')),
  'root Gradle build file is not scanned for API_BASE_URL overrides',
)
const currentIosProject = readFileSync(join(root, 'ios/project.yml'), 'utf8')
assert.deepEqual(
  validateIosApiBaseUrlEntries(currentIosProject).failures,
  [],
  'current iOS project has an unexpected API_BASE_URL entry',
)

// Negative fixture: a duplicate or undeclared API_BASE_URL key must be rejected.
const validApiYaml = `
settings:
  base:
    API_BASE_URL: ${productionApiBaseUrl}
  configs:
    Staging:
      API_BASE_URL: ${stagingApiBaseUrl}
info:
  properties:
    API_BASE_URL: $(API_BASE_URL)
`
assert.deepEqual(
  validateIosApiBaseUrlEntries(validApiYaml).failures,
  [],
  'valid API_BASE_URL fixture was rejected',
)
const duplicateApiYaml = validApiYaml.replace(
  '  base:\n',
  `  base:\n    API_BASE_URL: ${productionApiBaseUrl}\n`,
)
assert.ok(
  validateIosApiBaseUrlEntries(duplicateApiYaml).failures.some((failure) =>
    failure.includes('duplicate'),
  ),
  'duplicate API_BASE_URL YAML key was not detected',
)
const extraApiYaml = `${validApiYaml}
    API_BASE_URL: https://unreviewed.example
`
assert.ok(
  validateIosApiBaseUrlEntries(extraApiYaml).failures.some((failure) =>
    failure.includes('unexpected'),
  ),
  'undeclared API_BASE_URL YAML key was not detected',
)

// Negative fixture: cleartext and property/init overrides outside the reviewed
// app build must be detected before Gradle can consume them.
const cleartext = findCleartextApiBaseUrlLines(
  'API_BASE_URL=http://api.example.test\n# API_BASE_URL=https://ignored.example\n',
  { properties: true },
)
assert.equal(cleartext.length, 1, 'cleartext Gradle API_BASE_URL fixture was not detected')
assert.equal(
  findCleartextApiBaseUrlLines(
    'API_BASE_URL: http://api.example.test\n# API_BASE_URL: https://ignored.example\n',
  ).length,
  1,
  'cleartext YAML API_BASE_URL fixture was not detected',
)
const propertyOverride = findGradleApiBaseUrlOverrides([
  {
    path: 'android/gradle.properties',
    source:
      'API_BASE_URL=https://unreviewed.example\n# API_BASE_URL=https://commented.example\n',
  },
])
assert.equal(
  propertyOverride.length,
  1,
  'undeclared Gradle API_BASE_URL override was not detected',
)

// iOS session binding: the current sources must pass, while a missing origin
// comparison, raw-cookie storage, leftover legacy item, and origin-less client
// access must each be rejected.
const currentSession = readFileSync(
  join(root, 'ios/OnOffMyPC/Networking/Session.swift'),
  'utf8',
)
const currentAPIClient = readFileSync(
  join(root, 'ios/OnOffMyPC/Networking/APIClient.swift'),
  'utf8',
)
const currentAppState = readFileSync(
  join(root, 'ios/OnOffMyPC/OnOffMyPCApp.swift'),
  'utf8',
)
assert.deepEqual(
  validateIosSessionStorage(currentSession),
  [],
  'current iOS Keychain session is not origin-bound',
)
assert.deepEqual(
  validateIosSessionConsumers({
    apiClientSource: currentAPIClient,
    appStateSource: currentAppState,
  }),
  [],
  'current iOS API/AppState session use is not origin-bound',
)

const originMismatchFixture = currentSession.replace(
  /guard\s+stored\.origin\s*==\s*requested\s+else\s*\{\s*clear\(\)\s*return\s+nil\s*\}/,
  'guard stored.origin == requested else { return nil }',
)
assert.ok(
  validateIosSessionStorage(originMismatchFixture).some((failure) =>
    failure.includes('mismatched origin'),
  ),
  'origin-mismatch fixture was not rejected',
)
const rawCookieFixture = currentSession.replace(
  'JSONEncoder().encode(stored)',
  'Data(stored.cookie.utf8)',
)
assert.ok(
  validateIosSessionStorage(rawCookieFixture).some((failure) =>
    failure.includes('encoded as JSON'),
  ),
  'raw-cookie storage fixture was not rejected',
)
const legacyFixture = currentSession.replaceAll(
  'delete(account: legacyAccount)',
  '',
)
assert.ok(
  validateIosSessionStorage(legacyFixture).some((failure) =>
    failure.includes('legacy raw-cookie'),
  ),
  'legacy raw-cookie item fixture was not rejected',
)
const originlessCookieFixture = currentAPIClient.replace(
  'Session.cookie(for: configuredOrigin)',
  'Session.cookie',
)
assert.ok(
  validateIosSessionConsumers({
    apiClientSource: originlessCookieFixture,
    appStateSource: currentAppState,
  }).some((failure) => failure.includes('origin-less Session.cookie')),
  'origin-less cookie accessor fixture was not rejected',
)
const oldAppStateFixture = currentAppState.replace(
  /guard\s+let\s+origin\s*=\s*APIClient\.shared\.configuredOrigin\s+else\s*\{\s*return\s+false\s*\}\s*return\s+Session\.isLoggedIn\(for:\s*origin\)/,
  'Session.isLoggedIn',
)
assert.ok(
  validateIosSessionConsumers({
    apiClientSource: currentAPIClient,
    appStateSource: oldAppStateFixture,
  }).some((failure) => failure.includes('configured API origin')),
  'origin-less AppState login fixture was not rejected',
)
const no401ClearFixture = currentAPIClient.replace(
  /if\s+http\.statusCode\s*==\s*401\s*\{\s*Session\.clear\(\)/,
  'if http.statusCode == 401 {',
)
assert.ok(
  validateIosSessionConsumers({
    apiClientSource: no401ClearFixture,
    appStateSource: currentAppState,
  }).some((failure) => failure.includes('clear the session on 401')),
  '401 session-clear fixture was not rejected',
)

console.log('mobile hardening helper tests passed')
