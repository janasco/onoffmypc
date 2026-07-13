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

data class RegisterUiState(
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val loading: Boolean = false,
    val error: String? = null,
)

class RegisterViewModel : ViewModel() {
    private val repo = Graph.repository

    private val _state = MutableStateFlow(RegisterUiState())
    val state: StateFlow<RegisterUiState> = _state.asStateFlow()

    fun onEmail(value: String) = _state.update { it.copy(email = value, error = null) }
    fun onPassword(value: String) = _state.update { it.copy(password = value, error = null) }
    fun onConfirmPassword(value: String) = _state.update { it.copy(confirmPassword = value, error = null) }

    fun register(onSuccess: () -> Unit) {
        val s = _state.value
        if (s.email.isBlank() || s.password.isBlank()) {
            _state.update { it.copy(error = "Fill in all fields.") }
            return
        }
        if (s.password.length < 8) {
            _state.update { it.copy(error = "Password must be at least 8 characters.") }
            return
        }
        if (s.password != s.confirmPassword) {
            _state.update { it.copy(error = "Passwords do not match.") }
            return
        }
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            repo.register(s.email, s.password).fold(
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

    fun googleSignIn(context: Context, onSuccess: () -> Unit) {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val idToken = try {
                GoogleSignInHelper.getIdToken(context)
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = friendly(e.message)) }
                return@launch
            }
            repo.googleSignIn(idToken).fold(
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
        "email already registered" -> "That email is already registered."
        null -> "Something went wrong."
        else -> message
    }
}
