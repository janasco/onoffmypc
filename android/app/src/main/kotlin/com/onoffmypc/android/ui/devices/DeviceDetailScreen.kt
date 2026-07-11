package com.onoffmypc.android.ui.devices

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.data.model.Command
import com.onoffmypc.android.ui.components.PowerControls
import com.onoffmypc.android.ui.components.commandStatusColor
import com.onoffmypc.android.ui.components.commandStatusLabel
import com.onoffmypc.android.ui.components.DeviceStatusSummary
import com.onoffmypc.android.ui.components.deviceStatusPresentation
import com.onoffmypc.android.ui.theme.Accent
import com.onoffmypc.android.ui.theme.Muted
import java.time.Instant
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceDetailScreen(
    deviceId: String,
    onBack: () -> Unit,
    onUpgrade: () -> Unit = {},
    vm: DeviceDetailViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(deviceId) { vm.start(deviceId) }
    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            vm.consumeMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.device?.name ?: "Device") },
                navigationIcon = {
                    TextButton(
                        onClick = onBack,
                        modifier = Modifier.semantics { contentDescription = "Back to devices" },
                    ) { Text("←") }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { vm.onPullRefresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.loading -> CircularProgressIndicator(
                    Modifier
                        .align(Alignment.Center)
                        .clearAndSetSemantics { contentDescription = "Loading device details" },
                )

                state.device == null -> Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("Couldn't load device", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    Text("Check your connection and try again.", color = Muted)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = vm::onPullRefresh) { Text("Retry") }
                }

                else -> DetailContent(
                    state = state,
                    onRetry = vm::onPullRefresh,
                    onCommand = vm::sendCommand,
                )
            }
        }
    }

    if (state.upgradePrompt) {
        AlertDialog(
            onDismissRequest = { vm.consumeUpgradePrompt() },
            title = { Text("Device trial ended") },
            text = { Text("Unlock ${state.device?.name ?: "this device"} for \$${state.unlockPrice} one time to continue controlling it.") },
            confirmButton = {
                TextButton(onClick = { vm.consumeUpgradePrompt(); onUpgrade() }) { Text("Unlock device") }
            },
            dismissButton = { TextButton(onClick = { vm.consumeUpgradePrompt() }) { Text("Not now") } },
        )
    }
}

