package com.onoffmypc.android.ui.billing

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
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
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    LaunchedEffect(initialDeviceId) { vm.load(initialDeviceId) }
    DisposableEffect(lifecycleOwner, initialDeviceId) {
        var leftForeground = false
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> leftForeground = true
                Lifecycle.Event.ON_RESUME -> {
                    if (leftForeground) {
                        leftForeground = false
                        vm.refreshAfterExternalReturn(initialDeviceId)
                    }
                }
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(state.externalUrl) {
        state.externalUrl?.let { url ->
            try {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                vm.externalUrlOpened()
            } catch (_: ActivityNotFoundException) {
                vm.externalUrlFailed()
            } catch (_: SecurityException) {
                vm.externalUrlFailed()
            }
        }
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Device Unlocks") },
                navigationIcon = { TextButton(onClick = onBack) { Text("←") } },
            )
        },
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

            state.error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = Red, style = MaterialTheme.typography.bodySmall)
            }

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
                } else if (s.devices.isNotEmpty() && s.devices.all { it.unlocked }) {
                    Text(
                        "All of your devices are unlocked.",
                        color = Muted,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                } else if (s.devices.any { it.legacyPaymentPending }) {
                    Text(
                        "A legacy payment is still under review. Contact support if it needs attention.",
                        color = Muted,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }

                if (selected != null) {
                    Text("Secure checkout", style = MaterialTheme.typography.titleSmall, color = Muted)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Payment is handled securely by Polar in your browser. Return here after checkout and access will refresh automatically.",
                        color = Muted,
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = vm::startCheckout,
                        enabled = !state.startingCheckout && !state.openingPortal,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            when {
                                state.startingCheckout -> "Opening checkout…"
                                selected.polarCheckoutPending -> "Continue secure checkout"
                                else -> "Checkout securely with Polar"
                            },
                        )
                    }
                }
            }

            if (state.history.isNotEmpty()) {
                Spacer(Modifier.height(24.dp))
                Text("Purchase history", style = MaterialTheme.typography.titleSmall, color = Muted)
                Spacer(Modifier.height(8.dp))
                state.history.forEach { HistoryRow(it) }
            }

            val hasPolarPurchase = s.portal_available || state.history.any {
                "polar".equals(it.provider, ignoreCase = true) ||
                    "polar".equals(it.method, ignoreCase = true)
            }
            if (hasPolarPurchase) {
                Spacer(Modifier.height(16.dp))
                OutlinedButton(
                    onClick = vm::openCustomerPortal,
                    enabled = !state.openingPortal && !state.startingCheckout,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (state.openingPortal) "Opening Polar…" else "View receipts in Polar")
                }
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
                        device.polarCheckoutPending -> "Checkout pending — select to continue"
                        device.legacyPaymentPending -> "Legacy payment under review"
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
                device.legacyPaymentPending -> Text(
                    "Under review", color = Yellow, style = MaterialTheme.typography.labelLarge,
                )
                else -> TextButton(onClick = onSelect) {
                    Text(if (selected) "Selected" else if (device.polarCheckoutPending) "Continue" else "Select")
                }
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
            color = when (r.status.lowercase()) {
                "approved", "paid", "succeeded", "completed" -> Green
                "declined", "failed", "canceled", "cancelled", "refunded" -> Red
                else -> Yellow
            },
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
