#!/usr/bin/env node
/**
 * Upload a signed AAB to Google Play via the Android Publisher API.
 *
 * Replaces the deleted GitHub Actions workflow: there is no CI/CD, so this is
 * run by hand from the repository. No dependencies — Node 18+ only.
 *
 * Credentials: a Google Cloud service-account key with Play release access.
 *   PLAY_SERVICE_ACCOUNT_JSON=/path/to/key.json   (or inline JSON)
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *
 * Usage:
 *   node scripts/publish-play.mjs --dry-run
 *   node scripts/publish-play.mjs --track internal
 *   node scripts/publish-play.mjs --track production --status completed
 *
 * Options:
 *   --aab <path>       default android/app/build/outputs/bundle/release/app-release.aab
 *   --track <name>     internal | alpha | beta | production   (default internal)
 *   --status <s>       draft | completed                      (default draft)
 *   --whatsnew <path>  default distribution/whatsnew/whatsnew-en-US
 *   --notes <text>     override the "What's new" text
 *   --dry-run          authenticate, print the plan, change nothing
 *
 * Exit codes: 0 ok, 1 usage/config, 2 auth, 3 upload, 4 track/commit.
 */

import { createSign } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const PACKAGE_NAME = 'com.onoffmypc.android'
const SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3'
const UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3'

function die(message, code = 1) {
  console.error(`error: ${message}`)
  process.exit(code)
}

function parseArgs(argv) {
  const opts = {
    aab: 'android/app/build/outputs/bundle/release/app-release.aab',
    track: 'internal',
    status: 'draft',
    whatsnew: 'distribution/whatsnew/whatsnew-en-US',
    notes: null,
    dryRun: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    switch (a) {
      case '--aab': opts.aab = argv[++i]; break
      case '--track': opts.track = argv[++i]; break
      case '--status': opts.status = argv[++i]; break
      case '--whatsnew': opts.whatsnew = argv[++i]; break
      case '--notes': opts.notes = argv[++i]; break
      case '--dry-run': opts.dryRun = true; break
      case '-h': case '--help': {
        const src = readFileSync(new URL(import.meta.url), 'utf8')
        const doc = src.slice(src.indexOf('/**') + 3, src.indexOf('*/'))
        console.log(doc.replace(/^ ?\* ?/gm, '').trim())
        process.exit(0)
      }
      default:
        die(`unknown argument: ${a}`, 1)
    }
  }
  if (!['internal', 'alpha', 'beta', 'production'].includes(opts.track)) {
    die(`--track must be internal, alpha, beta or production (got "${opts.track}")`, 1)
  }
  if (!['draft', 'completed'].includes(opts.status)) {
    die(`--status must be draft or completed (got "${opts.status}")`, 1)
  }
  return opts
}

function loadCredentials() {
  const raw = process.env.PLAY_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!raw) {
    die(
      'no credentials. Set PLAY_SERVICE_ACCOUNT_JSON to a service-account key path ' +
      '(or its JSON), or GOOGLE_APPLICATION_CREDENTIALS.\n' +
      '  Play Console -> Setup -> API access -> service account with release permission,\n' +
      '  then Google Cloud -> IAM -> Service accounts -> Keys -> Add key -> JSON.',
      1,
    )
  }
  let text = raw
  if (!raw.trim().startsWith('{')) {
    const path = resolve(raw)
    if (!existsSync(path)) die(`credentials file not found: ${path}`, 1)
    text = readFileSync(path, 'utf8')
  }
  let creds
  try {
    creds = JSON.parse(text)
  } catch {
    die('credentials are not valid JSON', 1)
  }
  if (creds.type !== 'service_account' || !creds.client_email || !creds.private_key) {
    die('credentials are not a service-account key (expected type "service_account")', 1)
  }
  return creds
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function getAccessToken(creds) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: creds.client_email,
    scope: SCOPES.join(' '),
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const signature = base64url(createSign('RSA-SHA256').update(`${header}.${claims}`).sign(creds.private_key))

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    die(`could not obtain an access token (${res.status}): ${body.error_description || body.error || 'unknown'}`, 2)
  }
  return body.access_token
}

