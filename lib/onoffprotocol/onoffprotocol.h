#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

// Shared, parser-level device logic used by both the firmware (src/main.cpp)
// and the native unit tests (test/test_firmware). Keeping these in one place
// stops the tests from drifting away from what the device actually ships with.
//
// All helpers are std::string-based (no Arduino String) so they compile in the
// native test environment as-is.

// Accepts exactly six colon-separated hex byte pairs ("AA:BB:CC:DD:EE:FF") and
// rejects empty, malformed, or all-zero MACs (the last is a useless WoL target).
bool validMac(const std::string& mac);

// Build a 102-byte Wake-on-LAN magic packet for `mac` into `packet`.
// Returns false (and leaves `packet` untouched) on a bad MAC or undersized buffer.
bool buildWoLPacket(const std::string& mac, uint8_t* packet, size_t packetSize);

// Parse a command push frame {"command_id": "...", "type": "..."} into cmdId/type.
// Returns false on non-JSON, missing fields, or fields that don't fit the buffers.
bool parseCommandPayload(const char* json, char* cmdId, size_t cmdIdSize,
                         char* type, size_t typeSize);

// Build the telemetry push JSON string. NaN temp/humidity fields are omitted,
// mirroring the server's "no sensor" reporting contract.
std::string buildTelemetryPayload(const std::string& deviceId, bool pcOn,
                                  float temp, float humidity, int rssi,
                                  const std::string& firmwareVersion);

// Escape a string for safe embedding inside a JSON string literal (quotes,
// backslashes, and all C0 control characters). Used for Wi-Fi SSIDs, which are
// attacker-controlled nearby broadcast names.
std::string jsonEscape(const std::string& in);