package com.onoffmypc.android.ui.billing

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
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
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
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
import com.onoffmypc.android.ui.designsystem.LoadingState
import com.onoffmypc.android.ui.designsystem.shouldUseSingleColumnLayout
import com.onoffmypc.android.ui.theme.OnOffTheme

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
                navigationIcon = {
                    TextButton(
                        onClick = onBack,
                        modifier = Modifier
                            .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                            .semantics { contentDescription = "Back to account" },
                    ) { Text("←") }
                },
            )
        },
    ) { padding ->
        if (state.loading) {
            LoadingState(
                contentDescription = "Loading device access",
                modifier = Modifier.padding(padding),
            )
            return@Scaffold
        }
        val s = state.status
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = vm::refresh,
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            if (s == null) {
                Text(
                    state.error ?: "Couldn't load billing.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                return@Column
            }

            PlanCard(s)

            state.error?.let {
                Spacer(Modifier.height(12.dp))
                Text(
                    it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive },
                )
            }

            if (!s.billing_enabled) {
                Spacer(Modifier.height(16.dp))
                Card(Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Free full access",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            "Billing is currently off. Every device can use remote controls without a trial limit or unlock purchase.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            } else {
            val devicePlan = s.plans.firstOrNull { it.id == "device" }
            if (!s.is_lifetime) {
                Spacer(Modifier.height(20.dp))
                Text(
                    "One-time device unlock",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                Card(Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "${devicePlan?.name ?: "Device Unlock"} — $${devicePlan?.price ?: s.price} per device",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            "Pay once for the selected device. No subscription. Contact support before deleting a purchased device so its unlock can be transferred safely.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            if (s.is_lifetime) {
                Spacer(Modifier.height(16.dp))
                Card(Modifier.fillMaxWidth()) {
                    Text(
                        "Your legacy Lifetime access covers every device on this account. No additional purchase is needed.",
                        color = OnOffTheme.status.positive,
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            } else {
                Spacer(Modifier.height(20.dp))
                Text(
                    "Choose a device",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                if (s.devices.isEmpty()) {
                    Text(
                        "Add a device before purchasing an unlock.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                } else if (s.devices.any { it.legacyPaymentPending }) {
                    Text(
                        "A legacy payment is still under review. Contact support if it needs attention.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }

                if (selected != null) {
                    Text(
                        "Secure checkout",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Checkout opens securely in your browser. Return here afterward and access will refresh automatically.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                                selected.polarCheckoutPending -> "Continue checkout"
                                else -> "Pay now"
                            },
                        )
                    }
                }
            }

            }

            if (state.history.isNotEmpty()) {
                Spacer(Modifier.height(24.dp))
                Text(
                    "Purchase history",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                state.history.forEach { HistoryRow(it) }
            }

            val hasReceiptPortal = s.portal_available || state.history.any {
                "polar".equals(it.provider, ignoreCase = true) ||
                    "polar".equals(it.method, ignoreCase = true)
            }
            if (hasReceiptPortal) {
                Spacer(Modifier.height(16.dp))
                OutlinedButton(
                    onClick = vm::openCustomerPortal,
                    enabled = !state.openingPortal && !state.startingCheckout,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (state.openingPortal) "Opening…" else "Manage receipts")
                }
            }
            Spacer(Modifier.height(24.dp))
        }
        }
    }
}

@Composable
private fun PlanCard(s: BillingStatus) {
    Card(Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    "Current access",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium,
                )
                Text(
                    when {
                        !s.billing_enabled -> "Free access"
                        s.is_lifetime -> "Lifetime (legacy)"
                        else -> "Per device"
                    },
                    color = when {
                        !s.billing_enabled || s.is_lifetime -> OnOffTheme.status.positive
                        else -> MaterialTheme.colorScheme.primary
                    },
                    style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.height(6.dp))
            val statusText = when {
                !s.billing_enabled -> "All devices have full access while billing is off."
                s.is_lifetime -> "All devices on this account remain unlocked."
                s.devices.isEmpty() -> "Each device includes its own 30-day free trial."
                else -> "${s.devices.count { it.unlocked }} of ${s.devices.size} devices unlocked"
            }
            Text(
                statusText,
                color = if (s.billing_enabled && s.trial_expired) {
                    OnOffTheme.status.warning
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (s.billing_enabled && s.trial_expired) FontWeight.Bold else FontWeight.Normal,
            )
            if (s.billing_enabled && !s.is_lifetime) {
                Spacer(Modifier.height(4.dp))
                Text(
                    "Unlock price: $${s.plans.firstOrNull { it.id == "device" }?.price ?: s.price} one time per device",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium,
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
    val fontScale = LocalDensity.current.fontScale
    Card(Modifier.fillMaxWidth()) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
            val singleColumn = shouldUseSingleColumnLayout(maxWidth.value, fontScale)
            if (singleColumn) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    DeviceAccessDescription(device, Modifier.fillMaxWidth())
                    DeviceAccessAction(device, selected, onSelect)
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    DeviceAccessDescription(device, Modifier.weight(1f))
                    DeviceAccessAction(device, selected, onSelect)
                }
            }
        }
    }
}

@Composable
private fun DeviceAccessDescription(device: BillingDevice, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
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
                device.unlocked -> OnOffTheme.status.positive
                device.pending -> OnOffTheme.status.warning
                deviceTrialExpired(device) -> OnOffTheme.status.warning
                else -> MaterialTheme.colorScheme.onSurfaceVariant
            },
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@Composable
private fun DeviceAccessAction(device: BillingDevice, selected: Boolean, onSelect: () -> Unit) {
    when {
        device.unlocked -> Text(
            "Unlocked",
            color = OnOffTheme.status.positive,
            style = MaterialTheme.typography.labelLarge,
        )
        device.legacyPaymentPending -> Text(
            "Under review",
            color = OnOffTheme.status.warning,
            style = MaterialTheme.typography.labelLarge,
        )
        else -> TextButton(onClick = onSelect) {
            Text(if (selected) "Selected" else if (device.polarCheckoutPending) "Continue" else "Select")
        }
    }
}

@Composable
private fun HistoryRow(r: PaymentRequestItem) {
    val fontScale = LocalDensity.current.fontScale
    BoxWithConstraints(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        val details: @Composable () -> Unit = {
            Column {
            Text(r.device_name ?: r.method ?: r.plan, style = MaterialTheme.typography.bodyMedium)
            val method = r.method
            if (r.device_name != null && method != null) {
                Text(
                    method,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.labelSmall,
                )
            }
            Text(
                fmtDate(r.created_at),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelSmall,
            )
        }
        }
        val status: @Composable () -> Unit = {
            Text(
            r.status,
            color = when (r.status.lowercase()) {
                "approved", "paid", "succeeded", "completed" -> OnOffTheme.status.positive
                "declined", "failed", "canceled", "cancelled", "refunded" ->
                    MaterialTheme.colorScheme.error
                else -> OnOffTheme.status.warning
            },
            style = MaterialTheme.typography.labelMedium,
        )
        }
        if (shouldUseSingleColumnLayout(maxWidth.value, fontScale)) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                details()
                status()
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                details()
                status()
            }
        }
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
