package com.onoffmypc.android.ui.components

import androidx.compose.ui.graphics.Color
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.ui.theme.Accent
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow

/** Honest feedback for the synchronous command-request response. */
fun commandRequestFeedback(
    type: CommandType,
    deviceName: String,
    sentToDevice: Boolean,
    reason: String? = null,
): String = if (sentToDevice) {
    "${type.label} sent to $deviceName; awaiting device acknowledgement."
} else {
    when (reason) {
        "device_offline" -> "${type.label} queued for $deviceName; the device is offline."
        "relay_error" -> "${type.label} queued for $deviceName; the delivery service is temporarily unavailable."
        else -> "${type.label} queued for $deviceName; it has not reached the device yet."
    }
}

/** User-facing lifecycle text. Device acknowledgement is not physical-state proof. */
fun commandStatusLabel(status: String?): String = when (status) {
    "pending" -> "Queued"
    "sent" -> "Awaiting device acknowledgement"
    "delivered" -> "Device acknowledged (PC state not confirmed)"
    "expired" -> "Expired — not acknowledged"
    null -> "Unknown"
    else -> status.replace('_', ' ').replaceFirstChar { it.uppercase() }
}

fun commandStatusColor(status: String?): Color = when (status) {
    "delivered" -> Accent
    "expired" -> Red
    "pending", "sent" -> Yellow
    else -> Muted
}
