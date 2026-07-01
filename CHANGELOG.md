# Changelog

## [Unreleased]

### Added
- Release automation: `tools/release.sh` builds and packages the flashable image, app image, checksums, ESP Web Tools manifest, and release notes; `.github/workflows/release.yml` runs it on a version tag to publish the GitHub Release and update + deploy the web flasher. See `RELEASE.md`.
- Release workflow now verifies the tag's base version matches `FIRMWARE_VERSION` before building (fails fast on a mismatched tag), and supports a pre-release rehearsal path: a hyphenated tag (e.g. `v1.3.0-rc1`) builds and publishes a GitHub pre-release only, skipping the web-flasher update and marketing deploy so the full build + publish path can be exercised without touching production.

## [1.2.0] - 2026-06-30

### Changed
- WiFi reconnection: a provisioned device now retries WiFi indefinitely with exponential backoff (5 → 10 → 20 → 40 → 60 s cap) instead of falling back to the setup AP after a 30 s timeout. A router reboot or temporary outage no longer strands an unattended device in provisioning mode. Provisioning is now entered only on first boot with no stored config or via explicit factory reset (`r` over Serial); reconfiguring for a permanent network change requires a factory reset.

### Fixed
- Build error: `WiFiUdp` is not a type on the current ESP32 Arduino core — corrected to `WiFiUDP`. The firmware now compiles (`pio run -e esp32dev`) and all 12 native unit tests pass.

## [1.1.0] - 2026-06-30

### Added
- `power_off_force` command: holds the power button pin HIGH for 6 seconds to force a hard shutdown (use when normal `power_off` has no effect)
- Simulator: handles `power_off_force` — sets `pc_on = False` and logs "FORCE OFF"

### Fixed
- Captive portal: `WiFi.softAPConfig()` now called **before** `WiFi.softAP()` (correct order per ESP32 SDK docs) to ensure the custom IP is applied before the AP starts accepting clients

## [1.0.2] - 2026-06-30

### Fixed
- Simulator (`tools/simulate_device.py`): updated to send token as `X-Device-Token` header instead of URL query param, matching the firmware change in v1.0.1

## [1.0.1] - 2026-06-30

### Changed
- WebSocket connection no longer puts device token in the URL — token is now sent as `X-Device-Token` request header so it does not appear in server access logs

## [1.0.0] - 2026-06-30

### Added
- WiFi provisioning via captive portal: on first boot (or after factory reset), device creates an AP named `OnOffMyPC-XXXXXX` and serves a setup page at `http://192.168.4.1`
- NVS storage via `Preferences`: SSID, password, device ID, device token, and PC MAC saved to ESP32 flash and survive reboots
- Factory reset: send `r` over Serial to clear NVS config and restart into setup mode
- WiFi timeout (30 s): if STA connection fails, device returns to setup AP for reconfiguration
- Captive portal OS detection: redirects iOS (`/hotspot-detect.html`), Android (`/generate_204`), and Windows (`/ncsi.txt`, `/connecttest.txt`, `/fwlink`) portal checks automatically

### Changed
- Configuration no longer requires editing `config.h` — all credentials entered via browser at `http://192.168.4.1`
- Button press duration hardcoded to 200 ms inline (removed `POWER_BTN_PRESS_MS` define)
- Version string in boot message updated to `v1.0.0`

## [0.2.0] - 2026-06-29

### Added
- `tools/simulate_device.py`: Python WebSocket device simulator for testing without hardware
  - Connects to the live API via `wss://api.onoffmypc.com/ws/:id?token=`
  - Sends telemetry every 5 seconds with sine-wave temperature/humidity drift and random RSSI
  - Handles power_on, power_off, reset commands and sends acks
  - Immediately sends updated telemetry after each command to reflect new PC state
  - Usage: `python3 tools/simulate_device.py DEVICE_ID DEVICE_TOKEN`

### Fixed
- `diagram.json`: corrected Wokwi board type to `wokwi-esp32-devkit-v1`
- `diagram.json`: corrected pin names from `IO4`/`IO2` to `D4`/`D2` format
- `diagram.json`: corrected LED cathode pin from `K` to `C`

## [0.1.0] - 2026-06-29

### Added
- Initial ESP32 firmware (PlatformIO / Arduino framework)
- WiFi connection with auto-reconnect
- Authenticated WebSocket connection to api.onoffmypc.com (`/ws/:deviceId?token=`)
- Telemetry every 5 seconds: PC power state, room temperature, humidity, RSSI
- Command handling: power_on (Wake-on-LAN), power_off (short button press), reset (reset button press)
- Command ack sent back to server after execution
- State machine: WIFI_CONNECTING → WS_CONNECTING → CONNECTED with LED blink patterns
- config.h / config.example.h for user credentials and pin mapping
