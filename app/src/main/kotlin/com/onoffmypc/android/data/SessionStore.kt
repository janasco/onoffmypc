package com.onoffmypc.android.data

import android.content.Context

/** Persists the API `session` cookie in app-private storage. (Backup is disabled
 *  in the manifest so it isn't extracted via device backups; EncryptedSharedPrefs
 *  is a future hardening step.) */
class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("onoffmypc.session", Context.MODE_PRIVATE)

    var session: String?
        get() = prefs.getString(KEY, null)
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY) else putString(KEY, value)
            }.apply()
        }

    fun clear() {
        session = null
    }

    private companion object {
        const val KEY = "session_cookie"
    }
}
