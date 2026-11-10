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
 *   node scripts/publish-play.mjs --check
 *   node scripts/publish-play.mjs --track internal
 *   node scripts/publish-play.mjs --rollout
 *   node scripts/publish-play.mjs --track production --status completed
 *
 * Options:
 *   --aab <path>       default android/app/build/outputs/bundle/release/app-release.aab
 *   --track <name>     internal | alpha | beta | production   (default internal)
 *   --status <s>       draft | inProgress | halted | completed (default draft)
 *   --fraction <n>     staged rollout fraction for inProgress  (default 0.2)
 *   --countries <csv>  production country codes              (default US)
 *   --whatsnew <path>  default distribution/whatsnew/whatsnew-en-US
 *   --notes <text>     override the "What's new" text
 *   --dry-run          authenticate, print the plan, change nothing
 *   --check            authenticate and open/discard a Play edit (verifies the
 *                      project link and Play permission; no upload, no release)
 *   --tracks           print every track and its releases, change nothing
 *   --upload-screenshots  upload playstore/screenshots/play/*.png as the
 *                      listing's phone screenshots (no-op if any exist unless
 *                      --replace is passed)
 *   --app-sharing      upload the AAB to Internal app sharing and print the link
 *
 * Phone screenshots use the plural image type `phoneScreenshots`; the
 * singular/uppercase spellings are rejected by the API.
 *   --promote <code>   put an already-uploaded versionCode on --track without
 *                      re-uploading (default status draft)
 *   --inspect          print the current listing and image counts, change nothing
 *   --rollout          publish the existing draft on --track (default internal)
 *                      without re-uploading the bundle; status defaults to
 *                      completed, override with --status
 *
 * Exit codes: 0 ok, 1 usage/config, 2 auth, 3 upload, 4 track/commit.
 */

import { createSign } from 'node:crypto'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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
    fraction: 0.2,
    countries: 'US',
    dryRun: false,
    check: false,
    rollout: false,
    inspect: false,
    tracks: false,
    promote: null,
    appSharing: false,
    uploadScreenshots: false,
    replace: false,
  }
  let statusSet = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    switch (a) {
      case '--aab': opts.aab = argv[++i]; break
      case '--track': opts.track = argv[++i]; break
      case '--status': opts.status = argv[++i]; statusSet = true; break
      case '--whatsnew': opts.whatsnew = argv[++i]; break
      case '--notes': opts.notes = argv[++i]; break
      case '--fraction': opts.fraction = Number(argv[++i]); break
      case '--countries': opts.countries = argv[++i]; break
      case '--dry-run': opts.dryRun = true; break
      case '--check': opts.check = true; break
      case '--rollout': opts.rollout = true; break
      case '--inspect': opts.inspect = true; break
      case '--tracks': opts.tracks = true; break
      case '--promote': opts.promote = argv[++i]; break
      case '--app-sharing': opts.appSharing = true; break
      case '--upload-screenshots': opts.uploadScreenshots = true; break
      case '--replace': opts.replace = true; break
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
  if (!['draft', 'inProgress', 'halted', 'completed'].includes(opts.status)) {
    die(`--status must be draft, inProgress, halted or completed (got "${opts.status}")`, 1)
  }
  if (opts.status === 'inProgress' && !(opts.fraction > 0 && opts.fraction < 1)) {
    die(`--fraction must be between 0 and 1 for a staged rollout (got "${opts.fraction}")`, 1)
  }
  if (opts.rollout && !statusSet) opts.status = 'completed'
  return opts
}

