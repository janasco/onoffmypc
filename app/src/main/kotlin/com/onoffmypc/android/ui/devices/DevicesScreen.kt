package com.onoffmypc.android.ui.devices

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.ui.theme.Green
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow
import java.time.Instant

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevicesScreen(
    onLoggedOut: () -> Unit,
    vm: DevicesViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            vm.consumeMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Your Devices") },
                actions = {
                    TextButton(onClick = { vm.logout(onLoggedOut) }) { Text("Sign out") }
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

                state.error != null -> Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(state.error!!, color = Muted)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = vm::load) { Text("Retry") }
                }

                state.devices.isEmpty() -> Text(
                    text = "No devices yet. Add one from the web dashboard.",
                    color = Muted,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp),
                )

                else -> LazyColumn(
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(state.devices, key = { it.id }) { device ->
                        DeviceCard(device) { type -> vm.sendCommand(device, type) }
                    }
                }
            }
        }
    }
}

@Composable
private fun DeviceCard(device: Device, onCommand: (CommandType) -> Unit) {
    var confirmForceOff by remember { mutableStateOf(false) }
    val (statusText, statusColor) = deviceStatus(device)

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(device.name, fontWeight = FontWeight.SemiBold)
                Text(statusText, color = statusColor, style = MaterialTheme.typography.labelMedium)
            }

            Spacer(Modifier.height(12.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CmdButton("Power On", Green, Modifier.weight(1f)) { onCommand(CommandType.POWER_ON) }
                CmdButton("Power Off", Red, Modifier.weight(1f)) { onCommand(CommandType.POWER_OFF) }
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CmdButton("Force Off", Red, Modifier.weight(1f)) { confirmForceOff = true }
                CmdButton("Reset", Yellow, Modifier.weight(1f)) { onCommand(CommandType.RESET) }
            }
        }
    }

    if (confirmForceOff) {
        AlertDialog(
            onDismissRequest = { confirmForceOff = false },
            title = { Text("Force Off?") },
            text = { Text("Force Off holds the power button for 6 seconds and cuts power immediately. Use only if normal Power Off has no effect.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmForceOff = false
                    onCommand(CommandType.POWER_OFF_FORCE)
                }) { Text("Force Off", color = Red) }
            },
            dismissButton = {
                TextButton(onClick = { confirmForceOff = false }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun CmdButton(label: String, color: Color, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier,
        colors = ButtonDefaults.buttonColors(containerColor = color, contentColor = Color.White),
    ) {
        Text(label)
    }
}

/** Online if telemetry was seen within 90s; PC state from the latest pc_on. */
private fun deviceStatus(device: Device): Pair<String, Color> {
    val online = device.last_seen_at?.let {
        try {
            Instant.now().toEpochMilli() - Instant.parse(it).toEpochMilli() < 90_000
        } catch (_: Exception) {
            false
        }
    } ?: false

    if (!online) return "Offline" to Muted
    return if (device.pc_on == 1) "PC On" to Green else "PC Off" to Red
}
