#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WiFiUdp.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <esp_random.h>
#include "certs.h"

using namespace websockets;

#define FIRMWARE_VERSION "1.3.6"

// ── Pin definitions ───────────────────────────────────────────────────────────
#define PIN_POWER_SENSE 34
#define PIN_POWER_BTN   26
#define PIN_RESET_BTN   27
#define PIN_DHT          4
#define PIN_LED          2

// ── Timing ───────────────────────────────────────────────────────────────────
// 30s telemetry cadence: refreshes last_seen well inside the 90s "online" window
// while writing ~6x fewer D1 rows than the old 5s cadence (~2.9k vs ~17k/day).
#define TELEMETRY_INTERVAL_MS    30000
#define WS_RECONNECT_DELAY_MS    5000
#define WIFI_ATTEMPT_TIMEOUT_MS 30000   // wait this long for a single connect attempt
#define WIFI_RETRY_MIN_MS        5000   // backoff after a failed attempt (doubles each time)
#define WIFI_RETRY_MAX_MS       60000   // backoff ceiling

// ── Provisioning portal ───────────────────────────────────────────────────────

static const char SETUP_PAGE[] PROGMEM = R"HTML(<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OnOffMyPC Setup</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#f0f0f0;
  min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem}
.card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:2rem;
  width:100%;max-width:380px}
