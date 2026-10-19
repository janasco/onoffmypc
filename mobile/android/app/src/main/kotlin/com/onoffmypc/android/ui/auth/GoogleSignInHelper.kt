package com.onoffmypc.android.ui.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.onoffmypc.android.BuildConfig

/**
 * Wraps the Credential Manager "Sign in with Google" flow. Returns the Google
 * ID token, which we POST to /auth/google. Configured via the server (Web)
 * OAuth client ID in BuildConfig.GOOGLE_SERVER_CLIENT_ID.
 */
object GoogleSignInHelper {

    /** True when a server client ID is configured, so the UI can show the button. */
    val isConfigured: Boolean get() = BuildConfig.GOOGLE_SERVER_CLIENT_ID.isNotBlank()

    /** Launches the Google chooser and returns the ID token, or throws on failure/cancel. */
    suspend fun getIdToken(context: Context): String {
        require(isConfigured) { "Google Sign-In is not configured" }

        val option = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_SERVER_CLIENT_ID).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()

        val result = CredentialManager.create(context).getCredential(context, request)
        val credential = result.credential
        if (credential is CustomCredential &&
            credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            return GoogleIdTokenCredential.createFrom(credential.data).idToken
        }
        throw IllegalStateException("Unexpected credential type")
    }
}
