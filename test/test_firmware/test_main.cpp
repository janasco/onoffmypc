#include <unity.h>
#include <ArduinoJson.h>
#include <string.h>
#include <stdint.h>
#include <stdio.h>
#include "generated/onoff_design_tokens.h"

// ── WoL packet builder (extracted from main.cpp) ──────────────────────────────

static void buildWoLPacket(const char* mac, uint8_t* packet) {
  uint8_t macBytes[6];
  sscanf(mac, "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx",
    &macBytes[0], &macBytes[1], &macBytes[2],
    &macBytes[3], &macBytes[4], &macBytes[5]);
  memset(packet, 0xFF, 6);
  for (int i = 0; i < 16; i++) memcpy(&packet[6 + i * 6], macBytes, 6);
}

// ── Command parser (extracted from main.cpp) ──────────────────────────────────

struct Command {
  char commandId[64];
  char type[32];
  bool valid;
};

static Command parseCommand(const char* json) {
  Command cmd = {};
  JsonDocument doc;
  if (deserializeJson(doc, json) != DeserializationError::Ok) return cmd;
  const char* id   = doc["command_id"];
  const char* type = doc["type"];
  if (!id || !type) return cmd;
  strncpy(cmd.commandId, id,   sizeof(cmd.commandId) - 1);
  strncpy(cmd.type,      type, sizeof(cmd.type) - 1);
  cmd.valid = true;
  return cmd;
}

// ── Telemetry builder (extracted from main.cpp) ───────────────────────────────

static std::string buildTelemetry(const char* deviceId, bool pcOn,
                                   float temp, float humidity, int rssi) {
  JsonDocument doc;
  doc["type"]      = "telemetry";
  doc["device_id"] = deviceId;
  doc["pc_on"]     = pcOn;
  doc["rssi"]      = rssi;
  if (!isnan(temp))     doc["room_temp"]     = temp;
  if (!isnan(humidity)) doc["room_humidity"] = humidity;
  std::string out;
  serializeJson(doc, out);
  return out;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void test_generated_design_tokens() {
  TEST_ASSERT_EQUAL_STRING("#0C100E", OMP_COLOR_BACKGROUND);
  TEST_ASSERT_EQUAL_STRING("#141A16", OMP_COLOR_SURFACE);
  TEST_ASSERT_EQUAL_STRING("#93C5FD", OMP_COLOR_LINK);
  TEST_ASSERT_EQUAL_STRING("#3B82F6", OMP_COLOR_ACTION);
  TEST_ASSERT_EQUAL_STRING("#061225", OMP_COLOR_ACTION_TEXT);
  TEST_ASSERT_EQUAL_STRING("#60A5FA", OMP_COLOR_FOCUS);
  TEST_ASSERT_NOT_NULL(strstr(OMP_SETUP_THEME_CSS, "--omp-bg:"));
  TEST_ASSERT_NOT_NULL(strstr(OMP_SETUP_THEME_CSS, "--omp-action-text:"));
  TEST_ASSERT_NOT_NULL(strstr(OMP_SETUP_THEME_CSS, "--omp-success-container:"));
}

void test_wol_packet_length() {
  uint8_t packet[102];
  buildWoLPacket("AA:BB:CC:DD:EE:FF", packet);
  TEST_ASSERT_EQUAL(102, sizeof(packet));
}

void test_wol_packet_sync_bytes() {
  uint8_t packet[102];
  buildWoLPacket("AA:BB:CC:DD:EE:FF", packet);
  for (int i = 0; i < 6; i++) {
    TEST_ASSERT_EQUAL_HEX8(0xFF, packet[i]);
  }
}

void test_wol_packet_mac_repeated_16_times() {
  uint8_t packet[102];
  uint8_t expected[6] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF};
  buildWoLPacket("AA:BB:CC:DD:EE:FF", packet);
  for (int i = 0; i < 16; i++) {
    TEST_ASSERT_EQUAL_MEMORY(expected, &packet[6 + i * 6], 6);
  }
}