h1{font-size:1.2rem;margin-bottom:.25rem}
p{font-size:.85rem;color:#888;margin-bottom:1.5rem;line-height:1.5}
a{color:#3b82f6}
label{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;
  color:#888;margin:.75rem 0 .25rem}
input,select{width:100%;background:#0f0f0f;border:1px solid #2a2a2a;border-radius:6px;
  color:#f0f0f0;font-size:.875rem;padding:.55rem .75rem}
small{display:block;font-size:.7rem;color:#555;margin-top:.25rem}
button{margin-top:1.5rem;width:100%;background:#3b82f6;color:#fff;border:none;
  border-radius:6px;padding:.7rem;font-size:.9rem;cursor:pointer;font-weight:600}
.row{display:flex;gap:.5rem;align-items:stretch}
.row input{flex:1}
.mini{margin-top:0;width:auto;padding:.55rem .7rem;background:#2a2a2a;font-weight:500;
  font-size:.75rem;white-space:nowrap}
.reveal{margin-top:0;width:auto;padding:0 .8rem;background:#2a2a2a;font-weight:500;font-size:.75rem}
.hint{color:#3b82f6;font-size:.7rem;margin-top:.25rem}
</style>
</head>
<body>
<div class="card">
<h1>OnOffMyPC Setup</h1>
<p>Get your <strong>pairing code</strong> from
<a href="https://app.onoffmypc.com">app.onoffmypc.com</a>
(tap your device → Pairing code), then fill in the form.</p>
<form method="POST" action="/save">
<label>Pairing Code</label>
<input name="pair_code" id="pair" autocomplete="off" placeholder="e.g. 7QK2-9F3D" style="text-transform:uppercase;letter-spacing:.05em">
<small>One short code — the device fetches its own credentials. Works once, expires in 15 min.</small>
<label>WiFi Network</label>
<div class="row">
<input name="ssid" id="ssid" list="nets" required autocomplete="off" placeholder="Pick or type your WiFi">
<button type="button" class="mini" id="rescan" onclick="scan()">Scan</button>
</div>
<datalist id="nets"></datalist>
<div class="hint" id="scanmsg">Scanning for networks…</div>
<label>WiFi Password</label>
<div class="row">
<input type="password" name="pass" id="pass" autocomplete="new-password" placeholder="Leave blank if open">
<button type="button" class="reveal" onclick="tog('pass',this)">Show</button>
</div>
<details style="margin:.5rem 0">
<summary style="cursor:pointer;font-size:.75rem;color:#888">Advanced: enter Device ID + Token instead</summary>
<label>Device ID</label>
<input name="device_id" autocomplete="off" placeholder="Paste from dashboard">
<label>Device Token</label>
<div class="row">
<input type="password" name="device_token" id="tok" autocomplete="off" placeholder="Paste from dashboard">
<button type="button" class="reveal" onclick="tog('tok',this)">Show</button>
</div>
</details>
<label>PC MAC Address <small style="display:inline;text-transform:none">(for Wake-on-LAN)</small></label>
<input name="pc_mac" placeholder="AA:BB:CC:DD:EE:FF" autocomplete="off">
<small>Run <strong>ipconfig /all</strong> (Windows) or <strong>ip link</strong> (Linux/Mac)</small>
<label>Setup PIN</label>
<input name="setup_pin" required autocomplete="off" inputmode="numeric" placeholder="Printed in serial console">
<small>Find the 6-digit PIN in the ESP Web Tools / serial output when provisioning starts.</small>
<button type="submit">Save &amp; Connect</button>
</form>
</div>
<script>
function tog(id,b){var e=document.getElementById(id);
  if(e.type==='password'){e.type='text';b.textContent='Hide';}
  else{e.type='password';b.textContent='Show';}}
function bars(r){return r>=-55?'▂▄▆█':r>=-65?'▂▄▆ ':r>=-75?'▂▄  ':'▂   ';}
function scan(){var m=document.getElementById('scanmsg'),b=document.getElementById('rescan');
  m.textContent='Scanning for networks…';b.disabled=true;
  fetch('/scan').then(r=>r.json()).then(list=>{
    var dl=document.getElementById('nets');dl.innerHTML='';
    list.sort((a,c)=>c.rssi-a.rssi);
    var seen={};
    list.forEach(n=>{if(!n.ssid||seen[n.ssid])return;seen[n.ssid]=1;
      var o=document.createElement('option');
      o.value=n.ssid;o.label=bars(n.rssi)+(n.secure?' 🔒':'');dl.appendChild(o);});
    var c=Object.keys(seen).length;
    m.textContent=c?('Found '+c+' network'+(c>1?'s':'')+' — pick from the list or type your own'):'No networks found — type your WiFi name';
  }).catch(()=>{m.textContent='Scan failed — type your WiFi name manually';})
   .finally(()=>{b.disabled=false;});}
scan();
</script>
</body>
</html>)HTML";

static const char SAVED_PAGE[] PROGMEM = R"(<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Saved — OnOffMyPC</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#f0f0f0;
  min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem}
.card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:2rem;
  width:100%;max-width:380px;text-align:center}
h1{font-size:1.25rem;margin-bottom:.75rem;color:#22c55e}
p{font-size:.875rem;color:#888;line-height:1.6}
</style>
</head>
<body>
<div class="card">
<h1>&#10003; Saved</h1>
<p>Device is restarting and connecting to your network.<br><br>
Watch the LED — solid means it's online and ready.</p>
</div>
</body>
</html>)";

// ── Globals ───────────────────────────────────────────────────────────────────

Preferences      prefs;
WebServer        httpServer(80);
DNSServer        dnsServer;
WebsocketsClient ws;
DHT              dht(PIN_DHT, DHT22);
WiFiUDP          udp;

String cfgSsid, cfgPass, cfgDeviceId, cfgDeviceToken, cfgPcMac, cfgPairCode;

enum Mode  { PROVISIONING, NORMAL };
enum State { WIFI_CONNECTING, WS_CONNECTING, CONNECTED };
Mode  mode  = NORMAL;
State state = WIFI_CONNECTING;

unsigned long lastTelemetry    = 0;
unsigned long lastLedToggle    = 0;
unsigned long wifiStarted      = 0;
unsigned long wifiRetryAt      = 0;   // when to begin the next attempt (0 = attempt in progress)
uint32_t      wifiAttempts     = 0;   // consecutive failed attempts (for backoff)
unsigned long wsDisconnectedAt = 0;
bool          ledState         = false;

// ── LED ──────────────────────────────────────────────────────────────────────

void blinkLed(unsigned long intervalMs) {
  if (millis() - lastLedToggle >= intervalMs) {
    ledState = !ledState;
    digitalWrite(PIN_LED, ledState);
    lastLedToggle = millis();
  }
}

// ── Input sanitizing ──────────────────────────────────────────────────────────

// Strip ALL whitespace and control characters. Used for the device ID, token,
// MAC, and PIN — none of which ever contain spaces, but copy/paste into the
// setup portal routinely drags in a trailing newline or stray space that then
// breaks the token hash / device lookup server-side (a silent 401). Hyphens and
// colons are PRESERVED — they're valid in the UUID device ID and the MAC.
static String stripWs(const String& in) {
  String out;
  out.reserve(in.length());
  for (size_t i = 0; i < in.length(); i++) {
    unsigned char c = (unsigned char) in[i];
    if (c <= 0x20 || c == 0x7f) continue;   // space, tab, CR, LF, other controls
    out += (char) c;
  }
  return out;
}

// ── NVS ──────────────────────────────────────────────────────────────────────

bool loadConfig() {
  prefs.begin("onoffmypc", true);
  cfgSsid        = prefs.getString("ssid",         "");
  cfgPass        = prefs.getString("pass",         "");
  cfgDeviceId    = prefs.getString("device_id",    "");
  cfgDeviceToken = prefs.getString("device_token", "");
  cfgPcMac       = prefs.getString("pc_mac",       "");
  cfgPairCode    = prefs.getString("pair_code",    "");
  prefs.end();
  // Defense in depth: clean any config saved by older firmware that didn't
  // sanitize. SSID/password keep internal spaces (both are legal there) and are
  // only end-trimmed; the rest have all whitespace removed.
  cfgSsid.trim();
  cfgPass.trim();
  cfgDeviceId    = stripWs(cfgDeviceId);
  cfgDeviceToken = stripWs(cfgDeviceToken);
  cfgPcMac       = stripWs(cfgPcMac);
  cfgPairCode    = stripWs(cfgPairCode);
  // Provisioned if we have WiFi plus either real credentials or a pairing code
  // still to redeem (the code is exchanged for credentials once WiFi is up).
  const bool haveCreds = cfgDeviceId.length() > 0 && cfgDeviceToken.length() > 0;
  return cfgSsid.length() > 0 && (haveCreds || cfgPairCode.length() > 0);
}

void saveConfig(const String& ssid, const String& pass,
                const String& deviceId, const String& token,
                const String& pcMac) {
  prefs.begin("onoffmypc", false);
  prefs.putString("ssid",         ssid);
  prefs.putString("pass",         pass);
  prefs.putString("device_id",    deviceId);
  prefs.putString("device_token", token);
  prefs.putString("pc_mac",       pcMac);
  prefs.end();
}

// Save a provisioning that uses a pairing code: WiFi + MAC + code, with no
// credentials yet (they're fetched from the server once WiFi connects).
void savePairingConfig(const String& ssid, const String& pass,
                       const String& pairCode, const String& pcMac) {
  prefs.begin("onoffmypc", false);
  prefs.putString("ssid",      ssid);
  prefs.putString("pass",      pass);
  prefs.putString("pair_code", pairCode);
  prefs.putString("pc_mac",    pcMac);
  prefs.remove("device_id");
  prefs.remove("device_token");
  prefs.end();
}

// Persist credentials obtained by redeeming a pairing code, and drop the
// (now spent) code so we don't try to redeem it again.
void saveRedeemedCreds(const String& deviceId, const String& token) {
  prefs.begin("onoffmypc", false);
  prefs.putString("device_id",    deviceId);
  prefs.putString("device_token", token);
  prefs.remove("pair_code");
  prefs.end();
}

void clearConfig() {
  prefs.begin("onoffmypc", false);
  prefs.clear();
  prefs.end();
  Serial.println("[nvs] config cleared");
}

// ── Provisioning helpers ──────────────────────────────────────────────────────

static String randomFromCharset(const char* charset, int len) {
  String out;
  out.reserve(len);
  const size_t n = strlen(charset);
  for (int i = 0; i < len; i++) out += charset[esp_random() % n];
  return out;
}

static bool fieldTooLong(const String& value, size_t maxLen, const char* label) {
  if (value.length() <= maxLen) return false;
  httpServer.send(400, "text/plain", String(label) + " too long");
  return true;
}

// Networks scanned once at boot (in STA mode) and served to the setup page.
// We scan-then-cache so the provisioning AP itself can run in plain AP mode —
// AP+STA made the WPA2 hotspot reject clients on some hardware (1.3.2 regression).
String scanCache = "[]";

static String scanNetworksJson() {
  WiFi.mode(WIFI_STA);
  delay(100);
  int n = WiFi.scanNetworks();
  String json = "[";
  for (int i = 0; i < n; i++) {
    String s = WiFi.SSID(i);
    if (s.isEmpty()) continue;
    s.replace("\\", "\\\\");
    s.replace("\"", "\\\"");
    if (json.length() > 1) json += ",";
    json += "{\"ssid\":\"" + s + "\",\"rssi\":" + String(WiFi.RSSI(i)) +
            ",\"secure\":" + (WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "false" : "true") + "}";
  }
  json += "]";
  WiFi.scanDelete();
  return json;
}

// ── Provisioning mode ─────────────────────────────────────────────────────────

void startProvisioning() {
  mode = PROVISIONING;

  uint8_t mac[6];
  WiFi.macAddress(mac);
  char apSsid[24];
  snprintf(apSsid, sizeof(apSsid), "OnOffMyPC-%02X%02X%02X", mac[3], mac[4], mac[5]);

  // WPA2-protect the provisioning AP with a random per-device password (R26).
  // Generated once from the hardware RNG and kept in NVS so it's stable across
  // reboots; printed on serial (visible in the ESP Web Tools console) for the
  // user to join. A factory reset ('r') clears NVS and regenerates it.
  prefs.begin("onoffmypc", false);
  String apPass = prefs.getString("ap_pass", "");
  if (apPass.length() < 8) {
    apPass = randomFromCharset("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);
    prefs.putString("ap_pass", apPass);
  }
  String setupPin = prefs.getString("setup_pin", "");
  if (setupPin.length() < 6) {
    setupPin = randomFromCharset("0123456789", 6);
    prefs.putString("setup_pin", setupPin);
  }
  prefs.end();

  // Scan networks first (STA), then bring up a plain AP for the portal.
  scanCache = scanNetworksJson();

  IPAddress apIp(192, 168, 4, 1);
  WiFi.mode(WIFI_AP);   // plain AP — reliable WPA2 hotspot
  WiFi.softAPConfig(apIp, apIp, IPAddress(255, 255, 255, 0));
  WiFi.softAP(apSsid, apPass.c_str());

  dnsServer.start(53, "*", apIp);

  // Captive portal redirect for iOS, Android, Windows
  auto captive = []() {
    httpServer.sendHeader("Location", "http://192.168.4.1/");
    httpServer.send(302);
  };
  httpServer.onNotFound(captive);
  httpServer.on("/hotspot-detect.html", HTTP_GET, captive);
  httpServer.on("/generate_204",        HTTP_GET, captive);
  httpServer.on("/fwlink",              HTTP_GET, captive);
  httpServer.on("/connecttest.txt",     HTTP_GET, captive);
  httpServer.on("/ncsi.txt",            HTTP_GET, captive);

  httpServer.on("/", HTTP_GET, []() {
    httpServer.send_P(200, "text/html", SETUP_PAGE);
  });

  // Serve the networks scanned at boot (see scanNetworksJson). The AP stays in
  // plain mode, so we don't rescan live here.
  httpServer.on("/scan", HTTP_GET, []() {
    httpServer.send(200, "application/json", scanCache);
  });

  httpServer.on("/save", HTTP_POST, []() {
    // Sanitize every field. SSID and WiFi password may legitimately contain
    // internal spaces, so they are only end-trimmed; the device ID, token, MAC,
    // and PIN never contain spaces, so all whitespace/control chars are removed
    // (hyphens/colons kept). This kills the "pasted a trailing newline" 401.
    String ssid  = httpServer.arg("ssid");         ssid.trim();
    String pass  = httpServer.arg("pass");         pass.trim();
    String pair  = stripWs(httpServer.arg("pair_code")); pair.toUpperCase();
    String devId = stripWs(httpServer.arg("device_id"));
    String token = stripWs(httpServer.arg("device_token"));
    String pcMac = stripWs(httpServer.arg("pc_mac"));
    String pin   = stripWs(httpServer.arg("setup_pin"));

    if (fieldTooLong(ssid, 64, "WiFi SSID") ||
        fieldTooLong(pass, 64, "WiFi password") ||
        fieldTooLong(pair, 16, "Pairing code") ||
        fieldTooLong(devId, 64, "Device ID") ||
        fieldTooLong(token, 128, "Device token") ||
        fieldTooLong(pcMac, 17, "PC MAC") ||
        fieldTooLong(pin, 8, "Setup PIN")) {
      return;
    }

    prefs.begin("onoffmypc", true);
    String expectedPin = prefs.getString("setup_pin", "");
    prefs.end();
    if (expectedPin.isEmpty() || pin != expectedPin) {
      httpServer.send(403, "text/plain", "Invalid setup PIN");
      return;
    }

    const bool haveManual = !devId.isEmpty() && !token.isEmpty();
    if (ssid.isEmpty() || (pair.isEmpty() && !haveManual)) {
      httpServer.send(400, "text/plain", "Enter a pairing code (or WiFi + Device ID/Token)");
      return;
    }

    if (haveManual) {
      saveConfig(ssid, pass, devId, token, pcMac);
      Serial.printf("[prov] saved (manual): ssid='%s'  device_id='%s' (%uch)  token=%uch\n",
                    ssid.c_str(), devId.c_str(), devId.length(), token.length());
    } else {
      savePairingConfig(ssid, pass, pair, pcMac);
      Serial.printf("[prov] saved (pairing): ssid='%s'  pair_code='%s'\n", ssid.c_str(), pair.c_str());
    }
    httpServer.send_P(200, "text/html", SAVED_PAGE);
    Serial.println("[prov] config saved — restarting");
    delay(1500);
    ESP.restart();
  });

  httpServer.begin();
  Serial.printf("[prov] AP: %s  password: %s  setup PIN: %s  → http://192.168.4.1\n",
                apSsid, apPass.c_str(), setupPin.c_str());
}

// ── Wake-on-LAN ──────────────────────────────────────────────────────────────

void sendWoL() {
  if (cfgPcMac.isEmpty()) {
    Serial.println("[wol] no MAC configured");
    return;
  }

  uint8_t mac[6];
  sscanf(cfgPcMac.c_str(), "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx",
    &mac[0], &mac[1], &mac[2], &mac[3], &mac[4], &mac[5]);

  uint8_t packet[102];
  memset(packet, 0xFF, 6);
  for (int i = 0; i < 16; i++) memcpy(&packet[6 + i * 6], mac, 6);

  udp.beginPacket(IPAddress(255, 255, 255, 255), 9);
  udp.write(packet, sizeof(packet));
  udp.endPacket();
  Serial.println("[wol] magic packet sent");
}

// ── PC control ───────────────────────────────────────────────────────────────

void pulsePin(int pin, unsigned long durationMs) {
  digitalWrite(pin, HIGH);
  delay(durationMs);
  digitalWrite(pin, LOW);
}

// ── Commands ──────────────────────────────────────────────────────────────────

void sendAck(const String& commandId) {
  JsonDocument doc;
  doc["type"]       = "ack";
  doc["command_id"] = commandId;
  String msg;
  serializeJson(doc, msg);
  ws.send(msg);
}

void handleCommand(const String& commandId, const String& type) {
  Serial.printf("[cmd] %s (%s)\n", type.c_str(), commandId.c_str());
  if      (type == "power_on")        { sendWoL(); }
  else if (type == "power_off")       { pulsePin(PIN_POWER_BTN, 200); }
  else if (type == "power_off_force") { pulsePin(PIN_POWER_BTN, 6000); }
  else if (type == "reset")           { pulsePin(PIN_RESET_BTN, 200); }
  else { Serial.printf("[cmd] unknown: %s\n", type.c_str()); return; }
  sendAck(commandId);
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

void sendTelemetry() {
  float temp     = dht.readTemperature();
  float humidity = dht.readHumidity();
  bool  pcOn     = digitalRead(PIN_POWER_SENSE) == HIGH;
  int   rssi     = WiFi.RSSI();

  JsonDocument doc;
  doc["type"]             = "telemetry";
  doc["device_id"]        = cfgDeviceId;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["pc_on"]            = pcOn;
  doc["rssi"]             = rssi;
  if (!isnan(temp))     doc["room_temp"]     = serialized(String(temp, 1));
  if (!isnan(humidity)) doc["room_humidity"] = serialized(String(humidity, 1));

  String msg;
  serializeJson(doc, msg);
  ws.send(msg);
  Serial.printf("[tel] pc=%s temp=%.1f hum=%.1f rssi=%d\n",
    pcOn ? "ON" : "off", temp, humidity, rssi);
}

// ── WiFi & WebSocket ──────────────────────────────────────────────────────────

// TLS certificate validation (ws.setCACert) rejects the server cert as
// "not yet valid" until the ESP32 clock is set — it powers on at 1970. Sync
// SNTP once WiFi is up so the wss:// handshake can succeed. SNTP keeps running
// in the background, so even if this initial wait times out the clock is set a
// few seconds later and the next WS retry connects.
bool clockSynced = false;
void syncClock() {
  configTime(0, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");
  struct tm ti;
  for (int i = 0; i < 40; i++) {              // up to ~8 s
    if (getLocalTime(&ti, 100) && ti.tm_year > (2020 - 1900)) {
      clockSynced = true;
      Serial.printf("[time] clock synced: %04d-%02d-%02d %02d:%02d:%02d UTC\n",
                    ti.tm_year + 1900, ti.tm_mon + 1, ti.tm_mday,
                    ti.tm_hour, ti.tm_min, ti.tm_sec);
      return;
    }
    delay(200);
  }
  Serial.println("[time] NTP sync timed out — TLS may fail until clock sets");
}

void connectWifi() {
  Serial.printf("[wifi] connecting to %s (attempt %u)\n", cfgSsid.c_str(), wifiAttempts + 1);
  WiFi.mode(WIFI_STA);
  WiFi.begin(cfgSsid.c_str(), cfgPass.c_str());
  wifiStarted = millis();
  wifiRetryAt = 0;
}

// Exchange the stored pairing code for real credentials via POST /pair. Requires
// the clock to be synced first (TLS cert validation). On success it saves the
// device_id + token, clears the spent code, and returns true.
bool redeemPairCode() {
  Serial.printf("[pair] redeeming code %s …\n", cfgPairCode.c_str());
  WiFiClientSecure client;
  client.setCACert(ONOFFMYPC_ROOT_CA);
  HTTPClient https;
  https.setConnectTimeout(8000);
  https.setTimeout(8000);
  if (!https.begin(client, "https://api.onoffmypc.com/pair")) {
    Serial.println("[pair] connection setup failed");
    return false;
  }
  https.addHeader("Content-Type", "application/json");
  int code = https.POST(String("{\"code\":\"") + cfgPairCode + "\"}");
  String resp = https.getString();
  https.end();
  if (code != 200) {
    Serial.printf("[pair] server said HTTP %d: %s\n", code, resp.c_str());
    return false;
  }
  JsonDocument doc;
  if (deserializeJson(doc, resp) != DeserializationError::Ok) {
    Serial.println("[pair] bad JSON response");
    return false;
  }
  const char* devId = doc["device_id"];
  const char* tok   = doc["token"];
  if (!devId || !tok) {
    Serial.println("[pair] response missing device_id/token");
    return false;
  }
  cfgDeviceId    = devId;
  cfgDeviceToken = tok;
  cfgPairCode    = "";
  saveRedeemedCreds(cfgDeviceId, cfgDeviceToken);
  Serial.printf("[pair] success — device_id=%s (%uch)\n", cfgDeviceId.c_str(), cfgDeviceId.length());
  return true;
}

void connectWs() {
  // Validate the server against pinned root CAs (R25) so the device token in the
  // X-Device-Token header can't be captured by a MITM presenting a rogue cert.
  ws.setCACert(ONOFFMYPC_ROOT_CA);

  ws.onMessage([](WebsocketsMessage msg) {
    JsonDocument doc;
    if (deserializeJson(doc, msg.data()) != DeserializationError::Ok) return;
    String commandId = doc["command_id"].as<String>();
    String type      = doc["type"].as<String>();
    if (commandId.length() > 0 && type.length() > 0) handleCommand(commandId, type);
  });

  ws.onEvent([](WebsocketsEvent event, String) {
    if (event == WebsocketsEvent::ConnectionOpened) {
      state = CONNECTED;
      digitalWrite(PIN_LED, HIGH);
      Serial.println("[ws] connected");
    } else if (event == WebsocketsEvent::ConnectionClosed) {
      state = WS_CONNECTING;
      wsDisconnectedAt = millis();
      digitalWrite(PIN_LED, LOW);
      Serial.println("[ws] disconnected — will retry");
    } else if (event == WebsocketsEvent::GotPing) {
      ws.pong();
    }
  });

  ws.addHeader("X-Device-Token", cfgDeviceToken);
  String url = "wss://api.onoffmypc.com/ws/" + cfgDeviceId;
  Serial.printf("[ws] connecting to %s\n", url.c_str());
  ws.connect(url);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\n[boot] OnOffMyPC %s\n", FIRMWARE_VERSION);

  pinMode(PIN_POWER_SENSE, INPUT);
  pinMode(PIN_POWER_BTN,   OUTPUT);
  pinMode(PIN_RESET_BTN,   OUTPUT);
  pinMode(PIN_LED,         OUTPUT);
  digitalWrite(PIN_POWER_BTN, LOW);
  digitalWrite(PIN_RESET_BTN, LOW);
  digitalWrite(PIN_LED,       LOW);

  dht.begin();

  if (loadConfig()) {
    Serial.println("[boot] config loaded");
    connectWifi();
  } else {
    Serial.println("[boot] no config — entering setup mode");
    startProvisioning();
  }
}

// ── Loop ──────────────────────────────────────────────────────────────────────

void loop() {
  // Serial command: send 'r' to factory reset and re-enter setup
  if (Serial.available() && Serial.read() == 'r') {
    clearConfig();
    ESP.restart();
  }

  if (mode == PROVISIONING) {
    blinkLed(200);
    dnsServer.processNextRequest();
    httpServer.handleClient();
    return;
  }

  switch (state) {

    case WIFI_CONNECTING:
      blinkLed(150);

      // Waiting out a backoff delay before the next attempt
      if (wifiRetryAt != 0) {
        if (millis() >= wifiRetryAt) connectWifi();
        break;
      }

      if (WiFi.status() == WL_CONNECTED) {
        wifiAttempts = 0;
        Serial.printf("[wifi] IP: %s\n", WiFi.localIP().toString().c_str());
        // Init the WoL UDP socket now that the network stack is up. Doing this
        // in setup() (before WiFi) trips an lwIP "Invalid mbox" assert and boot-loops.
        udp.begin(9);
        // Set the clock before any TLS handshake (cert validation needs it).
        if (!clockSynced) syncClock();
        // If provisioned with a pairing code, redeem it for real credentials
        // before attempting the WebSocket. Retry with backoff if it fails
        // (e.g. expired code or transient network) rather than spinning on WS.
        if (cfgDeviceId.isEmpty() || cfgDeviceToken.isEmpty()) {
          if (!redeemPairCode()) {
            Serial.println("[pair] will retry in 10s");
            wifiRetryAt = millis() + 10000;
            break;
          }
        }
        state = WS_CONNECTING;
        connectWs();
      } else if (millis() - wifiStarted >= WIFI_ATTEMPT_TIMEOUT_MS) {
        // Attempt timed out. Back off and retry indefinitely — a provisioned
        // device must NEVER fall back to AP setup mode on its own, or a brief
        // network outage (router reboot, ISP blip) would strand an unattended
        // device until someone is physically present to reconfigure it.
        // Reconfiguration for a permanent network change is an explicit factory
        // reset ('r' over serial), not an automatic fallback.
        wifiAttempts++;
        unsigned long backoff = WIFI_RETRY_MIN_MS << (wifiAttempts > 4 ? 4 : wifiAttempts - 1);
        if (backoff > WIFI_RETRY_MAX_MS) backoff = WIFI_RETRY_MAX_MS;
        Serial.printf("[wifi] attempt timed out — retrying in %lus\n", backoff / 1000);
        WiFi.disconnect();
        wifiRetryAt = millis() + backoff;
      }
      break;

    case WS_CONNECTING:
      blinkLed(600);
      if (WiFi.status() != WL_CONNECTED) {
        state = WIFI_CONNECTING;
        connectWifi();
        break;
      }
      if (millis() - wsDisconnectedAt >= WS_RECONNECT_DELAY_MS) {
        wsDisconnectedAt = millis();
        connectWs();
      }
      break;

    case CONNECTED:
      if (WiFi.status() != WL_CONNECTED) {
        state = WIFI_CONNECTING;
        digitalWrite(PIN_LED, LOW);
        connectWifi();
        break;
      }
      ws.poll();
      if (millis() - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
        sendTelemetry();
        lastTelemetry = millis();
      }
      break;
  }
}
