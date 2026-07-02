package com.onoffmypc.android.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class OkResponse(val ok: Boolean = false)

@Serializable
data class MeResponse(
    val id: String,
    val email: String,
    val email_verified: Boolean = false,
    val created_at: String? = null,
)

@Serializable
data class Device(
    val id: String,
    val name: String,
    val pc_on: Int? = null,
    val last_seen_at: String? = null,
    val firmware_version: String? = null,
)

@Serializable
data class CommandRequest(val type: String)

@Serializable
data class CommandResponse(
    val id: String? = null,
    val delivered: Boolean = false,
    val reason: String? = null,
)

@Serializable
data class ApiError(val error: String? = null)

/** Command types the API accepts (POST /commands/:id). */
enum class CommandType(val wire: String, val label: String) {
    POWER_ON("power_on", "Power On"),
    POWER_OFF("power_off", "Power Off"),
    POWER_OFF_FORCE("power_off_force", "Force Off"),
    RESET("reset", "Reset"),
}
