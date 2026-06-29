# Changelog

## [Unreleased]

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
