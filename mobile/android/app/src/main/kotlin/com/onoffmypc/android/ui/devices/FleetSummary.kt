package com.onoffmypc.android.ui.devices

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import com.onoffmypc.android.data.model.BillingStatus
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.ui.components.DeviceConnectionState
import com.onoffmypc.android.ui.components.connectionFromLastContact
import com.onoffmypc.android.ui.designsystem.Spacing
import com.onoffmypc.android.ui.designsystem.StatusBadge
import com.onoffmypc.android.ui.designsystem.StatusRole

/**
 * Fleet counts derived from the devices list + optional billing attention.
 * Pending/failed command totals are omitted — the list API does not expose them.
 */
data class FleetSummary(
    val total: Int,
    val online: Int,
    val offline: Int,
    val unknown: Int,
    /** Devices with ended trial or payment under review (from billing API). */
    val attentionCount: Int,
    val attentionLabel: String?,
)

fun computeFleetSummary(
    devices: List<Device>,
    billing: BillingStatus?,
): FleetSummary {
    var online = 0
    var offline = 0
    var unknown = 0
    devices.forEach { device ->
        when (connectionFromLastContact(device.last_seen_at)) {
            DeviceConnectionState.ONLINE -> online++
            DeviceConnectionState.OFFLINE -> offline++
            DeviceConnectionState.UNKNOWN -> unknown++
        }
    }

    var attention = 0
    var attentionLabel: String? = null
    if (billing != null && billing.billing_enabled && !billing.is_lifetime) {
        val locked = billing.devices.filter { !it.unlocked }
        val expired = locked.count {
            !it.pending && (it.trial_expired == true || trialHasEndedLocal(it.trial_ends_at))
        }
        val pendingCheckout = locked.count { it.polarCheckoutPending }
        val pendingReview = locked.count { it.legacyPaymentPending }
        attention = expired + pendingCheckout + pendingReview
        val attentionParts = mutableListOf<String>()
        if (expired > 0) {
            attentionParts += "$expired device trial${if (expired == 1) "" else "s"} ended"
        }
        if (pendingCheckout > 0) {
            attentionParts += "$pendingCheckout checkout${if (pendingCheckout == 1) "" else "s"} ready to continue"
        }
        if (pendingReview > 0) {
            attentionParts += "$pendingReview legacy payment${if (pendingReview == 1) "" else "s"} under review"
        }
        attentionLabel = attentionParts.takeIf { it.isNotEmpty() }?.joinToString(" · ")
    }

    return FleetSummary(
        total = devices.size,
        online = online,
        offline = offline,
        unknown = unknown,
        attentionCount = attention,
        attentionLabel = attentionLabel,
    )
}

private fun trialHasEndedLocal(iso: String?): Boolean {
    if (iso == null) return false
    return try {
        java.time.Instant.parse(iso).toEpochMilli() <= System.currentTimeMillis()
    } catch (_: Exception) {
        false
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FleetSummaryCard(summary: FleetSummary, modifier: Modifier = Modifier) {
    if (summary.total == 0) return
    val a11y = buildString {
        append("${summary.total} devices, ${summary.online} online, ${summary.offline} offline")
        if (summary.unknown > 0) append(", ${summary.unknown} unknown")
        summary.attentionLabel?.let { append(". $it") }
    }
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clearAndSetSemantics { contentDescription = a11y },
    ) {
        Column(Modifier.padding(Spacing.md)) {
            Text(
                "Fleet",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(Spacing.sm))
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
                verticalArrangement = Arrangement.spacedBy(Spacing.sm),
            ) {
                FleetCount("Total", summary.total.toString())
                StatusBadge(label = "${summary.online} online", role = StatusRole.Online)
                StatusBadge(label = "${summary.offline} offline", role = StatusRole.Offline)
                if (summary.unknown > 0) {
                    StatusBadge(label = "${summary.unknown} unknown", role = StatusRole.Unknown)
                }
            }
            summary.attentionLabel?.let { label ->
                Spacer(Modifier.height(Spacing.sm))
                StatusBadge(label = label, role = StatusRole.Pending)
            }
        }
    }
}

@Composable
private fun FleetCount(label: String, value: String) {
    Column(horizontalAlignment = Alignment.Start) {
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
