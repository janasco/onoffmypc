# Changelog

## [1.3.2] - 2026-07-06

### Fixed
- **Device never connected to the server after provisioning (critical).** 1.3.1 turned on TLS certificate validation (`ws.setCACert`) but never set the ESP32 clock, which powers on at 1970 — so certificate validation failed as "not yet valid" and the `wss://api.onoffmypc.com` handshake dropped immediately, looping `[ws] connecting → disconnected`. The firmware now syncs the clock over SNTP (`pool.ntp.org` / Google / Cloudflare) once WiFi is up, before the first TLS handshake. SNTP keeps running, so a slow initial sync self-heals on the next retry.

### Added
- **Setup portal WiFi scan.** The provisioning page now scans for nearby networks (new `/scan` endpoint; the setup AP runs in AP+STA mode) and offers them in a pick-or-type dropdown sorted by signal strength, with a **Scan** button to refresh — no need to type the SSID by hand.
- **Show/Hide toggles** on the WiFi Password and Device Token fields in the setup portal.

## [1.3.1] - 2026-07-06

### Fixed
- **Boot-loop on real hardware (critical).** `udp.begin(9)` ran in `setup()` before the WiFi/TCP-IP stack was initialized, tripping an lwIP assert (`tcpip_send_msg_wait_sem ... Invalid mbox`) that panic-rebooted the device roughly once per second — so it never reached provisioning and no `OnOffMyPC-XXXXXX` setup AP appeared. The WoL UDP socket is now opened after WiFi reaches `WL_CONNECTED` (the only place it is used). Affected 1.2.0 and the unreleased 1.3.0. `FIRMWARE_VERSION` → 1.3.1.

### Added
- Release automation: `tools/release.sh` builds and packages the flashable image, app image, checksums, ESP Web Tools manifest, and release notes; `.github/workflows/release.yml` runs it on a version tag to publish the GitHub Release and update + deploy the web flasher. See `RELEASE.md`.
- Release workflow now verifies the tag's base version matches `FIRMWARE_VERSION` before building (fails fast on a mismatched tag), and supports a pre-release rehearsal path: a hyphenated tag (e.g. `v1.3.0-rc1`) builds and publishes a GitHub pre-release only, skipping the web-flasher update and marketing deploy so the full build + publish path can be exercised without touching production.

### Security
- **TLS certificate validation** on the `wss://api.onoffmypc.com` connection (`FIRMWARE_VERSION` → 1.3.0). Replaced `ws.setInsecure()` (which accepted any certificate) with `ws.setCACert()` pinned to a bundle of the two roots Cloudflare Universal SSL issues from — GTS Root R4 (Google Trust Services) and ISRG Root X1 (Let's Encrypt) — so the `X-Device-Token` header can no longer be captured by a MITM. Both roots are bundled so a routine CA rotation between them doesn't brick fielded devices (`src/certs.h`).
- **Provisioning AP is now WPA2-protected** with a random per-device password generated from the hardware RNG, stored in NVS (stable across reboots, regenerated on factory reset), and printed on serial / the ESP Web Tools console for the user to join. Previously the setup AP was open to anyone in range.

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
