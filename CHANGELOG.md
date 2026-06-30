# Changelog

## [Unreleased]

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
