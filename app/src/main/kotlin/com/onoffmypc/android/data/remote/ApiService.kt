package com.onoffmypc.android.data.remote

import com.onoffmypc.android.data.model.CommandRequest
import com.onoffmypc.android.data.model.CommandResponse
import com.onoffmypc.android.data.model.DeletedResponse
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.DeviceNameRequest
import com.onoffmypc.android.data.model.DeviceStatus
import com.onoffmypc.android.data.model.HistoryPoint
import com.onoffmypc.android.data.model.Telemetry
import com.onoffmypc.android.data.model.LoginRequest
import com.onoffmypc.android.data.model.MeResponse
import com.onoffmypc.android.data.model.NewDevice
import com.onoffmypc.android.data.model.OkResponse
import com.onoffmypc.android.data.model.RegisterRequest
import com.onoffmypc.android.data.model.RegisterResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<OkResponse>

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<RegisterResponse>

    @GET("auth/me")
    suspend fun me(): Response<MeResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<OkResponse>

    @GET("devices")
    suspend fun devices(): Response<List<Device>>

    @POST("devices")
    suspend fun addDevice(@Body body: DeviceNameRequest): Response<NewDevice>

    @PATCH("devices/{id}")
    suspend fun renameDevice(@Path("id") id: String, @Body body: DeviceNameRequest): Response<Device>

    @DELETE("devices/{id}")
    suspend fun deleteDevice(@Path("id") id: String): Response<DeletedResponse>

    @GET("devices/{id}")
    suspend fun device(@Path("id") id: String): Response<Device>

    @GET("devices/{id}/status")
    suspend fun deviceStatus(@Path("id") id: String): Response<DeviceStatus>

    @GET("telemetry/{id}")
    suspend fun telemetry(@Path("id") id: String): Response<List<Telemetry>>

    @GET("telemetry/{id}/history")
    suspend fun history(@Path("id") id: String, @Query("days") days: Int): Response<List<HistoryPoint>>

    @POST("commands/{id}")
    suspend fun sendCommand(@Path("id") id: String, @Body body: CommandRequest): Response<CommandResponse>
}
