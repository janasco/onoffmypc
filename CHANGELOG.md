# Changelog

## [Unreleased]

### Added
- **PC MAC validation:** a malformed or all-zero MAC is now rejected at save
  time and can never produce a silently broken magic packet.
- **Immediate post-command telemetry:** after a power/reset command, the device
  reports its new state right away instead of making the UI wait up to the full
  telemetry cadence.
- **Loop watchdog:** an ESP32 task watchdog (30 s) now resets the device if the
  main loop stalls, instead of silently going offline. Fed explicitly in the
  main loop and the NTP wait so legitimate blocking paths can't trip it.
- **Safe GPIO defaults:** power/reset output pins are re-asserted LOW at boot,
  on (re)connect, and after every command pulse, so a stray HIGH can never read
  as a held PC power button.

### Changed
- **WS heartbeat:** the device now pings the API every 30 s and treats a
  90 s silence as a half-dead connection, forcing a clean reconnect instead of
  staying silently "connected" after a network partition.
- **Shared protocol lib:** PC MAC validation, WoL packet building, command
  parsing, and telemetry framing moved into `lib/onoffprotocol`, used by both
  the device firmware and the native unit tests — test doubles no longer drift
  from what the device actually ships.
- **Reconnect jitter:** WebSocket reconnect delays are now randomized up to
  +2.5 s so many devices don't reconnect to the API in lockstep after an
  outage.
- **Telemetry phase jitter:** the first telemetry after a (re)connect is
  randomly delayed up to 10 s to de-synchronize clients' report bursts.
- **Checked sends:** telemetry and command acknowledgements now log when the
  WebSocket write fails instead of silently dropping.

## [1.3.7] - 2026-07-19

### Added
- **Chip Architecture Telemetry Suffix:** Appended dynamic `-esp32` or `-esp8266` suffix to the reported firmware version string to enable precise client-side platform labeling.
- Added a dependency-free captive-portal contract check and pull-request CI for
  labeled inputs, touch targets, announced scan state, offline-safe assets,
  generated design tokens, native unit tests, and ESP32 compilation.

### Changed
- Rebuilt the offline provisioning and saved-confirmation pages with generated
  `@onoffmypc/design` 0.1 tokens, clearer setup hierarchy, larger controls,
  visible focus, programmatically associated labels, descriptive password
  reveal controls, announced Wi-Fi scan state, constrained PIN and MAC entry,
  accessible in-page credential validation, readable supporting text, and
  accurate restarting/connecting feedback. The portal remains fully embedded
  with no runtime dependency.

## [1.3.6] - 2026-07-07

### Changed
- Reduced how often the device reports status/sensor data to save bandwidth and battery. Live status is unaffected.

## [1.3.5] - 2026-07-06

### Added
- **One-code setup.** The setup page now accepts a single short **pairing code** (e.g. `7QK2-9F3D`) from your dashboard instead of two long values — the easiest way to set up a device. Manual entry is still available under "Advanced".

## [1.3.4] - 2026-07-06

### Fixed
- Setup would sometimes fail if extra spaces were accidentally included when pasting your details. Entries are now cleaned automatically so setup succeeds.

## [1.3.3] - 2026-07-06

### Fixed
- Fixed an issue where the `OnOffMyPC-XXXXXX` setup network could reject the correct password. Joining the setup network is reliable again, and the setup page still lists nearby Wi-Fi networks to pick from.

## [1.3.2] - 2026-07-06

### Fixed
- Fixed a problem where a freshly set-up device could fail to come online. Devices now connect reliably right after setup.

### Added
- **Wi-Fi picker in setup.** The setup page scans for nearby networks so you can pick yours from a list instead of typing the name.
- **Show/Hide** buttons on the password fields in the setup page.

## [1.3.1] - 2026-07-06

### Fixed
- Fixed a startup problem that could prevent the setup network from appearing on some boards. First-time setup now works reliably.

### Security
- **Encrypted, verified connection to the service.** The device now verifies the server's identity before sending anything, protecting your device credentials in transit.
- **Password-protected setup network.** The `OnOffMyPC-XXXXXX` setup hotspot is now secured with a unique per-device password (shown during setup) instead of being open.

## [1.2.0] - 2026-06-30

### Changed
- **Automatic reconnection.** A configured device now keeps retrying Wi-Fi on its own after a router reboot or brief outage, instead of dropping back into setup mode. To change networks permanently, factory-reset the device (send `r` over the serial console).

## [1.1.0] - 2026-06-30

### Added
- **Force off** command: holds the power button for 6 seconds to force a hard shutdown when a normal power-off has no effect.

### Fixed
- Setup page reliability improvements.

## [1.0.1] - 2026-06-30

### Changed
- Security hardening for how the device authenticates to the service.

## [1.0.0] - 2026-06-30

### Added
- **Browser-based Wi-Fi setup.** On first boot (or after a factory reset) the device creates a `OnOffMyPC-XXXXXX` network and serves a setup page at `http://192.168.4.1` — no software or config files to edit.
- Settings are saved on the device and survive reboots.
- **Factory reset:** send `r` over the serial console to clear settings and restart into setup.
- The setup page opens automatically on iOS, Android, and Windows.

## [0.1.0] - 2026-06-29

### Added
- Initial firmware: Wi-Fi connectivity with auto-reconnect, secure connection to the service, periodic status/sensor reporting (PC power state, temperature, humidity, signal), and power-on / power-off / reset control.
