package com.onoffmypc.android.ui.devices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
import com.onoffmypc.android.data.isTrialLockError
import com.onoffmypc.android.data.model.Command
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.HistoryPoint
import com.onoffmypc.android.data.model.ScheduledCommand
import com.onoffmypc.android.data.model.Telemetry
import com.onoffmypc.android.ui.components.commandRequestFeedback
import com.onoffmypc.android.ui.components.DeviceConnectionState
import com.onoffmypc.android.ui.components.connectionFromLastContact
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DeviceDetailUiState(
    val loading: Boolean = true,
    val device: Device? = null,
    val connection: DeviceConnectionState = DeviceConnectionState.UNKNOWN,
    val lastSeenAt: String? = null,
    val latest: Telemetry? = null,
    val history: List<HistoryPoint> = emptyList(),
    val commands: List<Command> = emptyList(),
    val error: String? = null,
    val message: String? = null,
    val refreshing: Boolean = false,
    val upgradePrompt: Boolean = false,
    val unlockPrice: Int = 15,
    val commandInFlight: Boolean = false,
    val schedules: List<ScheduledCommand> = emptyList(),
    val scheduleBusy: Boolean = false,
    val scheduleMessage: String? = null,
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
        val schedulesRes = repo.schedules(id)

        deviceRes.fold(
            onSuccess = { device ->
                val status = statusRes.getOrNull()
                val lastSeenAt = status?.last_seen_at ?: device.last_seen_at
                val latestTelemetry = telemetryRes.getOrNull()?.firstOrNull()
                val partialFailure = statusRes.isFailure || telemetryRes.isFailure ||
                    historyRes.isFailure || commandsRes.isFailure || schedulesRes.isFailure
                val connection = when {
                    status == null -> DeviceConnectionState.UNKNOWN
                    status.online -> DeviceConnectionState.ONLINE
                    connectionFromLastContact(lastSeenAt) == DeviceConnectionState.UNKNOWN ->
                        DeviceConnectionState.UNKNOWN
                    else -> DeviceConnectionState.OFFLINE
                }
                _state.update {
                    it.copy(
                        loading = false,
                        error = if (partialFailure) "Some device information could not be refreshed." else null,
                        device = device,
                        connection = connection,
                        lastSeenAt = lastSeenAt,
                        latest = if (telemetryRes.isFailure) it.latest else latestTelemetry,
                        history = historyRes.getOrNull() ?: it.history,
                        commands = commandsRes.getOrNull() ?: it.commands,
                        schedules = schedulesRes.getOrNull() ?: it.schedules,
                    )
                }
            },
            onFailure = { e ->
                _state.update { it.copy(loading = false, error = e.message ?: "Failed to load device") }
            },
        )
    }

    fun scheduleCommand(type: CommandType, runAt: java.time.Instant) {
        val id = deviceId ?: return
        _state.update { it.copy(scheduleBusy = true, scheduleMessage = null) }
        viewModelScope.launch {
            repo.schedule(id, type, runAt.toString()).fold(
                onSuccess = { created ->
                    _state.update { st ->
                        st.copy(
                            scheduleBusy = false,
                            schedules = (st.schedules + created).sortedBy { it.run_at },
                            scheduleMessage = "${type.label} scheduled for ${created.run_at}.",
                        )
                    }
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(scheduleBusy = false, scheduleMessage = e.message ?: "Couldn't schedule that command.")
                    }
                },
            )
        }
    }

    fun cancelSchedule(scheduleId: String) {
        val id = deviceId ?: return
        _state.update { it.copy(scheduleBusy = true, scheduleMessage = null) }
        viewModelScope.launch {
            repo.cancelSchedule(id, scheduleId).fold(
                onSuccess = {
                    _state.update { st ->
                        st.copy(
                            scheduleBusy = false,
                            schedules = st.schedules.filterNot { item -> item.id == scheduleId },
                            scheduleMessage = "Schedule cancelled.",
                        )
                    }
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(scheduleBusy = false, scheduleMessage = e.message ?: "Couldn't cancel that schedule.")
                    }
                },
            )
        }
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
                        if (isTrialLockError(error)) {
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

    fun updateTelemetrySettings(cpu: Boolean?, ram: Boolean?, gpu: Boolean?, wifi: Boolean?) {
        val id = deviceId ?: return
        viewModelScope.launch {
            repo.updateTelemetrySettings(id, cpu, ram, gpu, wifi).fold(
                onSuccess = { updatedDevice ->
                    _state.update { it.copy(device = updatedDevice, message = "Telemetry settings updated.") }
                },
                onFailure = { error ->
                    _state.update { it.copy(message = error.message ?: "Failed to update telemetry settings.") }
                }
            )
        }
    }

    fun consumeMessage() = _state.update { it.copy(message = null) }
    fun consumeUpgradePrompt() = _state.update { it.copy(upgradePrompt = false) }
}
