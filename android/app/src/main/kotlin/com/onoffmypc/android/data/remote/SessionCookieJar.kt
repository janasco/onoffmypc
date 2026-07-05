package com.onoffmypc.android.data.remote

import com.onoffmypc.android.data.SessionStore
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

/** Captures and replays only the API `session` cookie. Login sets it; logout
 *  sends an expired/empty one, which clears it. */
class SessionCookieJar(private val store: SessionStore) : CookieJar {

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        for (cookie in cookies) {
            if (cookie.name != "session") continue
            if (cookie.value.isBlank() || cookie.expiresAt < System.currentTimeMillis()) {
                store.clear()
            } else {
                store.session = cookie.value
            }
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val value = store.session ?: return emptyList()
        return listOf(
            Cookie.Builder()
                .name("session")
                .value(value)
                .domain(url.host)
                .path("/")
                .secure()
                .build(),
        )
    }
}
