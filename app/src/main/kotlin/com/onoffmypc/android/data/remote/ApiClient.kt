package com.onoffmypc.android.data.remote

import com.onoffmypc.android.data.Api
import com.onoffmypc.android.data.SessionStore
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit

object ApiClient {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun create(store: SessionStore): ApiService {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .cookieJar(SessionCookieJar(store))
            .addInterceptor(UnauthorizedInterceptor(store))
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(Api.BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(KotlinxJsonConverterFactory(json, "application/json".toMediaType()))
            .build()
            .create(ApiService::class.java)
    }
}
