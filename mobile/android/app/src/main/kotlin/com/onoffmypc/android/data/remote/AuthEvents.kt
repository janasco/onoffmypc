package com.onoffmypc.android.data.remote

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

/** App-wide signal that the session is no longer valid (a 401 on an authenticated
 *  request). The navigation host collects this and returns to the login screen. */
object AuthEvents {
    private val _unauthorized = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val unauthorized: SharedFlow<Unit> = _unauthorized

    fun signalUnauthorized() {
        _unauthorized.tryEmit(Unit)
    }
}
