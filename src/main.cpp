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
#if defined(ESP32)
#include <esp_task_wdt.h>
#endif
#include "certs.h"
#include "generated/onoff_design_tokens.h"
#include <onoffprotocol.h>

using namespace websockets;

#define FIRMWARE_VERSION "1.3.7"

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
#define WS_RECONNECT_JITTER_MAX_MS 2500  // stagger reconnects after an outage so 1000s of devices don't pile on at once
#define WS_HEARTBEAT_INTERVAL_MS 30000   // ping cadence — also drives dead-session detection
#define WS_HEARTBEAT_TIMEOUT_MS  90000   // no pong for this long => half-dead session, reconnect
#define TELEMETRY_JITTER_MAX_MS  10000   // randomise first-telemetry phase after (re)connect to de-synchronise clients
#define WATCHDOG_TIMEOUT_MS      30000   // slow-fail loop watchdog, above the worst-case TLS/HTTP blocking path
#define WIFI_ATTEMPT_TIMEOUT_MS 30000   // wait this long for a single connect attempt
#define WIFI_RETRY_MIN_MS        5000   // backoff after a failed attempt (doubles each time)
#define WIFI_RETRY_MAX_MS       60000   // backoff ceiling

// ── Provisioning portal ───────────────────────────────────────────────────────

static const char SETUP_PAGE[] PROGMEM =
R"HTML(<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OnOffMyPC Setup</title>
<style>)HTML"
OMP_SETUP_THEME_CSS
R"HTML(
*{box-sizing:border-box;margin:0;padding:0}
html{color-scheme:dark}
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:linear-gradient(180deg,var(--omp-bg),#101612);
  color:var(--omp-text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.25rem}
.card{background:var(--omp-surface);border:1px solid var(--omp-border);border-radius:16px;padding:2rem;
  width:100%;max-width:430px;box-shadow:0 20px 60px rgba(0,0,0,.28)}
.eyebrow{color:var(--omp-action);font-size:.7rem;font-weight:700;letter-spacing:.09em;
  text-transform:uppercase;margin-bottom:.55rem}
h1{font-size:1.5rem;line-height:1.2;letter-spacing:-.025em;margin-bottom:.5rem}
p{font-size:.925rem;color:var(--omp-muted);margin-bottom:1.5rem;line-height:1.55}
p strong{color:var(--omp-text)}
a{color:var(--omp-link);text-underline-offset:2px}
label{display:block;font-size:.75rem;letter-spacing:.01em;color:var(--omp-muted);
  margin:1rem 0 .35rem;font-weight:650}
input,select{width:100%;min-height:48px;background:var(--omp-bg);border:1px solid var(--omp-border);
  border-radius:10px;color:var(--omp-text);font-size:1rem;padding:.7rem .85rem;outline:none}
input:focus,select:focus{border-color:var(--omp-action);box-shadow:0 0 0 3px rgba(59,130,246,.22)}
input::placeholder{color:var(--omp-muted);opacity:1}
small{display:block;font-size:.75rem;color:var(--omp-muted);margin-top:.35rem;line-height:1.4}
button{margin-top:1.5rem;width:100%;min-height:48px;background:var(--omp-action);color:var(--omp-action-text);
  border:none;border-radius:10px;padding:.7rem 1rem;font-size:.95rem;cursor:pointer;font-weight:700}
button:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid var(--omp-focus);outline-offset:2px}
button:disabled{opacity:.55;cursor:wait}
.row{display:flex;gap:.6rem;align-items:stretch}
.row input{flex:1}
.mini,.reveal{margin-top:0;width:auto;min-width:64px;padding:.55rem .75rem;background:var(--omp-surface-subtle);
  color:var(--omp-text);border:1px solid var(--omp-border);font-weight:650;font-size:.8rem;white-space:nowrap}
.hint{color:var(--omp-link);font-size:.75rem;margin-top:.4rem;line-height:1.4}
.form-error{margin-top:1rem;padding:.75rem;border:1px solid var(--omp-danger);border-radius:10px;
  background:color-mix(in srgb,var(--omp-danger) 12%,var(--omp-bg));color:var(--omp-danger);
  font-size:.8rem;font-weight:650;line-height:1.45}