function countries(opts) {
  return String(opts.countries || 'US')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
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

/**
 * Commit an edit. Managed publishing (or an in-flight review) rejects the
 * normal commit with "Changes cannot be sent for review automatically"; in that
 * case retry with changesNotSentForReview=true so the edit is saved for manual
 * publishing in the Play Console.
 */
async function commitEdit(token, editId) {
  let result = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits/${editId}:commit`)
  if (result.ok) return result
  const message = String(result.body?.error?.message ?? '')
  if (/sent for review automatically|changesNotSentForReview/i.test(message)) {
    console.log(`== automatic review rejected: ${message}`)
    result = await api(token, 'POST',
      `${API}/applications/${PACKAGE_NAME}/edits/${editId}:commit?changesNotSentForReview=true`)
    if (result.ok) {
      console.log('== committed without sending for review (publish it from the Play Console)')
    }
  }
  return result
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
  const needsAab = !opts.check && !opts.inspect && !opts.tracks && !opts.promote && !opts.uploadScreenshots
  const aabPath = resolve(opts.aab)
  if (needsAab && !existsSync(aabPath)) {
    die(`AAB not found: ${aabPath}\n  Build it first: cd android && ./gradlew :app:bundleRelease`, 1)
  }
  const aab = needsAab ? readFileSync(aabPath) : null
  const notesPath = resolve(opts.whatsnew)
  const notes = opts.notes || (existsSync(notesPath) ? readFileSync(notesPath, 'utf8').trim() : '')

  const creds = loadCredentials()
  console.log(`== package ${PACKAGE_NAME}`)
  console.log(`== service account ${creds.client_email}`)
  if (needsAab) {
    console.log(`== AAB ${aabPath} (${(aab.length / 1024 / 1024).toFixed(1)} MB)`)
    console.log(`== track ${opts.track}, status ${opts.status}`)
    console.log(`== whatsnew ${notes ? notes.split('\n')[0].slice(0, 70) + (notes.length > 70 ? '…' : '') : '(none)'}`)
  }

  const token = await getAccessToken(creds)
  console.log('== authenticated')

  if (opts.dryRun) {
    console.log('== dry run: credentials valid, nothing uploaded')
    return
  }

  if (opts.check) {
    const edit = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits`, { json: {} })
    if (!edit.ok) die(`Play access check failed: ${explain(edit.status, edit.body)}`, 3)
    await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${edit.body.id}`)
    console.log('== access check passed: edit opened and discarded (no upload, no release)')
    return
  }

  if (opts.uploadScreenshots) {
    const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'playstore', 'screenshots', 'play')
    const files = existsSync(dir)
      ? readdirSync(dir).filter((file) => file.toLowerCase().endsWith('.png')).sort()
      : []
    if (files.length === 0) die(`no PNG screenshots in ${dir}`, 1)

    const edit = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits`, { json: {} })
    if (!edit.ok) die(`could not open an edit: ${explain(edit.status, edit.body)}`, 4)
    const editId = edit.body.id

    const existing = await api(token, 'GET',
      `${API}/applications/${PACKAGE_NAME}/edits/${editId}/listings/en-US/phoneScreenshots`)
    const count = existing.ok ? (existing.body.images ?? []).length : 0
    if (count > 0 && !opts.replace) {
      await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
      console.log(`== ${count} phone screenshot(s) already present; pass --replace to overwrite`)
      return
    }
    if (count > 0 && opts.replace) {
      const removed = await api(token, 'DELETE',
        `${API}/applications/${PACKAGE_NAME}/edits/${editId}/listings/en-US/phoneScreenshots`)
      if (!removed.ok) {
        await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
        die(`could not clear existing screenshots: ${explain(removed.status, removed.body)}`, 4)
      }
      console.log(`== cleared ${count} existing phone screenshot(s)`)
    }

    for (const file of files) {
      const bytes = readFileSync(resolve(dir, file))
      const upload = await api(token, 'POST',
        `${UPLOAD_API}/applications/${PACKAGE_NAME}/edits/${editId}/listings/en-US/phoneScreenshots?uploadType=media`,
        { body: bytes, contentType: 'image/png' })
      if (!upload.ok) {
        await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
        die(`screenshot upload failed for ${file}: ${explain(upload.status, upload.body)}`, 3)
      }
      console.log(`== uploaded ${file} (${(bytes.length / 1024).toFixed(0)} KB)`)
    }

    const commit = await commitEdit(token, editId)
    if (!commit.ok) die(`commit failed: ${explain(commit.status, commit.body)}`, 4)
    console.log(`== committed ${files.length} phone screenshot(s)`)
    return
  }

  if (opts.appSharing) {
    const upload = await api(token, 'POST',
      `${UPLOAD_API}/applications/internalappsharing/${PACKAGE_NAME}/artifacts/bundle?uploadType=media`,
      { body: aab, contentType: 'application/octet-stream' })
    if (!upload.ok) die(`internal app sharing upload failed: ${explain(upload.status, upload.body)}`, 3)
    console.log(`
== internal app sharing
   url:    ${upload.body.downloadUrl}
   sha256: ${upload.body.sha256}
   cert:   ${upload.body.certificateFingerprint}`)
    return
  }

  if (opts.tracks) {
    const edit = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits`, { json: {} })
    if (!edit.ok) die(`could not open an edit: ${explain(edit.status, edit.body)}`, 4)
    const editId = edit.body.id
    try {
      const result = await api(token, 'GET', `${API}/applications/${PACKAGE_NAME}/edits/${editId}/tracks`)
      if (!result.ok) die(`could not list tracks: ${explain(result.status, result.body)}`, 4)
      const tracks = result.body.tracks ?? []
      if (tracks.length === 0) console.log('== no tracks')
      for (const track of tracks) {
        console.log(`== ${track.track}`)
        const releases = track.releases ?? []
        if (releases.length === 0) console.log('   (no releases)')
        for (const release of releases) {
          const versions = (release.versionCodes ?? []).join(', ') || '(none)'
          console.log(`   status=${release.status} versionCodes=${versions}${release.name ? ` name=${release.name}` : ''}`)
        }
      }
    } finally {
      await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
    }
    return
  }

  if (opts.inspect) {
    const edit = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits`, { json: {} })
    if (!edit.ok) die(`could not open an edit: ${explain(edit.status, edit.body)}`, 4)
    const editId = edit.body.id
    const language = 'en-US'
    try {
      const listings = await api(token, 'GET', `${API}/applications/${PACKAGE_NAME}/edits/${editId}/listings`)
      const languages = listings.ok ? (listings.body.listings ?? []).map((item) => item.language) : []
      console.log(`== listings: ${languages.length ? languages.join(', ') : '(none)'}`)

      const listing = await api(token, 'GET', `${API}/applications/${PACKAGE_NAME}/edits/${editId}/listings/${language}`)
      if (listing.ok) {
        console.log(`== ${language} title: ${listing.body.title || '(empty)'}`)
        console.log(`== ${language} short: ${listing.body.shortDescription || '(empty)'}`)
        console.log(`== ${language} full:  ${(listing.body.fullDescription || '').length} chars`)
      } else {
        console.log(`== ${language} listing: not set (${listing.status})`)
      }

      for (const [imageType, label] of [
        ['icon', 'icon'],
        ['featureGraphic', 'featureGraphic'],
        ['phoneScreenshots', 'phoneScreenshot'],
      ]) {
        const images = await api(token, 'GET',
          `${API}/applications/${PACKAGE_NAME}/edits/${editId}/listings/${language}/${imageType}`)
        const found = images.ok ? (images.body.images ?? []) : []
        console.log(`== ${label}: ${found.length} image(s)`)
        if (label === 'phoneScreenshot') {
          for (const [index, item] of found.entries()) console.log(`   ${index + 1}: ${item.url}`)
        }
      }
    } finally {
      await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
    }
    return
  }

  if (opts.promote) {
    const versionCode = String(opts.promote)
    if (!/^[0-9]+$/.test(versionCode)) die(`--promote needs a numeric versionCode (got "${versionCode}")`, 1)

    const edit = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits`, { json: {} })
    if (!edit.ok) die(`could not open an edit: ${explain(edit.status, edit.body)}`, 4)
    const editId = edit.body.id

    const current = await api(token, 'GET', `${API}/applications/${PACKAGE_NAME}/edits/${editId}/tracks/${opts.track}`)
    if (!current.ok) {
      await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
      die(`could not read the ${opts.track} track: ${explain(current.status, current.body)}`, 4)
    }

    current.body.releases = [{
      name: versionCode,
      versionCodes: [versionCode],
      status: opts.status,
      ...(opts.status === 'inProgress'
        ? { userFraction: opts.fraction, countryTargeting: { countries: countries(opts), includeRestOfWorld: true } }
        : {}),
      ...(notes ? { releaseNotes: [{ language: 'en-US', text: notes }] } : {}),
    }]

    const put = await api(token, 'PUT',
      `${API}/applications/${PACKAGE_NAME}/edits/${editId}/tracks/${opts.track}`,
      { json: current.body })
    if (!put.ok) {
      await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
      die(`could not promote versionCode ${versionCode} to ${opts.track}: ${explain(put.status, put.body)}`, 4)
    }

    const commit = await commitEdit(token, editId)
    if (!commit.ok) die(`commit failed: ${explain(commit.status, commit.body)}`, 4)

    console.log(`
== promoted
   versionCode: ${versionCode}
   track:       ${opts.track}
   status:      ${opts.status}`)
    return
  }

  if (opts.rollout) {
    const edit = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits`, { json: {} })
    if (!edit.ok) die(`could not open an edit: ${explain(edit.status, edit.body)}`, 4)
    const editId = edit.body.id

    const current = await api(token, 'GET', `${API}/applications/${PACKAGE_NAME}/edits/${editId}/tracks/${opts.track}`)
    if (!current.ok) {
      await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
      die(`could not read the ${opts.track} track: ${explain(current.status, current.body)}`, 4)
    }

    const releases = Array.isArray(current.body.releases) ? current.body.releases : []
    const drafts = releases.filter((release) => release.status === 'draft')
    if (drafts.length === 0) {
      await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
      die(`no draft release exists on the ${opts.track} track to roll out`, 4)
    }

    // A track may hold one completed release plus a newer draft. Completing the
    // draft replaces the old completed release; sending both is rejected with
    // "Only one completed release is allowed".
    const target = drafts[drafts.length - 1]
    target.status = opts.status
    if (opts.status === 'inProgress') {
      target.userFraction = opts.fraction
      target.countryTargeting = { countries: countries(opts), includeRestOfWorld: true }
    }
    if (notes) target.releaseNotes = [{ language: 'en-US', text: notes }]
    current.body.releases = opts.status === 'completed' ? [target] : releases

    const put = await api(token, 'PUT',
      `${API}/applications/${PACKAGE_NAME}/edits/${editId}/tracks/${opts.track}`,
      { json: current.body })
    if (!put.ok) {
      await api(token, 'DELETE', `${API}/applications/${PACKAGE_NAME}/edits/${editId}`)
      die(`could not update the ${opts.track} track: ${explain(put.status, put.body)}`, 4)
    }

    const commit = await api(token, 'POST', `${API}/applications/${PACKAGE_NAME}/edits/${editId}:commit`)
    if (!commit.ok) die(`commit failed: ${explain(commit.status, commit.body)}`, 4)

    const versions = (target.versionCodes ?? []).join(', ')
    console.log(`
== rolled out
   track:       ${opts.track}
   status:      ${opts.status}
   versionCodes: ${versions || '(none)'}`)
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

  const commit = await commitEdit(token, editId)
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