@Composable
private fun DetailContent(
    state: DeviceDetailUiState,
    onRetry: () -> Unit,
    onCommand: (com.onoffmypc.android.data.model.CommandType) -> Unit,
) {
    val latest = state.latest
    val device = state.device ?: return
    val status = deviceStatusPresentation(
        lastSeenAt = state.lastSeenAt ?: device.last_seen_at,
        pcOn = latest?.pc_on ?: device.pc_on,
        connection = state.connection,
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text("Device status", style = MaterialTheme.typography.titleSmall, color = Muted)
        Spacer(Modifier.height(6.dp))
        DeviceStatusSummary(status)
        device.firmware_version?.let {
            Spacer(Modifier.height(3.dp))
            Text("Firmware $it", color = Muted, style = MaterialTheme.typography.labelMedium)
        }
        if (state.error != null) {
            Spacer(Modifier.height(12.dp))
            Card(Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(start = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        "Some device information could not be refreshed.",
                        color = Muted,
                        modifier = Modifier.weight(1f).padding(vertical = 12.dp),
                    )
                    TextButton(onClick = onRetry) { Text("Retry") }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard(
                "PC State",
                pcText(latest?.pc_on ?: device.pc_on),
                Modifier.weight(1f),
            )
            StatCard(
                "Temperature",
                latest?.room_temp?.let { "%.1f°C".format(it) } ?: "Not reported",
                Modifier.weight(1f),
            )
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard(
                "Humidity",
                latest?.room_humidity?.let { "%.0f%%".format(it) } ?: "Not reported",
                Modifier.weight(1f),
            )
            StatCard(
                "Signal",
                latest?.rssi?.let { "$it dBm" } ?: "Not reported",
                Modifier.weight(1f),
            )
        }
        Spacer(Modifier.height(8.dp))
        StatCard(
            "Latest Telemetry",
            latest?.recorded_at?.let { timeAgo(it) } ?: "No telemetry received yet",
            Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(20.dp))
        PowerControls(
            deviceName = state.device?.name ?: "this device",
            commandInFlight = state.commandInFlight,
            onCommand = onCommand,
        )

        Spacer(Modifier.height(24.dp))
        Text("Temperature — last 7 days", style = MaterialTheme.typography.titleSmall, color = Muted)
        Spacer(Modifier.height(8.dp))
        TemperatureChart(state.history.mapNotNull { it.temp_avg })

        Spacer(Modifier.height(24.dp))
        Text("Command history", style = MaterialTheme.typography.titleSmall, color = Muted)
        Spacer(Modifier.height(8.dp))
        if (state.commands.isEmpty()) {
            Text("No commands yet.", color = Muted, style = MaterialTheme.typography.bodySmall)
        } else {
            state.commands.forEach { CommandRow(it) }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun CommandRow(command: Command) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(commandLabel(command.type), style = MaterialTheme.typography.bodyMedium)
            Text(fmtDateTime(command.created_at), style = MaterialTheme.typography.labelSmall, color = Muted)
        }
        Spacer(Modifier.height(2.dp))
        Text(
            commandStatusLabel(command.status),
            color = commandStatusColor(command.status),
            style = MaterialTheme.typography.labelMedium,
        )
    }
}

private fun commandLabel(type: String?): String = when (type) {
    "power_on" -> "Power On"
    "power_off" -> "Power Off"
    "power_off_force" -> "Force Off"
    "reset" -> "Reset"
    else -> type ?: "Unknown command"
}

private fun fmtDateTime(iso: String?): String {
    if (iso == null) return ""
    return try {
        OffsetDateTime.parse(iso).toLocalDateTime().format(DateTimeFormatter.ofPattern("MMM d, HH:mm"))
    } catch (_: Exception) {
        ""
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier, valueColor: Color = Color.Unspecified) {
    Card(modifier) {
        Column(Modifier.padding(12.dp)) {
            Text(label, color = Muted, style = MaterialTheme.typography.labelSmall)
            Text(value, color = valueColor, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun TemperatureChart(temps: List<Double>) {
    if (temps.size < 2) {
        Text("Not enough data yet for a chart.", color = Muted, style = MaterialTheme.typography.bodySmall)
        return
    }
    val minT = temps.min()
    val maxT = temps.max()
    val range = (maxT - minT).let { if (it == 0.0) 1.0 else it }

    Canvas(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp)
            .clearAndSetSemantics {
                contentDescription = "Temperature history. Minimum %.1f degrees Celsius, maximum %.1f degrees Celsius."
                    .format(minT, maxT)
            },
    ) {
        val pad = 8.dp.toPx()
        val w = size.width
        val h = size.height
        val n = temps.size
        val path = Path()
        temps.forEachIndexed { i, t ->
            val x = pad + (i.toFloat() / (n - 1)) * (w - 2 * pad)
            val y = h - pad - (((t - minT) / range).toFloat()) * (h - 2 * pad)
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        drawPath(
            path = path,
            color = Accent,
            style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round),
        )
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("%.1f°C".format(minT), color = Muted, style = MaterialTheme.typography.labelSmall)
        Text("%.1f°C".format(maxT), color = Muted, style = MaterialTheme.typography.labelSmall)
    }
}

private fun pcText(pcOn: Int?): String = when (pcOn) {
    1 -> "Last reported: on"
    0 -> "Last reported: off"
    else -> "Not reported"
}

private fun timeAgo(iso: String?): String {
    if (iso == null) return "No telemetry received yet"
    return try {
        val diff = ((Instant.now().toEpochMilli() - Instant.parse(iso).toEpochMilli()) / 1000).coerceAtLeast(0)
        when {
            diff < 15 -> "Just now"
            diff < 60 -> "${diff}s ago"
            diff < 3_600 -> "${diff / 60}m ago"
            diff < 86_400 -> "${diff / 3_600}h ago"
            else -> "${diff / 86_400}d ago"
        }
    } catch (_: Exception) {
        "Time unavailable"
    }
}
