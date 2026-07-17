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

module.exports = { pairWithCode }
