package com.onoffmypc.android.ui.devices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
import com.onoffmypc.android.data.model.ApiException
import com.onoffmypc.android.data.model.BillingStatus
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.MeResponse
import com.onoffmypc.android.data.model.NewDevice
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DevicesUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val devices: List<Device> = emptyList(),
    val user: MeResponse? = null,
    val billing: BillingStatus? = null,
    val error: String? = null,
    val message: String? = null,
    val createdDevice: NewDevice? = null,
    val upgradeDeviceId: String? = null,
)

class DevicesViewModel : ViewModel() {
    private val repo = Graph.repository

    private val _state = MutableStateFlow(DevicesUiState())
    val state: StateFlow<DevicesUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val me = repo.me().getOrNull()
            val billing = repo.billingStatus().getOrNull()
            repo.devices().fold(
                onSuccess = { list -> _state.update { it.copy(loading = false, devices = list, user = me ?: it.user, billing = billing ?: it.billing, error = null) } },
                onFailure = { e -> _state.update { it.copy(loading = false, user = me ?: it.user, billing = billing ?: it.billing, error = e.message ?: "Failed to load devices") } },
            )
        }
    }

    /** Pull-to-refresh / post-mutation reload — updates the list without the
     *  full-screen spinner, and keeps the current list on failure. */
    fun refresh() {
        _state.update { it.copy(refreshing = true) }
        viewModelScope.launch {
            val me = repo.me().getOrNull()
            val billing = repo.billingStatus().getOrNull()
            repo.devices().fold(
                onSuccess = { list -> _state.update { it.copy(refreshing = false, devices = list, user = me ?: it.user, billing = billing ?: it.billing, error = null) } },
                onFailure = { e -> _state.update { it.copy(refreshing = false, message = e.message ?: "Refresh failed") } },
            )
        }
    }

    /** Refresh access state after returning from billing without replacing the device list. */
    fun refreshBilling() {
        viewModelScope.launch {
            repo.billingStatus().onSuccess { billing ->
                _state.update { it.copy(billing = billing) }
            }
        }
    }

    fun resendVerification() {
        viewModelScope.launch {
            repo.resendVerify().fold(
                onSuccess = { _state.update { it.copy(message = "Verification email sent — check your inbox.") } },
                onFailure = { e -> _state.update { it.copy(message = e.message ?: "Couldn't resend the email.") } },
            )
        }
    }

    fun sendCommand(device: Device, type: CommandType) {
        viewModelScope.launch {
            repo.sendCommand(device.id, type).fold(
                onSuccess = { r ->
                    val msg = if (r.delivered) "${type.label} sent" else "${type.label}: device offline"
                    _state.update { it.copy(message = msg) }
                },
                onFailure = { e ->
                    if (isTrialExpired(e)) _state.update { it.copy(upgradeDeviceId = device.id) }
                    else _state.update { it.copy(message = e.message ?: "Command failed") }
                },
            )
        }
    }

    fun consumeUpgradePrompt() = _state.update { it.copy(upgradeDeviceId = null) }

    private fun isTrialExpired(e: Throwable): Boolean =
        e is ApiException && (
            e.httpCode == 402 || e.serverCode == "trial_expired" || e.serverCode == "device_locked"
        )

    fun addDevice(name: String) {
        viewModelScope.launch {
            repo.addDevice(name).fold(
                onSuccess = { created ->
                    _state.update { it.copy(createdDevice = created) }
                    refresh()
                },
                onFailure = { e -> _state.update { it.copy(message = e.message ?: "Couldn't add device") } },
            )
        }
    }

    fun renameDevice(id: String, name: String) {
        viewModelScope.launch {
            repo.renameDevice(id, name).fold(
                onSuccess = {
                    _state.update { it.copy(message = "Device renamed") }
                    refresh()
                },
                onFailure = { e -> _state.update { it.copy(message = e.message ?: "Rename failed") } },
            )
        }
    }

    fun deleteDevice(id: String) {
        viewModelScope.launch {
            repo.deleteDevice(id).fold(
                onSuccess = {
                    _state.update { it.copy(message = "Device removed") }
                    refresh()
                },
                onFailure = { e -> _state.update { it.copy(message = e.message ?: "Delete failed") } },
            )
        }
    }

    /** Replace a device's token (e.g. the ESP hardware was swapped). Reveals the
     *  new token via the same dialog as add-device. */
    fun rotateToken(device: Device) {
        viewModelScope.launch {
            repo.rotateToken(device.id).fold(
                onSuccess = { nd -> _state.update { it.copy(createdDevice = nd) } },
                onFailure = { e -> _state.update { it.copy(message = e.message ?: "Couldn't replace the token.") } },
            )
        }
    }

    fun dismissCreatedDevice() = _state.update { it.copy(createdDevice = null) }

    fun consumeMessage() = _state.update { it.copy(message = null) }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            repo.logout()
            onDone()
        }
    }
}
