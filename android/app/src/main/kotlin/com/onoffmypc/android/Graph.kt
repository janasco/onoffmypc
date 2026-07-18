package com.onoffmypc.android

import android.content.Context
import com.onoffmypc.android.data.OnOffRepository
import com.onoffmypc.android.data.SessionStore
import com.onoffmypc.android.data.remote.ApiClient

/** Minimal manual dependency container, initialized in [OnOffApp]. */
object Graph {
    lateinit var context: Context
        private set
    lateinit var session: SessionStore
        private set
    lateinit var repository: OnOffRepository
        private set

    fun init(context: Context) {
        this.context = context.applicationContext
        session = SessionStore(this.context)
        repository = OnOffRepository(ApiClient.create(session), session)
    }
}
