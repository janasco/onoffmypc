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
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            OnOffMyPCTheme {
                RequestNotificationPermission()
                LaunchedEffect(Unit) { PushManager.registerIfPossible() }
                AppNav()
            }
        }
    }
}
