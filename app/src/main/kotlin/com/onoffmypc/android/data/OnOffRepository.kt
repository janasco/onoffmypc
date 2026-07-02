package com.onoffmypc.android.data

import com.onoffmypc.android.data.model.ApiError
import com.onoffmypc.android.data.model.CommandRequest
import com.onoffmypc.android.data.model.CommandResponse
import com.onoffmypc.android.data.model.CommandType
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.LoginRequest
import com.onoffmypc.android.data.model.MeResponse
import com.onoffmypc.android.data.remote.ApiService
import kotlinx.serialization.json.Json
import retrofit2.Response

class OnOffRepository(
    private val api: ApiService,
    private val session: SessionStore,
) {
    val hasSession: Boolean get() = session.session != null

    suspend fun login(email: String, password: String): Result<Unit> =
        call { api.login(LoginRequest(email.trim(), password)) }.map { }

    suspend fun me(): Result<MeResponse> = call { api.me() }

    suspend fun devices(): Result<List<Device>> = call { api.devices() }

    suspend fun sendCommand(id: String, type: CommandType): Result<CommandResponse> =
        call { api.sendCommand(id, CommandRequest(type.wire)) }

    suspend fun logout() {
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
            else -> Result.failure(Exception(parseError(res) ?: "Request failed (${res.code()})"))
        }
    } catch (_: Exception) {
        Result.failure(Exception("Network error"))
    }

    private fun parseError(res: Response<*>): String? = try {
        res.errorBody()?.string()?.let { JSON.decodeFromString<ApiError>(it).error }
    } catch (_: Exception) {
        null
    }

    private companion object {
        val JSON = Json { ignoreUnknownKeys = true }
    }
}
