# Changelog

## [Unreleased]

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
