package com.onoffmypc.android.data.remote

import com.onoffmypc.android.data.Api
import com.onoffmypc.android.data.SessionTokenStore
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl

/** Captures and replays only the API `session` cookie. Login sets it; logout
 *  sends an expired/empty one, which clears it.
 *
 *  The cookie is bound to the configured HTTPS API origin. OkHttp is configured
 *  not to follow redirects, so a cross-origin redirect cannot receive it. */
class SessionCookieJar(
    private val store: SessionTokenStore,
    private val apiUrl: HttpUrl = Api.BASE_URL.toHttpUrl(),
) : CookieJar {

    private fun isApiOrigin(url: HttpUrl): Boolean =
        url.isHttps && url.host == apiUrl.host && url.port == apiUrl.port

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        if (!isApiOrigin(url)) return
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
        if (!isApiOrigin(url)) return emptyList()
        val value = store.session ?: return emptyList()
        return listOf(
            Cookie.Builder()
                .name("session")
                .value(value)
                .hostOnlyDomain(apiUrl.host)
                .path("/")
                .secure()
                .httpOnly()
                .build(),
        )
    }
}
