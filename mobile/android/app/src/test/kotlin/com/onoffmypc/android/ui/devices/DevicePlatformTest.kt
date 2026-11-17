package com.onoffmypc.android.ui.devices

import com.onoffmypc.android.data.model.Device
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DevicePlatformTest {
    private fun device(firmware: String?, platform: String? = null) =
        Device(id = "d1", name = "PC", firmware_version = firmware, platform = platform)

    @Test
    fun `parses the desktop agent os and version`() {
        val windows = resolveDevicePlatform(device("desktop-agent 0.1.4 (win32)"))
        assertEquals(DeviceOs.WINDOWS, windows.os)
        assertEquals("Windows", windows.label)
        assertEquals("0.1.4", windows.version)
        assertFalse(windows.isGateway)

        assertEquals(DeviceOs.LINUX, resolveDevicePlatform(device("desktop-agent 0.1.4 (linux)")).os)
        assertEquals(DeviceOs.MACOS, resolveDevicePlatform(device("desktop-agent 0.1.4 (darwin)")).os)
    }

    @Test
    fun `parses esp32 and legacy bare firmware versions`() {
        val esp32 = resolveDevicePlatform(device("1.4.0-rc1-esp32"))
        assertEquals(DeviceOs.ESP32, esp32.os)
        assertEquals("ESP32 gateway", esp32.label)
        assertEquals("1.4.0-rc1", esp32.version)
        assertTrue(esp32.isGateway)

        assertEquals(DeviceOs.ESP32, resolveDevicePlatform(device("1.3.7")).os)
    }

    @Test
    fun `prefers the normalized platform field`() {
        val result = resolveDevicePlatform(device("desktop-agent 0.1.4 (win32)", platform = "linux"))
        assertEquals(DeviceOs.LINUX, result.os)
    }

    @Test
    fun `unknown firmware is not mistaken for a platform`() {
        assertEquals(DeviceOs.UNKNOWN, resolveDevicePlatform(device(null)).os)
        assertEquals(DeviceOs.UNKNOWN, resolveDevicePlatform(device("something-else")).os)
    }
}
