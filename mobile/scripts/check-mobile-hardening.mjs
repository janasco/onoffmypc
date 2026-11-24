#!/usr/bin/env node
/**
 * Static hardening gate for the Android and iOS clients.
 *
 * This complements the platform builds and unit tests. It intentionally checks
 * source and manifest invariants that are easy to weaken during refactors:
 * backup/transfer, cleartext traffic, exported components, session-cookie
 * origin binding, release logging, credential clipboard previews, screenshot
 * protection, third-party privacy SDKs, and iOS ATS/Keychain/session behavior,
 * including the build-time API origin and privacy manifest.
 *
 * XML is parsed by tag/attribute rather than matched as an exact substring, so
 * attribute order, quote style, and whitespace do not bypass a check. When the
 * local build artifacts exist, the merged release manifest and generated
 * `sdkDependencies.txt` are checked too; this is not a packaged-APK check.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  discoverGradleApiOverrideSources,
  findCleartextApiBaseUrlLines,
  findGradleApiBaseUrlOverrides,
  validateIosApiBaseUrlEntries,
} from './lib/mobile-hardening-api-origin.mjs'
import {
  validateIosSessionConsumers,
  validateIosSessionStorage,
} from './lib/mobile-hardening-ios-session.mjs'
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

function requirePattern(relative, pattern, message) {
  const source = read(relative)
  if (!pattern.test(source)) failures.push(`${relative}: ${message}`)
}

function rejectPattern(relative, pattern, message) {
  const source = read(relative)
  if (pattern.test(source)) failures.push(`${relative}: ${message}`)
}

function requirePatternOccurrences(relative, pattern, minimum, message) {
  const source = read(relative)
  const count = source.match(pattern)?.length ?? 0
  if (count < minimum) failures.push(`${relative}: ${message}`)
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

function checkAndroidApiBaseUrl() {
  const gradlePath = 'android/app/build.gradle.kts'
  const constantsPath =
    'android/app/src/main/kotlin/com/onoffmypc/android/data/Constants.kt'
  const gradle = read(gradlePath)
  const constants = read(constantsPath)

  if (!/val productionApiBaseUrl\s*=\s*"https:\/\/api\.onoffmypc\.com"/.test(gradle)) {
    failures.push(
      `${gradlePath}: production API_BASE_URL must default to HTTPS https://api.onoffmypc.com`,
    )
  }
  if (!/buildConfigField\(\s*"String"\s*,\s*"API_BASE_URL"\s*,/.test(gradle)) {
    failures.push(`${gradlePath}: missing BuildConfig API_BASE_URL field`)
  }
  if (!/findProperty\(\s*"API_BASE_URL"\s*\)/.test(gradle)) {
    failures.push(
      `${gradlePath}: API_BASE_URL must be configurable with -PAPI_BASE_URL`,
    )
  }
  if (!/System\.getenv\(\s*"API_BASE_URL"\s*\)/.test(gradle)) {
    failures.push(
      `${gradlePath}: API_BASE_URL must support the environment fallback`,
    )
  }
  if (!/apiBaseUri\.scheme\s*!=\s*"https"/.test(gradle)) {
    failures.push(`${gradlePath}: API_BASE_URL must reject non-HTTPS schemes`)
  }
  if (!/throw\s+GradleException/.test(gradle)) {
    failures.push(`${gradlePath}: an invalid API_BASE_URL must fail the build`)
  }
  if (/"http:\/\//.test(gradle)) {
    failures.push(`${gradlePath}: cleartext API base URLs are forbidden`)
  }

  // Gradle properties and root/init scripts can inject a project property that
  // `findProperty("API_BASE_URL")` would silently consume. Only the reviewed
  // app build file may declare or read the override.
  const appGradlePath = resolve(join(root, gradlePath))
  const overrideFiles = discoverGradleApiOverrideSources(join(root, 'android'))
    .filter((path) => resolve(path) !== appGradlePath)
    .map((path) => ({
      path: relative(root, path).split('\\').join('/'),
      source: readFileSync(path, 'utf8'),
    }))
  for (const hit of findGradleApiBaseUrlOverrides(overrideFiles)) {
    failures.push(
      `${hit.path}:${hit.line}: API_BASE_URL overrides are only allowed in ${gradlePath}: ${hit.text}`,
    )
  }
  for (const file of overrideFiles) {
    for (const hit of findCleartextApiBaseUrlLines(file.source, {
      properties: file.path.endsWith('gradle.properties'),
    })) {
      failures.push(
        `${file.path}:${hit.line}: cleartext API base URL is forbidden`,
      )
    }
  }

  if (!constants.includes('BuildConfig.API_BASE_URL')) {
    failures.push(
      `${constantsPath}: API base URL must come from BuildConfig.API_BASE_URL`,
    )
  }
  if (/BASE_URL[^=\n]*=\s*"https?:\/\//.test(constants)) {
    failures.push(`${constantsPath}: Android API base URL must not be hard-coded`)
  }
  if (!constants.includes('startsWith("https://")')) {
    failures.push(`${constantsPath}: Android API base URL must require HTTPS`)
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

checkAndroidApiBaseUrl()
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/SessionStore.kt', 'AES256_GCM', 'session encryption must use AES256-GCM')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/SessionStore.kt', 'AES256_SIV', 'session key encryption must use AES256-SIV')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/SessionStore.kt', 'KEY_ORIGIN', 'session storage must persist the issuing API origin')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/SessionStore.kt', 'stored.origin != origin', 'session storage must reject a mismatched API origin')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/SessionStore.kt', 'remove(KEY_SESSION).remove(KEY_ORIGIN)', 'clearing the session must remove both the cookie and its origin')
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/SessionCookieJar.kt', 'sessionFor(apiOrigin)', 'cookie replay must enforce the issuing API origin')
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
requireText('android/app/src/main/kotlin/com/onoffmypc/android/data/remote/SessionCookieJar.kt', 'Api.BASE_URL.toHttpUrl()', 'session cookie jar must derive its origin from the configured API base URL')
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

const iosProject = 'ios/project.yml'
const iosAPIClient = 'ios/OnOffMyPC/Networking/APIClient.swift'
const iosSession = 'ios/OnOffMyPC/Networking/Session.swift'
const iosAppState = 'ios/OnOffMyPC/OnOffMyPCApp.swift'
const iosPrivacyManifest = 'ios/OnOffMyPC/PrivacyInfo.xcprivacy'

rejectText(iosProject, 'NSAllowsArbitraryLoads', 'iOS ATS exceptions are forbidden')
rejectText(iosProject, 'NSExceptionDomains', 'iOS ATS exception domains are forbidden')
rejectText(iosProject, 'NSAllowsArbitraryLoadsInWebContent', 'iOS ATS web-content exceptions are forbidden')
rejectText(iosProject, 'NSAllowsArbitraryLoadsForMedia', 'iOS ATS media exceptions are forbidden')
rejectText(iosProject, 'NSAllowsLocalNetworking', 'iOS ATS local-network exceptions are forbidden')
rejectText(iosProject, 'NSUserTrackingUsageDescription', 'iOS tracking permission is forbidden')

// Build-time API origin: production is the checked-in default, Staging is a
// separate XcodeGen configuration, and the generated Info.plist only ever
// receives the build setting via $(API_BASE_URL). It is not committed.
requirePattern(
  iosProject,
  /^[ \t]*API_BASE_URL:[ \t]*https:\/\/api\.onoffmypc\.com[ \t]*$/m,
  'iOS API_BASE_URL default must be https://api.onoffmypc.com',
)
requirePattern(
  iosProject,
  /^[ \t]*API_BASE_URL:[ \t]*\$\(API_BASE_URL\)[ \t]*$/m,
  'iOS Info.plist must expand the API_BASE_URL build setting',
)
requirePattern(
  iosProject,
  /^[ \t]*API_BASE_URL:[ \t]*https:\/\/onoffmypc-api-staging\.onoffmypc\.workers\.dev[ \t]*$/m,
  'iOS staging API_BASE_URL must be the reviewed staging Worker origin',
)
requirePattern(
  iosProject,
  /^[ \t]*Staging:[ \t]*release[ \t]*$/m,
  'iOS Staging build configuration is missing',
)
requirePattern(
  iosProject,
  /^[ \t]*GENERATE_INFOPLIST_FILE:[ \t]*NO[ \t]*$/m,
  'iOS must use the XcodeGen-managed Info.plist file',
)
requirePattern(
  iosProject,
  /^[ \t]*INFOPLIST_EXPAND_BUILD_SETTINGS:[ \t]*YES[ \t]*$/m,
  'iOS Info.plist must expand the API_BASE_URL build setting',
)
for (const hit of findCleartextApiBaseUrlLines(read(iosProject))) {
  failures.push(
    `${iosProject}:${hit.line}: iOS API_BASE_URL must not use cleartext HTTP`,
  )
}
const iosApiBaseUrlCheck = validateIosApiBaseUrlEntries(read(iosProject))
for (const failure of iosApiBaseUrlCheck.failures) {
  failures.push(`${iosProject}: ${failure}`)
}

requireText(iosAPIClient, 'forInfoDictionaryKey: "API_BASE_URL"', 'iOS API client must read API_BASE_URL from the generated Info.plist')
rejectText(iosAPIClient, 'private let base = "', 'iOS API base must not be hard-coded')
rejectPattern(iosAPIClient, /"http:\/\//, 'iOS API base must not use cleartext HTTP')
requireText(iosAPIClient, 'throw APIError.configuration', 'iOS API client must fail closed when API_BASE_URL is invalid')
requireText(iosAPIClient, '!value.isEmpty', 'iOS API base URL must reject an empty value')
requirePattern(iosAPIClient, /!host\.isEmpty/, 'iOS API base URL must require a non-empty host')
requirePatternOccurrences(
  iosAPIClient,
  /url\.scheme\?\.lowercased\(\)\s*==\s*"https"/g,
  2,
  'iOS API base validation and cookie capture must both require HTTPS',
)
requireText(iosAPIClient, 'apiHost = url?.host?.lowercased()', 'iOS cookie host must be derived from API_BASE_URL')
requireText(iosAPIClient, 'apiPort = url?.port', 'iOS cookie port must be derived from API_BASE_URL')
requireText(iosAPIClient, 'url.host?.lowercased() == apiHost', 'iOS cookie capture must be bound to the configured API host')
requireText(iosAPIClient, '(url.port ?? 443) == (apiPort ?? 443)', 'iOS cookie capture must be bound to the configured API port')
requireText(iosAPIClient, 'cookieDomain == apiHost', 'iOS cookie capture must validate the configured API host domain')
requireText(iosAPIClient, 'allowsReviewedParentDomain', 'iOS parent-domain cookies must be scoped to the configured API host')
requireText(iosAPIClient, 'cookieDomain == ".onoffmypc.com"', 'iOS cookie capture must keep the reviewed parent-domain allowance')
requireText(iosAPIClient, 'config.httpCookieStorage = nil', 'iOS URLSession cookie storage must be disabled')
requireText(iosAPIClient, 'config.httpShouldSetCookies = false', 'iOS URLSession automatic cookies must be disabled')
requireText(iosAPIClient, 'config.urlCache = nil', 'iOS API response cache must be disabled')
requireText(iosAPIClient, 'willPerformHTTPRedirection', 'iOS API redirects must be intercepted')
requireText(iosAPIClient, 'completionHandler(nil)', 'iOS API redirects must not be followed')
requireText(iosAPIClient, 'session.isSecure', 'iOS session cookies must be Secure')
requireText(iosSession, 'trimmingCharacters(in: .whitespacesAndNewlines)', 'iOS empty/whitespace cookies must be rejected')
requireText(iosSession, 'kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly', 'iOS session must be device-bound')
requireText(iosSession, 'kSecAttrSynchronizable as String: false', 'iOS session must not sync')
rejectText(iosSession, 'kSecAttrSynchronizable as String: true', 'iOS session synchronization is forbidden')

// Staging and production share a bundle ID and Keychain service, so the
// persisted cookie must carry the exact issuing origin. Raw cookie items from
// older builds have no origin and must be deleted, not replayed.
for (const failure of validateIosSessionStorage(read(iosSession))) {
  failures.push(`${iosSession}: ${failure}`)
}
for (const failure of validateIosSessionConsumers({
  apiClientSource: read(iosAPIClient),
  appStateSource: read(iosAppState),
})) {
  failures.push(failure)
}

requireText('ios/OnOffMyPC/Components/TokenReveal.swift', 'options: [.localOnly: true]', 'iOS credential clipboard must be local-only')
rejectText('ios/OnOffMyPC/Components/TokenReveal.swift', 'UIPasteboard.general.string', 'iOS credential clipboard must use local-only items')

// The privacy manifest is committed (unlike the generated Info.plist). It must
// remain wired as an explicit XcodeGen resource, declare no tracking, and
// declare the required-reason API the reviewed app sources actually use
// (UserDefaults in Session.swift). Collected-data declarations are intentionally
// absent until the App Store privacy answers can be reviewed; see
// mobile/docs/STAGED_API_IOS.md.
requirePattern(
  iosProject,
  /^[ \t]*-[ \t]+path:[ \t]+OnOffMyPC\/PrivacyInfo\.xcprivacy[ \t]*$/m,
  'PrivacyInfo.xcprivacy must be an explicit XcodeGen source',
)
requirePattern(
  iosProject,
  /^[ \t]*-[ \t]+PrivacyInfo\.xcprivacy[ \t]*$/m,
  'PrivacyInfo.xcprivacy must be excluded from the recursive source to avoid duplicate build files',
)
requirePattern(
  iosProject,
  /^[ \t]*buildPhase:[ \t]+resources[ \t]*$/m,
  'PrivacyInfo.xcprivacy must be copied into the app bundle as a resource',
)
const privacyManifest = read(iosPrivacyManifest)
const compactPrivacyManifest = privacyManifest
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\s+/g, '')
if (privacyManifest) {
  if (!compactPrivacyManifest.includes('<key>NSPrivacyTracking</key><false/>')) {
    failures.push(`${iosPrivacyManifest}: NSPrivacyTracking must be false`)
  }
  if (
    /<key>NSPrivacyTrackingDomains<\/key><array><string>/.test(
      compactPrivacyManifest,
    )
  ) {
    failures.push(`${iosPrivacyManifest}: tracking domains are forbidden`)
  }
  if (!compactPrivacyManifest.includes('<key>NSPrivacyAccessedAPITypes</key>')) {
    failures.push(`${iosPrivacyManifest}: NSPrivacyAccessedAPITypes is missing`)
  }
  if (
    !compactPrivacyManifest.includes(
      '<string>NSPrivacyAccessedAPICategoryUserDefaults</string>',
    )
  ) {
    failures.push(`${iosPrivacyManifest}: UserDefaults required-reason API is not declared`)
  }
  if (!compactPrivacyManifest.includes('<string>CA92.1</string>')) {
    failures.push(`${iosPrivacyManifest}: UserDefaults must declare the app-only reason CA92.1`)
  }
}

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
