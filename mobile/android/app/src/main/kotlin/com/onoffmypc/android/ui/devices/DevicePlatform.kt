package com.onoffmypc.android.ui.devices

import com.onoffmypc.android.data.model.Device

enum class DeviceOs { WINDOWS, LINUX, MACOS, ESP32, ESP8266, UNKNOWN }

data class DevicePlatform(
    val os: DeviceOs,
    val label: String,
    val version: String?,
    val isGateway: Boolean,
)

/**
 * Resolve the OS/gateway type from the normalized `platform` field when the
 * device reports it, otherwise from the legacy firmware/agent string.
 *
 * Examples:
 *   desktop-agent 0.1.4 (win32)  -> Windows / 0.1.4
 *   desktop-agent 0.1.4 (darwin) -> macOS / 0.1.4
 *   1.4.0-rc1-esp32              -> ESP32 gateway / 1.4.0-rc1
 *   1.3.7                        -> ESP32 gateway / 1.3.7 (old firmware)
 */
fun resolveDevicePlatform(device: Device): DevicePlatform {
    val reported = device.platform?.trim()?.lowercase()
    val firmware = device.firmware_version?.trim().orEmpty()
    val lower = firmware.lowercase()

    val os = when {
        reported == "windows" || reported == "win32" || reported == "win" -> DeviceOs.WINDOWS
        reported == "linux" -> DeviceOs.LINUX
        reported == "macos" || reported == "darwin" || reported == "mac" -> DeviceOs.MACOS
        reported == "esp32" -> DeviceOs.ESP32
        reported == "esp8266" -> DeviceOs.ESP8266
        lower.contains("desktop-agent") -> when {
            lower.contains("(win32)") || lower.contains("(windows)") -> DeviceOs.WINDOWS
            lower.contains("(darwin)") || lower.contains("(macos)") -> DeviceOs.MACOS
            lower.contains("(linux)") -> DeviceOs.LINUX
            else -> DeviceOs.UNKNOWN
        }
        lower.contains("esp8266") -> DeviceOs.ESP8266
        lower.contains("esp32") -> DeviceOs.ESP32
        Regex("^\\d+(\\.\\d+)*$").matches(firmware) -> DeviceOs.ESP32
        else -> DeviceOs.UNKNOWN
    }

    val label = when (os) {
        DeviceOs.WINDOWS -> "Windows"
        DeviceOs.LINUX -> "Linux"
        DeviceOs.MACOS -> "macOS"
        DeviceOs.ESP32 -> "ESP32 gateway"
        DeviceOs.ESP8266 -> "ESP8266 gateway"
        DeviceOs.UNKNOWN -> "Unknown device"
    }

    val version = when {
        os == DeviceOs.WINDOWS || os == DeviceOs.LINUX || os == DeviceOs.MACOS ->
            Regex("desktop-agent\\s+([^\\s(]+)", RegexOption.IGNORE_CASE)
                .find(firmware)?.groupValues?.getOrNull(1)
        os == DeviceOs.ESP32 ->
            firmware.replace(Regex("-esp32$", RegexOption.IGNORE_CASE), "").ifBlank { null }
        os == DeviceOs.ESP8266 ->
            firmware.replace(Regex("-esp8266$", RegexOption.IGNORE_CASE), "").ifBlank { null }
        else -> null
    }

    return DevicePlatform(
        os = os,
        label = label,
        version = version,
        isGateway = os == DeviceOs.ESP32 || os == DeviceOs.ESP8266,
    )
}
