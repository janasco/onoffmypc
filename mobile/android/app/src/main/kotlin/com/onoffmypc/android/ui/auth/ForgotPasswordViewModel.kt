package com.onoffmypc.android.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ForgotUiState(
    val email: String = "",
    val loading: Boolean = false,
    val sent: Boolean = false,
    val error: String? = null,
)

class ForgotPasswordViewModel : ViewModel() {
    private val repo = Graph.repository

    private val _state = MutableStateFlow(ForgotUiState())
    val state: StateFlow<ForgotUiState> = _state.asStateFlow()

    fun onEmail(value: String) = _state.update { it.copy(email = value, error = null) }

    fun submit() {
        val email = _state.value.email
        if (email.isBlank()) {
            _state.update { it.copy(error = "Enter your email.") }
            return
        }
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            repo.forgotPassword(email).fold(
                // The API is silent about whether the address exists, so success
                // just means the request went through.
                onSuccess = { _state.update { it.copy(loading = false, sent = true) } },
                onFailure = { e -> _state.update { it.copy(loading = false, error = e.message ?: "Something went wrong.") } },
            )
        }
    }
}
