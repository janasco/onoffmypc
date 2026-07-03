package com.onoffmypc.android.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(val email: String, val password: String, val invite_code: String)

@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class ChangeEmailRequest(val new_email: String, val password: String)

@Serializable
data class ChangePasswordRequest(val current_password: String, val new_password: String)

@Serializable
data class PushRegisterRequest(val token: String, val platform: String = "android")

@Serializable
data class RegisterResponse(
    val id: String? = null,
    val email: String? = null,
    val created_at: String? = null,
)

@Serializable
data class OkResponse(val ok: Boolean = false)

@Serializable
data class MeResponse(
    val id: String,
    val email: String,
    val email_verified: Boolean = false,
    val created_at: String? = null,
    /** When set, the account is scheduled for deletion at this time (ISO-8601). */
    val deletion_at: String? = null,
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
data class DeviceStatus(
    val online: Boolean = false,
    val last_seen_at: String? = null,
)

@Serializable
data class Telemetry(
    val recorded_at: String? = null,
    val pc_on: Int? = null,
    val room_temp: Double? = null,
    val room_humidity: Double? = null,
    val rssi: Int? = null,
)

@Serializable
data class HistoryPoint(
    val hour: String? = null,
    val temp_avg: Double? = null,
    val temp_min: Double? = null,
    val temp_max: Double? = null,
    val humidity_avg: Double? = null,
    val rssi_avg: Double? = null,
)

@Serializable
data class DeviceNameRequest(val name: String)

/** Response of POST /devices — includes the raw token, shown to the user once. */
@Serializable
data class NewDevice(
    val id: String? = null,
    val name: String? = null,
    val token: String? = null,
    val created_at: String? = null,
)

@Serializable
data class DeletedResponse(val deleted: Boolean = false)

/** A row from GET /commands/:deviceId (recent command history). */
@Serializable
data class Command(
    val id: String? = null,
    val created_at: String? = null,
    val type: String? = null,
    val status: String? = null,
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
