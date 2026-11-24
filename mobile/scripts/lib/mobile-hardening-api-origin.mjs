#!/usr/bin/env node
/**
 * Shared API-origin rules used by the mobile hardening gate and its tests.
 *
 * Android can be pointed at another environment with `-PAPI_BASE_URL` or the
 * `API_BASE_URL` environment variable. `project.findProperty(...)` also reads
 * Gradle property files, so a stray `API_BASE_URL` in `gradle.properties`, a
 * root build script, or an init script could silently change a production
 * build. The checks below only allow the reviewed app-level configuration.
 *
 * iOS uses `API_BASE_URL` in XcodeGen YAML. Duplicate YAML keys are not
 * rejected by every parser, so the gate counts the reviewed production,
 * staging, and Info.plist entries and rejects anything else.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

export const productionApiBaseUrl = 'https://api.onoffmypc.com'
export const stagingApiBaseUrl =
  'https://onoffmypc-api-staging.onoffmypc.workers.dev'
export const iosInfoPlistApiBaseUrl = '$(API_BASE_URL)'

const ignoredDirectories = new Set(['build', '.gradle', '.kotlin', '.git'])

function isGradleConfigurationFile(name) {
  return name === 'gradle.properties' || /\.gradle(\.kts)?$/.test(name)
}

/** Recursively discover Gradle properties, build, settings, and init files. */
export function discoverGradleApiOverrideSources(androidRoot) {
  const found = []
  const walk = (directory) => {
    let entries
    try {
      entries = readdirSync(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (ignoredDirectories.has(entry.name)) continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        walk(path)
      } else if (entry.isFile() && isGradleConfigurationFile(entry.name)) {
        found.push(path)
      }
    }
  }
  walk(androidRoot)
  return found.sort()
}

function codeLines(source, { properties = false } = {}) {
  const lines = source.split(/\r?\n/)
  const result = []
  let inBlockComment = false

  for (let index = 0; index < lines.length; index++) {
    let text = lines[index]
    let trimmed = text.trim()

    if (inBlockComment) {
      const end = trimmed.indexOf('*/')
      if (end === -1) continue
      text = trimmed.slice(end + 2)
      trimmed = text.trim()
      inBlockComment = false
    }
    if (trimmed.startsWith('/*')) {
      const end = trimmed.indexOf('*/')
      if (end === -1) {
        inBlockComment = true
        continue
      }
      text = trimmed.slice(end + 2)
      trimmed = text.trim()
    }
    if (trimmed === '') continue
    if (trimmed.startsWith('#')) continue
    if (properties && trimmed.startsWith('!')) continue
    if (!properties && trimmed.startsWith('//')) continue
    result.push({ line: index + 1, text })
  }
  return result
}

/**
 * Find `API_BASE_URL` in non-app Gradle sources. The caller excludes
 * `android/app/build.gradle.kts`, where the reviewed input is declared.
 */
export function findGradleApiBaseUrlOverrides(files) {
  const hits = []
  for (const { path, source } of files) {
    for (const { line, text } of codeLines(source, {
      properties: path.endsWith('gradle.properties'),
    })) {
      if (text.includes('API_BASE_URL')) {
        hits.push({ path, line, text: text.trim() })
      }
    }
  }
  return hits
}

/** Find an `API_BASE_URL` assignment that uses cleartext HTTP. */
export function findCleartextApiBaseUrlLines(source, { properties = false } = {}) {
  return codeLines(source, { properties }).filter(
    ({ text }) => text.includes('API_BASE_URL') && /http:\/\//i.test(text),
  )
}

/** Parse every YAML key named `API_BASE_URL`, preserving line numbers. */
export function findIosApiBaseUrlEntries(source) {
  const entries = []
  const lines = source.split(/\r?\n/)
  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const match = lines[index].match(
      /^[ \t]*["']?API_BASE_URL["']?[ \t]*:[ \t]*(.*)$/,
    )
    if (!match) continue
    let value = match[1].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    entries.push({ line: index + 1, value })
  }
  return entries
}

/**
 * Require exactly one reviewed production entry, one staging entry, and one
 * Info.plist expansion. Any extra or duplicate `API_BASE_URL` key is rejected.
 */
export function validateIosApiBaseUrlEntries(source) {
  const entries = findIosApiBaseUrlEntries(source)
  const expected = [
    productionApiBaseUrl,
    stagingApiBaseUrl,
    iosInfoPlistApiBaseUrl,
  ]
  const failures = []

  for (const entry of entries) {
    if (!expected.includes(entry.value)) {
      failures.push(
        `unexpected API_BASE_URL entry at line ${entry.line}: ${entry.value}`,
      )
    }
  }
  for (const value of expected) {
    const matching = entries.filter((entry) => entry.value === value)
    if (matching.length === 0) {
      failures.push(`missing API_BASE_URL entry: ${value}`)
    } else if (matching.length > 1) {
      failures.push(
        `duplicate API_BASE_URL entry: ${value} at lines ${matching
          .map((entry) => entry.line)
          .join(', ')}`,
      )
    }
  }

  return { entries, failures }
}
