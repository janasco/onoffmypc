package com.onoffmypc.shared.model

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test

class ModelsSerializationTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun device_roundTrip() {
        val raw = """{"id":"d1","name":"Office","pc_on":1,"last_seen_at":"2026-07-16T12:00:00Z"}"""
        val device = json.decodeFromString(Device.serializer(), raw)
        assertEquals("d1", device.id)
        assertEquals("Office", device.name)
        assertEquals(1, device.pc_on)
    }

    @Test
    fun device_withTelemetry_roundTrip() {
        val raw = """{"id":"d2","name":"Workstation","pc_on":1,"cpu_load":42.5,"ram_used_mb":8192.0,"ram_total_mb":16384.0,"gpu_temp":60.0}"""
        val device = json.decodeFromString(Device.serializer(), raw)
        assertEquals("d2", device.id)
        assertEquals("Workstation", device.name)
        assertEquals(42.5, device.cpu_load)
        assertEquals(8192.0, device.ram_used_mb)
        assertEquals(16384.0, device.ram_total_mb)
        assertEquals(60.0, device.gpu_temp)
    }

    @Test
    fun commandType_wireValues() {
        assertEquals("power_on", CommandType.POWER_ON.wire)
        assertEquals("reset", CommandType.RESET.wire)
        assertEquals("Reset", CommandType.RESET.label)
        assertEquals("sleep", CommandType.SLEEP.wire)
        assertEquals("Sleep", CommandType.SLEEP.label)
    }
}
