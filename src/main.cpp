#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <WiFiClientSecure.h>
#include <WiFiUdp.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <DHT.h>

using namespace websockets;

// ── Pin definitions ───────────────────────────────────────────────────────────
#define PIN_POWER_SENSE 34
#define PIN_POWER_BTN   26
#define PIN_RESET_BTN   27
#define PIN_DHT          4
#define PIN_LED          2

// ── Timing ───────────────────────────────────────────────────────────────────
#define TELEMETRY_INTERVAL_MS  5000
#define WS_RECONNECT_DELAY_MS  5000
#define WIFI_TIMEOUT_MS       30000

// ── Provisioning portal ───────────────────────────────────────────────────────

static const char SETUP_PAGE[] PROGMEM = R"(<!DOCTYPE html>
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
input{width:100%;background:#0f0f0f;border:1px solid #2a2a2a;border-radius:6px;
  color:#f0f0f0;font-size:.875rem;padding:.55rem .75rem}
small{display:block;font-size:.7rem;color:#555;margin-top:.25rem}
button{margin-top:1.5rem;width:100%;background:#3b82f6;color:#fff;border:none;
  border-radius:6px;padding:.7rem;font-size:.9rem;cursor:pointer;font-weight:600}
</style>
</head>
<body>
<div class="card">
<h1>OnOffMyPC Setup</h1>
<p>Get your Device ID and Token from
<a href="https://app.onoffmypc.com">app.onoffmypc.com</a>
then fill in the form below.</p>
<form method="POST" action="/save">
<label>WiFi Network Name</label>
<input name="ssid" required autocomplete="off" placeholder="Your WiFi SSID">
<label>WiFi Password</label>
<input type="password" name="pass" autocomplete="new-password" placeholder="Leave blank if open">
<label>Device ID</label>
<input name="device_id" required autocomplete="off" placeholder="Paste from dashboard">
<label>Device Token</label>
<input name="device_token" required autocomplete="off" placeholder="Paste from dashboard">
<label>PC MAC Address <small style="display:inline;text-transform:none">(for Wake-on-LAN)</small></label>
<input name="pc_mac" placeholder="AA:BB:CC:DD:EE:FF" autocomplete="off">
<small>Run <strong>ipconfig /all</strong> (Windows) or <strong>ip link</strong> (Linux/Mac)</small>
<button type="submit">Save &amp; Connect</button>
</form>
</div>
</body>
</html>)";

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
WiFiUdp          udp;

String cfgSsid, cfgPass, cfgDeviceId, cfgDeviceToken, cfgPcMac;

enum Mode  { PROVISIONING, NORMAL };
enum State { WIFI_CONNECTING, WS_CONNECTING, CONNECTED };
Mode  mode  = NORMAL;
State state = WIFI_CONNECTING;

unsigned long lastTelemetry    = 0;
unsigned long lastLedToggle    = 0;
unsigned long wifiStarted      = 0;
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

// ── NVS ──────────────────────────────────────────────────────────────────────

bool loadConfig() {
  prefs.begin("onoffmypc", true);
  cfgSsid        = prefs.getString("ssid",         "");
  cfgPass        = prefs.getString("pass",         "");
  cfgDeviceId    = prefs.getString("device_id",    "");
  cfgDeviceToken = prefs.getString("device_token", "");
  cfgPcMac       = prefs.getString("pc_mac",       "");
  prefs.end();
  return cfgSsid.length() > 0 && cfgDeviceId.length() > 0 && cfgDeviceToken.length() > 0;
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

void clearConfig() {
  prefs.begin("onoffmypc", false);
  prefs.clear();
  prefs.end();
  Serial.println("[nvs] config cleared");
}

// ── Provisioning mode ─────────────────────────────────────────────────────────

void startProvisioning() {
  mode = PROVISIONING;

  uint8_t mac[6];
  WiFi.macAddress(mac);
  char apSsid[24];
  snprintf(apSsid, sizeof(apSsid), "OnOffMyPC-%02X%02X%02X", mac[3], mac[4], mac[5]);

  IPAddress apIp(192, 168, 4, 1);
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(apIp, apIp, IPAddress(255, 255, 255, 0));
  WiFi.softAP(apSsid);

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

  httpServer.on("/save", HTTP_POST, []() {
    String ssid  = httpServer.arg("ssid").substring(0, 64);
    String pass  = httpServer.arg("pass").substring(0, 64);
    String devId = httpServer.arg("device_id").substring(0, 64);
    String token = httpServer.arg("device_token").substring(0, 64);
    String pcMac = httpServer.arg("pc_mac").substring(0, 17);

    if (ssid.isEmpty() || devId.isEmpty() || token.isEmpty()) {
      httpServer.send(400, "text/plain", "Missing required fields");
      return;
    }

    saveConfig(ssid, pass, devId, token, pcMac);
    httpServer.send_P(200, "text/html", SAVED_PAGE);

    Serial.println("[prov] config saved — restarting");
    delay(1500);
    ESP.restart();
  });

  httpServer.begin();
  Serial.printf("[prov] AP: %s  open http://192.168.4.1\n", apSsid);
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
  doc["type"]      = "telemetry";
  doc["device_id"] = cfgDeviceId;
  doc["pc_on"]     = pcOn;
  doc["rssi"]      = rssi;
  if (!isnan(temp))     doc["room_temp"]     = serialized(String(temp, 1));
  if (!isnan(humidity)) doc["room_humidity"] = serialized(String(humidity, 1));

  String msg;
  serializeJson(doc, msg);
  ws.send(msg);
  Serial.printf("[tel] pc=%s temp=%.1f hum=%.1f rssi=%d\n",
    pcOn ? "ON" : "off", temp, humidity, rssi);
}

// ── WiFi & WebSocket ──────────────────────────────────────────────────────────

void connectWifi() {
  Serial.printf("[wifi] connecting to %s\n", cfgSsid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(cfgSsid.c_str(), cfgPass.c_str());
  wifiStarted = millis();
}

void connectWs() {
  ws.setInsecure();

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
  Serial.println("\n[boot] OnOffMyPC v1.1.0");

  pinMode(PIN_POWER_SENSE, INPUT);
  pinMode(PIN_POWER_BTN,   OUTPUT);
  pinMode(PIN_RESET_BTN,   OUTPUT);
  pinMode(PIN_LED,         OUTPUT);
  digitalWrite(PIN_POWER_BTN, LOW);
  digitalWrite(PIN_RESET_BTN, LOW);
  digitalWrite(PIN_LED,       LOW);

  dht.begin();
  udp.begin(9);

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
      if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[wifi] IP: %s\n", WiFi.localIP().toString().c_str());
        state = WS_CONNECTING;
        connectWs();
      } else if (millis() - wifiStarted >= WIFI_TIMEOUT_MS) {
        // Wrong credentials or network gone — let user reconfigure
        Serial.println("[wifi] timeout — returning to setup mode");
        startProvisioning();
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
