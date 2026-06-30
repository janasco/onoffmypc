# ESP32 Firmware Roadmap

Status as of 2026-06-30. Bugs are marked **[BUG]**, security issues **[SEC]**, missing features **[FEAT]**, and improvements **[IMPROVE]**.

---

## Bugs

- **[BUG]** WiFi connection timeout (30 s) immediately falls back to provisioning mode — if the home network is temporarily down and the device reboots, it enters AP mode and requires the user to reconfigure. Should retry WiFi a configurable number of times before falling back to provisioning.
- **[BUG]** DHT22 read failures silently drop the fields — `isnan()` check omits `room_temp` / `room_humidity` from telemetry. Backend shows `—` with no indication of a sensor fault. Should send `"sensor_error": true` or a failure counter so the dashboard can warn the user.
- **[BUG]** MAC address from the provisioning form is stored as-is with no format validation — malformed MAC strings (wrong separator, wrong length) cause `sendWoL()` to silently parse garbage bytes and send an invalid magic packet.

---

## Security

- **[SEC]** `ws.setInsecure()` disables TLS certificate verification — the WebSocket connection to `wss://api.onoffmypc.com` is encrypted but the device does not verify the server certificate. A MITM can intercept commands. Fix: pin the root CA certificate for `api.onoffmypc.com` using `WiFiClientSecure::setCACert()`.
- **[SEC]** Device token stored in NVS in plaintext — if physical access to the ESP32 is obtained, the token can be read via the serial monitor using a modified firmware or NVS dump tool. Low practical risk for home use.

---

## Missing Features

- **[FEAT]** OTA firmware update — no mechanism to update firmware over-the-air. Users must reflash via USB cable. Implement `ArduinoOTA` or a custom HTTP endpoint for OTA delivery.
- **[FEAT]** Hardware factory-reset button — the only reset path is sending `r` over the serial monitor. Add a long-press on a GPIO button (e.g. BOOT button on most ESP32 dev boards) to trigger factory reset without a computer.
- **[FEAT]** Wi-Fi reconnect with backoff instead of provisioning fallback — exponential backoff with a max retry count before falling back to AP mode.
- **[FEAT]** Multiple PC MAC addresses / Wake-on-LAN targets — currently one MAC per device. Some users have multiple machines on the same network.
- **[FEAT]** Temperature unit preference (Celsius / Fahrenheit) — always reports Celsius; unit preference could be stored in NVS.
- **[FEAT]** Hardware watchdog — no watchdog timer; if the main loop hangs the device locks up until power-cycled. Enable `esp_task_wdt_init()`.
- **[FEAT]** Directed broadcast for WoL — `255.255.255.255` (limited broadcast) may be blocked by some routers. Also send WoL to the subnet directed broadcast address (e.g. `192.168.1.255`) computed from the device's own IP and subnet mask.
- **[FEAT]** NTP time sync — the device has no real-time clock. Timestamps in log output are `millis()`-relative. Syncing NTP would allow accurate local logging.

---

## Improvements

- **[IMPROVE]** Firmware version is now sent in telemetry (`firmware_version` field) so the backend can display it in the admin dashboard. **Implemented in this session.**
- **[IMPROVE]** Boot log references version as `FIRMWARE_VERSION` constant instead of a hardcoded string literal. **Implemented in this session.**
- **[IMPROVE]** Provisioning page has no input validation beyond `required` attribute — adding client-side checks for MAC format and UUID format would reduce misconfiguration errors.
- **[IMPROVE]** `WS_RECONNECT_DELAY_MS` is a fixed 5 s — exponential backoff would be kinder to the server under mass reconnects.
- **[IMPROVE]** LED blink patterns are only two speeds (fast = provisioning, slow = WS reconnecting, solid = connected) — adding a distinct "WiFi connected, WS connecting" pattern would help users diagnose where the connection is stalling.
- **[IMPROVE]** `udp.begin(9)` in `setup()` binds UDP to port 9 permanently. WoL only needs the UDP socket to send, not receive on port 9. Call `udp.begin(0)` (ephemeral port) to avoid holding port 9.
- **[IMPROVE]** No separate firmware release build process — the released `.bin` must be built manually with PlatformIO. Add a GitHub Actions CI workflow that builds and uploads the release binary automatically on a version tag.
