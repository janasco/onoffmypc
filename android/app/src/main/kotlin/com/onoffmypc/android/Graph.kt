package com.onoffmypc.android

import android.content.Context
import com.onoffmypc.android.data.OnOffRepository
import com.onoffmypc.android.data.SessionStore
import com.onoffmypc.android.data.remote.ApiClient

/** Minimal manual dependency container, initialized in [OnOffApp]. */
object Graph {
    lateinit var session: SessionStore
        private set
    lateinit var repository: OnOffRepository
        private set

    fun init(context: Context) {
        session = SessionStore(context.applicationContext)
        repository = OnOffRepository(ApiClient.create(session), session)
    }
}
