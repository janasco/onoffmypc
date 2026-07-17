'use strict'

// Same production API used by the web/Android/iOS clients (see
// onoffmypc-mobile Constants.kt). Overridable for local/staging development.
const API_BASE_URL = process.env.ONOFFMYPC_API_URL || 'https://api.onoffmypc.com'
const WS_BASE_URL = process.env.ONOFFMYPC_WS_URL || API_BASE_URL.replace(/^http/, 'ws')
const TELEMETRY_INTERVAL_MS = Number(process.env.ONOFFMYPC_TELEMETRY_INTERVAL_MS) || 30_000

module.exports = { API_BASE_URL, WS_BASE_URL, TELEMETRY_INTERVAL_MS }
