import { test } from "node:test";
import assert from "node:assert/strict";
import { getPlatformInfo } from "../src/lib/platform.ts";

test("maps the desktop agent build string to a versioned Windows Software platform", () => {
  assert.deepEqual(getPlatformInfo("desktop-agent 0.1.4"), {
    platform: "Windows Software",
    version: "0.1.4",
  });
});

test("keeps the whole string when the agent version is unparseable", () => {
  // No whitespace-separated token follows the name, so there is no version to
  // strip and the raw string is passed through.
  assert.deepEqual(getPlatformInfo("desktop-agent-nightly"), {
    platform: "Windows Software",
    version: "desktop-agent-nightly",
  });
});

test("strips the -esp32 suffix from ESP32 firmware versions", () => {
  assert.deepEqual(getPlatformInfo("0.3.9-esp32"), {
    platform: "ESP32",
    version: "0.3.9",
  });
});

test("maps ESP8266 firmware versions", () => {
  assert.deepEqual(getPlatformInfo("1.2.3-esp8266"), {
    platform: "ESP8266",
    version: "1.2.3",
  });
});

test("treats a bare semver as ESP32 firmware", () => {
  assert.deepEqual(getPlatformInfo("0.3.9"), {
    platform: "ESP32",
    version: "0.3.9",
  });
});

test("reports Unknown for unrecognized build strings", () => {
  assert.deepEqual(getPlatformInfo("mystery-hardware"), {
    platform: "Unknown",
    version: "mystery-hardware",
  });
});

test("reports Unknown/N-A for missing versions", () => {
  for (const input of [null, undefined, ""]) {
    assert.deepEqual(getPlatformInfo(input), { platform: "Unknown", version: "N/A" });
  }
});
