package com.onoffmypc.android.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.onoffmypc.android.Graph
import com.onoffmypc.android.ui.auth.LoginScreen
import com.onoffmypc.android.ui.devices.DevicesScreen

private const val ROUTE_LOGIN = "login"
private const val ROUTE_DEVICES = "devices"

@Composable
fun AppNav() {
    val navController = rememberNavController()
    val start = if (Graph.session.session != null) ROUTE_DEVICES else ROUTE_LOGIN

    NavHost(navController = navController, startDestination = start) {
        composable(ROUTE_LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    navController.navigate(ROUTE_DEVICES) {
                        popUpTo(ROUTE_LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(ROUTE_DEVICES) {
            DevicesScreen(
                onLoggedOut = {
                    navController.navigate(ROUTE_LOGIN) {
                        popUpTo(ROUTE_DEVICES) { inclusive = true }
                    }
                },
            )
        }
    }
}
