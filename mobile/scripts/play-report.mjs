#!/usr/bin/env node
/**
 * Post-launch monitor: crash/ANR rates and recent reviews.
 *
 *   PLAY_SERVICE_ACCOUNT_JSON=/path/to/key.json node scripts/play-report.mjs
 *   PLAY_SERVICE_ACCOUNT_JSON=... node scripts/play-report.mjs --days 14
 *
 * Vitals needs the Google Play Developer Reporting API enabled in the same
 * Cloud project as the service account:
 *   https://console.developers.google.com/apis/api/playdeveloperreporting.googleapis.com/overview
 * Reviews use the Android Publisher API and work with the existing key.
 *
 * Exit codes: 0 ok, 1 config, 2 auth, 3 API.
 */
import { createSign } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const PACKAGE_NAME = 'com.onoffmypc.android'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REPORTING = 'https://playdeveloperreporting.googleapis.com/v1beta1'
const PUBLISHER = 'https://androidpublisher.googleapis.com/androidpublisher/v3'

function die(message, code = 1) {
  console.error(`error: ${message}`)
  process.exit(code)
}

function loadCredentials() {
  const raw = process.env.PLAY_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!raw) die('set PLAY_SERVICE_ACCOUNT_JSON to the service-account JSON path (or inline JSON)', 1)
  const text = raw.trim().startsWith('{') ? raw : (() => {
    const path = resolve(raw)
    if (!existsSync(path)) die(`credentials file not found: ${path}`, 1)
    return readFileSync(path, 'utf8')
  })()
  let creds
  try { creds = JSON.parse(text) } catch { die('credentials are not valid JSON', 1) }
  if (creds.type !== 'service_account' || !creds.client_email || !creds.private_key) {
    die('credentials are not a service-account key', 1)
  }
  return creds
}

const b64 = (v) => Buffer.from(v).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

async function token(creds, scope) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64(JSON.stringify({
    iss: creds.client_email, scope, aud: TOKEN_URL, iat: now, exp: now + 3600,
  }))
  const signature = b64(createSign('RSA-SHA256').update(`${header}.${claims}`).sign(creds.private_key))
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) die(`could not obtain an access token (${res.status}): ${body.error_description || body.error}`, 2)
  return body.access_token
}

async function req(t, method, url, json) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${t}`, ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  return { status: res.status, body }
}

function dateParts(d) {
  return {
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hours: 0, minutes: 0, seconds: 0, nanos: 0, timeZone: { id: 'UTC' },
  }
}

const args = process.argv.slice(2)
const daysIndex = args.indexOf('--days')
const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : 7
if (!Number.isFinite(days) || days < 1 || days > 90) die('--days must be between 1 and 90', 1)

const creds = loadCredentials()
const reportToken = await token(creds, 'https://www.googleapis.com/auth/playdeveloperreporting')
const end = new Date()
const start = new Date(end.getTime() - days * 86400_000)
const timelineSpec = { aggregationPeriod: 'DAILY', startTime: dateParts(start), endTime: dateParts(end) }

for (const [kind, metrics] of [
  ['crashRate', ['crashRate', 'userPerceivedCrashRate', 'distinctUsers']],
  ['anrRate', ['anrRate', 'userPerceivedAnrRate', 'distinctUsers']],
]) {
  console.log(`\n== ${kind} (${days}d) ==`)
  const meta = await req(reportToken, 'GET', `${REPORTING}/apps/${PACKAGE_NAME}/${kind}MetricSet`)
  if (meta.status !== 200) {
    const message = meta.body?.error?.message ?? JSON.stringify(meta.body)
    console.log(`unavailable (${meta.status}): ${message}`)
    if (/has not been used|disabled/i.test(message)) {
      console.log('enable it: https://console.developers.google.com/apis/api/playdeveloperreporting.googleapis.com/overview')
    }
    continue
  }
  const available = (meta.body.metrics ?? []).map((m) => m.name)
  const chosen = metrics.filter((m) => available.includes(m))
  const query = await req(reportToken, 'POST', `${REPORTING}/apps/${PACKAGE_NAME}/${kind}MetricSet:query`, {
    timelineSpec,
    metrics: chosen.length ? chosen : available.slice(0, 2),
  })
  if (query.status !== 200) {
    console.log(`query failed (${query.status}): ${JSON.stringify(query.body).slice(0, 300)}`)
    continue
  }
  const rows = query.body.rows ?? []
  if (rows.length === 0) {
    console.log('no data yet')
    continue
  }
  for (const row of rows) {
    const values = Object.fromEntries((row.metrics ?? []).map((m) => [
      m.metric,
      m.decimalValue?.value ?? m.int64Value ?? (m.decimalValue?.value === undefined ? null : m.decimalValue.value),
    ]))
    const date = `${row.startTime?.year ?? ''}-${String(row.startTime?.month ?? '').padStart(2, '0')}-${String(row.startTime?.day ?? '').padStart(2, '0')}`
    console.log(` ${date} ${JSON.stringify(values)}`)
  }
}

const publisherToken = await token(creds, 'https://www.googleapis.com/auth/androidpublisher')
console.log(`\n== reviews ==`)
const reviews = await req(publisherToken, 'GET', `${PUBLISHER}/applications/${PACKAGE_NAME}/reviews?maxResults=20`)
if (reviews.status !== 200) {
  console.log(`unavailable (${reviews.status}): ${JSON.stringify(reviews.body).slice(0, 300)}`)
} else {
  const list = reviews.body.reviews ?? []
  console.log(`count: ${list.length}`)
  for (const review of list) {
    const comment = review.comments?.[0]?.userComment
    console.log(`- ${review.authorName ?? 'anonymous'} ${comment?.starRating ?? '?'}★ ${(comment?.text ?? '').slice(0, 120)}`)
  }
}
