package com.onoffmypc.android.ui.auth

import android.app.Activity
import android.os.Bundle

/**
 * Catches `com.onoffmypc.android://oauth...` redirects from Apple/Microsoft
 * browser sign-in and delivers the URI to [BrowserOidcHelper].
 */
class OAuthRedirectActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val uri = intent?.data
        if (uri != null) BrowserOidcHelper.complete(uri)
        else BrowserOidcHelper.cancel()
        finish()
    }
}
