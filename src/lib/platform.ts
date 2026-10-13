/**
 * Maps a device's reported firmware/agent version string to a human-facing
 * platform and version. Used by the dashboard and device detail surfaces to
 * label "Device Source" without leaking raw agent build strings.
 *
 * Pure and host-independent so it can be unit-tested without Electron or a
 * browser.
 */

export interface PlatformInfo {
  platform: string;
  version: string;
}

export function getPlatformInfo(versionStr: string | null | undefined): PlatformInfo {
  if (!versionStr) return { platform: "Unknown", version: "N/A" };
  const lower = versionStr.toLowerCase();
  if (lower.includes("desktop-agent")) {
    const match = versionStr.match(/desktop-agent\s+([^\s(]+)/i);
    return {
      platform: "Windows Software",
      version: match ? match[1] : versionStr.replace(/desktop-agent\s+/i, ""),
    };
  }
  if (lower.includes("esp32")) {
    return {
      platform: "ESP32",
      version: versionStr.replace(/-esp32/i, ""),
    };
  }
  if (lower.includes("esp8266")) {
    return {
      platform: "ESP8266",
      version: versionStr.replace(/-esp8266/i, ""),
    };
  }
  // Version-only strings (e.g. "0.3.9") are assumed to be ESP32 firmware: it
  // is the only platform that reports a bare semver.
  if (/^[0-9.]+/.test(versionStr)) {
    return {
      platform: "ESP32",
      version: versionStr,
    };
  }
  return {
    platform: "Unknown",
    version: versionStr,
  };
}
