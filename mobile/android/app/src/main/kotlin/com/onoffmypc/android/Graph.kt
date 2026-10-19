package com.onoffmypc.android

import android.app.Application
import com.onoffmypc.android.data.OnOffRepository
import com.onoffmypc.android.data.SessionStore
import com.onoffmypc.android.data.remote.ApiClient

/** Minimal manual dependency container, initialized in [OnOffApp]. */
object Graph {
    /**
     * The Application instance — never an Activity context. Holding an
     * Application statically is leak-safe and matches how this object is
     * initialized from `Application.onCreate()`.
     */
    lateinit var application: Application
        private set
    lateinit var session: SessionStore
        private set
    lateinit var repository: OnOffRepository
        private set

    fun init(application: Application) {
        this.application = application
        session = SessionStore(this.application)
        repository = OnOffRepository(ApiClient.create(session), session)
    }
}
