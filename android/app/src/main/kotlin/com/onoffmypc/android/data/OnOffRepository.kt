package com.onoffmypc.android.data

import com.onoffmypc.android.data.model.ApiError
import com.onoffmypc.android.data.model.CommandRequest
import com.onoffmypc.android.data.model.CommandResponse
import com.onoffmypc.android.data.model.ChangeEmailRequest
import com.onoffmypc.android.data.model.ChangePasswordRequest
import com.onoffmypc.android.data.model.CheckoutRequest
import com.onoffmypc.android.data.model.CheckoutResponse
import com.onoffmypc.android.data.model.Command
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.DeviceNameRequest
import com.onoffmypc.android.data.model.DeviceStatus
import com.onoffmypc.android.data.model.ForgotPasswordRequest
import com.onoffmypc.android.data.model.GoogleAuthRequest
import com.onoffmypc.android.data.model.SocialAuthRequest
import com.onoffmypc.android.data.model.HistoryPoint
import com.onoffmypc.android.data.model.LoginRequest
import com.onoffmypc.android.data.model.MeResponse
import com.onoffmypc.android.data.model.NewDevice
import com.onoffmypc.android.data.model.PairCodeResponse
import com.onoffmypc.android.data.model.PortalResponse
import com.onoffmypc.android.data.model.PushRegisterRequest
import com.onoffmypc.android.data.model.RegisterRequest
import com.onoffmypc.android.data.model.Telemetry
import com.onoffmypc.android.data.remote.ApiService
import com.onoffmypc.android.push.PushManager
import kotlinx.serialization.json.Json
import retrofit2.Response

class OnOffRepository(
    private val api: ApiService,
    private val session: SessionStore,
) {
    val hasSession: Boolean get() = session.session != null

    suspend fun login(email: String, password: String): Result<Unit> =
        call { api.login(LoginRequest(email.trim(), password)) }.map { }

    /** Exchange a Google ID token for a session (cookie set by the API). */
    suspend fun googleSignIn(idToken: String): Result<Unit> =
        call { api.googleAuth(GoogleAuthRequest(idToken)) }.map { }

    suspend fun appleSignIn(idToken: String): Result<Unit> =
        call { api.appleAuth(SocialAuthRequest(idToken)) }.map { }

    suspend fun microsoftSignIn(idToken: String): Result<Unit> =
        call { api.microsoftAuth(SocialAuthRequest(idToken)) }.map { }

    /** Request a password-reset email. The API is intentionally silent about
     *  whether the address exists, so any 2xx is treated as success. */
    suspend fun forgotPassword(email: String): Result<Unit> =
        call { api.forgotPassword(ForgotPasswordRequest(email.trim())) }.map { }

    /** Register, then sign in (registration doesn't set a session cookie; login does). */
    suspend fun register(email: String, password: String): Result<Unit> {
        val reg = call { api.register(RegisterRequest(email.trim(), password)) }
        if (reg.isFailure) return Result.failure(reg.exceptionOrNull() ?: Exception("Registration failed"))
        return login(email, password)
    }

    suspend fun me(): Result<MeResponse> = call { api.me() }

    suspend fun billingStatus() = call { api.billingStatus() }
    suspend fun paymentHistory() = call { api.paymentHistory() }
    suspend fun createCheckout(deviceId: String): Result<CheckoutResponse> =
        call { api.createCheckout(CheckoutRequest(deviceId)) }

    suspend fun customerPortal(): Result<PortalResponse> = call { api.customerPortal() }

    suspend fun changeEmail(newEmail: String, password: String): Result<Unit> =
        call { api.changeEmail(ChangeEmailRequest(newEmail.trim(), password)) }.map { }

    suspend fun changePassword(current: String, new: String): Result<Unit> =
        call { api.changePassword(ChangePasswordRequest(current, new)) }.map { }

    suspend fun resendVerify(): Result<Unit> = call { api.resendVerify() }.map { }

    suspend fun registerPush(token: String): Result<Unit> =
        call { api.registerPush(PushRegisterRequest(token)) }.map { }

    suspend fun unregisterPush(token: String): Result<Unit> =
        call { api.unregisterPush(PushRegisterRequest(token)) }.map { }

    suspend fun deleteAccount(): Result<Unit> = call { api.deleteAccount() }.map { }

    suspend fun cancelDeletion(): Result<Unit> = call { api.cancelDeletion() }.map { }

    suspend fun devices(): Result<List<Device>> = call { api.devices() }

    suspend fun addDevice(name: String): Result<NewDevice> =
        call { api.addDevice(DeviceNameRequest(name.trim())) }

    suspend fun renameDevice(id: String, name: String): Result<Device> =
        call { api.renameDevice(id, DeviceNameRequest(name.trim())) }

    suspend fun deleteDevice(id: String): Result<Unit> = call { api.deleteDevice(id) }.map { }

    suspend fun rotateToken(id: String): Result<NewDevice> = call { api.rotateToken(id) }

    suspend fun generatePairCode(id: String): Result<PairCodeResponse> = call { api.generatePairCode(id) }

    suspend fun device(id: String): Result<Device> = call { api.device(id) }

    suspend fun deviceStatus(id: String): Result<DeviceStatus> = call { api.deviceStatus(id) }

    suspend fun telemetry(id: String): Result<List<Telemetry>> = call { api.telemetry(id) }

    suspend fun history(id: String, days: Int = 7): Result<List<HistoryPoint>> = call { api.history(id, days) }

    suspend fun commands(id: String): Result<List<Command>> = call { api.commands(id) }

    suspend fun sendCommand(id: String, type: CommandType): Result<CommandResponse> =
        call { api.sendCommand(id, CommandRequest(type.wire)) }

    suspend fun logout() {
        // Drop this device's push token while the session cookie is still valid.
        runCatching { PushManager.unregisterIfPossible() }
        runCatching { api.logout() }
        session.clear()
    }

    /** Success -> body; non-2xx -> the API's `error` message; exception -> generic. */
    private suspend fun <T> call(block: suspend () -> Response<T>): Result<T> = try {
        val res = block()
        val body = res.body()
        when {
            res.isSuccessful && body != null -> Result.success(body)
            res.isSuccessful -> Result.failure(Exception("Empty response"))
            else -> {
                val err = parseError(res)
                Result.failure(mapHttpFailure(res.code(), err))
            }
        }
    } catch (e: java.net.UnknownHostException) {
        Result.failure(NetworkException("Network error", e))
    } catch (e: java.net.ConnectException) {
        Result.failure(NetworkException("Network error", e))
    } catch (e: java.net.SocketTimeoutException) {
        Result.failure(NetworkException("Network error", e))
    } catch (_: Exception) {
        Result.failure(Exception("Network error"))
    }

    private fun parseError(res: Response<*>): ApiError? = try {
        res.errorBody()?.string()?.let { JSON.decodeFromString<ApiError>(it) }
    } catch (_: Exception) {
        null
    }

    private companion object {
        val JSON = Json { ignoreUnknownKeys = true }
    }
}
