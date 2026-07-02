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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.data.model.Telemetry
import com.onoffmypc.android.ui.components.PowerControls
import com.onoffmypc.android.ui.theme.Accent
import com.onoffmypc.android.ui.theme.Green
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.OnBackground
import com.onoffmypc.android.ui.theme.Red
import java.time.Instant

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceDetailScreen(
    deviceId: String,
    onBack: () -> Unit,
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
                    TextButton(onClick = onBack) { Text("←") }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))

                state.device == null -> Text(
                    text = state.error ?: "Device not found.",
                    color = Muted,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp),
                )

                else -> DetailContent(state) { vm.sendCommand(it) }
            }
        }
    }
}

@Composable
private fun DetailContent(state: DeviceDetailUiState, onCommand: (com.onoffmypc.android.data.model.CommandType) -> Unit) {
    val latest = state.latest

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = if (state.online) "Online" else "Offline",
                color = if (state.online) Green else Muted,
                style = MaterialTheme.typography.labelLarge,
            )
            state.device?.firmware_version?.let {
                Text(
                    text = "  •  Firmware $it",
                    color = Muted,
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("PC State", pcText(latest), Modifier.weight(1f), pcColor(latest))
            StatCard("Temperature", latest?.room_temp?.let { "%.1f°C".format(it) } ?: "—", Modifier.weight(1f))
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("Humidity", latest?.room_humidity?.let { "%.0f%%".format(it) } ?: "—", Modifier.weight(1f))
            StatCard("Signal", latest?.rssi?.let { "$it dBm" } ?: "—", Modifier.weight(1f))
        }
        Spacer(Modifier.height(8.dp))
        StatCard("Last Update", timeAgo(latest?.recorded_at), Modifier.fillMaxWidth())

        Spacer(Modifier.height(20.dp))
        PowerControls(onCommand = onCommand)

        Spacer(Modifier.height(24.dp))
        Text("Temperature — last 7 days", style = MaterialTheme.typography.titleSmall, color = Muted)
        Spacer(Modifier.height(8.dp))
        TemperatureChart(state.history.mapNotNull { it.temp_avg })
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier, valueColor: Color = OnBackground) {
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
            .height(160.dp),
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

private fun pcText(t: Telemetry?): String = when (t?.pc_on) {
    1 -> "On"
    0 -> "Off"
    else -> "—"
}

private fun pcColor(t: Telemetry?): Color = when (t?.pc_on) {
    1 -> Green
    0 -> Red
    else -> OnBackground
}

private fun timeAgo(iso: String?): String {
    if (iso == null) return "—"
    return try {
        val diff = (Instant.now().toEpochMilli() - Instant.parse(iso).toEpochMilli()) / 1000
        when {
            diff < 60 -> "${diff}s ago"
            diff < 3600 -> "${diff / 60}m ago"
            else -> "${diff / 3600}h ago"
        }
    } catch (_: Exception) {
        "—"
    }
}
