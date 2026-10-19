package com.onoffmypc.android.ui.components

import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.ui.designsystem.StatusRole
import com.onoffmypc.android.ui.designsystem.toStatusRole
import com.onoffmypc.design.generated.OnOffCommandStates

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
fun commandStatusLabel(status: String?): String {
    if (status == null) return "Unknown"
    val generated = OnOffCommandStates[status]
        ?: return status.replace('_', ' ').replaceFirstChar { it.uppercase() }
    return when (status) {
        "delivered" -> "${generated.label} (PC state not confirmed)"
        "expired" -> "${generated.label} — not acknowledged"
        else -> generated.label
    }
}

fun commandStatusRole(status: String?): StatusRole =
    OnOffCommandStates[status]?.tone?.toStatusRole() ?: StatusRole.Unknown
