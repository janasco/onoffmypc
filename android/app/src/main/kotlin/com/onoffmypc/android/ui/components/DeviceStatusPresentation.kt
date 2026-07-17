package com.onoffmypc.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.style.TextAlign
import com.onoffmypc.android.ui.designsystem.Spacing
import com.onoffmypc.android.ui.designsystem.StatusBadge
import com.onoffmypc.android.ui.designsystem.StatusRole
import java.time.Duration
import java.time.Instant

enum class DeviceConnectionState {
    ONLINE,
    OFFLINE,
    UNKNOWN,
}

data class DeviceStatusPresentation(
    val connection: DeviceConnectionState,
    val connectionLabel: String,
    val connectionRole: StatusRole,
    val pcStateLabel: String,
    val lastContactLabel: String,
) {
    val accessibilityLabel: String
        get() = "$connectionLabel. $pcStateLabel. $lastContactLabel."
}

fun connectionFromLastContact(lastSeenAt: String?, now: Instant = Instant.now()): DeviceConnectionState {
    val lastSeen = parseInstant(lastSeenAt) ?: return DeviceConnectionState.UNKNOWN
    val age = Duration.between(lastSeen, now).seconds.coerceAtLeast(0)
    return if (age < 90) DeviceConnectionState.ONLINE else DeviceConnectionState.OFFLINE
}

fun deviceStatusPresentation(
    lastSeenAt: String?,
    pcOn: Int?,
    connection: DeviceConnectionState? = null,
    onlineLabel: String = "Online",
    now: Instant = Instant.now(),
): DeviceStatusPresentation {
    val resolvedConnection = connection ?: connectionFromLastContact(lastSeenAt, now)
    val connectionLabel = when (resolvedConnection) {
        DeviceConnectionState.ONLINE -> onlineLabel
        DeviceConnectionState.OFFLINE -> "Offline"
        DeviceConnectionState.UNKNOWN -> "Status unknown"
    }
    val connectionRole = when (resolvedConnection) {
        DeviceConnectionState.ONLINE -> StatusRole.Online
        DeviceConnectionState.OFFLINE -> StatusRole.Offline
        DeviceConnectionState.UNKNOWN -> StatusRole.Unknown
    }
    val pcStateLabel = when (pcOn) {
        1 -> "Last reported PC state: on"
        0 -> "Last reported PC state: off"
        else -> "PC state not reported"
    }
    return DeviceStatusPresentation(
        connection = resolvedConnection,
        connectionLabel = connectionLabel,
        connectionRole = connectionRole,
        pcStateLabel = pcStateLabel,
        lastContactLabel = lastContactLabel(lastSeenAt, now),
    )
}

@Composable
fun DeviceStatusSummary(
    presentation: DeviceStatusPresentation,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clearAndSetSemantics { contentDescription = presentation.accessibilityLabel },
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
            StatusBadge(
                label = presentation.connectionLabel,
                role = presentation.connectionRole,
            )
            Text(
                presentation.lastContactLabel,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium,
                textAlign = TextAlign.End,
                modifier = Modifier.weight(1f),
            )
        }
        Text(
            presentation.pcStateLabel,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

private fun lastContactLabel(value: String?, now: Instant): String {
    if (value == null) return "No device contact yet"
    val lastSeen = parseInstant(value) ?: return "Last contact unavailable"
    val age = Duration.between(lastSeen, now).seconds.coerceAtLeast(0)
    return when {
        age < 15 -> "Last contact just now"
        age < 60 -> "Last contact ${age}s ago"
        age < 3_600 -> "Last contact ${age / 60}m ago"
        age < 86_400 -> "Last contact ${age / 3_600}h ago"
        else -> "Last contact ${age / 86_400}d ago"
    }
}

private fun parseInstant(value: String?): Instant? = value?.let {
    try {
        Instant.parse(it)
    } catch (_: Exception) {
        null
    }
}
