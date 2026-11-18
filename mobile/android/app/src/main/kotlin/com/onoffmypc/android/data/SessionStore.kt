package com.onoffmypc.android.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** Narrow storage seam so cookie-origin logic is testable without Android. */
interface SessionTokenStore {
    var session: String?
    fun clear()
}

/** Persists the API `session` cookie in encrypted app-private storage. */
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

    override var session: String?
        get() = prefs.getString(KEY, null)
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY) else putString(KEY, value)
            }.apply()
        }

    override fun clear() {
        session = null
    }

    private companion object {
        const val PREFS_NAME = "onoffmypc.session"
        const val KEY = "session_cookie"
    }
}
