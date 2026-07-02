# ESP32 Firmware Roadmap

Status as of 2026-06-30. Tags: **[BUG]** defects, **[SEC]** security, **[FEAT]** missing features, **[IMPROVE]** improvements.

Firmware `1.1.0`. PlatformIO / Arduino framework on `esp32dev`. Connects over WSS to `api.onoffmypc.com`, relays power commands (WoL + momentary button pulses) and pushes telemetry every 5 s. Provisioned via a captive-portal AP (`OnOffMyPC-XXXXXX`) that stores config in NVS.

---

## Bugs & Reliability

- **[BUG] CRITICAL reliability** — ~~In `WIFI_CONNECTING`, after a 30 s timeout the device dropped into AP setup mode, so any WiFi outage longer than 30 s stranded an unattended device.~~ **Fixed 2026-06-30 (fw 1.2.0)** — a provisioned device now retries WiFi indefinitely with exponential backoff (5→10→20→40→60 s cap) and never auto-enters provisioning. Provisioning is reachable only on first boot with no config or via explicit factory reset (`r` over serial). Tradeoff: a permanent SSID change requires a factory reset to reconfigure — acceptable, and noted for the future physical-reset-button feature.
- **[BUG]** ~~`main.cpp` did not compile against the current ESP32 core — `WiFiUdp` is not a type (must be `WiFiUDP`).~~ **Fixed 2026-06-30** — corrected to `WiFiUDP`. Build now succeeds (`pio run -e esp32dev`) and the 12 native unit tests pass.
- **[BUG]** `WS_CONNECTING` never calls `ws.poll()`, and `wsDisconnectedAt` starts at `0`, so the first reconnect timing is off and incoming frames aren't serviced in that state. Reconnection currently leans on the blocking `ws.connect()`.
- **[BUG]** No watchdog timer — if `loop()` stalls (blocking DHT read, WS library hang) the device locks up until power-cycled. Enable and feed the ESP32 task watchdog (`esp_task_wdt_init()`) or a hardware WDT.
- **[BUG]** DHT22 read failures silently drop fields — the `isnan()` check omits `room_temp`/`room_humidity`, so the backend shows `—` with no indication of a sensor fault. Send a `sensor_error` flag or failure counter so the dashboard can warn the user.
- **[BUG]** `ws.send()` return value is ignored for telemetry and acks — failed sends go undetected (no retry, no logging).
- **[BUG]** WoL only broadcasts to `255.255.255.255` (limited broadcast) on port 9 — does not traverse subnets/VLANs and may be dropped by some routers. No directed-broadcast or target-IP option, so WoL silently fails when the PC isn't on the same broadcast domain.
- **[BUG]** MAC parse via `sscanf(...%hhx...)` is not validated — a malformed `pc_mac` produces a garbage magic packet with no error surfaced.
- **[BUG]** Open-loop commands — after `power_on`/`power_off`/`reset` the firmware never confirms `PIN_POWER_SENSE` changed; the UI reports "sent" with no verification the PC responded.
- **[BUG]** `/save` truncates fields with `substring(0, N)` — a token/password longer than the cap is silently truncated, corrupting config with no error to the user.
- **[BUG]** DHT read (~250 ms, blocking) runs every 5 s on the main loop, briefly starving `ws.poll()`.

## Security

- **[SEC]** ~~`ws.setInsecure()` disables TLS certificate validation~~ **Fixed 2026-07-02** — `ws.setCACert()` now pins a bundle of GTS Root R4 + ISRG Root X1 (`src/certs.h`), the two roots Cloudflare Universal SSL issues from, so the `X-Device-Token` can't be MITM'd; bundling both survives a CA rotation without OTA. Compile-verified for `esp32dev`; still needs an on-device connect test.
- **[SEC]** ~~Provisioning AP is **open**~~ **Fixed 2026-07-02** — the setup AP is WPA2-protected with a random per-device password (hardware RNG, stored in NVS, printed on serial / ESP Web Tools console; regenerated on factory reset).
- **[SEC]** Setup credentials (WiFi password, device token) are submitted over plain HTTP on the local AP. Acceptable for a short local-only setup window but should be documented.
- **[SEC]** Device token is stored in NVS in plaintext — with physical access it can be dumped. Low practical risk for home use; note it.

