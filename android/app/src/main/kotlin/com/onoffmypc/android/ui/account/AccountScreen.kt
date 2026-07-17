package com.onoffmypc.android.ui.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
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
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.ui.components.LogoutConfirmDialog
import com.onoffmypc.android.ui.components.PasswordField
import com.onoffmypc.android.ui.designsystem.ErrorState
import com.onoffmypc.android.ui.designsystem.LoadingState
import com.onoffmypc.android.ui.designsystem.Spacing
import com.onoffmypc.android.ui.theme.OnOffTheme
import kotlinx.coroutines.delay
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountScreen(
    onBack: () -> Unit,
    onBilling: () -> Unit,
    onSignedOut: () -> Unit,
    vm: AccountViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val statusColors = OnOffTheme.status

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
    var confirmLogout by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Account") },
                navigationIcon = {
                    TextButton(
                        onClick = onBack,
                        enabled = !state.busy,
                        modifier = Modifier
                            .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                            .semantics { contentDescription = "Back to devices" },
                    ) { Text("←") }
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
            val user = state.user
            when {
                state.loading -> LoadingState(
                    contentDescription = "Loading account",
                    modifier = Modifier.align(Alignment.Center),
                )

                user == null -> ErrorState(
                    title = "Couldn't load account",
                    message = state.error ?: "Check your connection and try again.",
                    modifier = Modifier.align(Alignment.Center),
                    onRetry = vm::refresh,
                )

                else -> PullToRefreshBox(
                    isRefreshing = state.refreshing,
                    onRefresh = vm::refresh,
                    modifier = Modifier.fillMaxSize(),
                ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(Spacing.md),
                ) {
                    if (state.busy) {
                        AccountBusyIndicator()
                        Spacer(Modifier.height(Spacing.smMd))
                    }
                    user.deletion_at?.let { da ->
                        DeletionCountdownCard(deletionAt = da, busy = state.busy, onCancel = vm::cancelDeletion)
                        Spacer(Modifier.height(24.dp))
                    }

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
                                    Text(
                                        "Email not verified",
                                        color = statusColors.warning,
                                        style = MaterialTheme.typography.labelMedium,
                                    )
                                    TextButton(onClick = vm::resendVerify, enabled = !state.busy) { Text("Resend") }
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            ProfileRow("Access", planLabel(user.plan))
                            Spacer(Modifier.height(8.dp))
                            ProfileRow("Member since", formatDate(user.created_at))
                        }
                    }

                    Spacer(Modifier.height(12.dp))
                    OutlinedButton(
                        onClick = onBilling,
                        enabled = !state.busy,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Device unlocks & billing")
                    }

                    Spacer(Modifier.height(24.dp))
                    SectionTitle("Change email")
                    OutlinedTextField(
                        value = newEmail,
                        onValueChange = { newEmail = it },
                        label = { Text("New email") },
                        enabled = !state.busy,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    PasswordField(
                        value = emailPw,
                        label = "Current password",
                        imeAction = ImeAction.Done,
                        enabled = !state.busy,
                    ) { emailPw = it }
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = { vm.changeEmail(newEmail, emailPw) { newEmail = ""; emailPw = "" } },
                        enabled = !state.busy,
                    ) { Text("Update email") }

                    Spacer(Modifier.height(24.dp))
                    SectionTitle("Security")
                    PasswordField(curPw, "Current password", ImeAction.Next, enabled = !state.busy) { curPw = it }
                    Spacer(Modifier.height(8.dp))
                    PasswordField(newPw, "New password", ImeAction.Next, enabled = !state.busy) { newPw = it }
                    Spacer(Modifier.height(8.dp))
                    PasswordField(confirmPw, "Confirm new password", ImeAction.Done, enabled = !state.busy) { confirmPw = it }
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
                    OutlinedButton(
                        onClick = { confirmLogout = true },
                        enabled = !state.busy,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Sign out")
                    }

                    Spacer(Modifier.height(24.dp))
                    SectionTitle("Danger zone", color = MaterialTheme.colorScheme.error)
                    if (user.deletion_at == null) {
                        Text(
                            text = "Deletes your account after a 15-day grace period — all devices, commands, and telemetry. You can cancel any time before then.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(8.dp))
                        Button(
                            onClick = { showDelete = true },
                            enabled = !state.busy,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.error,
                                contentColor = MaterialTheme.colorScheme.onError,
                            ),
                        ) { Text("Delete account") }
                    } else {
                        Text(
                            text = "Your account is scheduled for deletion. Use “Keep my account” above to cancel.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.height(24.dp))
                }
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
            onConfirm = { showDelete = false; vm.scheduleDeletion() },
        )
    }
    if (confirmLogout) {
        LogoutConfirmDialog(
            onConfirm = { confirmLogout = false; vm.signOut(onSignedOut) },
            onDismiss = { confirmLogout = false },
        )
    }
}

@Composable
private fun AccountBusyIndicator() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite },
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Row(
            modifier = Modifier.padding(Spacing.smMd),
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CircularProgressIndicator(modifier = Modifier.defaultMinSize(20.dp, 20.dp), strokeWidth = 2.dp)
            Text("Updating account…", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun DeletionCountdownCard(deletionAt: String, busy: Boolean, onCancel: () -> Unit) {
    val target = remember(deletionAt) {
        runCatching { OffsetDateTime.parse(deletionAt).toInstant().toEpochMilli() }.getOrNull()
    }
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(deletionAt) {
        while (true) {
            now = System.currentTimeMillis()
            delay(1000)
        }
    }
    val remaining = ((target ?: now) - now).coerceAtLeast(0)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer,
        ),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                text = "Account scheduled for deletion",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = formatCountdown(remaining),
                color = MaterialTheme.colorScheme.onBackground,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Your account and all data will be permanently deleted when the timer ends. Cancel any time before then.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
            )
            Spacer(Modifier.height(12.dp))
            Button(onClick = onCancel, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Keep my account")
            }
        }
    }
}

private fun formatCountdown(ms: Long): String {
    if (ms <= 0L) return "Deleting now…"
    val totalSec = ms / 1000
    val days = totalSec / 86_400
    val hours = (totalSec % 86_400) / 3600
    val mins = (totalSec % 3600) / 60
    val secs = totalSec % 60
    return "${days}d ${hours}h ${mins}m ${secs}s"
}

@Composable
private fun SectionTitle(text: String, color: Color? = null) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = color ?: MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}

@Composable
private fun ProfileRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f),
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun DeleteAccountDialog(email: String, busy: Boolean, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    var typed by remember { mutableStateOf("") }
    val matches = typed.trim().equals(email, ignoreCase = true)
    val emailFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) { emailFocus.requestFocus() }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete your account?") },
        text = {
            Column {
                Text(
                    text = "Your account will be scheduled for deletion and permanently removed in 15 days. You can cancel any time before then. Type your email to confirm.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = typed,
                    onValueChange = { typed = it },
                    label = { Text("Your email") },
                    singleLine = true,
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth().focusRequester(emailFocus),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onConfirm, enabled = matches && !busy) {
                Text("Schedule deletion", color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { Text("Cancel") } },
    )
}

private fun planLabel(plan: String?): String =
    if (plan == "lifetime") "Lifetime (legacy)" else "One-time purchase per device"

private fun formatDate(iso: String?): String {
    if (iso == null) return "—"
    return try {
        OffsetDateTime.parse(iso).toLocalDate().format(DateTimeFormatter.ofPattern("MMMM d, yyyy"))
    } catch (_: Exception) {
        "—"
    }
}
