package com.onoffmypc.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class GoogleAuthRequest(val credential: String)

/** Shared body for /auth/google, /auth/apple, /auth/microsoft. */
@Serializable
data class SocialAuthRequest(val credential: String)

@Serializable
data class RegisterRequest(val email: String, val password: String)

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
data class Plan(
    val id: String,
    val name: String,
    val devices: Int? = null,
    val price: Int = 0,
    val oneTime: Boolean = false,
    val description: String = "",
)

@Serializable
data class PaymentRequestItem(
    val id: String,
    val plan: String,
    val device_id: String? = null,
    val device_name: String? = null,
    val amount: String? = null,
    val currency: String? = null,
    val method: String? = null,
    val reference: String? = null,
    val provider: String? = null,
    val status: String,
    val created_at: String,
)

@Serializable
data class BillingDevice(
    val id: String,
    val name: String,
    val unlocked: Boolean = false,
    val pending: Boolean = false,
    val pending_provider: String? = null,
    val trial_ends_at: String? = null,
    // Nullable keeps compatibility with API versions that predate per-device status.
    val trial_expired: Boolean? = null,
) {
    val polarCheckoutPending: Boolean
        get() = pending && pending_provider.equals("polar", ignoreCase = true)

    val legacyPaymentPending: Boolean
        get() = pending && !polarCheckoutPending

    val checkoutEligible: Boolean
        get() = !unlocked && (!pending || polarCheckoutPending)
}

@Serializable
data class BillingStatus(
    val plan: String,
    val is_lifetime: Boolean = false,
    val billing_enabled: Boolean = true,
    val has_access: Boolean = true,
    val trial_ends_at: String? = null,
    val trial_expired: Boolean = false,
    val device_limit: Int? = null,
    val device_count: Int = 0,
    val plans: List<Plan> = emptyList(),
    val price: Int = 0,
    val devices: List<BillingDevice> = emptyList(),
    val billing_provider: String? = null,
    val portal_available: Boolean = false,
    val payment_instructions: String = "",
    val pending_request: PaymentRequestItem? = null,
)

@Serializable
data class CheckoutRequest(val device_id: String)

@Serializable
data class CheckoutResponse(
    val checkout_id: String,
    val url: String,
    val expires_at: String? = null,
    val reused: Boolean = false,
)

@Serializable
data class PortalResponse(val url: String)

@Serializable
data class MeResponse(
    val id: String,
    val email: String,
    val email_verified: Boolean = false,
    val created_at: String? = null,
    /** When set, the account is scheduled for deletion at this time (ISO-8601). */
    val deletion_at: String? = null,
    val plan: String? = null,
    /** Max devices for the plan; null means unlimited. */
    val device_limit: Int? = null,
)

@Serializable
data class Device(
    val id: String,
    val name: String,
    val pc_on: Int? = null,
    val last_seen_at: String? = null,
    val firmware_version: String? = null,
    val cpu_load: Double? = null,
    val ram_used_mb: Double? = null,
    val ram_total_mb: Double? = null,
    val gpu_temp: Double? = null,
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
    val cpu_load: Double? = null,
    val ram_used_mb: Double? = null,
    val ram_total_mb: Double? = null,
    val gpu_temp: Double? = null,
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
data class ApiError(val error: String? = null, val code: String? = null)

/** Carries the HTTP status + server error code so callers can branch on them
 *  (e.g. 402 / "device_locked" → open the device-unlock flow). */
class ApiException(
    val httpCode: Int,
    val serverCode: String? = null,
    message: String? = null,
) : Exception(message)

/** Command types the API accepts (POST /commands/:id). */
enum class CommandType(val wire: String, val label: String) {
    POWER_ON("power_on", "Power On"),
    POWER_OFF("power_off", "Power Off"),
    POWER_OFF_FORCE("power_off_force", "Force Off"),
    RESET("reset", "Reset"),
    SLEEP("sleep", "Sleep"),
}
