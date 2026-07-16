package com.onoffmypc.android.data.remote

import com.onoffmypc.android.data.model.ChangeEmailRequest
import com.onoffmypc.android.data.model.ChangePasswordRequest
import com.onoffmypc.android.data.model.CheckoutRequest
import com.onoffmypc.android.data.model.CheckoutResponse
import com.onoffmypc.android.data.model.Command
import com.onoffmypc.android.data.model.CommandRequest
import com.onoffmypc.android.data.model.CommandResponse
import com.onoffmypc.android.data.model.DeletedResponse
import com.onoffmypc.android.data.model.Device
import com.onoffmypc.android.data.model.DeviceNameRequest
import com.onoffmypc.android.data.model.DeviceStatus
import com.onoffmypc.android.data.model.BillingStatus
import com.onoffmypc.android.data.model.ForgotPasswordRequest
import com.onoffmypc.android.data.model.GoogleAuthRequest
import com.onoffmypc.android.data.model.SocialAuthRequest
import com.onoffmypc.android.data.model.PaymentRequestItem
import com.onoffmypc.android.data.model.PortalResponse
import com.onoffmypc.android.data.model.HistoryPoint
import com.onoffmypc.android.data.model.Telemetry
import com.onoffmypc.android.data.model.LoginRequest
import com.onoffmypc.android.data.model.MeResponse
import com.onoffmypc.android.data.model.NewDevice
import com.onoffmypc.android.data.model.OkResponse
import com.onoffmypc.android.data.model.PushRegisterRequest
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

    @POST("auth/google")
    suspend fun googleAuth(@Body body: GoogleAuthRequest): Response<OkResponse>

    @POST("auth/apple")
    suspend fun appleAuth(@Body body: SocialAuthRequest): Response<OkResponse>

    @POST("auth/microsoft")
    suspend fun microsoftAuth(@Body body: SocialAuthRequest): Response<OkResponse>

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<RegisterResponse>

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): Response<OkResponse>

    @POST("push/register")
    suspend fun registerPush(@Body body: PushRegisterRequest): Response<OkResponse>

    @POST("push/unregister")
    suspend fun unregisterPush(@Body body: PushRegisterRequest): Response<OkResponse>

    @GET("auth/me")
    suspend fun me(): Response<MeResponse>

    @GET("billing/status")
    suspend fun billingStatus(): Response<BillingStatus>

    @POST("billing/checkout")
    suspend fun createCheckout(@Body body: CheckoutRequest): Response<CheckoutResponse>

    @POST("billing/portal")
    suspend fun customerPortal(): Response<PortalResponse>

    @GET("billing/requests")
    suspend fun paymentHistory(): Response<List<PaymentRequestItem>>

    @POST("auth/change-email")
    suspend fun changeEmail(@Body body: ChangeEmailRequest): Response<OkResponse>

    @POST("auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): Response<OkResponse>

    @POST("auth/resend-verify")
    suspend fun resendVerify(): Response<OkResponse>

    @DELETE("auth/account")
    suspend fun deleteAccount(): Response<OkResponse>

    @POST("auth/account/cancel-deletion")
    suspend fun cancelDeletion(): Response<OkResponse>

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

    @POST("devices/{id}/rotate-token")
    suspend fun rotateToken(@Path("id") id: String): Response<NewDevice>

    @GET("devices/{id}")
    suspend fun device(@Path("id") id: String): Response<Device>

    @GET("devices/{id}/status")
    suspend fun deviceStatus(@Path("id") id: String): Response<DeviceStatus>

    @GET("telemetry/{id}")
    suspend fun telemetry(@Path("id") id: String): Response<List<Telemetry>>

    @GET("telemetry/{id}/history")
    suspend fun history(@Path("id") id: String, @Query("days") days: Int): Response<List<HistoryPoint>>

    @GET("commands/{id}")
    suspend fun commands(@Path("id") id: String): Response<List<Command>>

    @POST("commands/{id}")
    suspend fun sendCommand(@Path("id") id: String, @Body body: CommandRequest): Response<CommandResponse>
}
