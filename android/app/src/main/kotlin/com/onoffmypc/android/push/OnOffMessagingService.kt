package com.onoffmypc.android.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/** Receives FCM messages and token rotations. Declared in the manifest. */
class OnOffMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        PushManager.onTokenRefreshed(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: message.data["title"] ?: "OnOffMyPC"
        val body = message.notification?.body ?: message.data["body"] ?: return
        Notifications.show(this, title, body)
    }
}
