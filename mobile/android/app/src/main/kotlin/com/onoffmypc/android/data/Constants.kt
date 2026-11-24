package com.onoffmypc.android.data

import com.onoffmypc.android.BuildConfig

/** Backend API. The app authenticates with a Bearer token (the API also accepts
 *  the HttpOnly session cookie used by the web app). */
object Api {
    /** Injected at build time by app/build.gradle.kts from `-PAPI_BASE_URL` or
     *  the `API_BASE_URL` environment variable. Gradle rejects blank and
     *  non-HTTPS values; this check keeps the invariant at runtime. */
    val BASE_URL: String = BuildConfig.API_BASE_URL.also { url ->
        require(url.startsWith("https://")) {
            "API_BASE_URL must use HTTPS"
        }
    }
}
