package com.onoffmypc.android.ui.devices

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.ClipboardManager
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.NewDevice
import com.onoffmypc.android.ui.theme.OnOffTheme
import kotlinx.coroutines.delay

@Composable
fun AddDeviceDialog(onDismiss: () -> Unit, onCreate: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    val nameFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) { nameFocus.requestFocus() }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add device") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Device name") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(
                    onDone = { if (name.isNotBlank()) onCreate(name.trim()) },
                ),
                modifier = Modifier.fillMaxWidth().focusRequester(nameFocus),
            )
        },
        confirmButton = {
            TextButton(onClick = { onCreate(name.trim()) }, enabled = name.isNotBlank()) { Text("Create") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
fun RenameDeviceDialog(device: Device, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var name by remember { mutableStateOf(device.name) }
    val nameFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) { nameFocus.requestFocus() }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rename device") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Device name") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(
                    onDone = { if (name.isNotBlank()) onSave(name.trim()) },
                ),
                modifier = Modifier.fillMaxWidth().focusRequester(nameFocus),
            )
        },
        confirmButton = {
            TextButton(onClick = { onSave(name.trim()) }, enabled = name.isNotBlank()) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
fun DeleteDeviceDialog(device: Device, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete device?") },
        text = { Text("\"${device.name}\" will be removed permanently if it has no purchase or payment under review. Purchased access must be transferred through support before deletion.") },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text("Delete “${device.name}”", color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
fun TokenRevealDialog(device: NewDevice, onDismiss: () -> Unit) {
    val clipboard = LocalClipboardManager.current
    var copiedLabel by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(copiedLabel) {
        if (copiedLabel != null) {
            delay(2_000)
            copiedLabel = null
        }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Device credentials") },
        text = {
            Column {
                Text(
                    text = "Save your Device ID and Token — you'll enter both into the ESP32 setup. The token won't be shown again.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))
                CredentialRow("Device ID", device.id.orEmpty(), clipboard) { copiedLabel = it }
                Spacer(Modifier.height(12.dp))
                CredentialRow("Device Token", device.token.orEmpty(), clipboard) { copiedLabel = it }
                copiedLabel?.let { label ->
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "$label copied",
                        color = OnOffTheme.status.positive,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                    )
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done") } },
    )
}

@Composable
private fun CredentialRow(
    label: String,
    value: String,
    clipboard: ClipboardManager,
    onCopied: (String) -> Unit,
) {
    Text(
        label,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Row(verticalAlignment = Alignment.CenterVertically) {
        SelectionContainer(modifier = Modifier.weight(1f)) {
            Text(
                text = value,
                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
            )
        }
        TextButton(
            onClick = {
                clipboard.setText(AnnotatedString(value))
                onCopied(label)
            },
            enabled = value.isNotEmpty(),
            modifier = Modifier
                .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                .semantics { contentDescription = "Copy $label" },
        ) { Text("Copy") }
    }
}
