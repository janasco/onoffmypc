package com.onoffmypc.android.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.onoffmypc.android.Graph
import com.onoffmypc.android.data.remote.AuthEvents
import com.onoffmypc.android.ui.account.AccountScreen
import com.onoffmypc.android.ui.billing.BillingScreen
import com.onoffmypc.android.ui.auth.ForgotPasswordScreen
import com.onoffmypc.android.ui.auth.LoginScreen
import com.onoffmypc.android.ui.auth.RegisterScreen
import com.onoffmypc.android.ui.devices.DeviceDetailScreen
import com.onoffmypc.android.ui.devices.DevicesScreen

private const val ROUTE_LOGIN = "login"
private const val ROUTE_REGISTER = "register"
private const val ROUTE_FORGOT = "forgot"
private const val ROUTE_DEVICES = "devices"
private const val ROUTE_ACCOUNT = "account"
private const val ROUTE_BILLING = "billing"
private const val ROUTE_BILLING_PATTERN = "billing?deviceId={deviceId}"

private fun billingRoute(deviceId: String? = null): String =
    if (deviceId == null) ROUTE_BILLING else "$ROUTE_BILLING?deviceId=$deviceId"

@Composable
fun AppNav() {
    val navController = rememberNavController()
    val start = if (Graph.session.session != null) ROUTE_DEVICES else ROUTE_LOGIN

    // Return to login whenever the session becomes invalid (401 on an
    // authenticated request, emitted by UnauthorizedInterceptor).
    LaunchedEffect(Unit) {
        AuthEvents.unauthorized.collect {
            navController.navigate(ROUTE_LOGIN) {
                popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    NavHost(navController = navController, startDestination = start) {
        composable(ROUTE_LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    navController.navigate(ROUTE_DEVICES) {
                        popUpTo(ROUTE_LOGIN) { inclusive = true }
                    }
                },
                onRegister = { navController.navigate(ROUTE_REGISTER) },
                onForgotPassword = { navController.navigate(ROUTE_FORGOT) },
            )
        }
        composable(ROUTE_FORGOT) {
            ForgotPasswordScreen(onBackToLogin = { navController.popBackStack() })
        }
        composable(ROUTE_REGISTER) {
            RegisterScreen(
                onRegistered = {
                    navController.navigate(ROUTE_DEVICES) {
                        popUpTo(ROUTE_LOGIN) { inclusive = true }
                    }
                },
                onBackToLogin = { navController.popBackStack() },
            )
        }
        composable(ROUTE_DEVICES) {
            DevicesScreen(
                onOpen = { device -> navController.navigate("device/${device.id}") },
                onAccount = { navController.navigate(ROUTE_ACCOUNT) },
                onBilling = { deviceId -> navController.navigate(billingRoute(deviceId)) },
                onLoggedOut = {
                    navController.navigate(ROUTE_LOGIN) {
                        popUpTo(ROUTE_DEVICES) { inclusive = true }
                    }
                },
            )
        }
        composable(ROUTE_ACCOUNT) {
            AccountScreen(
                onBack = { navController.popBackStack() },
                onBilling = { navController.navigate(billingRoute()) },
                onSignedOut = {
                    navController.navigate(ROUTE_LOGIN) {
                        popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                    }
                },
            )
        }
        composable(
            route = ROUTE_BILLING_PATTERN,
            arguments = listOf(
                navArgument("deviceId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
            ),
        ) { backStackEntry ->
            BillingScreen(
                onBack = { navController.popBackStack() },
                initialDeviceId = backStackEntry.arguments?.getString("deviceId"),
            )
        }
        composable(
            route = "device/{deviceId}",
            arguments = listOf(navArgument("deviceId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val deviceId = backStackEntry.arguments?.getString("deviceId")
            if (deviceId != null) {
                DeviceDetailScreen(
                    deviceId = deviceId,
                    onBack = { navController.popBackStack() },
                    onUpgrade = { navController.navigate(billingRoute(deviceId)) },
                )
            }
        }
    }
}
