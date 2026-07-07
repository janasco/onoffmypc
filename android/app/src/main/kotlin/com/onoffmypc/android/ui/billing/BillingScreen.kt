package com.onoffmypc.android.ui.billing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.data.model.BillingStatus
import com.onoffmypc.android.data.model.PaymentRequestItem
import com.onoffmypc.android.ui.theme.Accent
import com.onoffmypc.android.ui.theme.Green
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillingScreen(
    onBack: () -> Unit,
    vm: BillingViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { vm.load() }
    LaunchedEffect(state.message) {
        state.message?.let { snackbar.showSnackbar(it); vm.consumeMessage() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Plan & Billing") },
                navigationIcon = { TextButton(onClick = onBack) { Text("←") } },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        if (state.loading) {
            CircularProgressIndicator(Modifier.padding(padding).padding(32.dp))
            return@Scaffold
        }
        val s = state.status
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            if (s == null) {
                Text(state.error ?: "Couldn't load billing.", color = Muted)
                return@Column
            }

            PlanCard(s)

            Spacer(Modifier.height(20.dp))
            Text("Unlock everything", style = MaterialTheme.typography.titleSmall, color = Muted)
            Spacer(Modifier.height(8.dp))
            val lifetime = s.plans.firstOrNull { it.id == "lifetime" }
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        text = lifetime?.let { "${it.name} — $${it.price} one-time" } ?: "Lifetime — $${s.price} one-time",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        lifetime?.description ?: "1 device · all features · one-time payment",
                        color = Muted, style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            if (s.pending_request != null) {
                Spacer(Modifier.height(16.dp))
                Card(Modifier.fillMaxWidth()) {
                    Text(
                        "Your payment is pending review. We'll unlock your account once it's verified.",
                        color = Yellow, modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            } else if (!s.is_lifetime) {
                Spacer(Modifier.height(20.dp))
                if (s.payment_instructions.isNotBlank()) {
                    Text("How to pay", style = MaterialTheme.typography.titleSmall, color = Muted)
                    Spacer(Modifier.height(8.dp))
                    Text(s.payment_instructions, style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(16.dp))
                }
                Text("Submit your payment", style = MaterialTheme.typography.titleSmall, color = Muted)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = state.method, onValueChange = vm::onMethod,
                    label = { Text("Payment method (e.g. GCash, PayPal)") },
                    singleLine = true, modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = state.reference, onValueChange = vm::onReference,
                    label = { Text("Reference / proof") },
                    singleLine = true, modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = state.note, onValueChange = vm::onNote,
                    label = { Text("Note (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                )
                state.error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = Red, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = vm::submit,
                    enabled = !state.submitting,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(if (state.submitting) "Submitting…" else "Submit for review") }
            }

            if (state.history.isNotEmpty()) {
                Spacer(Modifier.height(24.dp))
                Text("Payment history", style = MaterialTheme.typography.titleSmall, color = Muted)
                Spacer(Modifier.height(8.dp))
                state.history.forEach { HistoryRow(it) }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PlanCard(s: BillingStatus) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Current plan", color = Muted, style = MaterialTheme.typography.labelMedium)
                Text(
                    if (s.is_lifetime) "Lifetime" else "Free Trial",
                    color = if (s.is_lifetime) Green else Accent,
                    style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.height(6.dp))
            val statusText = when {
                s.is_lifetime -> "All features unlocked — never expires."
                s.trial_expired -> "Your trial has ended. Pay $${s.price} once to keep controlling your device."
                s.trial_ends_at != null -> "Free trial · ends ${fmtDate(s.trial_ends_at)}"
                else -> ""
            }
            Text(
                statusText,
                color = if (s.trial_expired) Red else Muted,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (s.trial_expired) FontWeight.Bold else FontWeight.Normal,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Devices: ${s.device_count} / ${s.device_limit ?: "∞"}",
                color = Muted, style = MaterialTheme.typography.labelMedium,
            )
        }
    }
}

@Composable
private fun HistoryRow(r: PaymentRequestItem) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text(r.method ?: r.plan, style = MaterialTheme.typography.bodyMedium)
            Text(fmtDate(r.created_at), color = Muted, style = MaterialTheme.typography.labelSmall)
        }
        Text(
            r.status,
            color = when (r.status) { "approved" -> Green; "declined" -> Red; else -> Yellow },
            style = MaterialTheme.typography.labelMedium,
        )
    }
}

private fun fmtDate(iso: String?): String {
    if (iso == null) return ""
    return iso.take(10)
}
