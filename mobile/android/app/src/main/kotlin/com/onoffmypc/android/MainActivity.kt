package com.onoffmypc.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import com.onoffmypc.android.push.PushManager
import com.onoffmypc.android.push.RequestNotificationPermission
import com.onoffmypc.android.ui.navigation.AppNav
import com.onoffmypc.android.ui.theme.OnOffMyPCTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Android 16 (API 36) enforces edge-to-edge for apps targeting 36.
        // Call this after super.onCreate and before setContent; Scaffold
        // consumes the resulting insets on every screen.
        enableEdgeToEdge()
        setContent {
            OnOffMyPCTheme {
                RequestNotificationPermission()
                LaunchedEffect(Unit) { PushManager.registerIfPossible() }
                AppNav()
            }
        }
    }
}
