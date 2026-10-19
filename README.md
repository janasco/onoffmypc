# OnOffMyPC

Open-source remote power control for workstation PCs. An ESP32 (or a desktop
agent) sits between you and your machine's power/reset headers, so you can
power on, power off, reset, sleep, lock, or log out a PC from anywhere.

This repository contains the client and device side of the platform. The
hosted service that brokers commands, handles accounts and billing, and stores
telemetry lives in a separate private repository and is not required to build
or run anything here.

## Components

| Directory | What it is |
|---|---|
| [`firmware/`](firmware/) | ESP32/ESP8266 firmware (PlatformIO, Arduino framework). Drives the power/reset lines, reports telemetry over WSS. |
| [`desktop/`](desktop/) | Electron desktop agent for Linux/Windows. Software-side shutdown/restart/reset plus hardware telemetry, using the same pairing protocol as the firmware. |
| [`mobile/`](mobile/) | Android (Kotlin/Compose) and iOS (SwiftUI) apps. |
| [`web/`](web/) | Next.js web app: marketing pages, dashboard, account, and setup guide. |
| [`design/`](design/) | Cross-platform design tokens and product-state presentation, generated into each consumer. |
| [`release/`](release/) | Public release documentation, security policy, and the firmware config example. |

## How the pieces fit together

A device pairs to your account with a one-time pairing code, then holds a
WebSocket connection to the command relay. When you issue a power action, the
relay claims the command, writes it to the device socket, and records the
device's acknowledgement. Telemetry (power state, temperature, humidity, RSSI,
and optionally CPU/RAM/GPU on the desktop agent) flows back over the same
connection and is aggregated into hourly rollups for history.

## Building

Each component is self-contained; there is no root-level build.

```bash
# Firmware (PlatformIO)
cd firmware
pio run                 # build for ESP32
pio test -e native      # host-side unit tests

# Desktop agent (Electron, Node >= 20)
cd desktop
npm ci
npm run check           # syntax + unit tests
npm start               # run the agent

# Web app (Next.js)
cd web
npm install
npm run check           # lint + typecheck + unit tests
npm run dev

# Android
cd mobile/android
./gradlew :app:assembleDebug
```

The iOS app is generated from `mobile/ios/project.yml` with XcodeGen and
requires macOS.

## Security

See [`release/SECURITY.md`](release/SECURITY.md) for how to report a
vulnerability. Please do not open a public issue for security problems.

Devices control physical power, so two properties matter more than usual and
are treated as design constraints rather than features:

- **A device credential is never trusted without OS-level encryption at rest.**
  The desktop agent refuses to store a pairing token unless a real OS keyring
  (gnome-keyring/KWallet) or platform keystore is available, and fails closed
  on Electron's unencrypted fallback.
- **An acknowledgement is evidence of receipt, not of physical state.** The
  protocol distinguishes requested, queued, delivered, and acknowledged from a
  confirmed change in PC state, and the UI wording follows that distinction.

## License

MIT — see [`firmware/LICENSE`](firmware/LICENSE) and
[`design/LICENSE`](design/LICENSE). Component directories may carry their own
copy.
