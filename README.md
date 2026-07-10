# OnOffMyPC — ESP32 firmware

This repository contains the source and release pipeline for the OnOffMyPC
ESP32 device agent. It owns local provisioning, secure pairing, the authenticated
WSS connection, telemetry, Wake-on-LAN, GPIO power/reset pulses, status LED
behavior, and reconnect/recovery behavior.

It is not the cloud API, web dashboard, mobile client, or public artifact
repository. Those are `onoffmypc-app`, `onoffmypc-web`, `onoffmypc-mobile`, and
`onoffmypc-release` respectively.

## Current device contract

- Target: ESP32 DevKit/classic ESP32 via PlatformIO `esp32dev`.
- Provisioning: WPA2 AP and captive portal at `192.168.4.1`; pairing codes are
  redeemed over HTTPS at `/pair`.
- Runtime: `wss://api.onoffmypc.com/ws/{deviceId}` with `X-Device-Token`.
- Telemetry: JSON every 30 seconds with PC state, DHT22 readings, RSSI, and
  firmware version.
- Commands: `power_on`, `power_off`, `power_off_force`, and `reset`.
- Pins: DHT22 GPIO4, LED GPIO2, power sense GPIO34, power GPIO26, reset GPIO27.

Acknowledgements mean the device received/initiated a command; the firmware
does not yet prove that the PC reached the requested state. OTA updates,
device-verified signatures, anti-rollback, and secure-boot policy are not yet
implemented.

## Build and test

```bash
pio run -e esp32dev
pio test -e native
pio check -e esp32dev
```

Native tests do not replace TLS, provisioning, watchdog, GPIO, malformed-frame,
or interrupted-flash tests on a lab board.

## Release

Tags use `fw-vX.Y.Z` and must match `FIRMWARE_VERSION` in `src/main.cpp`.
Stable tags update the public release and web flasher; `-rcN` tags publish a
pre-release without updating the live flasher. Read [RELEASE.md](RELEASE.md)
before tagging.

## Documentation

- [RELEASE.md](RELEASE.md) — build and publication workflow
- [ROADMAP.md](ROADMAP.md) — current backlog and limitations
- [CHANGELOG.md](CHANGELOG.md) — version history
- [docs/SECURITY_ASSESSMENT.md](docs/SECURITY_ASSESSMENT.md) — private assessment link
