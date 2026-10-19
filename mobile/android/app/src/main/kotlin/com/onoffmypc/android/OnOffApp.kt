package com.onoffmypc.android

import android.app.Application
import com.onoffmypc.android.push.Notifications

class OnOffApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Graph.init(this)
        Notifications.ensureChannel(this)
    }
}
