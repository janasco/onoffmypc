package com.onoffmypc.android.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl

/** A session cookie value together with the exact API origin that issued it. */
data class ApiSession(val value: String, val origin: String)

/** Canonical scheme + host + port, including the default HTTPS port. */
internal fun HttpUrl.originString(): String = "$scheme://$host:$port"

/** Narrow storage seam so cookie-origin logic is testable without Android. */
interface SessionTokenStore {
    /** Persisted pair; [sessionFor] enforces the origin binding before use. */
    var storedSession: ApiSession?
    fun clear()
}

/** Returns the cookie only when it was issued by [origin]; clears any mismatch. */
fun SessionTokenStore.sessionFor(origin: String): String? {
    val stored = storedSession ?: return null
    if (stored.origin != origin) {
        clear()
        return null
    }
    return stored.value
}

/** Persists the API `session` cookie and its issuing origin in encrypted app-private storage. */
class SessionStore(context: Context) : SessionTokenStore {
    private val prefs: SharedPreferences = run {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    override var storedSession: ApiSession?
        get() {
            val value = prefs.getString(KEY_SESSION, null)
            val origin = prefs.getString(KEY_ORIGIN, null)
            if (value.isNullOrBlank() || origin.isNullOrBlank()) {
                if (value != null || origin != null) clear()
                return null
            }
            return ApiSession(value, origin)
        }
        set(value) {
            prefs.edit().apply {
                if (value == null) {
                    remove(KEY_SESSION)
                    remove(KEY_ORIGIN)
                } else {
                    putString(KEY_SESSION, value.value)
                    putString(KEY_ORIGIN, value.origin)
                }
            }.apply()
        }

    override fun clear() {
        prefs.edit().remove(KEY_SESSION).remove(KEY_ORIGIN).apply()
    }

    /** True only when the stored session was issued by the configured API origin. */
    val hasSession: Boolean
        get() = sessionFor(Api.BASE_URL.toHttpUrl().originString()) != null

    private companion object {
        const val PREFS_NAME = "onoffmypc.session"
        const val KEY_SESSION = "session_cookie"
        const val KEY_ORIGIN = "session_api_origin"
    }
}
