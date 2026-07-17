package com.onoffmypc.android.ui.components

import com.onoffmypc.shared.model.CommandType
import com.onoffmypc.android.ui.designsystem.StatusRole
import com.onoffmypc.android.ui.designsystem.toStatusRole
import com.onoffmypc.design.generated.OnOffTone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CommandPresentationTest {

    @Test
    fun commandRequestFeedback_sentToDevice() {
        val text = commandRequestFeedback(CommandType.POWER_OFF, "Office PC", sentToDevice = true)
        assertEquals(
            "Power Off sent to Office PC; awaiting device acknowledgement.",
            text,
        )
        assertFalse(text.contains("Success", ignoreCase = true))
    }

    @Test
    fun commandRequestFeedback_queuedOffline() {
        val text = commandRequestFeedback(
            CommandType.RESET,
            "Lab",
            sentToDevice = false,
            reason = "device_offline",
        )
        assertEquals("Reset queued for Lab; the device is offline.", text)
    }

    @Test
    fun commandRequestFeedback_queuedRelayError() {
        val text = commandRequestFeedback(
            CommandType.POWER_ON,
            "Desk",
            sentToDevice = false,
            reason = "relay_error",
        )
        assertEquals(
            "Power On queued for Desk; the delivery service is temporarily unavailable.",
            text,
        )
    }

    @Test
    fun commandStatusLabel_honestLifecycle() {
        assertEquals("Queued", commandStatusLabel("pending"))
        assertEquals("Awaiting acknowledgement", commandStatusLabel("sent"))
        assertEquals("Device acknowledged (PC state not confirmed)", commandStatusLabel("delivered"))
        assertEquals("Expired — not acknowledged", commandStatusLabel("expired"))
        assertEquals("Unknown", commandStatusLabel(null))
        assertFalse(commandStatusLabel("delivered").contains("Success", ignoreCase = true))
    }

    @Test
    fun commandStatusRole_matchesLifecycle() {
        assertEquals(StatusRole.Pending, commandStatusRole("pending"))
        assertEquals(StatusRole.Information, commandStatusRole("sent"))
        assertEquals(StatusRole.Information, commandStatusRole("delivered"))
        assertEquals(StatusRole.Danger, commandStatusRole("expired"))
        assertEquals(StatusRole.Positive, commandStatusRole("confirmed"))
        assertEquals(StatusRole.Unknown, commandStatusRole(null))
    }

    @Test
    fun powerOnAction_isInformationalRatherThanPositiveEvidence() {
        assertEquals(StatusRole.Information, OnOffTone.PowerOn.toStatusRole())
    }

    @Test
    fun confirmActionLabel_namesDevice() {
        assertEquals("Restart “Office PC”", confirmActionLabel(CommandType.RESET, "Office PC"))
        assertEquals("Power Off “Lab”", confirmActionLabel(CommandType.POWER_OFF, "Lab"))
        assertTrue(confirmActionLabel(CommandType.POWER_OFF_FORCE, "X").contains("X"))
    }
}
