package com.onoffmypc.android.ui.devices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.NewDevice
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DevicesUiState(
    val loading: Boolean = true,
    val devices: List<Device> = emptyList(),
    val error: String? = null,
    val message: String? = null,
    val createdDevice: NewDevice? = null,
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
            repo.devices().fold(
                onSuccess = { list -> _state.update { it.copy(loading = false, devices = list) } },
                onFailure = { e -> _state.update { it.copy(loading = false, error = e.message ?: "Failed to load devices") } },
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
                onFailure = { e -> _state.update { it.copy(message = e.message ?: "Command failed") } },
            )
        }
    }

    fun addDevice(name: String) {
        viewModelScope.launch {
            repo.addDevice(name).fold(
                onSuccess = { created ->
                    _state.update { it.copy(createdDevice = created) }
                    load()
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
                    load()
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
                    load()
                },
                onFailure = { e -> _state.update { it.copy(message = e.message ?: "Delete failed") } },
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