[hidden]{display:none!important}
details{margin:.9rem 0 0;background:var(--omp-bg);border:1px solid var(--omp-border);border-radius:10px;padding:.75rem}
summary{cursor:pointer;min-height:44px;color:var(--omp-muted);font-size:.8rem;font-weight:650;display:flex;align-items:center}
@media(max-width:420px){body{padding:.75rem}.card{padding:1.4rem}.row{gap:.4rem}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style>
</head>
<body>
<div class="card">
<div class="eyebrow">Device setup</div>
<h1>OnOffMyPC Setup</h1>
<p>Get your <strong>pairing code</strong> from
<a href="https://app.onoffmypc.com">app.onoffmypc.com</a>
(tap your device → Pairing code), then fill in the form.</p>
<form method="POST" action="/save" id="setup-form" autocomplete="off">
<label for="pair">Pairing code</label>
<input name="pair_code" id="pair" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="16" pattern="[A-Za-z0-9-]{4,16}" aria-describedby="pair-help" placeholder="e.g. 7QK2-9F3D" style="text-transform:uppercase;letter-spacing:.05em">
<small id="pair-help">One short code — the device fetches its own credentials. Works once, expires in 15 min.</small>
<label for="ssid">Wi-Fi network</label>
<div class="row">
<input name="ssid" id="ssid" list="nets" required autocomplete="off" maxlength="64" aria-describedby="scanmsg" placeholder="Pick or type your Wi-Fi network">
<button type="button" class="mini" id="rescan" aria-controls="nets scanmsg" onclick="scan()">Scan</button>
</div>
<datalist id="nets"></datalist>
<div class="hint" id="scanmsg" role="status" aria-live="polite" aria-atomic="true">Scanning for networks…</div>
<label for="pass">Wi-Fi password</label>
<div class="row">
<input type="password" name="pass" id="pass" autocomplete="new-password" maxlength="64" placeholder="Leave blank if open">
<button type="button" class="reveal" data-label="Wi-Fi password" aria-controls="pass" aria-label="Show Wi-Fi password" onclick="tog('pass',this)">Show</button>
</div>
<details>
<summary>Advanced: enter Device ID + Token instead</summary>
<label for="device-id">Device ID</label>
<input name="device_id" id="device-id" autocomplete="off" maxlength="64" spellcheck="false" placeholder="Paste from dashboard">
<label for="tok">Device token</label>
<div class="row">
<input type="password" name="device_token" id="tok" autocomplete="off" maxlength="128" placeholder="Paste from dashboard">
<button type="button" class="reveal" data-label="device token" aria-controls="tok" aria-label="Show device token" onclick="tog('tok',this)">Show</button>
</div>
</details>
<label for="pc-mac">PC MAC address <small style="display:inline;text-transform:none">(for Wake-on-LAN)</small></label>
<input name="pc_mac" id="pc-mac" maxlength="17" pattern="([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}" aria-describedby="mac-help" placeholder="AA:BB:CC:DD:EE:FF" autocomplete="off" autocapitalize="characters" spellcheck="false">
<small id="mac-help">Run <strong>ipconfig /all</strong> (Windows) or <strong>ip link</strong> (Linux/Mac)</small>
<label for="setup-pin">Setup PIN</label>
<input name="setup_pin" id="setup-pin" required autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" aria-describedby="pin-help" placeholder="Printed in serial console">
<small id="pin-help">Find the 6-digit PIN in the ESP Web Tools / serial output when provisioning starts.</small>
<div class="form-error" id="form-error" role="alert" tabindex="-1" hidden></div>
<button type="submit">Save &amp; connect</button>
</form>
</div>
<script>
function tog(id,b){var e=document.getElementById(id),show=e.type==='password';
  e.type=show?'text':'password';b.textContent=show?'Hide':'Show';
  b.setAttribute('aria-label',(show?'Hide ':'Show ')+(b.dataset.label||'password'));}
function bars(r){return r>=-55?'▂▄▆█':r>=-65?'▂▄▆ ':r>=-75?'▂▄  ':'▂   ';}
function scan(){var m=document.getElementById('scanmsg'),b=document.getElementById('rescan');
  m.textContent='Scanning for networks…';m.setAttribute('aria-busy','true');b.disabled=true;
  fetch('/scan').then(r=>r.json()).then(list=>{
    var dl=document.getElementById('nets');dl.innerHTML='';
    list.sort((a,c)=>c.rssi-a.rssi);
    var seen={};
    list.forEach(n=>{if(!n.ssid||seen[n.ssid])return;seen[n.ssid]=1;
      var o=document.createElement('option');
      o.value=n.ssid;o.label=bars(n.rssi)+(n.secure?' 🔒':'');dl.appendChild(o);});
    var c=Object.keys(seen).length;
    m.textContent=c?('Found '+c+' network'+(c>1?'s':'')+' — pick from the list or type your own'):'No networks found — type your Wi-Fi network name';
  }).catch(()=>{m.textContent='Scan failed — type your Wi-Fi network name manually';})
   .finally(()=>{m.setAttribute('aria-busy','false');b.disabled=false;});}
function formError(message,field){var e=document.getElementById('form-error');
  e.textContent=message;e.hidden=false;e.focus();if(field){field.setAttribute('aria-invalid','true');
  field.setAttribute('aria-errormessage','form-error');}}
document.getElementById('setup-form').addEventListener('submit',function(event){
  var e=document.getElementById('form-error'),pair=document.getElementById('pair'),
      device=document.getElementById('device-id'),token=document.getElementById('tok');
  e.hidden=true;[pair,device,token].forEach(function(field){field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-errormessage');});
  if(!this.checkValidity()){event.preventDefault();this.reportValidity();return;}
  if(!pair.value.trim()&&(!device.value.trim()||!token.value.trim())){
    event.preventDefault();formError('Enter a pairing code, or enter both the Device ID and device token.',
      !device.value.trim()?device:token);
  }
});
scan();
</script>
</body>
</html>)HTML";

static const char SAVED_PAGE[] PROGMEM =
R"HTML(<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Saved — OnOffMyPC</title>
<style>)HTML"
OMP_SETUP_THEME_CSS
R"HTML(
*{box-sizing:border-box;margin:0;padding:0}
html{color-scheme:dark}
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:linear-gradient(180deg,var(--omp-bg),#101612);
  color:var(--omp-text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.25rem}
.card{background:var(--omp-surface);border:1px solid var(--omp-border);border-radius:16px;padding:2.25rem;
  width:100%;max-width:430px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.28)}
.eyebrow{color:var(--omp-action);font-size:.7rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;margin-bottom:.7rem}
.check{width:48px;height:48px;margin:0 auto 1rem;border-radius:999px;background:var(--omp-success-container);color:var(--omp-success);
  display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700}
h1{font-size:1.5rem;line-height:1.2;letter-spacing:-.025em;margin-bottom:.75rem}
p{font-size:.925rem;color:var(--omp-muted);line-height:1.6}
</style>
</head>
<body>
<div class="card">
<div class="eyebrow">Device setup</div>
<div class="check" aria-hidden="true">&#10003;</div>
<h1>Settings saved</h1>
<p>Device is restarting and connecting to your network.<br><br>
Watch the LED — solid means it's online and ready.</p>
</div>
</body>
</html>)HTML";

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

