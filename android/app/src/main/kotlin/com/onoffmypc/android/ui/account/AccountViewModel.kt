package com.onoffmypc.android.ui.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
import com.onoffmypc.android.data.model.MeResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AccountUiState(
    val loading: Boolean = true,
    val user: MeResponse? = null,
    val error: String? = null,
    val message: String? = null,
    val busy: Boolean = false,
)

class AccountViewModel : ViewModel() {
    private val repo = Graph.repository

    private val _state = MutableStateFlow(AccountUiState())
    val state: StateFlow<AccountUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            repo.me().fold(
                onSuccess = { u -> _state.update { it.copy(loading = false, user = u) } },
                onFailure = { e -> _state.update { it.copy(loading = false, error = e.message ?: "Failed to load account") } },
            )
        }
    }

    fun resendVerify() {
        _state.update { it.copy(busy = true) }
        viewModelScope.launch {
            repo.resendVerify().fold(
                onSuccess = { _state.update { it.copy(busy = false, message = "Verification email sent — check your inbox.") } },
                onFailure = { e -> _state.update { it.copy(busy = false, message = e.message ?: "Couldn't resend the email.") } },
            )
        }
    }

    fun changeEmail(newEmail: String, password: String, onSuccess: () -> Unit) {
        if (newEmail.isBlank() || password.isBlank()) {
            _state.update { it.copy(message = "Enter a new email and your current password.") }
            return
        }
        _state.update { it.copy(busy = true) }
        viewModelScope.launch {
            repo.changeEmail(newEmail, password).fold(
                onSuccess = {
                    _state.update { it.copy(busy = false, message = "Email updated — check your new inbox to verify it.") }
                    reloadUser()
                    onSuccess()
                },
                onFailure = { e -> _state.update { it.copy(busy = false, message = e.message ?: "Couldn't change email.") } },
            )
        }
    }

    fun changePassword(current: String, new: String, confirm: String, onSuccess: () -> Unit) {
        if (current.isBlank() || new.isBlank()) {
            _state.update { it.copy(message = "Enter your current and new password.") }
            return
        }
        if (new.length < 8) {
            _state.update { it.copy(message = "New password must be at least 8 characters.") }
            return
        }
        if (new != confirm) {
            _state.update { it.copy(message = "New passwords do not match.") }
            return
        }
        _state.update { it.copy(busy = true) }
        viewModelScope.launch {
            repo.changePassword(current, new).fold(
                onSuccess = {
                    _state.update { it.copy(busy = false, message = "Password changed. Other devices have been signed out.") }
                    onSuccess()
                },
                onFailure = { e -> _state.update { it.copy(busy = false, message = e.message ?: "Couldn't change password.") } },
            )
        }
    }

    /** Schedules deletion (15-day grace period). Keeps the user signed in so they
     *  can cancel; the account screen then shows the countdown. */
    fun scheduleDeletion() {
        _state.update { it.copy(busy = true) }
        viewModelScope.launch {
            repo.deleteAccount().fold(
                onSuccess = {
                    _state.update { it.copy(busy = false, message = "Account scheduled for deletion.") }
                    reloadUser()
                },
                onFailure = { e -> _state.update { it.copy(busy = false, message = e.message ?: "Couldn't schedule deletion.") } },
            )
        }
    }

    fun cancelDeletion() {
        _state.update { it.copy(busy = true) }
        viewModelScope.launch {
            repo.cancelDeletion().fold(
                onSuccess = {
                    _state.update { it.copy(busy = false, message = "Account deletion cancelled.") }
                    reloadUser()
                },
                onFailure = { e -> _state.update { it.copy(busy = false, message = e.message ?: "Couldn't cancel deletion.") } },
            )
        }
    }

    fun signOut(onDone: () -> Unit) {
        viewModelScope.launch {
            repo.logout()
            onDone()
        }
    }

    fun consumeMessage() = _state.update { it.copy(message = null) }

    private suspend fun reloadUser() {
        repo.me().getOrNull()?.let { u -> _state.update { it.copy(user = u) } }
    }
}
