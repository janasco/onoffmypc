# onoffmypc-desktop

Linux/Windows companion agent. Runs in the system tray, reports hardware
telemetry (CPU load, RAM, GPU temperature, Wi-Fi signal) and handles
software-side shutdown/restart commands over the same device pairing protocol
the ESP32/ESP8266 firmware already uses.

## Why this exists alongside the firmware relay

The firmware device is wired directly to the PC's power/reset pins because
Wake-on-LAN is unreliable in practice (NIC/BIOS/driver support varies) — it's
the only thing that can power a PC back on from fully off. This agent runs
*inside* the OS, so it can do two things the firmware can't:

- Report real hardware telemetry (CPU/GPU/RAM) — the firmware only has a
  room-temperature/humidity sensor and RSSI, nothing about the PC's internals.
- Ask the OS to shut down or restart cleanly, rather than the firmware's
  physical button-press simulation.

It deliberately **does not implement Power On** — if this process isn't
running, the PC is off, and nothing in-OS can turn it back on. That command
stays the firmware's (or Wake-on-LAN's) job. A `power_on` command sent to a
device paired via this agent is left un-acknowledged; the server's existing
cron expires stale pending commands.

Note also that "Force Off" here is weaker than the firmware's hardware
version: if the OS is hung badly enough to need a force-off, this agent (which
lives inside that same hung OS) usually can't respond either. That's expected,
not a bug — it's the same reason the firmware's physical relay exists.

## Pairing

Reuses the exact handshake the firmware uses
(`onoffmypc-app/src/routes/pair.ts`): create a pending device in the
mobile/web app ("Add device"), which shows a short pairing code. Enter that
code in this agent's tray menu ("Pair this computer…"). The agent redeems the
code once for a `device_id` + token, then connects to
`wss://api.onoffmypc.com/ws/:deviceId` with `X-Device-Token`, exactly like an
ESP32 would.

The pairing token is the only real secret and is stored via Electron's
`safeStorage` (OS keychain-backed encryption), never in plaintext.

## Known limitation: one physical PC, two device rows

Since this agent and a firmware unit each pair independently, a machine with
both installed shows up as two separate devices in the fleet list today
(e.g. "Office PC" and "Office PC (Desktop Agent)"). Merging them into one
fleet entry would need a backend concept of "linked devices" that doesn't
exist yet — that's a deliberate scope cut for this first drop, not an
oversight.

## Layout

- `src/main/index.js` — app entry: tray icon/menu, wiring between pairing,
  relay, telemetry loop, and command handling.
- `src/main/relay.js` — WebSocket client for the device relay protocol
  (telemetry frames out, command pushes in, auto-reconnect with backoff).
- `src/main/telemetry.js` — hardware stat collection via `systeminformation`,
  clamped the same way the server's `sanitizeTelemetry` does.
- `src/main/commands.js` — OS-level shutdown/restart/reset per platform
  (`systemctl` on Linux, `shutdown.exe` on Windows).
- `src/main/pairing.js` / `tokenStore.js` — the pairing handshake and secure
  credential storage.
- `src/main/autostart.js` — start-at-login toggle.
- `src/renderer/` — the one-time pairing window (context-isolated, no Node
  access — see `preload.js`).

## Commands

```
npm install
npm start          # run from source
npm run check       # syntax + unit tests
npm run dist:linux  # AppImage + .deb via electron-builder
npm run dist:windows # NSIS installer via electron-builder
```

## Environment overrides (development/staging)

- `ONOFFMYPC_API_URL` — defaults to `https://api.onoffmypc.com`
- `ONOFFMYPC_WS_URL` — defaults to the API URL with `wss://`
- `ONOFFMYPC_TELEMETRY_INTERVAL_MS` — defaults to `30000`

## Platform support

Linux and Windows only for this first drop, matching the product's initial
target platforms. macOS is not built or tested here.
