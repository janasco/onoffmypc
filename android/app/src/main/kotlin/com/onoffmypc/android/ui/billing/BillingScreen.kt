package com.onoffmypc.android.ui.billing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.data.model.BillingStatus
import com.onoffmypc.android.data.model.BillingDevice
import com.onoffmypc.android.data.model.PaymentRequestItem
import com.onoffmypc.android.ui.theme.Accent
import com.onoffmypc.android.ui.theme.Green
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillingScreen(
    onBack: () -> Unit,
    initialDeviceId: String? = null,
    vm: BillingViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(initialDeviceId) { vm.load(initialDeviceId) }
    LaunchedEffect(state.message) {
        state.message?.let { snackbar.showSnackbar(it); vm.consumeMessage() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Device Unlocks") },
                navigationIcon = { TextButton(onClick = onBack) { Text("←") } },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        if (state.loading) {
            CircularProgressIndicator(Modifier.padding(padding).padding(32.dp))
            return@Scaffold
        }
        val s = state.status
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            if (s == null) {
                Text(state.error ?: "Couldn't load billing.", color = Muted)
                return@Column
            }

            PlanCard(s)

            val devicePlan = s.plans.firstOrNull { it.id == "device" }
            if (!s.is_lifetime) {
                Spacer(Modifier.height(20.dp))
                Text("One-time device unlock", style = MaterialTheme.typography.titleSmall, color = Muted)
                Spacer(Modifier.height(8.dp))
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text(
                            text = "${devicePlan?.name ?: "Device Unlock"} — $${devicePlan?.price ?: s.price} per device",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            "Pay once for the selected device. No subscription. Contact support before deleting a purchased device so its unlock can be transferred safely.",
                            color = Muted, style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            if (s.is_lifetime) {
                Spacer(Modifier.height(16.dp))
                Card(Modifier.fillMaxWidth()) {
                    Text(
                        "Your legacy Lifetime access covers every device on this account. No additional purchase is needed.",
                        color = Green, modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            } else {
                Spacer(Modifier.height(20.dp))
                Text("Choose a device", style = MaterialTheme.typography.titleSmall, color = Muted)
                Spacer(Modifier.height(8.dp))
                if (s.devices.isEmpty()) {
                    Text(
                        "Add a device before purchasing an unlock.",
                        color = Muted,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                } else {
                    s.devices.forEach { device ->
                        DeviceAccessRow(
                            device = device,
                            selected = device.id == state.selectedDeviceId,
                            onSelect = { vm.selectDevice(device.id) },
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                }

                val selected = s.devices.firstOrNull { it.id == state.selectedDeviceId }
                if (selected != null) {
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Unlocking ${selected.name} for $${devicePlan?.price ?: s.price} one time.",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(Modifier.height(16.dp))
                } else if (s.devices.isNotEmpty() && s.devices.all { it.unlocked || it.pending }) {
                    Text(
                        if (s.devices.all { it.unlocked }) {
                            "All of your devices are unlocked."
                        } else {
                            "Every locked device already has a payment under review."
                        },
                        color = Muted,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }

                if (selected != null) {
                    if (s.payment_instructions.isNotBlank()) {
                        Text("How to pay", style = MaterialTheme.typography.titleSmall, color = Muted)
                        Spacer(Modifier.height(8.dp))
                        Text(s.payment_instructions, style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(16.dp))
                    }
                    Text("Submit your payment", style = MaterialTheme.typography.titleSmall, color = Muted)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = state.method, onValueChange = vm::onMethod,
                        label = { Text("Payment method (e.g. GCash, PayPal)") },
                        singleLine = true, modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = state.reference, onValueChange = vm::onReference,
                        label = { Text("Reference / proof") },
                        singleLine = true, modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = state.note, onValueChange = vm::onNote,
                        label = { Text("Note (optional)") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    state.error?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, color = Red, style = MaterialTheme.typography.bodySmall)
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = vm::submit,
                        enabled = !state.submitting,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (state.submitting) "Submitting…" else "Submit for review") }
                }
            }

            if (state.history.isNotEmpty()) {
                Spacer(Modifier.height(24.dp))
                Text("Payment history", style = MaterialTheme.typography.titleSmall, color = Muted)
                Spacer(Modifier.height(8.dp))
                state.history.forEach { HistoryRow(it) }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PlanCard(s: BillingStatus) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Current access", color = Muted, style = MaterialTheme.typography.labelMedium)
                Text(
                    if (s.is_lifetime) "Lifetime (legacy)" else "Per device",
                    color = if (s.is_lifetime) Green else Accent,
                    style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.height(6.dp))
            val statusText = when {
                s.is_lifetime -> "All devices on this account remain unlocked."
                s.devices.isEmpty() -> "Each device includes its own 30-day free trial."
                else -> "${s.devices.count { it.unlocked }} of ${s.devices.size} devices unlocked"
            }
            Text(
                statusText,
                color = if (s.trial_expired) Red else Muted,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (s.trial_expired) FontWeight.Bold else FontWeight.Normal,
            )
            if (!s.is_lifetime) {
                Spacer(Modifier.height(4.dp))
                Text(
                    "Unlock price: $${s.plans.firstOrNull { it.id == "device" }?.price ?: s.price} one time per device",
                    color = Muted, style = MaterialTheme.typography.labelMedium,
                )
            }
        }
    }
}

@Composable
private fun DeviceAccessRow(
    device: BillingDevice,
    selected: Boolean,
    onSelect: () -> Unit,
) {
    Card(Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(device.name, fontWeight = FontWeight.SemiBold)
                Text(
                    when {
                        device.unlocked -> "Unlocked — no expiration"
                        device.pending -> "Payment under review"
                        deviceTrialExpired(device) -> "Free trial ended"
                        device.trial_ends_at != null -> "Free trial ends ${fmtDate(device.trial_ends_at)}"
                        else -> "Ready to unlock"
                    },
                    color = when {
                        device.unlocked -> Green
                        device.pending -> Yellow
                        deviceTrialExpired(device) -> Red
                        else -> Muted
                    },
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            when {
                device.unlocked -> Text("Unlocked", color = Green, style = MaterialTheme.typography.labelLarge)
                device.pending -> Text("Pending", color = Yellow, style = MaterialTheme.typography.labelLarge)
                else -> TextButton(onClick = onSelect) { Text(if (selected) "Selected" else "Select") }
            }
        }
    }
}

@Composable
private fun HistoryRow(r: PaymentRequestItem) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text(r.device_name ?: r.method ?: r.plan, style = MaterialTheme.typography.bodyMedium)
            if (r.device_name != null && r.method != null) {
                Text(r.method, color = Muted, style = MaterialTheme.typography.labelSmall)
            }
            Text(fmtDate(r.created_at), color = Muted, style = MaterialTheme.typography.labelSmall)
        }
        Text(
            r.status,
            color = when (r.status) { "approved" -> Green; "declined" -> Red; else -> Yellow },
            style = MaterialTheme.typography.labelMedium,
        )
    }
}

private fun fmtDate(iso: String?): String {
    if (iso == null) return ""
    return iso.take(10)
}

private fun deviceTrialExpired(device: BillingDevice): Boolean =
    device.trial_expired ?: try {
        device.trial_ends_at != null &&
            java.time.Instant.parse(device.trial_ends_at).toEpochMilli() <= System.currentTimeMillis()
    } catch (_: Exception) {
        false
    }
