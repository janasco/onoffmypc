package com.onoffmypc.android.data.remote

import com.onoffmypc.android.data.SessionStore
import okhttp3.Interceptor
import okhttp3.Response

/** On a 401 from an authenticated endpoint, clear the session and signal the app
 *  to return to login. Public auth endpoints (login/register/forgot/reset) are
 *  excluded — a 401 there is a credential error, not an expired session. */
class UnauthorizedInterceptor(private val store: SessionStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)
        if (response.code == 401 && !isPublicAuthPath(request.url.encodedPath)) {
            store.clear()
            AuthEvents.signalUnauthorized()
        }
        return response
    }

    private fun isPublicAuthPath(path: String): Boolean =
        path.endsWith("/auth/login") ||
            path.endsWith("/auth/register") ||
            path.endsWith("/auth/forgot-password") ||
            path.endsWith("/auth/reset-password")
}
