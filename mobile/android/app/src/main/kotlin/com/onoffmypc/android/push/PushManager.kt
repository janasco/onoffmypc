package com.onoffmypc.android.push

import com.google.firebase.messaging.FirebaseMessaging
import com.onoffmypc.android.Graph
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Registers the FCM token with the backend. All calls are no-ops when Firebase
 *  isn't configured (no google-services.json) or the user isn't signed in. */
object PushManager {

    private val scope = CoroutineScope(Dispatchers.IO)

    /** Fetch the current token and register it, if signed in and FCM is available. */
    fun registerIfPossible() {
        if (!Graph.repository.hasSession) return
        val messaging = messagingOrNull() ?: return
        messaging.token.addOnCompleteListener { task ->
            val token = if (task.isSuccessful) task.result else null
            if (!token.isNullOrEmpty()) {
                scope.launch { runCatching { Graph.repository.registerPush(token) } }
            }
        }
    }

    /** Called by the messaging service when the token rotates. */
    fun onTokenRefreshed(token: String) {
        if (!Graph.repository.hasSession || token.isEmpty()) return
        scope.launch { runCatching { Graph.repository.registerPush(token) } }
    }

    /** Best-effort: tell the API to drop this device's FCM token. Call while the
     *  session is still valid (e.g. during logout), before clearing credentials. */
    suspend fun unregisterIfPossible() {
        if (!Graph.repository.hasSession) return
        val messaging = messagingOrNull() ?: return
        val token = currentToken(messaging) ?: return
        if (token.isNotEmpty()) {
            runCatching { Graph.repository.unregisterPush(token) }
        }
    }

    private suspend fun currentToken(messaging: FirebaseMessaging): String? =
        suspendCancellableCoroutine { cont ->
            messaging.token.addOnCompleteListener { task ->
                if (cont.isCompleted) return@addOnCompleteListener
                cont.resume(if (task.isSuccessful) task.result else null)
            }
        }

    private fun messagingOrNull(): FirebaseMessaging? = try {
        FirebaseMessaging.getInstance()
    } catch (_: Exception) {
        null // Firebase not configured
    }
}
