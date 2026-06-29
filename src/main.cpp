#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiUdp.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "config.h"

using namespace websockets;

// ── Globals ──────────────────────────────────────────────────────────────────

WebsocketsClient ws;
DHT dht(PIN_DHT, DHT22);
WiFiUDP udp;

enum State { WIFI_CONNECTING, WS_CONNECTING, CONNECTED };
State state = WIFI_CONNECTING;

unsigned long lastTelemetry  = 0;
unsigned long lastLedToggle  = 0;
unsigned long wsDisconnectedAt = 0;
bool ledState = false;

// ── LED status patterns ───────────────────────────────────────────────────────

void blinkLed(unsigned long intervalMs) {
  if (millis() - lastLedToggle >= intervalMs) {
    ledState = !ledState;
    digitalWrite(PIN_LED, ledState);
    lastLedToggle = millis();
  }
}

// ── Wake-on-LAN ──────────────────────────────────────────────────────────────

void sendWoL() {
  uint8_t mac[6];
  sscanf(PC_MAC, "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx",
    &mac[0], &mac[1], &mac[2], &mac[3], &mac[4], &mac[5]);

  uint8_t packet[102];
  memset(packet, 0xFF, 6);
  for (int i = 0; i < 16; i++) memcpy(&packet[6 + i * 6], mac, 6);

  udp.beginPacket(IPAddress(255, 255, 255, 255), 9);
  udp.write(packet, sizeof(packet));
  udp.endPacket();
  Serial.println("[cmd] WoL packet sent");
}

// ── PC button control ─────────────────────────────────────────────────────────

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

  if (type == "power_on") {
    sendWoL();
  } else if (type == "power_off") {
    pulsePin(PIN_POWER_BTN, POWER_BTN_PRESS_MS);
  } else if (type == "reset") {
    pulsePin(PIN_RESET_BTN, POWER_BTN_PRESS_MS);
  } else {
    Serial.printf("[cmd] unknown type: %s\n", type.c_str());
    return;
  }

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
  doc["device_id"] = DEVICE_ID;
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

// ── WiFi ─────────────────────────────────────────────────────────────────────

void connectWifi() {
  Serial.printf("[wifi] connecting to %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

void connectWs() {
  ws.setInsecure();  // CF issues valid certs; for stricter validation set a CA cert

  ws.onMessage([](WebsocketsMessage msg) {
    JsonDocument doc;
    if (deserializeJson(doc, msg.data()) != DeserializationError::Ok) {
      Serial.println("[ws] bad JSON");
      return;
    }
    String commandId = doc["command_id"].as<String>();
    String type      = doc["type"].as<String>();
    if (commandId.length() > 0 && type.length() > 0) {
      handleCommand(commandId, type);
    }
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

  String url = "wss://" API_HOST "/ws/" DEVICE_ID "?token=" DEVICE_TOKEN;
  Serial.printf("[ws] connecting to %s\n", url.c_str());
  ws.connect(url);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  Serial.println("\n[boot] OnOffMyPC firmware starting");

  pinMode(PIN_POWER_SENSE, INPUT);
  pinMode(PIN_POWER_BTN,   OUTPUT);
  pinMode(PIN_RESET_BTN,   OUTPUT);
  pinMode(PIN_LED,         OUTPUT);

  digitalWrite(PIN_POWER_BTN, LOW);
  digitalWrite(PIN_RESET_BTN, LOW);
  digitalWrite(PIN_LED,       LOW);

  dht.begin();
  udp.begin(9);

  connectWifi();
}

// ── Loop ──────────────────────────────────────────────────────────────────────

void loop() {
  switch (state) {

    case WIFI_CONNECTING:
      blinkLed(150);
      if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[wifi] connected, IP: %s\n", WiFi.localIP().toString().c_str());
        state = WS_CONNECTING;
        connectWs();
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
