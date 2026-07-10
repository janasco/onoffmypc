package com.onoffmypc.android.ui.devices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
import com.onoffmypc.android.data.model.ApiException
import com.onoffmypc.android.data.model.Command
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.HistoryPoint
import com.onoffmypc.android.data.model.Telemetry
import com.onoffmypc.android.ui.components.commandRequestFeedback
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DeviceDetailUiState(
    val loading: Boolean = true,
    val device: Device? = null,
    val online: Boolean = false,
    val latest: Telemetry? = null,
    val history: List<HistoryPoint> = emptyList(),
    val commands: List<Command> = emptyList(),
    val error: String? = null,
    val message: String? = null,
    val refreshing: Boolean = false,
    val upgradePrompt: Boolean = false,
    val unlockPrice: Int = 15,
    val commandInFlight: Boolean = false,
)

class DeviceDetailViewModel : ViewModel() {
    private val repo = Graph.repository

    private val _state = MutableStateFlow(DeviceDetailUiState())
    val state: StateFlow<DeviceDetailUiState> = _state.asStateFlow()

    private var deviceId: String? = null
    private var started = false

    /** Called once from the screen; kicks off a 30s auto-refresh loop that stops
     *  when the ViewModel is cleared (the screen is left). */
    fun start(id: String) {
        if (started) return
        started = true
        deviceId = id
        viewModelScope.launch {
            repo.billingStatus().onSuccess { billing ->
                val price = billing.plans.firstOrNull { it.id == "device" }?.price ?: billing.price
                _state.update { it.copy(unlockPrice = price) }
            }
        }
        viewModelScope.launch {
            while (true) {
                refresh(id)
                delay(30_000)
            }
        }
    }

    private suspend fun refresh(id: String) {
        val deviceRes = repo.device(id)
        val statusRes = repo.deviceStatus(id)
        val telemetryRes = repo.telemetry(id)
        val historyRes = repo.history(id, 7)
        val commandsRes = repo.commands(id)

        deviceRes.fold(
            onSuccess = { device ->
                _state.update {
                    it.copy(
                        loading = false,
                        error = null,
                        device = device,
                        online = statusRes.getOrNull()?.online ?: false,
                        latest = telemetryRes.getOrNull()?.firstOrNull(),
                        history = historyRes.getOrNull() ?: it.history,
                        commands = commandsRes.getOrNull() ?: it.commands,
                    )
                }
            },
            onFailure = { e ->
                _state.update { it.copy(loading = false, error = e.message ?: "Failed to load device") }
            },
        )
    }

    /** Manual pull-to-refresh: re-fetch now and show the refresh indicator. */
    fun onPullRefresh() {
        val id = deviceId ?: return
        viewModelScope.launch {
            _state.update { it.copy(refreshing = true) }
            refresh(id)
            _state.update { it.copy(refreshing = false) }
        }
    }

    fun sendCommand(type: CommandType) {
        val id = deviceId ?: return
        if (_state.value.commandInFlight) return
        _state.update { it.copy(commandInFlight = true) }
        viewModelScope.launch {
            try {
                repo.sendCommand(id, type).fold(
                    onSuccess = { response ->
                        val name = _state.value.device?.name ?: "this device"
                        _state.update {
                            it.copy(
                                message = commandRequestFeedback(
                                    type, name, response.delivered, response.reason,
                                ),
                            )
                        }
                    },
                    onFailure = { error ->
                        if (error is ApiException && (
                                error.httpCode == 402 || error.serverCode == "trial_expired" || error.serverCode == "device_locked"
                            )
                        ) {
                            _state.update { it.copy(upgradePrompt = true) }
                        } else {
                            _state.update {
                                it.copy(message = error.message ?: "Couldn't submit the command request.")
                            }
                        }
                    },
                )
                refresh(id)
            } finally {
                _state.update { it.copy(commandInFlight = false) }
            }
        }
    }

    fun consumeMessage() = _state.update { it.copy(message = null) }
    fun consumeUpgradePrompt() = _state.update { it.copy(upgradePrompt = false) }
}
