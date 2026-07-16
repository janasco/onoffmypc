package com.onoffmypc.android.ui.auth

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.suspendCancellableCoroutine
import java.security.SecureRandom
import java.util.concurrent.atomic.AtomicReference
import kotlin.coroutines.Continuation
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Minimal browser-based OIDC helper: opens a Custom Tab authorize URL and
 * captures `id_token` from the redirect URI fragment/query. Used for Apple and
 * Microsoft when native SDKs are not wired. Hide provider buttons when client
 * IDs are empty so this path is inert until configured.
 */
object BrowserOidcHelper {
    const val REDIRECT_URI = "com.onoffmypc.android://oauth"

    private val pending = AtomicReference<Continuation<String>?>(null)

    fun randomNonce(): String {
        val bytes = ByteArray(16)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /** Called from [OAuthRedirectActivity] when the provider redirects back. */
    fun complete(uri: Uri) {
        val cont = pending.getAndSet(null) ?: return
        val idToken = extractIdToken(uri)
        if (idToken.isNullOrBlank()) {
            cont.resumeWithException(IllegalStateException("Sign-in did not return an ID token."))
        } else {
            cont.resume(idToken)
        }
    }

    fun cancel(reason: String = "Sign-in cancelled.") {
        pending.getAndSet(null)?.resumeWithException(IllegalStateException(reason))
    }

    suspend fun authorize(context: Context, authorizeUrl: String): String =
        suspendCancellableCoroutine { cont ->
            val previous = pending.getAndSet(cont)
            previous?.resumeWithException(IllegalStateException("Another sign-in is in progress."))
            cont.invokeOnCancellation { pending.compareAndSet(cont, null) }
            try {
                val intent = CustomTabsIntent.Builder().build()
                intent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                intent.launchUrl(context, Uri.parse(authorizeUrl))
            } catch (e: Exception) {
                pending.compareAndSet(cont, null)
                cont.resumeWithException(e)
            }
        }

    private fun extractIdToken(uri: Uri): String? {
        uri.getQueryParameter("id_token")?.let { if (it.isNotBlank()) return it }
        val fragment = uri.encodedFragment ?: return null
        return fragment.split('&')
            .mapNotNull { part ->
                val eq = part.indexOf('=')
                if (eq <= 0) null else part.substring(0, eq) to Uri.decode(part.substring(eq + 1))
            }
            .firstOrNull { it.first == "id_token" }
            ?.second
            ?.takeIf { it.isNotBlank() }
    }
}
