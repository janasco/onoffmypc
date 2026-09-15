#include "onoffprotocol.h"

#include <ArduinoJson.h>

#include <cmath>
#include <cstdio>
#include <cstring>

bool validMac(const std::string& mac) {
  if (mac.size() != 17) return false;
  bool anySet = false;
  for (size_t i = 0; i < 17; i++) {
    char c = mac[i];
    if (i % 3 == 2) {
      if (c != ':') return false;
    } else {
      bool hex = (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f');
      if (!hex) return false;
      if (c != '0') anySet = true;
    }
  }
  return anySet;   // reject the all-zero MAC too (a useless WoL target)
}

bool buildWoLPacket(const std::string& mac, uint8_t* packet, size_t packetSize) {
  if (!validMac(mac)) return false;
  if (packetSize < 102) return false;
  unsigned macBytes[6];
  if (sscanf(mac.c_str(), "%02x:%02x:%02x:%02x:%02x:%02x",
             &macBytes[0], &macBytes[1], &macBytes[2],
             &macBytes[3], &macBytes[4], &macBytes[5]) != 6) {
    return false;
  }
  memset(packet, 0xFF, 6);
  for (int i = 0; i < 16; i++) {
    for (int j = 0; j < 6; j++) packet[6 + i * 6 + j] = (uint8_t) macBytes[j];
  }
  return true;
}

bool parseCommandPayload(const char* json, char* cmdId, size_t cmdIdSize,
                         char* type, size_t typeSize) {
  JsonDocument doc;
  if (!json || deserializeJson(doc, json) != DeserializationError::Ok) return false;
  const char* id = doc["command_id"] | (const char*) nullptr;
  const char* tp = doc["type"] | (const char*) nullptr;
  if (!id || !tp) return false;
  if (strlen(id) >= cmdIdSize || strlen(tp) >= typeSize) return false;
  strcpy(cmdId, id);
  strcpy(type, tp);
  return true;
}

std::string buildTelemetryPayload(const std::string& deviceId, bool pcOn,
                                  float temp, float humidity, int rssi,
                                  const std::string& firmwareVersion) {
  JsonDocument doc;
  doc["type"]             = "telemetry";
  doc["device_id"]        = deviceId;
  doc["pc_on"]            = pcOn;
  doc["rssi"]             = rssi;
  doc["firmware_version"] = firmwareVersion;
  char buf[16];
  if (!std::isnan(temp)) {
    snprintf(buf, sizeof(buf), "%.1f", temp);
    doc["room_temp"] = serialized(buf);
  }
  if (!std::isnan(humidity)) {
    snprintf(buf, sizeof(buf), "%.1f", humidity);
    doc["room_humidity"] = serialized(buf);
  }
  std::string out;
  serializeJson(doc, out);
  return out;
}
std::string jsonEscape(const std::string& in) {
  std::string out;
  out.reserve(in.size() + 8);
  for (unsigned char c : in) {
    switch (c) {
      case '"':  out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\b': out += "\\b";  break;
      case '\f': out += "\\f";  break;
      case '\n': out += "\\n";  break;
      case '\r': out += "\\r";  break;
      case '\t': out += "\\t";  break;
      default:
        if (c < 0x20) {
          char buf[7];
          snprintf(buf, sizeof(buf), "\\u%04x", c);
          out += buf;
        } else {
          out += (char) c;
        }
    }
  }
  return out;
}
