package com.onoffmypc.android.ui.auth

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.ui.designsystem.AuthLayout

@Composable
fun ForgotPasswordScreen(
    onBackToLogin: () -> Unit,
    vm: ForgotPasswordViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()

    AuthLayout(
        title = "Reset password",
        subtitle = "Enter your email and we'll send a link to reset your password.",
    ) {
        if (state.sent) {
            Text(
                text = "If an account exists for that email, we've sent a password-reset link. Open it on this device or the web to choose a new password.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
            Spacer(Modifier.height(20.dp))
            Button(onClick = onBackToLogin, modifier = Modifier.fillMaxWidth()) { Text("Back to sign in") }
            return@AuthLayout
        }

        OutlinedTextField(
            value = state.email,
            onValueChange = vm::onEmail,
            label = { Text("Email") },
            enabled = !state.loading,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Done),
            modifier = Modifier.fillMaxWidth(),
        )

        state.error?.let {
            Spacer(Modifier.height(12.dp))
            Text(
                it,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive },
            )
        }

        Spacer(Modifier.height(20.dp))
        Button(
            onClick = vm::submit,
            enabled = !state.loading,
            modifier = Modifier
                .fillMaxWidth()
                .semantics {
                    contentDescription = if (state.loading) "Sending reset link" else "Send reset link"
                },
        ) {
            if (state.loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text("Send reset link")
            }
        }

        Spacer(Modifier.height(8.dp))
        TextButton(
            onClick = onBackToLogin,
            enabled = !state.loading,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        ) {
            Text("Back to sign in")
        }
    }
}
