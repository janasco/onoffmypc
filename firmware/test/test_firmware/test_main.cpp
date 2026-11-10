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

void test_json_escape_quotes_and_backslash() {
  TEST_ASSERT_EQUAL_STRING("a\\\"b\\\\c", jsonEscape("a\"b\\c").c_str());
}

void test_json_escape_control_chars() {
  TEST_ASSERT_EQUAL_STRING("line\\nbreak\\ttab\\r", jsonEscape("line\nbreak\ttab\r").c_str());
  TEST_ASSERT_EQUAL_STRING("\\u0001", jsonEscape("\x01").c_str());
}

void test_json_escape_leaves_normal_text_intact() {
  TEST_ASSERT_EQUAL_STRING("Home Wi-Fi 5G", jsonEscape("Home Wi-Fi 5G").c_str());
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

// ── Protocol v2 ───────────────────────────────────────────────────────────────

void test_command_parse_v2() {
  CommandFrame frame;
  TEST_ASSERT_TRUE(parseCommandFrame(
    "{\"command_id\":\"abc\",\"type\":\"power_on\",\"v\":2,\"seq\":5}", &frame));
  TEST_ASSERT_EQUAL_UINT32(2, frame.version);
  TEST_ASSERT_TRUE(frame.hasSeq);
  TEST_ASSERT_EQUAL_UINT64(5, frame.seq);
  TEST_ASSERT_EQUAL_STRING("abc", frame.commandId);
}

void test_command_parse_v1_defaults() {
  CommandFrame frame;
  TEST_ASSERT_TRUE(parseCommandFrame(
    "{\"command_id\":\"abc\",\"type\":\"power_on\"}", &frame));
  TEST_ASSERT_EQUAL_UINT32(1, frame.version);
  TEST_ASSERT_FALSE(frame.hasSeq);
}

void test_replay_execute_new_seq() {
  TEST_ASSERT_TRUE(decideReplay(2, true, 6, 5, false) == ReplayDecision::Execute);
  TEST_ASSERT_TRUE(decideReplay(2, true, 1, 0, false) == ReplayDecision::Execute);
}

void test_replay_duplicate_id() {
  TEST_ASSERT_TRUE(decideReplay(2, true, 5, 5, true) == ReplayDecision::Duplicate);
  TEST_ASSERT_TRUE(decideReplay(2, true, 4, 5, true) == ReplayDecision::Duplicate);
}

void test_replay_stale_seq() {
  TEST_ASSERT_TRUE(decideReplay(2, true, 5, 5, false) == ReplayDecision::StaleSeq);
  TEST_ASSERT_TRUE(decideReplay(2, true, 4, 5, false) == ReplayDecision::StaleSeq);
}

void test_replay_v1_always_executes() {
  TEST_ASSERT_TRUE(decideReplay(1, false, 0, 100, true) == ReplayDecision::Execute);
}

void test_replay_ring_wraps() {
  ReplayRing ring;
  replayRingInit(&ring);
  for (int i = 0; i < 10; i++) {
    char id[16];
    snprintf(id, sizeof(id), "id-%d", i);
    replayRingPush(&ring, id);
  }
  TEST_ASSERT_EQUAL_UINT8(8, ring.count);
  TEST_ASSERT_FALSE(replayRingContains(&ring, "id-0"));
  TEST_ASSERT_FALSE(replayRingContains(&ring, "id-1"));
  TEST_ASSERT_TRUE(replayRingContains(&ring, "id-2"));
  TEST_ASSERT_TRUE(replayRingContains(&ring, "id-9"));
}

void test_ack_payload_v2() {
  std::string payload = buildAckPayload("cmd-1", 7, "accepted", nullptr, 0, 1);
  JsonDocument doc;
  TEST_ASSERT_TRUE(deserializeJson(doc, payload) == DeserializationError::Ok);
  TEST_ASSERT_EQUAL_STRING("ack", doc["type"].as<const char*>());
  TEST_ASSERT_EQUAL_UINT32(2, doc["v"].as<uint32_t>());
  TEST_ASSERT_EQUAL_STRING("cmd-1", doc["command_id"].as<const char*>());
  TEST_ASSERT_EQUAL_UINT64(7, doc["seq"].as<uint64_t>());
  TEST_ASSERT_EQUAL_STRING("accepted", doc["result"].as<const char*>());
  TEST_ASSERT_EQUAL_INT(0, doc["state_before"].as<int>());
  TEST_ASSERT_EQUAL_INT(1, doc["state_after"].as<int>());
  TEST_ASSERT_TRUE(doc["reason"].isNull());
}

void test_hello_payload() {
  std::string payload = buildHelloPayload("boot-1", 42);
  JsonDocument doc;
  TEST_ASSERT_TRUE(deserializeJson(doc, payload) == DeserializationError::Ok);
  TEST_ASSERT_EQUAL_STRING("hello", doc["type"].as<const char*>());
  TEST_ASSERT_EQUAL_UINT32(2, doc["v"].as<uint32_t>());
  TEST_ASSERT_EQUAL_STRING("boot-1", doc["boot_id"].as<const char*>());
  TEST_ASSERT_EQUAL_UINT64(42, doc["last_seq"].as<uint64_t>());
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

  RUN_TEST(test_command_parse_v2);
  RUN_TEST(test_command_parse_v1_defaults);
  RUN_TEST(test_replay_execute_new_seq);
  RUN_TEST(test_replay_duplicate_id);
  RUN_TEST(test_replay_stale_seq);
  RUN_TEST(test_replay_v1_always_executes);
  RUN_TEST(test_replay_ring_wraps);
  RUN_TEST(test_ack_payload_v2);
  RUN_TEST(test_hello_payload);

  RUN_TEST(test_valid_mac_uppercase);
  RUN_TEST(test_valid_mac_lowercase);
  RUN_TEST(test_valid_mac_rejects_short);
  RUN_TEST(test_valid_mac_rejects_bad_separator);
  RUN_TEST(test_valid_mac_rejects_non_hex);
  RUN_TEST(test_valid_mac_rejects_empty);
  RUN_TEST(test_valid_mac_rejects_all_zero);

  RUN_TEST(test_json_escape_quotes_and_backslash);
  RUN_TEST(test_json_escape_control_chars);
  RUN_TEST(test_json_escape_leaves_normal_text_intact);

  RUN_TEST(test_telemetry_pc_on);
  RUN_TEST(test_telemetry_pc_off);
  RUN_TEST(test_telemetry_has_temp_humidity);
  RUN_TEST(test_telemetry_type_field);

  return UNITY_END();
}
