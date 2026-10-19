package com.onoffmypc.android.ui.devices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
import com.onoffmypc.android.data.NetworkException
import com.onoffmypc.android.data.isNetworkError
import com.onoffmypc.android.data.isTrialLockError
import com.onoffmypc.android.data.model.BillingStatus
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.MeResponse
import com.onoffmypc.android.data.model.NewDevice
import com.onoffmypc.android.data.model.PairCodeResponse
import com.onoffmypc.android.ui.components.commandRequestFeedback
import com.onoffmypc.shared.model.ApiException
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
    val pairCode: PairCodeResponse? = null,
    val pairCodeLoading: Boolean = false,
    val upgradeDeviceId: String? = null,
    val commandInFlightDeviceIds: Set<String> = emptySet(),
    val bulkCommandInFlight: Boolean = false,
    val selectMode: Boolean = false,
    val selectedDeviceIds: Set<String> = emptySet(),
    val offline: Boolean = false,
    val onboardingDismissed: Boolean = false,
    val hasSentCommand: Boolean = false,
)

class DevicesViewModel : ViewModel() {
    private val repo = Graph.repository
    private val prefs = Graph.application.getSharedPreferences("onoffmypc_onboarding", 0)

    private val _state = MutableStateFlow(DevicesUiState(
        onboardingDismissed = prefs.getBoolean(KEY_ONBOARDING_DISMISSED, false),
        hasSentCommand = prefs.getBoolean(KEY_HAS_SENT_COMMAND, false),
    ))
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
                onSuccess = { list -> _state.update { it.copy(loading = false, devices = list, user = me ?: it.user, billing = billing ?: it.billing, error = null, offline = false) } },
                onFailure = { e ->
                    _state.update {
                        it.copy(
                            loading = false,
                            user = me ?: it.user,
                            billing = billing ?: it.billing,
                            error = e.message ?: "Failed to load devices",
                            offline = isNetworkError(e),
                        )
                    }
                },
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
                onSuccess = { list -> _state.update { it.copy(refreshing = false, devices = list, user = me ?: it.user, billing = billing ?: it.billing, error = null, offline = false) } },
                onFailure = { e -> _state.update { it.copy(refreshing = false, message = e.message ?: "Refresh failed", offline = isNetworkError(e)) } },
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
        if (device.id in _state.value.commandInFlightDeviceIds) return
        _state.update { it.copy(commandInFlightDeviceIds = it.commandInFlightDeviceIds + device.id) }
        viewModelScope.launch {
            try {
                    repo.sendCommand(device.id, type).fold(
                        onSuccess = { response ->
                            if (!prefs.getBoolean(KEY_HAS_SENT_COMMAND, false)) {
                                prefs.edit().putBoolean(KEY_HAS_SENT_COMMAND, true).apply()
                                _state.update { it.copy(hasSentCommand = true) }
                            }
                            _state.update {
                                it.copy(
                                    message = commandRequestFeedback(
                                        type, device.name, response.delivered, response.reason,
                                    ),
                                )
                            }
                        },
                    onFailure = { error ->
                        if (isTrialExpired(error)) {
                            _state.update { it.copy(upgradeDeviceId = device.id) }
                        } else {
                            _state.update {
                                it.copy(message = error.message ?: "Couldn't submit the command request.")
                            }
                        }
                    },
                )
            } finally {
                _state.update {
                    it.copy(commandInFlightDeviceIds = it.commandInFlightDeviceIds - device.id)
                }
            }
        }
    }

    fun toggleSelectMode() {
        _state.update {
            val newMode = !it.selectMode
            it.copy(
                selectMode = newMode,
                selectedDeviceIds = if (newMode) emptySet() else it.selectedDeviceIds
            )
        }
    }

    fun toggleDeviceSelected(deviceId: String) {
        _state.update {
            val currentSelected = it.selectedDeviceIds
            val newSelected = if (deviceId in currentSelected) {
                currentSelected - deviceId
            } else {
                currentSelected + deviceId
            }
            it.copy(selectedDeviceIds = newSelected)
        }
    }

    fun clearSelection() {
        _state.update {
            it.copy(
                selectMode = false,
                selectedDeviceIds = emptySet()
            )
        }
    }

    fun sendBulkCommand(type: CommandType) {
        val selectedIds = _state.value.selectedDeviceIds
        val targets = _state.value.devices.filter { it.id in selectedIds }
        if (targets.isEmpty() || _state.value.bulkCommandInFlight) return

        _state.update { it.copy(bulkCommandInFlight = true) }
        viewModelScope.launch {
            var sent = 0
            var queued = 0
            val failed = mutableListOf<String>()
            var stoppedAt = -1

            try {
                for (i in targets.indices) {
                    val device = targets[i]
                    _state.update { it.copy(commandInFlightDeviceIds = it.commandInFlightDeviceIds + device.id) }
                    
                    val result = repo.sendCommand(device.id, type)
                    
                    _state.update { it.copy(commandInFlightDeviceIds = it.commandInFlightDeviceIds - device.id) }

                    result.fold(
                        onSuccess = { response ->
                            if (response.delivered) {
                                sent++
                            } else {
                                queued++
                            }
                        },
                        onFailure = { error ->
                            if (error is ApiException && error.httpCode == 429) {
                                stoppedAt = i
                            } else {
                                failed.add(device.name)
                            }
                        }
                    )

                    if (stoppedAt >= 0) {
                        break
                    }
                }
            } finally {
                _state.update { it.copy(bulkCommandInFlight = false) }
            }

            val label = type.label
            val parts = mutableListOf<String>()
            if (sent > 0) parts.add("sent to $sent")
            if (queued > 0) parts.add("queued for $queued offline")
            if (failed.isNotEmpty()) parts.add("rejected for ${failed.size}")
            if (stoppedAt >= 0) {
                val remaining = targets.size - stoppedAt
                parts.add("stopped by the rate limit with $remaining remaining — wait a minute and retry those")
            }
            val summary = "$label: ${parts.joinToString(", ").ifEmpty { "nothing sent" }}."

            _state.update {
                it.copy(
                    message = summary,
                    selectMode = stoppedAt >= 0,
                    selectedDeviceIds = if (stoppedAt >= 0) {
                        targets.subList(stoppedAt, targets.size).map { d -> d.id }.toSet()
                    } else {
                        emptySet()
                    }
                )
            }
        }
    }

    fun consumeUpgradePrompt() = _state.update { it.copy(upgradeDeviceId = null) }

    private fun isTrialExpired(e: Throwable): Boolean = isTrialLockError(e)

    fun addDevice(name: String) {
        viewModelScope.launch {
            repo.addDevice(name).fold(
                onSuccess = { created ->
                    _state.update { it.copy(createdDevice = created, pairCode = null, pairCodeLoading = true) }
                    // Auto-generate a pairing code for the new device.
                    created.id?.let { id ->
                        repo.generatePairCode(id).fold(
                            onSuccess = { pc -> _state.update { it.copy(pairCode = pc, pairCodeLoading = false) } },
                            onFailure = { _state.update { it.copy(pairCodeLoading = false) } },
                        )
                    } ?: _state.update { it.copy(pairCodeLoading = false) }
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

    fun dismissCreatedDevice() = _state.update { it.copy(createdDevice = null, pairCode = null) }

    /** Generate a pairing code for an existing device (from its dropdown menu). */
    fun generatePairCode(device: Device) {
        viewModelScope.launch {
            _state.update { it.copy(pairCode = null, pairCodeLoading = true) }
            repo.generatePairCode(device.id).fold(
                onSuccess = { pc ->
                    // Show the pair code in a stand-alone dialog (createdDevice = null).
                    _state.update { it.copy(pairCode = pc, pairCodeLoading = false) }
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(
                            pairCodeLoading = false,
                            message = e.message ?: "Couldn't generate pairing code",
                        )
                    }
                },
            )
        }
    }

    fun dismissPairCode() = _state.update { it.copy(pairCode = null) }

    fun dismissOnboarding() {
        prefs.edit().putBoolean(KEY_ONBOARDING_DISMISSED, true).apply()
        _state.update { it.copy(onboardingDismissed = true) }
    }

    fun consumeMessage() = _state.update { it.copy(message = null) }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            repo.logout()
            onDone()
        }
    }

    private companion object {
        const val KEY_ONBOARDING_DISMISSED = "dismissed"
        const val KEY_HAS_SENT_COMMAND = "has_sent_command"
    }
}
