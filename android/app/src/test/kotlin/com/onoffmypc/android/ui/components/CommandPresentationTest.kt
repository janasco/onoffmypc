package com.onoffmypc.android.ui.components

import com.onoffmypc.shared.model.CommandType
import com.onoffmypc.android.ui.theme.Accent
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow
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
        assertEquals("Awaiting device acknowledgement", commandStatusLabel("sent"))
        assertEquals("Device acknowledged (PC state not confirmed)", commandStatusLabel("delivered"))
        assertEquals("Expired — not acknowledged", commandStatusLabel("expired"))
        assertEquals("Unknown", commandStatusLabel(null))
        assertFalse(commandStatusLabel("delivered").contains("Success", ignoreCase = true))
    }

    @Test
    fun commandStatusColor_matchesLifecycle() {
        assertEquals(Yellow, commandStatusColor("pending"))
        assertEquals(Yellow, commandStatusColor("sent"))
        assertEquals(Accent, commandStatusColor("delivered"))
        assertEquals(Red, commandStatusColor("expired"))
        assertEquals(Muted, commandStatusColor(null))
    }

    @Test
    fun confirmActionLabel_namesDevice() {
        assertEquals("Restart “Office PC”", confirmActionLabel(CommandType.RESET, "Office PC"))
        assertEquals("Power Off “Lab”", confirmActionLabel(CommandType.POWER_OFF, "Lab"))
        assertTrue(confirmActionLabel(CommandType.POWER_OFF_FORCE, "X").contains("X"))
    }
}