unsigned long telemetryAt      = 0;   // millis() when the next telemetry is due (jittered after connect)
unsigned long lastLedToggle    = 0;
unsigned long wifiStarted      = 0;
unsigned long wifiRetryAt      = 0;   // when to begin the next attempt (0 = attempt in progress)
uint32_t      wifiAttempts     = 0;   // consecutive failed attempts (for backoff)
unsigned long wsDisconnectedAt = 0;
unsigned long wsReconnectDelayMs = WS_RECONNECT_DELAY_MS;
unsigned long lastWsPingAt      = 0;
unsigned long lastWsPongAt      = 0;
bool          ledState         = false;

// ── Watchdog & GPIO safety ────────────────────────────────────────────────────

// ESP32 task watchdog: trips the hardware reset if the loop task stalls in a
// non-yielding section; delay() feeds it on Arduino cores, and loop() feeds it
// explicitly. No-op on other targets so native tests still compile.
#if defined(ESP32)
void feedWatchdog() { esp_task_wdt_reset(); }
void startWatchdog() {
  esp_task_wdt_init(WATCHDOG_TIMEOUT_MS / 1000, true);
  esp_task_wdt_add(NULL);
}
#else
void feedWatchdog() {}
void startWatchdog() {}
#endif

// The PC power/reset lines must never be left asserted. Re-assert LOW at boot
// (after a watchdog reset the pin state is undefined until setup runs) and
// after every pulse so a stuck HIGH can never look like a held button press.
void forceSafePcPins() {
  digitalWrite(PIN_POWER_BTN, LOW);
  digitalWrite(PIN_RESET_BTN, LOW);
}

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

    if (fieldTooLong(ssid, 64, "Wi-Fi network name") ||
        fieldTooLong(pass, 64, "Wi-Fi password") ||
        fieldTooLong(pair, 16, "Pairing code") ||
        fieldTooLong(devId, 64, "Device ID") ||
        fieldTooLong(token, 128, "Device token") ||
        fieldTooLong(pcMac, 17, "PC MAC") ||
        fieldTooLong(pin, 8, "Setup PIN")) {
      return;
    }

    if (!pcMac.isEmpty() && !validMac(pcMac.c_str())) {
      httpServer.send(400, "text/plain", "PC MAC must be six hex pairs (AA:BB:CC:DD:EE:FF)");
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
      httpServer.send(400, "text/plain", "Enter a pairing code (or Wi-Fi details + Device ID/token)");
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
  if (cfgPcMac.isEmpty() || !validMac(cfgPcMac.c_str())) {
    Serial.println("[wol] no valid MAC configured");
    return;
  }

  uint8_t packet[102];
  if (!buildWoLPacket(cfgPcMac.c_str(), packet, sizeof(packet))) {
    Serial.println("[wol] packet build failed");
    return;
  }

  udp.beginPacket(IPAddress(255, 255, 255, 255), 9);
  udp.write(packet, sizeof(packet));
  udp.endPacket();
  Serial.println("[wol] magic packet sent");
}

