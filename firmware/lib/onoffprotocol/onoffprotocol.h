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

// ── Command protocol v2 ─────────────────────────────────────────────────────

// A parsed command frame. `version` is 1 when the field is absent; `hasSeq` is
// false for v1 frames. `expiresAt` is informational only: the server owns
// expiry (the device has no trusted clock requirement).
struct CommandFrame {
  char commandId[64];
  char type[32];
  uint32_t version;
  bool hasSeq;
  uint64_t seq;
  bool hasExpiresAt;
  char expiresAt[32];
};

bool parseCommandFrame(const char* json, CommandFrame* out);

enum class ReplayDecision { Execute, Duplicate, StaleSeq };

// Decide what to do with a (possibly replayed) command.
// v1 frames always execute; v2 frames require seq > lastSeq. A seq at or below
// lastSeq is a duplicate when the command id is still in the ring, otherwise a
// stale/reordered frame.
ReplayDecision decideReplay(uint32_t version, bool hasSeq, uint64_t seq,
                            uint64_t lastSeq, bool idInRing);

constexpr size_t kReplayRingSize = 8;

struct ReplayRing {
  char ids[kReplayRingSize][64];
  uint8_t count;
  uint8_t next;
};

void replayRingInit(ReplayRing* ring);
bool replayRingContains(const ReplayRing* ring, const char* id);
void replayRingPush(ReplayRing* ring, const char* id);

std::string buildHelloPayload(const std::string& bootId, uint64_t lastSeq);
std::string buildAckPayload(const char* commandId, uint64_t seq, const char* result,
                            const char* reason, int stateBefore, int stateAfter);

// Build the telemetry push JSON string. NaN temp/humidity fields are omitted,
// mirroring the server's "no sensor" reporting contract.
std::string buildTelemetryPayload(const std::string& deviceId, bool pcOn,
                                  float temp, float humidity, int rssi,
                                  const std::string& firmwareVersion);

// Escape a string for safe embedding inside a JSON string literal (quotes,
// backslashes, and all C0 control characters). Used for Wi-Fi SSIDs, which are
// attacker-controlled nearby broadcast names.
std::string jsonEscape(const std::string& in);