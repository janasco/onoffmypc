package com.onoffmypc.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.ui.theme.Green
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow

/** Power controls shared by list and detail views. Disruptive commands require
 *  target-specific confirmation; controls lock while a request is in flight. */
@Composable
fun PowerControls(
    deviceName: String,
    commandInFlight: Boolean,
    onCommand: (CommandType) -> Unit,
    modifier: Modifier = Modifier,
) {
    var confirmation by remember { mutableStateOf<CommandType?>(null) }

    Column(modifier) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CmdButton(
                "Power On", Green, Modifier.weight(1f), !commandInFlight, "Power On $deviceName",
            ) {
                onCommand(CommandType.POWER_ON)
            }
            CmdButton(
                "Power Off", Red, Modifier.weight(1f), !commandInFlight, "Power Off $deviceName",
            ) {
                confirmation = CommandType.POWER_OFF
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CmdButton(
                "Force Off", Red, Modifier.weight(1f), !commandInFlight, "Force Off $deviceName",
            ) {
                confirmation = CommandType.POWER_OFF_FORCE
            }
            CmdButton(
                "Reset", Yellow, Modifier.weight(1f), !commandInFlight, "Reset $deviceName",
            ) {
                confirmation = CommandType.RESET
            }
        }
        if (commandInFlight) {
            Spacer(Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                Text("Submitting command request…", color = Muted)
            }
        }
    }

    confirmation?.let { type ->
        AlertDialog(
            onDismissRequest = { confirmation = null },
            title = { Text("${type.label} “$deviceName”?") },
            text = { Text(commandConsequence(type, deviceName)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmation = null
                    onCommand(type)
                }) { Text(type.label, color = Red) }
            },
            dismissButton = {
                TextButton(onClick = { confirmation = null }) { Text("Cancel") }
            },
        )
    }
}

@Composable
fun RowScope.CmdButton(
    label: String,
    color: Color,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    accessibilityLabel: String = label,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        modifier = modifier.semantics { contentDescription = accessibilityLabel },
        enabled = enabled,
        colors = ButtonDefaults.buttonColors(
            containerColor = color,
            contentColor = Color.White,
            disabledContainerColor = color.copy(alpha = 0.45f),
            disabledContentColor = Color.White.copy(alpha = 0.7f),
        ),
    ) {
        Text(label)
    }
}

private fun commandConsequence(type: CommandType, deviceName: String): String = when (type) {
    CommandType.POWER_OFF ->
        "This asks “$deviceName” to press the PC power button. The computer may begin shutting down, and unsaved work could be lost."
    CommandType.RESET ->
        "This asks “$deviceName” to press the PC reset switch. The computer will restart immediately and unsaved work could be lost."
    CommandType.POWER_OFF_FORCE ->
        "This asks “$deviceName” to hold the PC power button for 6 seconds. Power may be cut immediately and unsaved work could be lost. Use only when normal Power Off does not work."
    CommandType.POWER_ON -> "This asks “$deviceName” to turn the PC on."
}
