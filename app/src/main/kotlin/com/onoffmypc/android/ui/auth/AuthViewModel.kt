package com.onoffmypc.android.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
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