async function api(token, method, url, { json, body, contentType } = {}) {
  const headers = { Authorization: `Bearer ${token}` }
  let payload
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(json)
  } else if (body !== undefined) {
    headers['Content-Type'] = contentType || 'application/octet-stream'
    payload = body
  }
  const res = await fetch(url, { method, headers, body: payload })
  const text = await res.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { ok: res.ok, status: res.status, body: parsed }
}

function explain(status, body) {
  const message = body && body.error && body.error.message ? body.error.message : JSON.stringify(body)
  if (status === 401 || status === 403) {
    return `${message}\n  The service account needs release permission in Play Console -> Users and permissions.`
  }
  if (status === 404) {
    return `${message}\n  If the app has never been published, create the first release manually in the Play Console;\n  the API only accepts uploads once the package exists.`
  }
  return message
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const aabPath = resolve(opts.aab)
  if (!existsSync(aabPath)) {
    die(`AAB not found: ${aabPath}\n  Build it first: cd android && ./gradlew :app:bundleRelease`, 1)
  }
  const aab = readFileSync(aabPath)
  const notesPath = resolve(opts.whatsnew)
  const notes = opts.notes || (existsSync(notesPath) ? readFileSync(notesPath, 'utf8').trim() : '')

  const creds = loadCredentials()
  console.log(`== package ${PACKAGE_NAME}`)
  console.log(`== service account ${creds.client_email}`)
  console.log(`== AAB ${aabPath} (${(aab.length / 1024 / 1024).toFixed(1)} MB)`)
  console.log(`== track ${opts.track}, status ${opts.status}`)
  console.log(`== whatsnew ${notes ? notes.split('\n')[0].slice(0, 70) + (notes.length > 70 ? '…' : '') : '(none)'}`)

  const token = await getAccessToken(creds)
  console.log('== authenticated')

  if (opts.dryRun) {
    console.log('== dry run: credentials valid, nothing uploaded')
    return
  }

  const edit = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits`, { json: {} })
  if (!edit.ok) die(`could not open an edit: ${explain(edit.status, edit.body)}`, 3)
  const editId = edit.body.id
  console.log(`== edit ${editId}`)

  const upload = await api(
    token, 'POST',
    `${UPLOAD_API}/applications/${PACKAGE_NAME}/edits/${editId}/bundles?uploadType=media`,
    { body: aab },
  )
  if (!upload.ok) {
    await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
    die(`bundle upload failed: ${explain(upload.status, upload.body)}`, 3)
  }
  const versionCode = String(upload.body.versionCode)
  console.log(`== uploaded, versionCode ${versionCode}`)

  const track = await api(token, 'PUT',
    `${API}/applications/${PACKAGE_NAME}/edits/${editId}/tracks/${opts.track}`,
    {
      json: {
        track: opts.track,
        releases: [{
          versionCodes: [versionCode],
          status: opts.status,
          ...(notes ? { releaseNotes: [{ language: 'en-US', text: notes }] } : {}),
        }],
      },
    })
  if (!track.ok) {
    await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
    die(`could not set the ${opts.track} track: ${explain(track.status, track.body)}`, 4)
  }
  console.log(`== ${opts.track} track set (${opts.status})`)

  const commit = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits/${editId}:commit`)
  if (!commit.ok) die(`commit failed: ${explain(commit.status, commit.body)}`, 4)

  console.log(`
== done
   versionCode: ${versionCode}
   track:       ${opts.track}
   status:      ${opts.status}
   ${opts.status === 'draft'
      ? 'Review and roll out in Play Console (the release is a draft).'
      : 'Submitted. Check Play Console for review status.'}`)
}

main().catch((err) => die(err?.stack || String(err), 1))
