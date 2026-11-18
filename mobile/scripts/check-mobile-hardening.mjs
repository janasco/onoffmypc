#!/usr/bin/env node
/**
 * Static hardening gate for the Android and iOS clients.
 *
 * This complements the platform builds and unit tests. It intentionally checks
 * source and manifest invariants that are easy to weaken during refactors:
 * backup/transfer, cleartext traffic, exported components, session-cookie
 * origin binding, release logging, credential clipboard previews, screenshot
 * protection, and iOS Keychain accessibility.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

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

const manifest = read('android/app/src/main/AndroidManifest.xml')
const application = manifest.match(/<application\b[^>]*>/)?.[0] ?? ''
for (const attr of [
  'android:allowBackup="false"',
  'android:fullBackupContent="@xml/backup_rules"',
  'android:dataExtractionRules="@xml/data_extraction_rules"',
  'android:networkSecurityConfig="@xml/network_security_config"',
  'android:usesCleartextTraffic="false"',
]) {
  if (!application.includes(attr)) failures.push(`AndroidManifest application is missing ${attr}`)
}

const permissions = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)]
  .map((match) => match[1])
  .sort()
const expectedPermissions = [
  'android.permission.INTERNET',
  'android.permission.POST_NOTIFICATIONS',
].sort()
if (JSON.stringify(permissions) !== JSON.stringify(expectedPermissions)) {
  failures.push(`Android permissions changed: ${permissions.join(', ') || '(none)'}`)
}

const exporters = [...manifest.matchAll(/<(activity|service|receiver|provider)\b([^>]*)>/g)]
  .map((match) => ({ kind: match[1], body: match[2] }))
  .filter(({ body }) => body.includes('android:exported="true"'))
  .map(({ kind, body }) => `${kind}:${body.match(/android:name="([^"]+)"/)?.[1] ?? '?'}`)
  .sort()
const expectedExporters = ['activity:.MainActivity', 'activity:.ui.auth.OAuthRedirectActivity'].sort()
if (JSON.stringify(exporters) !== JSON.stringify(expectedExporters)) {
  failures.push(`unexpected exported Android components: ${exporters.join(', ') || '(none)'}`)
}
if (!/<service\b[^>]*android:name="\.push\.OnOffMessagingService"[^>]*android:exported="false"/s.test(manifest)) {
  // Attribute order is not guaranteed; inspect the service tag explicitly.
  const fcm = [...manifest.matchAll(/<service\b[^>]*>/g)].find((match) => match[0].includes('.push.OnOffMessagingService'))
  if (!fcm || !fcm[0].includes('android:exported="false"')) {
    failures.push('FCM service must be non-exported')
  }
}

requireText('android/app/src/main/res/xml/network_security_config.xml', 'cleartextTrafficPermitted="false"', 'cleartext traffic must be disabled')
requireText('android/app/src/main/res/xml/network_security_config.xml', '<certificates src="system" />', 'custom trust anchors are not allowed')
for (const file of ['android/app/src/main/res/xml/backup_rules.xml', 'android/app/src/main/res/xml/data_extraction_rules.xml']) {
  for (const domain of ['root', 'database', 'sharedpref', 'file', 'external']) {
    requireText(file, `<exclude domain="${domain}" />`, `backup/transfer must exclude ${domain}`)
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
requireText('ios/OnOffMyPC/Networking/Session.swift', 'kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly', 'iOS session must be device-bound')
requireText('ios/OnOffMyPC/Networking/Session.swift', 'kSecAttrSynchronizable as String: false', 'iOS session must not sync')
requireText('ios/OnOffMyPC/Components/TokenReveal.swift', 'options: [.localOnly: true]', 'iOS credential clipboard must be local-only')

if (failures.length > 0) {
  console.error('mobile hardening check failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('mobile hardening check passed')