// ── PC control ───────────────────────────────────────────────────────────────

void pulsePin(int pin, unsigned long durationMs) {
  digitalWrite(pin, HIGH);
  delay(durationMs);
  forceSafePcPins();
}

// ── Commands ──────────────────────────────────────────────────────────────────

void sendTelemetry();

bool sendWs(const String& msg) {
  bool ok = ws.send(msg);
  if (!ok) Serial.println("[ws] send failed (dropped)");
  return ok;
}

void sendAck(const String& commandId) {
  JsonDocument doc;
  doc["type"]       = "ack";
  doc["command_id"] = commandId;
  String msg;
  serializeJson(doc, msg);
  sendWs(msg);
}

void handleCommand(const String& commandId, const String& type) {
  Serial.printf("[cmd] %s (%s)\n", type.c_str(), commandId.c_str());
  if      (type == "power_on")        { sendWoL(); }
  else if (type == "power_off")       { pulsePin(PIN_POWER_BTN, 200); }
  else if (type == "power_off_force") { pulsePin(PIN_POWER_BTN, 6000); }
  else if (type == "reset")           { pulsePin(PIN_RESET_BTN, 200); }
  else { Serial.printf("[cmd] unknown: %s\n", type.c_str()); return; }
  sendAck(commandId);
  // Reflect the new PC state right away instead of letting the UI wait up to
  // the full telemetry cadence. Reset the periodic phase so the next report
  // isn't a back-to-back duplicate.
  telemetryAt = millis() + TELEMETRY_INTERVAL_MS;
  sendTelemetry();
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

void sendTelemetry() {
  bool  pcOn     = digitalRead(PIN_POWER_SENSE) == HIGH;
  float temp     = dht.readTemperature();
  float humidity = dht.readHumidity();
  int   rssi     = WiFi.RSSI();

#if defined(ESP8266)
  String fw = String(FIRMWARE_VERSION) + "-esp8266";
#else
  String fw = String(FIRMWARE_VERSION) + "-esp32";
#endif

  String msg = buildTelemetryPayload(cfgDeviceId.c_str(), pcOn, temp, humidity,
                                     rssi, fw.c_str()).c_str();
  sendWs(msg);
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
    feedWatchdog();
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
    char commandId[64] = {0};
    char type[32]      = {0};
    if (!parseCommandPayload(msg.data().c_str(), commandId, sizeof(commandId),
                             type, sizeof(type))) return;
    handleCommand(String(commandId), String(type));
  });

  ws.onEvent([](WebsocketsEvent event, String) {
    if (event == WebsocketsEvent::ConnectionOpened) {
      state = CONNECTED;
      digitalWrite(PIN_LED, HIGH);
      forceSafePcPins();
      telemetryAt = millis() + (esp_random() % TELEMETRY_JITTER_MAX_MS);
      lastWsPongAt = millis();
      lastWsPingAt = millis();
      Serial.println("[ws] connected");
    } else if (event == WebsocketsEvent::ConnectionClosed) {
      state = WS_CONNECTING;
      wsDisconnectedAt = millis();
      wsReconnectDelayMs = WS_RECONNECT_DELAY_MS + (esp_random() % (WS_RECONNECT_JITTER_MAX_MS + 1));
      digitalWrite(PIN_LED, LOW);
      Serial.println("[ws] disconnected — will retry");
    } else if (event == WebsocketsEvent::GotPong) {
      lastWsPongAt = millis();
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
  forceSafePcPins();
  digitalWrite(PIN_LED,       LOW);

  startWatchdog();
  feedWatchdog();

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
  feedWatchdog();

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
      if (millis() - wsDisconnectedAt >= wsReconnectDelayMs) {
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
      // Heartbeat: ping periodically; if no pong comes back far beyond the
      // interval the TCP session is likely half-dead (no close frame arrived)
      // — force a clean reconnect instead of silently staying "connected".
      if (millis() - lastWsPingAt >= WS_HEARTBEAT_INTERVAL_MS) {
        ws.ping();
        lastWsPingAt = millis();
      }
      if (millis() - lastWsPongAt >= WS_HEARTBEAT_TIMEOUT_MS) {
        Serial.println("[ws] heartbeat timeout — forcing reconnect");
        ws.close();
        break;
      }
      ws.poll();
      if (millis() >= telemetryAt) {
        sendTelemetry();
        telemetryAt = millis() + TELEMETRY_INTERVAL_MS;
      }
      break;
  }
}
