package com.onoffmypc.android.data.remote

import com.onoffmypc.android.data.model.CommandRequest
import com.onoffmypc.android.data.model.CommandResponse
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.LoginRequest
import com.onoffmypc.android.data.model.MeResponse
import com.onoffmypc.android.data.model.OkResponse
import com.onoffmypc.android.data.model.RegisterRequest
import com.onoffmypc.android.data.model.RegisterResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

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

    @POST("commands/{id}")
    suspend fun sendCommand(@Path("id") id: String, @Body body: CommandRequest): Response<CommandResponse>
}