## Missing Features

- **[FEAT]** OTA firmware updates (HTTPS pull or pushed) — today the only update path is a USB reflash, which does not scale to a deployed fleet. Highest-value firmware feature. Implement `ArduinoOTA` or a signed HTTP OTA endpoint.
- **[FEAT]** Physical factory-reset button (long-press, e.g. BOOT/GPIO0) — reset is currently only via the serial `r` command, unusable for non-technical users.
- **[FEAT]** Report power-state changes / command outcome back to the server (close the open loop).
- **[FEAT]** WiFi reconnect with bounded backoff instead of provisioning fallback (see the critical bug above).
- **[FEAT]** Multiple WoL targets and/or stored target IP; directed subnet broadcast (e.g. `192.168.1.255`) computed from the device IP + netmask.
- **[FEAT]** Server-pushed configurable telemetry interval.
- **[FEAT]** Temperature unit preference (°C/°F) stored in NVS.
- **[FEAT]** mDNS hostname for local discovery.
- **[FEAT]** NTP time sync (needed if on-device scheduling is added; also enables accurate local logging).
- **[FEAT]** Persist last-known PC state across reboots.
- **[FEAT]** Brown-out / power-loss detection and reporting.
- **[FEAT]** Optional relay-based hard power cut in addition to momentary button pulses.
- **[FEAT]** Swappable sensor abstraction (DHT22 optional; support BME280 etc.).
- **[FEAT]** Diagnostics in telemetry: boot reason, uptime, free heap.

## Improvements

- **[IMPROVE]** `config.example.h` is stale and misleading — it implies a compile-time config flow (`WIFI_SSID`, `DEVICE_TOKEN`, etc.), but the firmware actually provisions via the captive portal into NVS. Reconcile with reality or remove it.
- **[IMPROVE]** Exponential backoff (with jitter) on WS reconnect instead of a fixed `WS_RECONNECT_DELAY_MS` 5 s, to avoid a thundering herd after a server/network outage.
- **[IMPROVE]** Add jitter to the telemetry interval for the same reason.
- **[IMPROVE]** `udp.begin(9)` permanently binds UDP port 9; WoL only needs to *send*. Use `udp.begin(0)` (ephemeral) so the device doesn't hold port 9.
- **[IMPROVE]** Add a distinct LED pattern for "WiFi connected, WS connecting" (currently fast=provisioning, slow=WS reconnect, solid=connected) and an explicit auth-failure pattern, to help users diagnose where a connection stalls.
- **[IMPROVE]** Provisioning page validation is `required`-only — add client-side MAC-format and UUID-format checks to reduce misconfiguration.
- **[IMPROVE]** Centralize timing/pin/version constants; `FIRMWARE_VERSION` and pins live in `main.cpp` while `config.example.h` duplicates pin defs.
- **[IMPROVE]** Unit tests cover only the WoL/command/telemetry builders. Add tests (or Wokwi simulation) for the WiFi/WS state machine, especially the reconnect/provisioning-fallback logic.
- **[IMPROVE]** No CI release build — the released `.bin` is built manually. Add a GitHub Actions workflow that builds and uploads the binary on a version tag.

## Hardware notes
- **[IMPROVE]** `PIN_POWER_SENSE` (GPIO34) is input-only with no internal pull — correct readings depend entirely on external level-shifting/opto conditioning from the PC power LED. Document the required circuit so builders don't get floating reads.

## Done
- **[IMPROVE]** Firmware version is sent in telemetry (`firmware_version`) so the backend can display it. **Done.**
- **[IMPROVE]** Boot log uses the `FIRMWARE_VERSION` constant instead of a string literal. **Done.**
