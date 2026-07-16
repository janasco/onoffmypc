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
    fun commandType_wireValues() {
        assertEquals("power_on", CommandType.POWER_ON.wire)
        assertEquals("reset", CommandType.RESET.wire)
        assertEquals("Reset", CommandType.RESET.label)
    }
}
