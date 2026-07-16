package com.onoffmypc.android.ui.auth

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
import com.onoffmypc.android.push.PushManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
)

class AuthViewModel : ViewModel() {
    private val repo = Graph.repository

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    fun onEmail(value: String) = _state.update { it.copy(email = value, error = null) }
    fun onPassword(value: String) = _state.update { it.copy(password = value, error = null) }

    fun login(onSuccess: () -> Unit) {
        val current = _state.value
        if (current.email.isBlank() || current.password.isBlank()) {
            _state.update { it.copy(error = "Enter your email and password.") }
            return
        }
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            repo.login(current.email, current.password).fold(
                onSuccess = {
                    _state.update { it.copy(loading = false) }
                    PushManager.registerIfPossible()
                    onSuccess()
                },
                onFailure = { e ->
                    _state.update { it.copy(loading = false, error = friendly(e.message)) }
                },
            )
        }
    }

    /** Whether to show the "Continue with Google" button. */
    val googleEnabled: Boolean get() = GoogleSignInHelper.isConfigured
    val appleEnabled: Boolean get() = AppleSignInHelper.isConfigured
    val microsoftEnabled: Boolean get() = MicrosoftSignInHelper.isConfigured

    fun googleSignIn(context: Context, onSuccess: () -> Unit) {
        socialSignIn(onSuccess) {
            val idToken = GoogleSignInHelper.getIdToken(context)
            repo.googleSignIn(idToken)
        }
    }

    fun appleSignIn(context: Context, onSuccess: () -> Unit) {
        socialSignIn(onSuccess) {
            val idToken = AppleSignInHelper.getIdToken(context)
            repo.appleSignIn(idToken)
        }
    }

    fun microsoftSignIn(context: Context, onSuccess: () -> Unit) {
        socialSignIn(onSuccess) {
            val idToken = MicrosoftSignInHelper.getIdToken(context)
            repo.microsoftSignIn(idToken)
        }
    }

    private fun socialSignIn(
        onSuccess: () -> Unit,
        block: suspend () -> Result<Unit>,
    ) {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val result = try {
                block()
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = friendly(e.message)) }
                return@launch
            }
            result.fold(
                onSuccess = {
                    _state.update { it.copy(loading = false) }
                    PushManager.registerIfPossible()
                    onSuccess()
                },
                onFailure = { e ->
                    _state.update { it.copy(loading = false, error = friendly(e.message)) }
                },
            )
        }
    }

    private fun friendly(message: String?): String = when (message) {
        "invalid credentials" -> "Invalid email or password."
        null -> "Something went wrong."
        else -> message
    }
}
