package com.onoffmypc.android.ui.devices

import com.onoffmypc.shared.model.BillingDevice
import com.onoffmypc.shared.model.BillingStatus
import com.onoffmypc.shared.model.Device
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant

class FleetSummaryTest {

    @Test
    fun computeFleetSummary_countsConnectionStates() {
        val now = Instant.now()
        val online = Device(
            id = "1",
            name = "A",
            last_seen_at = now.minusSeconds(30).toString(),
        )
        val offline = Device(
            id = "2",
            name = "B",
            last_seen_at = now.minusSeconds(120).toString(),
        )
        val unknown = Device(id = "3", name = "C", last_seen_at = null)
        val summary = computeFleetSummary(listOf(online, offline, unknown), billing = null)
        assertEquals(3, summary.total)
        assertEquals(1, summary.online)
        assertEquals(1, summary.offline)
        assertEquals(1, summary.unknown)
        assertEquals(0, summary.attentionCount)
        assertNull(summary.attentionLabel)
    }

    @Test
    fun computeFleetSummary_attentionFromBilling() {
        val billing = BillingStatus(
            plan = "free",
            devices = listOf(
                BillingDevice(id = "1", name = "A", unlocked = false, trial_expired = true),
                BillingDevice(id = "2", name = "B", unlocked = false, pending = true),
            ),
        )
        val summary = computeFleetSummary(
            devices = listOf(Device(id = "1", name = "A"), Device(id = "2", name = "B")),
            billing = billing,
        )
        assertEquals(2, summary.attentionCount)
        assertEquals(true, summary.attentionLabel?.contains("trial") == true)
    }
}
