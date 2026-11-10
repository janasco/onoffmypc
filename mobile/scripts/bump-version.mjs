#!/usr/bin/env node
/**
 * Bump the Android version for a Play release.
 *
 *   node scripts/bump-version.mjs 0.4.6            # versionCode +1, versionName 0.4.6
 *   node scripts/bump-version.mjs 0.4.6 --dry-run  # print, change nothing
 *
 * versionCode must increase for every Play upload, even a rebuild. The helper
 * edits android/app/build.gradle.kts in place and prints the old/new values.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('usage: node scripts/bump-version.mjs <major.minor.patch> [--dry-run]')
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const file = resolve(here, '..', 'android', 'app', 'build.gradle.kts')
const source = readFileSync(file, 'utf8')

const code = source.match(/versionCode\s*=\s*(\d+)/)
const name = source.match(/versionName\s*=\s*"([^"]+)"/)
if (!code || !name) {
  console.error(`could not find versionCode/versionName in ${file}`)
  process.exit(1)
}

const nextCode = Number(code[1]) + 1
if (nextCode <= 0 || !Number.isSafeInteger(nextCode)) {
  console.error(`invalid current versionCode: ${code[1]}`)
  process.exit(1)
}

const updated = source
  .replace(code[0], `versionCode = ${nextCode}`)
  .replace(name[0], `versionName = "${version}"`)

console.log(`file:        ${file}`)
console.log(`versionCode: ${code[1]} -> ${nextCode}`)
console.log(`versionName: ${name[1]} -> ${version}`)

if (dryRun) {
  console.log('dry run: not written')
} else {
  writeFileSync(file, updated)
  console.log('written')
}
