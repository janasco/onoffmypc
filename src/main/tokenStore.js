'use strict'

const { app, safeStorage } = require('electron')
const { readFileSync, writeFileSync, existsSync, unlinkSync } = require('node:fs')
const { join } = require('node:path')

function credentialsPath() {
  return join(app.getPath('userData'), 'credentials.json')
}

// device_id is not secret (it's a UUID used as a path segment). The pairing
// token is the actual credential, so only it goes through safeStorage
// (OS keychain-backed encryption on all three platforms Electron supports).
function save({ deviceId, token, deviceName }) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS-level credential encryption is not available on this system.')
  }
  const encryptedToken = safeStorage.encryptString(token).toString('base64')
  writeFileSync(
    credentialsPath(),
    JSON.stringify({ deviceId, deviceName, encryptedToken }, null, 2),
    { mode: 0o600 },
  )
}

function load() {
  const path = credentialsPath()
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    if (!raw.deviceId || !raw.encryptedToken) return null
    const token = safeStorage.decryptString(Buffer.from(raw.encryptedToken, 'base64'))
    return { deviceId: raw.deviceId, deviceName: raw.deviceName ?? null, token }
  } catch {
    return null
  }
}

function clear() {
  const path = credentialsPath()
  if (existsSync(path)) unlinkSync(path)
}

module.exports = { save, load, clear }
