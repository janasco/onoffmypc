#include <unity.h>
#include <ArduinoJson.h>
#include <string.h>
#include <stdint.h>
#include <stdio.h>
#include <string>
#include "generated/onoff_design_tokens.h"
#include <onoffprotocol.h>

// ── Command parser (thin wrapper over the shared lib — struct return makes the
//    tests below clearer; the parsing logic itself is shared with the device) ─

struct Command {
  char commandId[64];
  char type[32];
  bool valid;
};

static Command parseCommand(const char* json) {
  Command cmd = {};
  cmd.valid = parseCommandPayload(json, cmd.commandId, sizeof(cmd.commandId),
                                  cmd.type, sizeof(cmd.type));
  return cmd;
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
  TEST_ASSERT_TRUE(buildWoLPacket("AA:BB:CC:DD:EE:FF", packet, sizeof(packet)));
  TEST_ASSERT_EQUAL(102, sizeof(packet));
}

void test_wol_packet_sync_bytes() {
  uint8_t packet[102];
  TEST_ASSERT_TRUE(buildWoLPacket("AA:BB:CC:DD:EE:FF", packet, sizeof(packet)));
  for (int i = 0; i < 6; i++) {
    TEST_ASSERT_EQUAL_HEX8(0xFF, packet[i]);
  }
}

void test_wol_packet_mac_repeated_16_times() {
  uint8_t packet[102];
  uint8_t expected[6] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF};
  TEST_ASSERT_TRUE(buildWoLPacket("AA:BB:CC:DD:EE:FF", packet, sizeof(packet)));
  for (int i = 0; i < 16; i++) {
    TEST_ASSERT_EQUAL_MEMORY(expected, &packet[6 + i * 6], 6);
  }
}

void test_wol_packet_rejects_bad_mac() {
  uint8_t packet[102];
  TEST_ASSERT_FALSE(buildWoLPacket("AA:BB:CC:DD:EG:FF", packet, sizeof(packet)));
  TEST_ASSERT_FALSE(buildWoLPacket("", packet, sizeof(packet)));
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

void test_valid_mac_uppercase() {
  TEST_ASSERT_TRUE(validMac("AA:BB:CC:DD:EE:FF"));
}

void test_valid_mac_lowercase() {
  TEST_ASSERT_TRUE(validMac("aa:bb:cc:dd:ee:0f"));
}

void test_valid_mac_rejects_short() {
  TEST_ASSERT_FALSE(validMac("AA:BB:CC"));
}

void test_valid_mac_rejects_bad_separator() {
  TEST_ASSERT_FALSE(validMac("AA-BB-CC-DD-EE-FF"));
}

void test_valid_mac_rejects_non_hex() {
  TEST_ASSERT_FALSE(validMac("AA:BB:CC:DD:EG:FF"));
}

void test_valid_mac_rejects_empty() {
  TEST_ASSERT_FALSE(validMac(""));
}

void test_valid_mac_rejects_all_zero() {
  TEST_ASSERT_FALSE(validMac("00:00:00:00:00:00"));
}

void test_telemetry_pc_on() {
  std::string msg = buildTelemetryPayload("device-1", true, 22.5f, 55.0f, -65, "1.3.7-esp32");
  JsonDocument doc;
  deserializeJson(doc, msg);
  TEST_ASSERT_EQUAL_STRING("telemetry", doc["type"].as<const char*>());
  TEST_ASSERT_EQUAL_STRING("device-1",  doc["device_id"].as<const char*>());
  TEST_ASSERT_TRUE(doc["pc_on"].as<bool>());
  TEST_ASSERT_EQUAL(-65, doc["rssi"].as<int>());
  TEST_ASSERT_EQUAL_STRING("1.3.7-esp32", doc["firmware_version"].as<const char*>());
}

void test_telemetry_pc_off() {
  std::string msg = buildTelemetryPayload("device-1", false, 21.0f, 60.0f, -70, "1.3.7-esp32");
  JsonDocument doc;
  deserializeJson(doc, msg);
  TEST_ASSERT_FALSE(doc["pc_on"].as<bool>());
}

void test_telemetry_has_temp_humidity() {
  std::string msg = buildTelemetryPayload("device-1", true, 23.5f, 48.0f, -60, "1.3.7-esp32");
  JsonDocument doc;
  deserializeJson(doc, msg);
  TEST_ASSERT_FLOAT_WITHIN(0.1f, 23.5f, doc["room_temp"].as<float>());
  TEST_ASSERT_FLOAT_WITHIN(0.1f, 48.0f, doc["room_humidity"].as<float>());
}

void test_telemetry_type_field() {
  std::string msg = buildTelemetryPayload("d", true, NAN, NAN, -50, "1.3.7-esp32");
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
  RUN_TEST(test_wol_packet_rejects_bad_mac);

  RUN_TEST(test_command_parse_power_on);
  RUN_TEST(test_command_parse_power_off);
  RUN_TEST(test_command_parse_reset);
  RUN_TEST(test_command_parse_bad_json);
  RUN_TEST(test_command_parse_missing_type);

  RUN_TEST(test_valid_mac_uppercase);
  RUN_TEST(test_valid_mac_lowercase);
  RUN_TEST(test_valid_mac_rejects_short);
  RUN_TEST(test_valid_mac_rejects_bad_separator);
  RUN_TEST(test_valid_mac_rejects_non_hex);
  RUN_TEST(test_valid_mac_rejects_empty);
  RUN_TEST(test_valid_mac_rejects_all_zero);

  RUN_TEST(test_telemetry_pc_on);
  RUN_TEST(test_telemetry_pc_off);
  RUN_TEST(test_telemetry_has_temp_humidity);
  RUN_TEST(test_telemetry_type_field);

  return UNITY_END();
}
