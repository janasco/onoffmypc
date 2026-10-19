'use strict'

const { app, safeStorage } = require('electron')
const { readFileSync, writeFileSync, existsSync, unlinkSync } = require('node:fs')
const { join } = require('node:path')

function credentialsPath() {
  return join(app.getPath('userData'), 'credentials.json')
}

// On Linux, safeStorage.isEncryptionAvailable() can return true even when no
// real OS keyring (gnome-keyring/KWallet) is present: Electron silently falls
// back to a "basic_text" backend that provides no real protection, and
// isEncryptionAvailable() only reports whether *some* backend is selected,
// not which one. getSelectedStorageBackend() (Linux-only) reveals the actual
// backend; only a real keyring is trusted. Everything (Windows DPAPI, macOS
// Keychain) is trusted as-is via isEncryptionAvailable() alone.
const TRUSTED_LINUX_BACKENDS = new Set(['gnome_libsecret', 'kwallet', 'kwallet5', 'kwallet6'])

// Pure allowlist check (no Electron dependency), split out so it's directly
// unit-testable: unrecognized/future backend names fail closed, same as
// 'basic_text' and 'unknown' do today.
function isTrustedLinuxBackend(backend) {
  return TRUSTED_LINUX_BACKENDS.has(backend)
}

function currentLinuxBackend() {
  if (typeof safeStorage.getSelectedStorageBackend !== 'function') return 'unknown'
  try {
    return safeStorage.getSelectedStorageBackend()
  } catch {
    return 'unknown'
  }
}

// Throws if this system cannot provide real credential encryption, so a
// pairing token is never written to (or trusted from) disk without it.
function assertTrustworthyStorage() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS-level credential encryption is not available on this system.')
  }
  if (process.platform === 'linux') {
    const backend = currentLinuxBackend()
    if (!isTrustedLinuxBackend(backend)) {
      throw new Error(
        `No trusted OS keyring is available (detected "${backend}"). Install and unlock ` +
        'gnome-keyring or KWallet, then restart OnOffMyPC — pairing credentials are never ' +
        'stored without real OS-level encryption.'
      )
    }
  }
}

// device_id is not secret (it's a UUID used as a path segment). The pairing
// token is the actual credential, so only it goes through safeStorage
// (OS keychain-backed encryption on all three platforms Electron supports).
function save({ deviceId, token, deviceName }) {
  assertTrustworthyStorage()
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
    assertTrustworthyStorage()
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

module.exports = { save, load, clear, assertTrustworthyStorage, isTrustedLinuxBackend }
