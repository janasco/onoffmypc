package com.onoffmypc.android.ui.components

import com.onoffmypc.android.ui.theme.Green
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class DeviceStatusPresentationTest {

    @Test
    fun connectionFromLastContact_onlineWithin90s() {
        val now = Instant.parse("2026-07-16T12:00:00Z")
        val recent = Instant.parse("2026-07-16T11:59:30Z").toString()
        assertEquals(DeviceConnectionState.ONLINE, connectionFromLastContact(recent, now))
    }

    @Test
    fun connectionFromLastContact_offlineAfter90s() {
        val now = Instant.parse("2026-07-16T12:00:00Z")
        val stale = Instant.parse("2026-07-16T11:58:00Z").toString()
        assertEquals(DeviceConnectionState.OFFLINE, connectionFromLastContact(stale, now))
    }

    @Test
    fun connectionFromLastContact_unknownWhenMissing() {
        assertEquals(DeviceConnectionState.UNKNOWN, connectionFromLastContact(null))
    }

    @Test
    fun deviceStatusPresentation_separatesConnectionAndPcState() {
        val now = Instant.parse("2026-07-16T12:00:00Z")
        val lastSeen = Instant.parse("2026-07-16T11:59:50Z").toString()
        val p = deviceStatusPresentation(lastSeenAt = lastSeen, pcOn = 0, now = now)
        assertEquals(DeviceConnectionState.ONLINE, p.connection)
        assertEquals(Green, p.connectionColor)
        assertEquals("Last reported PC state: off", p.pcStateLabel)
        assertTrue(p.accessibilityLabel.contains("off", ignoreCase = true))
    }

    @Test
    fun deviceStatusPresentation_unknownUsesMuted() {
        val p = deviceStatusPresentation(lastSeenAt = null, pcOn = null)
        assertEquals(DeviceConnectionState.UNKNOWN, p.connection)
        assertEquals(Muted, p.connectionColor)
        assertEquals(
            Red,
            deviceStatusPresentation(
                lastSeenAt = Instant.parse("2020-01-01T00:00:00Z").toString(),
                pcOn = 1,
                now = Instant.parse("2026-07-16T12:00:00Z"),
            ).connectionColor,
        )
    }
}
