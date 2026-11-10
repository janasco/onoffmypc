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

bool parseCommandFrame(const char* json, CommandFrame* out) {
  if (!out) return false;
  *out = CommandFrame{};
  JsonDocument doc;
  if (!json || deserializeJson(doc, json) != DeserializationError::Ok) return false;
  const char* id = doc["command_id"] | (const char*) nullptr;
  const char* tp = doc["type"] | (const char*) nullptr;
  if (!id || !tp) return false;
  if (strlen(id) >= sizeof(out->commandId) || strlen(tp) >= sizeof(out->type)) return false;
  strcpy(out->commandId, id);
  strcpy(out->type, tp);

  uint32_t version = doc["v"] | 1;
  out->version = version >= 2 ? 2 : 1;
  JsonVariant seq = doc["seq"];
  if (seq.is<uint64_t>()) {
    out->hasSeq = true;
    out->seq = seq.as<uint64_t>();
  }
  const char* exp = doc["expires_at"] | (const char*) nullptr;
  if (exp) {
    strncpy(out->expiresAt, exp, sizeof(out->expiresAt) - 1);
    out->hasExpiresAt = out->expiresAt[0] != '\0';
  }
  return true;
}

ReplayDecision decideReplay(uint32_t version, bool hasSeq, uint64_t seq,
                            uint64_t lastSeq, bool idInRing) {
  if (version < 2 || !hasSeq) return ReplayDecision::Execute;
  if (seq > lastSeq) return ReplayDecision::Execute;
  return idInRing ? ReplayDecision::Duplicate : ReplayDecision::StaleSeq;
}

void replayRingInit(ReplayRing* ring) {
  if (!ring) return;
  memset(ring, 0, sizeof(*ring));
}

bool replayRingContains(const ReplayRing* ring, const char* id) {
  if (!ring || !id) return false;
  for (size_t i = 0; i < ring->count && i < kReplayRingSize; i++) {
    if (strncmp(ring->ids[i], id, sizeof(ring->ids[i])) == 0) return true;
  }
  return false;
}

void replayRingPush(ReplayRing* ring, const char* id) {
  if (!ring || !id) return;
  size_t slot;
  if (ring->count < kReplayRingSize) {
    slot = ring->count;
    ring->count++;
  } else {
    slot = ring->next;
  }
  strncpy(ring->ids[slot], id, sizeof(ring->ids[slot]) - 1);
  ring->ids[slot][sizeof(ring->ids[slot]) - 1] = '\0';
  ring->next = (uint8_t)((slot + 1) % kReplayRingSize);
}

std::string buildHelloPayload(const std::string& bootId, uint64_t lastSeq) {
  JsonDocument doc;
  doc["type"]     = "hello";
  doc["v"]        = 2;
  doc["boot_id"]  = bootId;
  doc["last_seq"] = lastSeq;
  JsonArray caps  = doc["capabilities"].to<JsonArray>();
  caps.add("ack_v2");
  caps.add("state_sense");
  std::string out;
  serializeJson(doc, out);
  return out;
}

std::string buildAckPayload(const char* commandId, uint64_t seq, const char* result,
                            const char* reason, int stateBefore, int stateAfter) {
  JsonDocument doc;
  doc["type"]       = "ack";
  doc["v"]          = 2;
  doc["command_id"] = commandId;
  doc["seq"]        = seq;
  doc["result"]     = result ? result : "accepted";
  if (reason && reason[0]) doc["reason"] = reason;
  if (stateBefore >= 0) doc["state_before"] = stateBefore;
  if (stateAfter  >= 0) doc["state_after"]  = stateAfter;
  std::string out;
  serializeJson(doc, out);
  return out;
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
