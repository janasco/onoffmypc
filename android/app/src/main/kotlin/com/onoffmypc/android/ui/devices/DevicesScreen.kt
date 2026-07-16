package com.onoffmypc.android.ui.devices

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.ui.components.AppLogo
import com.onoffmypc.android.ui.components.LogoutConfirmDialog
import com.onoffmypc.android.ui.components.PowerControls
import com.onoffmypc.android.ui.components.DeviceStatusSummary
import com.onoffmypc.android.ui.components.deviceStatusPresentation
import com.onoffmypc.android.ui.theme.Muted
import androidx.compose.ui.graphics.Color
import com.onoffmypc.android.ui.theme.Accent
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevicesScreen(
    onOpen: (Device) -> Unit,
    onAccount: () -> Unit,
    onBilling: (String?) -> Unit,
    onLoggedOut: () -> Unit,
    vm: DevicesViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    var showAdd by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf<Device?>(null) }
    var deleting by remember { mutableStateOf<Device?>(null) }
    var replacing by remember { mutableStateOf<Device?>(null) }
    var menuOpen by remember { mutableStateOf(false) }
    var confirmLogout by remember { mutableStateOf(false) }
    var hasResumedOnce by remember { mutableStateOf(false) }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            vm.consumeMessage()
        }
    }

    LifecycleResumeEffect(Unit) {
        if (hasResumedOnce) vm.refreshBilling() else hasResumedOnce = true
        onPauseOrDispose { }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AppLogo(size = 30.dp)
                        Spacer(Modifier.width(8.dp))
                        Text("OnOffMyPC")
                    }
                },
                actions = {
                    Box {
                        TextButton(
                            onClick = { menuOpen = true },
                            modifier = Modifier.semantics { contentDescription = "Open menu" },
                        ) {
                            Text("☰", style = MaterialTheme.typography.headlineSmall)
                        }
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(
                                text = { Text("Account") },
                                onClick = { menuOpen = false; onAccount() },
                            )
                            DropdownMenuItem(
                                text = { Text("Logout") },
                                onClick = { menuOpen = false; confirmLogout = true },
                            )
                        }
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = { showAdd = true }) { Text("Add device") }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.loading -> CircularProgressIndicator(
                    Modifier
                        .align(Alignment.Center)
                        .clearAndSetSemantics { contentDescription = "Loading devices" },
                )

                state.error != null -> Column(
                    modifier = Modifier.align(Alignment.Center).padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("Couldn't load devices", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Check your connection and try again.",
                        color = Muted,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = vm::load) { Text("Retry") }
                }

                else -> PullToRefreshBox(
                    isRefreshing = state.refreshing,
                    onRefresh = vm::refresh,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        val user = state.user
                        if (user?.deletion_at != null) {
                            item { DeletionBanner(onManage = onAccount) }
                        }
                        if (user != null && !user.email_verified) {
                            item { VerifyEmailBanner(onResend = vm::resendVerification) }
                        }
                        state.billing?.let { b ->
                            if (b.billing_enabled && !b.is_lifetime && (b.devices.isEmpty() || b.devices.any { !it.unlocked })) {
                                item { TrialBanner(billing = b, onUpgrade = { onBilling(null) }) }
                            }
                        }
                        if (state.devices.isEmpty()) {
                            item {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 48.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Text("No devices yet", style = MaterialTheme.typography.titleMedium)
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        "Add your first device to view its connection and last-reported PC status.",
                                        color = Muted,
                                        textAlign = TextAlign.Center,
                                    )
                                    Spacer(Modifier.height(12.dp))
                                    Button(onClick = { showAdd = true }) { Text("Add device") }
                                }
                            }
                        } else {
                            items(state.devices, key = { it.id }) { device ->
                                DeviceCard(
                                    device = device,
                                    commandInFlight = device.id in state.commandInFlightDeviceIds,
                                    onOpen = { onOpen(device) },
                                    onCommand = { type -> vm.sendCommand(device, type) },
                                    onRename = { renaming = device },
                                    onDelete = { deleting = device },
                                    onReplace = { replacing = device },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAdd) {
        AddDeviceDialog(
            onDismiss = { showAdd = false },
            onCreate = { name ->
                showAdd = false
                vm.addDevice(name)
            },
        )
    }
    renaming?.let { device ->
        RenameDeviceDialog(
            device = device,
            onDismiss = { renaming = null },
            onSave = { name ->
                renaming = null
                vm.renameDevice(device.id, name)
            },
        )
    }
    deleting?.let { device ->
        DeleteDeviceDialog(
            device = device,
            onDismiss = { deleting = null },
            onConfirm = {
                deleting = null
                vm.deleteDevice(device.id)
            },
        )
    }
    replacing?.let { device ->
        AlertDialog(
            onDismissRequest = { replacing = null },
            title = { Text("Replace device token?") },
            text = { Text("Use this if the ESP hardware was damaged or swapped. A new token is generated; the old one stops working and you'll flash the new ESP with it. Your device name and history are kept.") },
            confirmButton = {
                TextButton(onClick = { replacing = null; vm.rotateToken(device) }) { Text("Generate new token") }
            },
            dismissButton = { TextButton(onClick = { replacing = null }) { Text("Cancel") } },
        )
    }
    state.createdDevice?.let { created ->
        TokenRevealDialog(device = created, onDismiss = { vm.dismissCreatedDevice() })
    }
    if (confirmLogout) {
        LogoutConfirmDialog(
            onConfirm = { confirmLogout = false; vm.logout(onLoggedOut) },
            onDismiss = { confirmLogout = false },
        )
    }
    state.upgradeDeviceId?.let { deviceId ->
        val deviceName = state.devices.firstOrNull { it.id == deviceId }?.name ?: "this device"
        val unlockPrice = state.billing?.plans?.firstOrNull { it.id == "device" }?.price
            ?: state.billing?.price
            ?: 15
        AlertDialog(
            onDismissRequest = { vm.consumeUpgradePrompt() },
            title = { Text("Device trial ended") },
            text = { Text("The free trial for $deviceName has ended. Unlock this device for \$$unlockPrice one time to continue controlling it.") },
            confirmButton = {
                TextButton(onClick = { vm.consumeUpgradePrompt(); onBilling(deviceId) }) { Text("Unlock device") }
            },
            dismissButton = { TextButton(onClick = { vm.consumeUpgradePrompt() }) { Text("Not now") } },
        )
    }
}

@Composable
private fun DeviceCard(
    device: Device,
    commandInFlight: Boolean,
    onOpen: () -> Unit,
    onCommand: (CommandType) -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit,
    onReplace: () -> Unit,
) {
    val status = deviceStatusPresentation(
        lastSeenAt = device.last_seen_at,
        pcOn = device.pc_on,
        onlineLabel = "Recently online",
    )
    var menuOpen by remember { mutableStateOf(false) }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = device.name,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                Box {
                    TextButton(
                        onClick = { menuOpen = true },
                        modifier = Modifier.semantics {
                            contentDescription = "Device actions for ${device.name}"
                        },
                    ) { Text("⋮") }
                    DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                        DropdownMenuItem(
                            text = { Text("Rename") },
                            onClick = { menuOpen = false; onRename() },
                        )
                        DropdownMenuItem(
                            text = { Text("Replace token") },
                            onClick = { menuOpen = false; onReplace() },
                        )
                        DropdownMenuItem(
                            text = { Text("Delete", color = Red) },
                            onClick = { menuOpen = false; onDelete() },
                        )
                    }
                }
            }

            Spacer(Modifier.height(6.dp))
            DeviceStatusSummary(status)
            Spacer(Modifier.height(12.dp))
            PowerControls(
                deviceName = device.name,
                commandInFlight = commandInFlight,
                onCommand = onCommand,
            )
            Spacer(Modifier.height(4.dp))
            TextButton(
                onClick = onOpen,
                modifier = Modifier.semantics {
                    contentDescription = "View details for ${device.name}"
                },
            ) { Text("View details →") }
        }
    }
}

