'use strict'

// Same handshake the ESP32 firmware uses (see onoffmypc-app/src/routes/pair.ts):
// the user creates a pending device + short pairing code in the mobile/web app,
// this agent redeems it once for a real device_id + token, then never needs the
// code again — only the token, for the WebSocket relay connection.

async function pairWithCode(apiBaseUrl, code) {
  const res = await fetch(`${apiBaseUrl}/pair`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Pairing failed (HTTP ${res.status})`)
  }

  const body = await res.json()
  if (!body.device_id || !body.token) {
    throw new Error('Pairing response was missing device_id/token.')
  }
  return { deviceId: body.device_id, token: body.token }
}

// Revokes this device's credential server-side (device-token-authenticated
// self-service, see onoffmypc-app/src/routes/deviceSelf.ts) so a locally
// "unpaired" install can never keep acting as this device afterward. Returns
// true only on a confirmed server-side revoke; the caller decides what to do
// (e.g. still clear local state) if this returns false, such as when the
// machine is offline.
async function unpairDevice(apiBaseUrl, deviceId, token) {
  try {
    const res = await fetch(`${apiBaseUrl}/device/${deviceId}/unpair`, {
      method: 'POST',
      headers: { 'X-Device-Token': token },
    })
    return res.ok
  } catch {
    return false
  }
}

module.exports = { pairWithCode, unpairDevice }
