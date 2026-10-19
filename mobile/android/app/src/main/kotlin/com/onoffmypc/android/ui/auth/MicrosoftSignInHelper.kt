package com.onoffmypc.android.ui.auth

import android.content.Context
import android.net.Uri
import com.onoffmypc.android.BuildConfig

/**
 * Microsoft / Entra sign-in via Custom Tab OIDC (public client). Returns the
 * ID token to POST to /auth/microsoft. Hidden when MICROSOFT_CLIENT_ID is empty.
 */
object MicrosoftSignInHelper {

    val isConfigured: Boolean get() = BuildConfig.MICROSOFT_CLIENT_ID.isNotBlank()

    suspend fun getIdToken(context: Context): String {
        require(isConfigured) { "Microsoft Sign-In is not configured" }
        val nonce = BrowserOidcHelper.randomNonce()
        val url = Uri.parse("https://login.microsoftonline.com/common/oauth2/v2.0/authorize").buildUpon()
            .appendQueryParameter("client_id", BuildConfig.MICROSOFT_CLIENT_ID)
            .appendQueryParameter("redirect_uri", BrowserOidcHelper.REDIRECT_URI)
            .appendQueryParameter("response_type", "id_token")
            .appendQueryParameter("response_mode", "fragment")
            .appendQueryParameter("scope", "openid profile email")
            .appendQueryParameter("nonce", nonce)
            .appendQueryParameter("prompt", "select_account")
            .build()
            .toString()
        return BrowserOidcHelper.authorize(context, url)
    }
}
