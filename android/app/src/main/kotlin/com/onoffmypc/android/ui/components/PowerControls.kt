package com.onoffmypc.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.ui.designsystem.Spacing
import com.onoffmypc.android.ui.designsystem.shouldUseSingleColumnLayout
import com.onoffmypc.android.ui.theme.OnOffTheme

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
    val fontScale = LocalDensity.current.fontScale

    Column(modifier) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            if (shouldUseSingleColumnLayout(maxWidth.value, fontScale)) {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    CmdButton(
                        label = "Power On",
                        style = CommandButtonStyle.PowerOn,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !commandInFlight,
                        accessibilityLabel = "Power On $deviceName",
                    ) { onCommand(CommandType.POWER_ON) }
                    CmdButton(
                        label = "Sleep",
                        style = CommandButtonStyle.Neutral,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !commandInFlight,
                        accessibilityLabel = "Sleep $deviceName",
                    ) { onCommand(CommandType.SLEEP) }
                    CmdButton(
                        label = "Power Off",
                        style = CommandButtonStyle.DestructiveTonal,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !commandInFlight,
                        accessibilityLabel = "Power Off $deviceName",
                    ) { confirmation = CommandType.POWER_OFF }
                    CmdButton(
                        label = "Force Off",
                        style = CommandButtonStyle.DestructiveOutline,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !commandInFlight,
                        accessibilityLabel = "Force Off $deviceName",
                    ) { confirmation = CommandType.POWER_OFF_FORCE }
                    CmdButton(
                        label = "Reset",
                        style = CommandButtonStyle.PowerReset,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !commandInFlight,
                        accessibilityLabel = "Reset $deviceName",
                    ) { confirmation = CommandType.RESET }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
                    ) {
                        CmdButton(
                            label = "Power On",
                            style = CommandButtonStyle.PowerOn,
                            modifier = Modifier.weight(1f),
                            enabled = !commandInFlight,
                            accessibilityLabel = "Power On $deviceName",
                        ) { onCommand(CommandType.POWER_ON) }
                        CmdButton(
                            label = "Sleep",
                            style = CommandButtonStyle.Neutral,
                            modifier = Modifier.weight(1f),
                            enabled = !commandInFlight,
                            accessibilityLabel = "Sleep $deviceName",
                        ) { onCommand(CommandType.SLEEP) }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
                    ) {
                        CmdButton(
                            label = "Power Off",
                            style = CommandButtonStyle.DestructiveTonal,
                            modifier = Modifier.weight(1f),
                            enabled = !commandInFlight,
                            accessibilityLabel = "Power Off $deviceName",
                        ) { confirmation = CommandType.POWER_OFF }
                        CmdButton(
                            label = "Force Off",
                            style = CommandButtonStyle.DestructiveOutline,
                            modifier = Modifier.weight(1f),
                            enabled = !commandInFlight,
                            accessibilityLabel = "Force Off $deviceName",
                        ) { confirmation = CommandType.POWER_OFF_FORCE }
                    }
                    CmdButton(
                        label = "Reset",
                        style = CommandButtonStyle.PowerReset,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !commandInFlight,
                        accessibilityLabel = "Reset $deviceName",
                    ) { confirmation = CommandType.RESET }
                }
            }
        }
        if (commandInFlight) {
            Spacer(Modifier.height(Spacing.sm))
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clearAndSetSemantics {
                        contentDescription = "Submitting command request"
                        liveRegion = LiveRegionMode.Polite
                    },
                color = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                shape = MaterialTheme.shapes.small,
            ) {
                Row(
                    modifier = Modifier.padding(Spacing.smMd),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    Text(
                        "Submitting command request…",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }
    }

    confirmation?.let { type ->
        val confirmLabel = confirmActionLabel(type, deviceName)
        AlertDialog(
            onDismissRequest = { confirmation = null },
            title = { Text("$confirmLabel?") },
            text = { Text(commandConsequence(type, deviceName)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmation = null
                        onCommand(type)
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error,
                    ),
                ) { Text(confirmLabel) }
            },
            dismissButton = {
                TextButton(onClick = { confirmation = null }) { Text("Cancel") }
            },
        )
    }
}

private enum class CommandButtonStyle {
    PowerOn,
    PowerReset,
    DestructiveTonal,
    DestructiveOutline,
    Neutral,
}

/** Explicit confirm copy naming the action and device (never a generic “Confirm”). */
fun confirmActionLabel(type: CommandType, deviceName: String): String = when (type) {
    CommandType.POWER_ON -> "Power On “$deviceName”"
    CommandType.POWER_OFF -> "Power Off “$deviceName”"
    CommandType.POWER_OFF_FORCE -> "Force Off “$deviceName”"
    CommandType.RESET -> "Restart “$deviceName”"
    CommandType.SLEEP -> "Sleep “$deviceName”"
    CommandType.LOCK -> "Lock “$deviceName”"
    CommandType.LOGOUT -> "Log Out “$deviceName”"
}

@Composable
private fun CmdButton(
    label: String,
    style: CommandButtonStyle,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    accessibilityLabel: String = label,
    onClick: () -> Unit,
) {
    val operational = OnOffTheme.status
    val buttonModifier = modifier
        .defaultMinSize(minHeight = 48.dp)
        .semantics { contentDescription = accessibilityLabel }
    when (style) {
        CommandButtonStyle.PowerOn -> Button(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = enabled,
            colors = ButtonDefaults.buttonColors(
                containerColor = operational.powerOnBackground,
                contentColor = operational.powerOnForeground,
            ),
        ) { Text(label) }

        CommandButtonStyle.PowerReset -> Button(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = enabled,
            colors = ButtonDefaults.buttonColors(
                containerColor = operational.powerResetBackground,
                contentColor = operational.powerResetForeground,
            ),
        ) { Text(label) }

        CommandButtonStyle.DestructiveTonal -> FilledTonalButton(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = enabled,
            colors = ButtonDefaults.filledTonalButtonColors(
                containerColor = operational.powerOffBackground,
                contentColor = operational.powerOffForeground,
            ),
        ) { Text(label) }

        CommandButtonStyle.DestructiveOutline -> OutlinedButton(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = enabled,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.error),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error,
            ),
        ) { Text(label) }

        CommandButtonStyle.Neutral -> FilledTonalButton(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = enabled,
        ) { Text(label) }
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
    CommandType.SLEEP -> "This asks “$deviceName” to sleep. Open apps stay in memory; nothing is closed."
    CommandType.LOCK -> "This will lock the current user session on “$deviceName”."
    CommandType.LOGOUT -> "This will log out the current user session on “$deviceName”. Unsaved work could be lost."
}
