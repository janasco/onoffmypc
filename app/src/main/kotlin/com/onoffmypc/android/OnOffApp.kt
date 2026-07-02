package com.onoffmypc.android

import android.app.Application

class OnOffApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Graph.init(this)
    }
}
