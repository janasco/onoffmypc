package com.onoffmypc.android.ui.components

import com.onoffmypc.android.ui.designsystem.StatusRole
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
        assertEquals(StatusRole.Online, p.connectionRole)
        // The observation age is part of the label: a reading without its age
        // is indistinguishable from a live one.
        assertEquals("Last reported PC state: off, observation time unknown", p.pcStateLabel)
        assertTrue(p.accessibilityLabel.contains("off", ignoreCase = true))
    }

    @Test
    fun deviceStatusPresentation_includesPcObservationAge() {
        val now = Instant.parse("2026-07-16T12:00:00Z")
        val fresh = deviceStatusPresentation(
            lastSeenAt = now.toString(),
            pcOn = 1,
            telemetryAt = Instant.parse("2026-07-16T11:59:50Z").toString(),
            now = now,
        )
        assertEquals("Last reported PC state: on, observed just now", fresh.pcStateLabel)

        val stale = deviceStatusPresentation(
            lastSeenAt = now.toString(),
            pcOn = 1,
            telemetryAt = Instant.parse("2026-07-16T10:00:00Z").toString(),
            now = now,
        )
        assertEquals("Last reported PC state: on, observed 2h ago", stale.pcStateLabel)
    }

    @Test
    fun deviceStatusPresentation_usesSemanticConnectionRoles() {
        val p = deviceStatusPresentation(lastSeenAt = null, pcOn = null)
        assertEquals(DeviceConnectionState.UNKNOWN, p.connection)
        assertEquals(StatusRole.Unknown, p.connectionRole)
        assertEquals(
            StatusRole.Offline,
            deviceStatusPresentation(
                lastSeenAt = Instant.parse("2020-01-01T00:00:00Z").toString(),
                pcOn = 1,
                now = Instant.parse("2026-07-16T12:00:00Z"),
            ).connectionRole,
        )
    }
}
