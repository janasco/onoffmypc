package com.onoffmypc.android.ui.auth

import android.content.Context
import android.net.Uri
import com.onoffmypc.android.BuildConfig

/**
 * Sign in with Apple via Custom Tab OIDC (Services ID). Returns the Apple
 * identity token to POST to /auth/apple. Hidden when APPLE_SERVICES_ID is empty.
 */
object AppleSignInHelper {

    val isConfigured: Boolean get() = BuildConfig.APPLE_SERVICES_ID.isNotBlank()

    suspend fun getIdToken(context: Context): String {
        require(isConfigured) { "Apple Sign-In is not configured" }
        val nonce = BrowserOidcHelper.randomNonce()
        val url = Uri.parse("https://appleid.apple.com/auth/authorize").buildUpon()
            .appendQueryParameter("client_id", BuildConfig.APPLE_SERVICES_ID)
            .appendQueryParameter("redirect_uri", BrowserOidcHelper.REDIRECT_URI)
            .appendQueryParameter("response_type", "code id_token")
            .appendQueryParameter("response_mode", "fragment")
            .appendQueryParameter("scope", "name email")
            .appendQueryParameter("nonce", nonce)
            .build()
            .toString()
        return BrowserOidcHelper.authorize(context, url)
    }
}
