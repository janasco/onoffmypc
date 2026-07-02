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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.ui.components.PowerControls
import com.onoffmypc.android.ui.components.deviceStatusFromLastSeen
import com.onoffmypc.android.ui.theme.Muted

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevicesScreen(
    onOpen: (Device) -> Unit,
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
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(state.devices, key = { it.id }) { device ->
                        DeviceCard(
                            device = device,
                            onOpen = { onOpen(device) },
                            onCommand = { type -> vm.sendCommand(device, type) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DeviceCard(
    device: Device,
    onOpen: () -> Unit,
    onCommand: (CommandType) -> Unit,
) {
    val (statusText, statusColor) = deviceStatusFromLastSeen(device)

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
            PowerControls(onCommand = onCommand)
            Spacer(Modifier.height(4.dp))
            TextButton(onClick = onOpen) { Text("View details →") }
        }
    }
}
