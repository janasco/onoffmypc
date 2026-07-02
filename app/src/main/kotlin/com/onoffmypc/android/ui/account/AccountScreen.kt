package com.onoffmypc.android.ui.account

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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountScreen(
    onBack: () -> Unit,
    onSignedOut: () -> Unit,
    vm: AccountViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            vm.consumeMessage()
        }
    }

    var newEmail by remember { mutableStateOf("") }
    var emailPw by remember { mutableStateOf("") }
    var curPw by remember { mutableStateOf("") }
    var newPw by remember { mutableStateOf("") }
    var confirmPw by remember { mutableStateOf("") }
    var showDelete by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Account") },
                navigationIcon = { TextButton(onClick = onBack) { Text("←") } },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            val user = state.user
            when {
                state.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))

                user == null -> Text(
                    text = state.error ?: "Couldn't load your account.",
                    color = Muted,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp),
                )

                else -> Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                ) {
                    SectionTitle("Profile")
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            ProfileRow("Email", user.email)
                            if (!user.email_verified) {
                                Spacer(Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text("Email not verified", color = Yellow, style = MaterialTheme.typography.labelMedium)
                                    TextButton(onClick = vm::resendVerify, enabled = !state.busy) { Text("Resend") }
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            ProfileRow("Member since", formatDate(user.created_at))
                        }
                    }

                    Spacer(Modifier.height(24.dp))
                    SectionTitle("Change email")
                    OutlinedTextField(
                        value = newEmail,
                        onValueChange = { newEmail = it },
                        label = { Text("New email") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = emailPw,
                        onValueChange = { emailPw = it },
                        label = { Text("Current password") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = { vm.changeEmail(newEmail, emailPw) { newEmail = ""; emailPw = "" } },
                        enabled = !state.busy,
                    ) { Text("Update email") }

                    Spacer(Modifier.height(24.dp))
                    SectionTitle("Security")
                    PasswordField(curPw, "Current password", ImeAction.Next) { curPw = it }
                    Spacer(Modifier.height(8.dp))
                    PasswordField(newPw, "New password", ImeAction.Next) { newPw = it }
                    Spacer(Modifier.height(8.dp))
                    PasswordField(confirmPw, "Confirm new password", ImeAction.Done) { confirmPw = it }
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = {
                            vm.changePassword(curPw, newPw, confirmPw) {
                                curPw = ""; newPw = ""; confirmPw = ""
                            }
                        },
                        enabled = !state.busy,
                    ) { Text("Change password") }

                    Spacer(Modifier.height(24.dp))
                    OutlinedButton(onClick = { vm.signOut(onSignedOut) }, modifier = Modifier.fillMaxWidth()) {
                        Text("Sign out")
                    }

                    Spacer(Modifier.height(24.dp))
                    SectionTitle("Danger zone", color = Red)
                    Text(
                        text = "Permanently deletes your account, all devices, commands, and telemetry. This cannot be undone.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = { showDelete = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Red, contentColor = Color.White),
                    ) { Text("Delete account") }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }

    val user = state.user
    if (showDelete && user != null) {
        DeleteAccountDialog(
            email = user.email,
            busy = state.busy,
            onDismiss = { showDelete = false },
            onConfirm = { vm.deleteAccount(onSignedOut) },
        )
    }
}

@Composable
private fun SectionTitle(text: String, color: Color = Muted) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}

@Composable
private fun ProfileRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = Muted)
    }
}

@Composable
private fun PasswordField(value: String, label: String, imeAction: ImeAction, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = imeAction),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun DeleteAccountDialog(email: String, busy: Boolean, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    var typed by remember { mutableStateOf("") }
    val matches = typed.trim().equals(email, ignoreCase = true)
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete your account?") },
        text = {
            Column {
                Text(
                    text = "This permanently deletes your account and all data. Type your email to confirm.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = typed,
                    onValueChange = { typed = it },
                    label = { Text("Your email") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onConfirm, enabled = matches && !busy) { Text("Delete forever", color = Red) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

private fun formatDate(iso: String?): String {
    if (iso == null) return "—"
    return try {
        OffsetDateTime.parse(iso).toLocalDate().format(DateTimeFormatter.ofPattern("MMMM d, yyyy"))
    } catch (_: Exception) {
        "—"
    }
}
