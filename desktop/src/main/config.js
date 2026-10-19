'use strict'

const { app } = require('electron')

// Same production API used by the web/Android/iOS clients (see
// onoffmypc-mobile Constants.kt).
const DEFAULT_API_BASE_URL = 'https://api.onoffmypc.com'

function secureOverride(url, scheme) {
  return typeof url === 'string' && new RegExp(`^${scheme}://`).test(url) ? url : null
}

// In a packaged (production) build, only an explicit https/wss override is
// honored — a plaintext http/ws override (or a malformed one) is ignored in
// favor of the real production endpoint, rather than silently sending the
// pairing token and every command over an unencrypted connection to whatever
// host the environment happens to name. Dev runs (`npm start`, unpackaged)
// keep the existing unrestricted override for local/staging development
// against a plain-HTTP backend — pure functions so this policy is directly
// unit-testable without an Electron runtime.
function resolveApiBaseUrl(rawOverride, isPackaged) {
  if (!isPackaged) return rawOverride || DEFAULT_API_BASE_URL
  const secure = secureOverride(rawOverride, 'https')
  if (rawOverride && !secure) {
    console.error(
      'onoffmypc: ignoring insecure or malformed ONOFFMYPC_API_URL override in a packaged build; using the production endpoint'
    )
  }
  return secure || DEFAULT_API_BASE_URL
}

function resolveWsBaseUrl(rawOverride, apiBaseUrl, isPackaged) {
  if (!isPackaged) return rawOverride || apiBaseUrl.replace(/^http/, 'ws')
  const secure = secureOverride(rawOverride, 'wss')
  if (rawOverride && !secure) {
    console.error(
      'onoffmypc: ignoring insecure or malformed ONOFFMYPC_WS_URL override in a packaged build; deriving it from the production endpoint'
    )
  }
  return secure || apiBaseUrl.replace(/^http/, 'ws')
}

const isPackaged = Boolean(app && app.isPackaged)
const API_BASE_URL = resolveApiBaseUrl(process.env.ONOFFMYPC_API_URL, isPackaged)
const WS_BASE_URL = resolveWsBaseUrl(process.env.ONOFFMYPC_WS_URL, API_BASE_URL, isPackaged)
const TELEMETRY_INTERVAL_MS = Number(process.env.ONOFFMYPC_TELEMETRY_INTERVAL_MS) || 30_000

module.exports = {
  API_BASE_URL,
  WS_BASE_URL,
  TELEMETRY_INTERVAL_MS,
  resolveApiBaseUrl,
  resolveWsBaseUrl,
}
