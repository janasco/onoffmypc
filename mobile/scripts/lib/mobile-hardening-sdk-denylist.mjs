#!/usr/bin/env node
/**
 * Shared Android SDK denylist used by the mobile hardening gate and its test.
 *
 * The gate scans every Gradle build/settings/properties file and version
 * catalog under `android/` (excluding build caches), plus the generated release
 * `sdkDependencies.txt` when it is present. Matching is case-insensitive and
 * uses token boundaries so an artifact such as `adjust-android` is caught
 * without treating words like "adjusting" or "notadjust" as SDK coordinates.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

export const privacySdkTokens = [
  // Google analytics / measurement / ads
  'firebase-analytics',
  'firebase-crashlytics',
  'firebase-performance',
  'firebase-perf',
  'play-services-ads',
  'play-services-ads-identifier',
  'play-services-analytics',
  'play-services-measurement',
  'google-analytics',
  'google-mobile-ads',
  'admob',
  // Attribution / engagement / product analytics
  'adjust',
  'appsflyer',
  'braze',
  'appboy',
  'amplitude',
  'mixpanel',
  'segment',
  'mparticle',
  'tealium',
  'leanplum',
  'clevertap',
  'moengage',
  'countly',
  'fullstory',
  'smartlook',
  'flurry',
  'kochava',
  'io.branch',
  'hianalytics',
  'com.umeng',
  // Crash / performance monitoring
  'sentry',
  'bugsnag',
  'datadog',
  'newrelic',
  'instabug',
  // Push / marketing providers
  'onesignal',
  'airship',
  'urbanairship',
  // Facebook / ad mediation
  'com.facebook',
  'facebook-android-sdk',
  'chartboost',
  'applovin',
  'ironsource',
  'vungle',
  'adcolony',
  'mintegral',
  'pangle',
  'bytedance',
]

export const requiredAndroidSdkSources = [
  'android/build.gradle.kts',
  'android/settings.gradle.kts',
  'android/app/build.gradle.kts',
  'android/shared/model/build.gradle.kts',
  'android/gradle/libs.versions.toml',
]

export const resolvedReleaseSdkFile =
  'android/app/build/outputs/sdk-dependencies/release/sdkDependencies.txt'

const ignoredDirectories = new Set(['build', '.gradle', '.kotlin', '.git'])

function isGradleSource(name) {
  return (
    /^(build|settings)\.gradle(\.kts)?$/.test(name) ||
    name.endsWith('.versions.toml') ||
    name === 'gradle.properties'
  )
}

function discoverGradleSources(androidRoot, current = androidRoot, found = []) {
  if (!existsSync(current)) return found
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue
    const path = join(current, entry.name)
    if (entry.isDirectory()) {
      discoverGradleSources(androidRoot, path, found)
    } else if (entry.isFile() && isGradleSource(entry.name)) {
      found.push(relative(androidRoot, path).split('\\').join('/'))
    }
  }
  return found
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Return every denylisted SDK token present in `source`. */
export function findDeniedSdkTokens(source, tokens = privacySdkTokens) {
  const normalized = source.toLowerCase()
  return tokens.filter((token) => {
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(token.toLowerCase())}([^a-z0-9]|$)`,
    )
    return pattern.test(normalized)
  })
}

/**
 * Scan the Android Gradle sources and the optional resolved release SDK list.
 * Returns `{ files, missing, hits, resolvedScanned }`; callers decide whether
 * missing required files or hits are fatal.
 */
export function scanAndroidSdkSources(root) {
  const androidRoot = join(root, 'android')
  const files = discoverGradleSources(androidRoot)
    .map((file) => `android/${file}`)
    .sort()
  const hits = []

  for (const file of files) {
    const source = readFileSync(join(root, file), 'utf8')
    for (const token of findDeniedSdkTokens(source)) hits.push({ file, token })
  }

  const resolvedPath = join(root, resolvedReleaseSdkFile)
  const resolvedScanned = existsSync(resolvedPath)
  if (resolvedScanned) {
    const source = readFileSync(resolvedPath, 'utf8')
    for (const token of findDeniedSdkTokens(source)) {
      hits.push({ file: resolvedReleaseSdkFile, token })
    }
  }

  const missing = requiredAndroidSdkSources.filter(
    (file) => !existsSync(join(root, file)),
  )

  return { files, missing, hits, resolvedScanned }
}

/**
 * Negative fixture: a Gradle file that declares Adjust must produce an
 * `adjust` hit through the same scanner the gate uses.
 */
export function denylistFixturePasses(root) {
  const fixtureRoot = join(root, 'scripts', 'fixtures', 'denied-sdk')
  const scan = scanAndroidSdkSources(fixtureRoot)
  return scan.hits.some(
    (hit) =>
      hit.token === 'adjust' &&
      hit.file === 'android/app/build.gradle.kts',
  )
}
