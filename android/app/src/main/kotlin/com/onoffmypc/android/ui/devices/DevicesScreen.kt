package com.onoffmypc.android.ui.devices

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
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
import androidx.compose.ui.unit.dp
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
import com.onoffmypc.android.ui.designsystem.EmptyState
import com.onoffmypc.android.ui.designsystem.ErrorState
import com.onoffmypc.android.ui.designsystem.LoadingState
import com.onoffmypc.android.ui.designsystem.Spacing
import com.onoffmypc.android.ui.designsystem.StatusRole
import com.onoffmypc.android.ui.designsystem.statusPalette
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.OutlinedButton
import com.onoffmypc.android.ui.components.confirmActionLabel
import com.onoffmypc.android.ui.theme.OnOffTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevicesScreen(
    onOpen: (Device) -> Unit,
    onAccount: () -> Unit,
    onBilling: (String?) -> Unit,
    onLoggedOut: () -> Unit,
    onDashboardMockup: () -> Unit = {},
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
    var bulkConfirmCommand by remember { mutableStateOf<CommandType?>(null) }

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
                        AppLogo(size = 30.dp, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("OnOffMyPC")
                    }
                },
                actions = {
                    if (state.devices.isNotEmpty()) {
                        TextButton(
                            onClick = { vm.toggleSelectMode() },
                            modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                        ) {
                            Text(if (state.selectMode) "Done" else "Select")
                        }
                    }
                    Box {
                        TextButton(
                            onClick = { menuOpen = true },
                            modifier = Modifier
                                .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                                .semantics { contentDescription = "Open menu" },
                        ) {
                            Text("☰", style = MaterialTheme.typography.headlineSmall)
                        }
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(
                                text = { Text("Account") },
                                onClick = { menuOpen = false; onAccount() },
                            )
                            DropdownMenuItem(
                                text = { Text("Dashboard concept") },
                                onClick = { menuOpen = false; onDashboardMockup() },
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
            if (!state.selectMode) {
                ExtendedFloatingActionButton(onClick = { showAdd = true }) { Text("Add device") }
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.loading -> LoadingState(
                    contentDescription = "Loading devices",
                    modifier = Modifier.align(Alignment.Center),
                )

                state.error != null -> ErrorState(
                    title = "Couldn't load devices",
                    message = "Check your connection and try again.",
                    modifier = Modifier.align(Alignment.Center),
                    onRetry = vm::load,
                )

                else -> {
                    Column(modifier = Modifier.fillMaxSize()) {
                        if (state.selectMode) {
                            BulkActionBar(
                                selectedCount = state.selectedDeviceIds.size,
                                bulkSendBusy = state.bulkCommandInFlight,
                                onBulkCommand = { type ->
                                    if (type == CommandType.POWER_ON || type == CommandType.SLEEP) {
                                        vm.sendBulkCommand(type)
                                    } else {
                                        bulkConfirmCommand = type
                                    }
                                }
                            )
                        }

                        PullToRefreshBox(
                            isRefreshing = state.refreshing,
                            onRefresh = vm::refresh,
                            modifier = Modifier.fillMaxSize().weight(1f),
                        ) {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(
                                    start = Spacing.md,
                                    top = Spacing.md,
                                    end = Spacing.md,
                                    bottom = 88.dp,
                                ),
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
                                if (state.devices.isNotEmpty()) {
                                    item {
                                        FleetSummaryCard(
                                            summary = computeFleetSummary(state.devices, state.billing),
                                        )
                                    }
                                }
                                if (state.devices.isEmpty()) {
                                    item {
                                        EmptyState(
                                            title = "No devices yet",
                                            message = "Add your first device to view its connection and last-reported PC status.",
                                            actionLabel = "Add device",
                                            onAction = { showAdd = true },
                                        )
                                    }
                                } else {
                                    items(state.devices, key = { it.id }) { device ->
                                        DeviceCard(
                                            device = device,
                                            commandInFlight = device.id in state.commandInFlightDeviceIds,
                                            selectMode = state.selectMode,
                                            selected = device.id in state.selectedDeviceIds,
                                            onSelectedChange = { selected ->
                                                vm.toggleDeviceSelected(device.id)
                                            },
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

    bulkConfirmCommand?.let { type ->
        val selectedIds = state.selectedDeviceIds
        val count = selectedIds.size
        val targetNames = state.devices
            .filter { it.id in selectedIds }
            .map { it.name }
        val namesSummary = if (targetNames.size <= 4) {
            targetNames.joinToString(", ")
        } else {
            targetNames.take(4).joinToString(", ") + " and ${targetNames.size - 4} more"
        }
        val label = type.label
        val message = when (type) {
            CommandType.POWER_OFF ->
                "This asks the targets to press the PC power button. The computers may begin shutting down, and unsaved work could be lost."
            CommandType.RESET ->
                "This asks the targets to press the PC reset switch. The computers will restart immediately and unsaved work could be lost."
            CommandType.POWER_OFF_FORCE ->
                "This asks the targets to hold the PC power button for 6 seconds. Power may be cut immediately and unsaved work could be lost. Use only when normal Power Off does not work."
            else -> ""
        }
        AlertDialog(
            onDismissRequest = { bulkConfirmCommand = null },
            title = { Text("$label $count device${if (count == 1) "" else "s"}?") },
            text = { Text("$message Targets: $namesSummary.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        bulkConfirmCommand = null
                        vm.sendBulkCommand(type)
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error,
                    ),
                ) { Text("$label all") }
            },
            dismissButton = {
                TextButton(onClick = { bulkConfirmCommand = null }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun DeviceCard(
    device: Device,
    commandInFlight: Boolean,
    selectMode: Boolean,
    selected: Boolean,
    onSelectedChange: (Boolean) -> Unit,
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

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (selectMode) {
                    Modifier.clickable { onSelectedChange(!selected) }
                } else {
                    Modifier
                }
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (selected && selectMode) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.15f)
            } else {
                MaterialTheme.colorScheme.surfaceContainerLow
            },
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (selectMode) {
                    Checkbox(
                        checked = selected,
                        onCheckedChange = onSelectedChange,
                        modifier = Modifier.padding(end = Spacing.xs)
                    )
                }
                Text(
                    text = device.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                if (!selectMode) {
                    Box {
                        TextButton(
                            onClick = { menuOpen = true },
                            modifier = Modifier
                                .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                                .semantics {
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
                                text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                                onClick = { menuOpen = false; onDelete() },
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(Spacing.xs))
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = MaterialTheme.shapes.medium,
                modifier = Modifier.fillMaxWidth(),
            ) {
                DeviceStatusSummary(
                    presentation = status,
                    modifier = Modifier.padding(Spacing.smMd),
                )
            }
            if (!selectMode) {
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
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BulkActionBar(
    selectedCount: Int,
    bulkSendBusy: Boolean,
    onBulkCommand: (CommandType) -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = MaterialTheme.shapes.medium,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
    ) {
        Column(
            modifier = Modifier.padding(Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "$selectedCount selected",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                if (bulkSendBusy) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp
                    )
                }
            }
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
                verticalArrangement = Arrangement.spacedBy(Spacing.xs)
            ) {
                val enabled = !bulkSendBusy && selectedCount > 0
                val operational = OnOffTheme.status

                Button(
                    onClick = { onBulkCommand(CommandType.POWER_ON) },
                    enabled = enabled,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = operational.powerOnBackground,
                        contentColor = operational.powerOnForeground,
                    ),
                    modifier = Modifier.semantics { contentDescription = "Bulk Power On" }
                ) {
                    Text("Power On")
                }

                FilledTonalButton(
                    onClick = { onBulkCommand(CommandType.SLEEP) },
                    enabled = enabled,
                    modifier = Modifier.semantics { contentDescription = "Bulk Sleep" }
                ) {
                    Text("Sleep")
                }

                FilledTonalButton(
                    onClick = { onBulkCommand(CommandType.POWER_OFF) },
                    enabled = enabled,
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = operational.powerOffBackground,
                        contentColor = operational.powerOffForeground,
                    ),
                    modifier = Modifier.semantics { contentDescription = "Bulk Power Off" }
                ) {
                    Text("Power Off")
                }

                OutlinedButton(
                    onClick = { onBulkCommand(CommandType.POWER_OFF_FORCE) },
                    enabled = enabled,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.error),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error,
                    ),
                    modifier = Modifier.semantics { contentDescription = "Bulk Force Off" }
                ) {
                    Text("Force Off")
                }

                Button(
                    onClick = { onBulkCommand(CommandType.RESET) },
                    enabled = enabled,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = operational.powerResetBackground,
                        contentColor = operational.powerResetForeground,
                    ),
                    modifier = Modifier.semantics { contentDescription = "Bulk Reset" }
                ) {
                    Text("Reset")
                }
            }
        }
    }
}

@Composable
private fun DeletionBanner(onManage: () -> Unit) {
    val palette = statusPalette(StatusRole.Danger)
    Card(colors = CardDefaults.cardColors(containerColor = palette.container)) {
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
                color = palette.content,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onManage) { Text("Cancel") }
        }
    }
}

@Composable
private fun VerifyEmailBanner(onResend: () -> Unit) {
    val palette = statusPalette(StatusRole.Pending)
    Card(colors = CardDefaults.cardColors(containerColor = palette.container)) {
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
                color = palette.content,
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
    val trialDevices = locked.filter { !it.pending }
    val expiredCount = trialDevices.count { deviceTrialExpired(it) }
    val pendingCheckoutCount = locked.count { it.polarCheckoutPending }
    val pendingReviewCount = locked.count { it.legacyPaymentPending }
    val days = trialDevices.mapNotNull { trialDaysLeft(it.trial_ends_at) }.minOrNull()
        ?: trialDaysLeft(billing.trial_ends_at)
    val expired = if (billing.devices.isEmpty()) billing.trial_expired else expiredCount > 0
    val needsAttention = expired || pendingCheckoutCount > 0 || pendingReviewCount > 0
    val palette = statusPalette(if (needsAttention) StatusRole.Pending else StatusRole.Information)
    Card(colors = CardDefaults.cardColors(containerColor = palette.container)) {
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
                    pendingCheckoutCount > 0 -> "$pendingCheckoutCount device checkout${if (pendingCheckoutCount == 1) " is" else "s are"} ready to continue."
                    pendingReviewCount > 0 -> "$pendingReviewCount legacy device payment${if (pendingReviewCount == 1) " is" else "s are"} under review."
                    billing.devices.isEmpty() && expired -> "Free trial ended. Unlock a device for $${billing.price} one time."
                    days != null -> "Device trial: $days day${if (days == 1L) "" else "s"} left on the next device."
                    else -> "Each device includes a free trial."
                },
                color = palette.content,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onUpgrade) {
                Text(
                    when {
                        expired -> "Unlock"
                        pendingCheckoutCount > 0 -> "Continue"
                        else -> "Manage"
                    },
                )
            }
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
