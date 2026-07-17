package com.onoffmypc.android.ui.auth

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.onoffmypc.android.ui.components.PasswordField
import com.onoffmypc.android.ui.designsystem.AuthLayout

@Composable
fun RegisterScreen(
    onRegistered: () -> Unit,
    onBackToLogin: () -> Unit,
    vm: RegisterViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    AuthLayout(
        title = "Create account",
        subtitle = "Create your account to get started.",
    ) {
        OutlinedTextField(
            value = state.email,
            onValueChange = vm::onEmail,
            label = { Text("Email") },
            enabled = !state.loading,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        PasswordField(
            value = state.password,
            label = "Password",
            imeAction = ImeAction.Next,
            enabled = !state.loading,
            onValueChange = vm::onPassword,
        )
        Spacer(Modifier.height(12.dp))
        PasswordField(
            value = state.confirmPassword,
            label = "Confirm password",
            imeAction = ImeAction.Done,
            enabled = !state.loading,
            onValueChange = vm::onConfirmPassword,
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
            onClick = { vm.register(onRegistered) },
            enabled = !state.loading,
            modifier = Modifier
                .fillMaxWidth()
                .semantics {
                    contentDescription = if (state.loading) "Creating account" else "Create account"
                },
        ) {
            if (state.loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text("Create account")
            }
        }

        if (vm.googleEnabled) {
            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = { vm.googleSignIn(context, onRegistered) },
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Continue with Google")
            }
        }
        if (vm.appleEnabled) {
            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = { vm.appleSignIn(context, onRegistered) },
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Continue with Apple")
            }
        }
        if (vm.microsoftEnabled) {
            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = { vm.microsoftSignIn(context, onRegistered) },
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Continue with Microsoft")
            }
        }

        Spacer(Modifier.height(8.dp))
        TextButton(
            onClick = onBackToLogin,
            enabled = !state.loading,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        ) {
            Text("Already have an account? Sign in")
        }
    }
}