@Composable
private fun DeletionBanner(onManage: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Red.copy(alpha = 0.15f))) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Account scheduled for deletion.",
                style = MaterialTheme.typography.bodySmall,
                color = Red,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onManage) { Text("Cancel") }
        }
    }
}

@Composable
private fun VerifyEmailBanner(onResend: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Yellow.copy(alpha = 0.15f))) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Verify your email to secure your account.",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onResend) { Text("Resend") }
        }
    }
}

@Composable
private fun TrialBanner(
    billing: com.onoffmypc.android.data.model.BillingStatus,
    onUpgrade: () -> Unit,
) {
    val locked = billing.devices.filter { !it.unlocked }
    val actionable = locked.filter { !it.pending }
    val expiredCount = actionable.count { deviceTrialExpired(it) }
    val pendingCount = locked.count { it.pending }
    val days = actionable.mapNotNull { trialDaysLeft(it.trial_ends_at) }.minOrNull()
        ?: trialDaysLeft(billing.trial_ends_at)
    val expired = if (billing.devices.isEmpty()) billing.trial_expired else expiredCount > 0
    val tint = if (expired) Red else Accent
    Card(colors = CardDefaults.cardColors(containerColor = tint.copy(alpha = 0.12f))) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = when {
                    expiredCount > 0 -> "$expiredCount device trial${if (expiredCount == 1) " has" else "s have"} ended. Unlock each for $${billing.price} one time."
                    actionable.isEmpty() && pendingCount > 0 -> "$pendingCount device payment${if (pendingCount == 1) " is" else "s are"} under review."
                    billing.devices.isEmpty() && expired -> "Free trial ended. Unlock a device for $${billing.price} one time."
                    days != null -> "Device trial: $days day${if (days == 1L) "" else "s"} left on the next device."
                    else -> "Each device includes a free trial."
                },
                color = if (expired) Red else Color.Unspecified,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onUpgrade) { Text(if (expired) "Unlock" else "Manage") }
        }
    }
}

/** Whole days remaining until the trial ends, or null if unknown/past. */
private fun trialDaysLeft(iso: String?): Long? {
    if (iso == null) return null
    return try {
        val end = java.time.Instant.parse(iso).toEpochMilli()
        val diff = end - System.currentTimeMillis()
        if (diff <= 0) 0 else diff / 86_400_000L
    } catch (_: Exception) {
        null
    }
}

private fun trialHasEnded(iso: String?): Boolean {
    if (iso == null) return false
    return try {
        java.time.Instant.parse(iso).toEpochMilli() <= System.currentTimeMillis()
    } catch (_: Exception) {
        false
    }
}

private fun deviceTrialExpired(device: com.onoffmypc.android.data.model.BillingDevice): Boolean =
    device.trial_expired ?: trialHasEnded(device.trial_ends_at)
