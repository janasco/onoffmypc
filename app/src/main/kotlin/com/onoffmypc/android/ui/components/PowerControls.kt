package com.onoffmypc.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.ui.theme.Green
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow
import java.time.Instant

/** The four power commands laid out 2x2, with a confirmation for Force Off. */
@Composable
fun PowerControls(onCommand: (CommandType) -> Unit, modifier: Modifier = Modifier) {
    var confirmForceOff by remember { mutableStateOf(false) }

    Column(modifier) {
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
fun RowScope.CmdButton(label: String, color: Color, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier,
        colors = ButtonDefaults.buttonColors(containerColor = color, contentColor = Color.White),
    ) {
        Text(label)
    }
}

/** Dashboard status from last_seen_at (online if seen within 90s) + latest pc_on. */
fun deviceStatusFromLastSeen(device: Device): Pair<String, Color> {
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
