#!/usr/bin/env node
/**
 * Static hardening gate for the Android and iOS clients.
 *
 * This complements the platform builds and unit tests. It intentionally checks
 * source and manifest invariants that are easy to weaken during refactors:
 * backup/transfer, cleartext traffic, exported components, session-cookie
 * origin binding, release logging, credential clipboard previews, screenshot
 * protection, third-party privacy SDKs, and iOS ATS/Keychain/session behavior.
 *
 * XML is parsed by tag/attribute rather than matched as an exact substring, so
 * attribute order, quote style, and whitespace do not bypass a check. When the
 * local build artifacts exist, the merged release manifest and generated
 * `sdkDependencies.txt` are checked too; this is not a packaged-APK check.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  denylistFixturePasses,
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
const failures = []
const backupDomains = ['root', 'database', 'sharedpref', 'file', 'external']

function read(relative) {
  const path = join(root, relative)
  if (!existsSync(path)) {
    failures.push(`missing file: ${relative}`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function requireText(relative, needle, message) {
  const source = read(relative)
  if (!source.includes(needle)) failures.push(`${relative}: ${message}`)
}

function rejectText(relative, needle, message) {
  const source = read(relative)
  if (source.includes(needle)) failures.push(`${relative}: ${message}`)
}

function requireAttr(node, name, expected, label) {
  if (attr(node, name) !== expected) {
    failures.push(`${label}: ${name} must be ${JSON.stringify(expected)}`)
  }
}

function checkApplication(relative, application) {
  if (!application) {
    failures.push(`${relative}: missing <application>`)
    return
  }
  requireAttr(application, 'android:allowBackup', 'false', `${relative} application`)
  requireAttr(
    application,
    'android:fullBackupContent',
    '@xml/backup_rules',
    `${relative} application`,
  )
  requireAttr(
    application,
    'android:dataExtractionRules',
    '@xml/data_extraction_rules',
    `${relative} application`,
  )
  requireAttr(
    application,
    'android:networkSecurityConfig',
    '@xml/network_security_config',
    `${relative} application`,
  )
  requireAttr(
    application,
    'android:usesCleartextTraffic',
    'false',
    `${relative} application`,
  )
  if (isTrueAttr(application, 'android:debuggable')) {
    failures.push(`${relative}: debuggable release manifest is forbidden`)
  }
}

function parseManifest(relative) {
  const document = parseXml(read(relative))
  const manifest = document.children.find((node) => node.name === 'manifest')
  if (!manifest) {
    failures.push(`${relative}: missing <manifest>`)
    return null
  }
  const application = findDirect(manifest, 'application')
  checkApplication(relative, application)
  return { manifest, application }
}

function permissionNames(relative, manifest) {
  const tags = [
    ...findAll(manifest, 'uses-permission'),
    ...findAll(manifest, 'uses-permission-sdk-23'),
  ]
  const names = []
  for (const tag of tags) {
    const name = attr(tag, 'android:name')
    if (!name) {
      failures.push(`${relative}: ${tag.name} is missing android:name`)
      continue
    }
    names.push(name)
  }
  return [...new Set(names)].sort()
}

function collectExportedComponents(application) {
  if (!application) return []
  const components = []
  for (const kind of ['activity', 'service', 'receiver', 'provider']) {
    for (const node of findAll(application, kind)) {
      if (!isTrueAttr(node, 'android:exported')) continue
      components.push({
        kind,
        name: attr(node, 'android:name') ?? '?',
        node,
      })
    }
  }
  return components
}

function checkFcmService(relative, application) {
  if (!application) return
  const fcm = findAll(application, 'service').find((node) =>
    (attr(node, 'android:name') ?? '').endsWith('.push.OnOffMessagingService'),
  )
  if (!fcm) {
    failures.push(`${relative}: missing FCM service`)
  } else if ((attr(fcm, 'android:exported') ?? '').toLowerCase() !== 'false') {
    failures.push(`${relative}: FCM service must be non-exported`)
  }
}

function checkNetworkSecurity(relative) {
  const document = parseXml(read(relative))
  const config = document.children.find(
    (node) => node.name === 'network-security-config',
  )
  if (!config) {
    failures.push(`${relative}: missing <network-security-config>`)
    return
  }

  const baseConfigs = findAll(config, 'base-config')
  if (baseConfigs.length === 0) {
    failures.push(`${relative}: missing <base-config>`)
  }
  for (const base of baseConfigs) {
    if ((attr(base, 'cleartextTrafficPermitted') ?? '').toLowerCase() !== 'false') {
      failures.push(`${relative}: base-config must set cleartextTrafficPermitted="false"`)
    }
    const anchors = findDirect(base, 'trust-anchors')
    const certificates = anchors ? findAll(anchors, 'certificates') : []
    if (!certificates.some((certificate) => attr(certificate, 'src') === 'system')) {
      failures.push(`${relative}: base-config must trust the system CA store`)
    }
  }

  for (const section of findAll(config, 'domain-config')) {
    if (isTrueAttr(section, 'cleartextTrafficPermitted')) {
      failures.push(`${relative}: domain-config must not enable cleartext traffic`)
    }
  }
  for (const certificate of findAll(config, 'certificates')) {
    if (attr(certificate, 'src') !== 'system') {
      failures.push(`${relative}: only system trust anchors are allowed`)
    }
  }
}

function checkBackupExclusions(relative, rootName, sections) {
  const document = parseXml(read(relative))
  const rules = document.children.find((node) => node.name === rootName)
  if (!rules) {
    failures.push(`${relative}: missing <${rootName}>`)
    return
  }

  const targets = sections
    ? sections.map((name) => ({ label: name, node: findDirect(rules, name) }))
    : [{ label: rootName, node: rules }]

  for (const { label, node } of targets) {
    if (!node) {
      failures.push(`${relative}: missing <${label}> section`)
      continue
    }
    const excluded = new Set(
      findAll(node, 'exclude')
        .map((exclude) => attr(exclude, 'domain'))
        .filter(Boolean),
    )
    for (const domain of backupDomains) {
      if (!excluded.has(domain)) {
        failures.push(`${relative}: ${label} must exclude ${domain}`)
      }
    }
    if (findAll(node, 'include').length > 0) {
      failures.push(`${relative}: ${label} must not include backup data`)
    }
  }
}

const manifestPath = 'android/app/src/main/AndroidManifest.xml'
const parsedManifest = parseManifest(manifestPath)
if (parsedManifest) {
  const { manifest, application } = parsedManifest
  const permissions = permissionNames(manifestPath, manifest)
  const expectedPermissions = [
    'android.permission.INTERNET',
    'android.permission.POST_NOTIFICATIONS',
  ].sort()
  if (JSON.stringify(permissions) !== JSON.stringify(expectedPermissions)) {
    failures.push(
      `Android permissions changed: ${permissions.join(', ') || '(none)'}`,
    )
  }

  const exporters = collectExportedComponents(application)
    .map(({ kind, name }) => `${kind}:${name}`)
    .sort()
  const expectedExporters = [
    'activity:.MainActivity',
    'activity:.ui.auth.OAuthRedirectActivity',
  ].sort()
  if (JSON.stringify(exporters) !== JSON.stringify(expectedExporters)) {
    failures.push(
      `unexpected exported Android components: ${exporters.join(', ') || '(none)'}`,
    )
  }

  checkFcmService(manifestPath, application)
}

checkNetworkSecurity('android/app/src/main/res/xml/network_security_config.xml')
checkBackupExclusions(
  'android/app/src/main/res/xml/backup_rules.xml',
  'full-backup-content',
)
checkBackupExclusions(
  'android/app/src/main/res/xml/data_extraction_rules.xml',
  'data-extraction-rules',
  ['cloud-backup', 'device-transfer'],
)

requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/Constants.kt', 'const val BASE_URL = "https://', 'Android API base URL must use HTTPS')
rejectText('android/app/src/main/kotlin/com/onoffmypc/android/data/Constants.kt', 'const val BASE_URL = "http://', 'Android API base URL must not use cleartext HTTP')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/SessionStore.kt', 'AES256_GCM', 'session encryption must use AES256-GCM')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/SessionStore.kt', 'AES256_SIV', 'session key encryption must use AES256-SIV')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/ApiClient.kt', '.cookieJar(SessionCookieJar(store))', 'API client must use the origin-bound cookie jar')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/push/Notifications.kt', 'PendingIntent.FLAG_IMMUTABLE', 'notification intents must be immutable')
rejectText('android/app/src/main/kotlin/com/onoffmypc/android/push/Notifications.kt', 'FLAG_MUTABLE', 'mutable notification intents are forbidden')

const sdkScan = scanAndroidSdkSources(root)
for (const missing of sdkScan.missing) failures.push(`missing file: ${missing}`)
for (const hit of sdkScan.hits) {
  failures.push(
    `${hit.file}: analytics/ads/attribution/crash SDK is not reviewed: ${hit.token}`,
  )
}
if (!denylistFixturePasses(root)) {
  failures.push(
    'SDK denylist self-test failed: the Adjust fixture was not detected',
  )
}

// Optional local build artifact: the merged release manifest adds transitive
// permissions/components. It is not an APK and may be absent on a clean CI
// checkout, so its absence is not a failure.
const mergedManifestPath =
  'android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml'
if (existsSync(join(root, mergedManifestPath))) {
  const merged = parseManifest(mergedManifestPath)
  if (merged) {
    const permissions = permissionNames(mergedManifestPath, merged.manifest)
    const expectedMergedPermissions = [
      'android.permission.INTERNET',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.WAKE_LOCK',
      'com.google.android.c2dm.permission.RECEIVE',
      'com.onoffmypc.android.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
    ].sort()
    if (JSON.stringify(permissions) !== JSON.stringify(expectedMergedPermissions)) {
      failures.push(
        `merged release manifest permissions changed: ${permissions.join(', ') || '(none)'}`,
      )
    }

    checkFcmService(mergedManifestPath, merged.application)

    const exported = collectExportedComponents(merged.application)
    for (const expected of [
      'com.onoffmypc.android.MainActivity',
      'com.onoffmypc.android.ui.auth.OAuthRedirectActivity',
    ]) {
      if (
        !exported.some(
          (component) =>
            component.kind === 'activity' && component.name === expected,
        )
      ) {
        failures.push(`${mergedManifestPath}: missing exported activity ${expected}`)
      }
    }
    for (const component of exported) {
      const isAppComponent =
        component.name === 'com.onoffmypc.android.MainActivity' ||
        component.name === 'com.onoffmypc.android.ui.auth.OAuthRedirectActivity'
      if (!isAppComponent && !attr(component.node, 'android:permission')) {
        failures.push(
          `${mergedManifestPath}: exported ${component.kind} ${component.name} lacks android:permission`,
        )
      }
    }
  }
}

requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/SessionStore.kt', 'EncryptedSharedPreferences', 'session storage must be encrypted')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/SessionCookieJar.kt', 'url.isHttps', 'session cookie must require HTTPS')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/SessionCookieJar.kt', 'url.host == apiUrl.host', 'session cookie must be API-host bound')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/SessionCookieJar.kt', 'url.port == apiUrl.port', 'session cookie must be API-port bound')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/SessionCookieJar.kt', 'hostOnlyDomain(apiUrl.host)', 'session cookie must be host-only')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/SessionCookieJar.kt', '.httpOnly()', 'session cookie must be HttpOnly')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/ApiClient.kt', '.followRedirects(false)', 'authenticated redirects must be disabled')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/ApiClient.kt', '.followSslRedirects(false)', 'SSL redirects must be disabled')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/ApiClient.kt', 'BuildConfig.DEBUG', 'network logging must be debug-only')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/ApiClient.kt', 'HttpLoggingInterceptor.Level.BASIC', 'release logging must remain BASIC')
rejectText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/ApiClient.kt', 'Level.BODY', 'BODY logging is forbidden')
rejectText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/ApiClient.kt', 'Level.HEADERS', 'HEADERS logging is forbidden')

requireText('android/app/src/main/kotlin/com/onoffmypc/android/ui/components/SensitiveClipboard.kt', 'EXTRA_IS_SENSITIVE', 'sensitive clipboard marker missing')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/ui/devices/DeviceDialogs.kt', 'copySensitiveText', 'credentials must use the sensitive clipboard helper')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/ui/components/SecureDialogContent.kt', 'FLAG_SECURE', 'credential dialogs must block screenshots')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/ui/devices/DeviceDialogs.kt', 'SecureDialogContent()', 'credential dialogs must use FLAG_SECURE')

rejectText('ios/project.yml', 'NSAllowsArbitraryLoads', 'iOS ATS exceptions are forbidden')
rejectText('ios/project.yml', 'NSExceptionDomains', 'iOS ATS exception domains are forbidden')
rejectText('ios/project.yml', 'NSAllowsArbitraryLoadsInWebContent', 'iOS ATS web-content exceptions are forbidden')
rejectText('ios/project.yml', 'NSAllowsArbitraryLoadsForMedia', 'iOS ATS media exceptions are forbidden')
rejectText('ios/project.yml', 'NSAllowsLocalNetworking', 'iOS ATS local-network exceptions are forbidden')
rejectText('ios/project.yml', 'NSUserTrackingUsageDescription', 'iOS tracking permission is forbidden')
requireText('ios/OnOffMyPC/Networking/APIClient.swift', 'private let base = "https://', 'iOS API base URL must use HTTPS')
rejectText('ios/OnOffMyPC/Networking/APIClient.swift', 'private let base = "http://', 'iOS API base URL must not use cleartext HTTP')
requireText('ios/OnOffMyPC/Networking/APIClient.swift', 'config.httpCookieStorage = nil', 'iOS URLSession cookie storage must be disabled')
requireText('ios/OnOffMyPC/Networking/APIClient.swift', 'config.httpShouldSetCookies = false', 'iOS URLSession automatic cookies must be disabled')
requireText('ios/OnOffMyPC/Networking/APIClient.swift', 'config.urlCache = nil', 'iOS API response cache must be disabled')
requireText('ios/OnOffMyPC/Networking/APIClient.swift', 'willPerformHTTPRedirection', 'iOS API redirects must be intercepted')
requireText('ios/OnOffMyPC/Networking/APIClient.swift', 'completionHandler(nil)', 'iOS API redirects must not be followed')
requireText('ios/OnOffMyPC/Networking/APIClient.swift', 'url.scheme == "https"', 'iOS cookie capture must require HTTPS')
requireText('ios/OnOffMyPC/Networking/APIClient.swift', 'url.host == Self.apiHost', 'iOS cookie capture must be bound to the API host')
requireText('ios/OnOffMyPC/Networking/APIClient.swift', 'session.isSecure', 'iOS session cookies must be Secure')
requireText('ios/OnOffMyPC/Networking/Session.swift', 'trimmingCharacters(in: .whitespacesAndNewlines)', 'iOS empty/whitespace cookies must be rejected')
requireText('ios/OnOffMyPC/Networking/Session.swift', 'kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly', 'iOS session must be device-bound')
requireText('ios/OnOffMyPC/Networking/Session.swift', 'kSecAttrSynchronizable as String: false', 'iOS session must not sync')
rejectText('ios/OnOffMyPC/Networking/Session.swift', 'kSecAttrSynchronizable as String: true', 'iOS session synchronization is forbidden')
requireText('ios/OnOffMyPC/Components/TokenReveal.swift', 'options: [.localOnly: true]', 'iOS credential clipboard must be local-only')
rejectText('ios/OnOffMyPC/Components/TokenReveal.swift', 'UIPasteboard.general.string', 'iOS credential clipboard must use local-only items')

if (failures.length > 0) {
  console.error('mobile hardening check failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log(
  `mobile hardening check passed (${sdkScan.files.length} Gradle sources` +
    `${sdkScan.resolvedScanned ? ' + resolved SDK list' : ''}; ` +
    `merged manifest ${existsSync(join(root, mergedManifestPath)) ? 'checked' : 'not present'})`,
)