void test_command_parse_power_on() {
  const char* json = "{\"command_id\":\"abc-123\",\"type\":\"power_on\"}";
  Command cmd = parseCommand(json);
  TEST_ASSERT_TRUE(cmd.valid);
  TEST_ASSERT_EQUAL_STRING("abc-123", cmd.commandId);
  TEST_ASSERT_EQUAL_STRING("power_on", cmd.type);
}

void test_command_parse_power_off() {
  const char* json = "{\"command_id\":\"xyz-456\",\"type\":\"power_off\"}";
  Command cmd = parseCommand(json);
  TEST_ASSERT_TRUE(cmd.valid);
  TEST_ASSERT_EQUAL_STRING("power_off", cmd.type);
}

void test_command_parse_reset() {
  const char* json = "{\"command_id\":\"r-789\",\"type\":\"reset\"}";
  Command cmd = parseCommand(json);
  TEST_ASSERT_TRUE(cmd.valid);
  TEST_ASSERT_EQUAL_STRING("reset", cmd.type);
}

void test_command_parse_bad_json() {
  Command cmd = parseCommand("not json at all");
  TEST_ASSERT_FALSE(cmd.valid);
}

void test_command_parse_missing_type() {
  Command cmd = parseCommand("{\"command_id\":\"x\"}");
  TEST_ASSERT_FALSE(cmd.valid);
}

void test_telemetry_pc_on() {
  std::string msg = buildTelemetry("device-1", true, 22.5f, 55.0f, -65);
  JsonDocument doc;
  deserializeJson(doc, msg);
  TEST_ASSERT_EQUAL_STRING("telemetry", doc["type"].as<const char*>());
  TEST_ASSERT_EQUAL_STRING("device-1",  doc["device_id"].as<const char*>());
  TEST_ASSERT_TRUE(doc["pc_on"].as<bool>());
  TEST_ASSERT_EQUAL(-65, doc["rssi"].as<int>());
}

void test_telemetry_pc_off() {
  std::string msg = buildTelemetry("device-1", false, 21.0f, 60.0f, -70);
  JsonDocument doc;
  deserializeJson(doc, msg);
  TEST_ASSERT_FALSE(doc["pc_on"].as<bool>());
}

void test_telemetry_has_temp_humidity() {
  std::string msg = buildTelemetry("device-1", true, 23.5f, 48.0f, -60);
  JsonDocument doc;
  deserializeJson(doc, msg);
  TEST_ASSERT_FLOAT_WITHIN(0.1f, 23.5f, doc["room_temp"].as<float>());
  TEST_ASSERT_FLOAT_WITHIN(0.1f, 48.0f, doc["room_humidity"].as<float>());
}

void test_telemetry_type_field() {
  std::string msg = buildTelemetry("d", true, NAN, NAN, -50);
  JsonDocument doc;
  deserializeJson(doc, msg);
  TEST_ASSERT_EQUAL_STRING("telemetry", doc["type"].as<const char*>());
  TEST_ASSERT_TRUE(doc["room_temp"].isNull());
  TEST_ASSERT_TRUE(doc["room_humidity"].isNull());
}

// ── Entry point ───────────────────────────────────────────────────────────────

int main() {
  UNITY_BEGIN();

  RUN_TEST(test_generated_design_tokens);

  RUN_TEST(test_wol_packet_length);
  RUN_TEST(test_wol_packet_sync_bytes);
  RUN_TEST(test_wol_packet_mac_repeated_16_times);

  RUN_TEST(test_command_parse_power_on);
  RUN_TEST(test_command_parse_power_off);
  RUN_TEST(test_command_parse_reset);
  RUN_TEST(test_command_parse_bad_json);
  RUN_TEST(test_command_parse_missing_type);

  RUN_TEST(test_telemetry_pc_on);
  RUN_TEST(test_telemetry_pc_off);
  RUN_TEST(test_telemetry_has_temp_humidity);
  RUN_TEST(test_telemetry_type_field);

  return UNITY_END();
}
