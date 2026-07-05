package com.onoffmypc.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface as AppSurface
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

private val DarkColors = darkColorScheme(
    primary = Accent,
    onPrimary = Color.White,
    background = Background,
    onBackground = OnBackground,
    surface = Surface,
    onSurface = OnBackground,
    surfaceVariant = Surface,
    onSurfaceVariant = Muted,
    error = Red,
    onError = Color.White,
    outline = Border,
)

private val LightColors = lightColorScheme(
    primary = Accent,
    onPrimary = Color.White,
    background = BackgroundLight,
    onBackground = OnBackgroundLight,
    surface = SurfaceLight,
    onSurface = OnBackgroundLight,
    surfaceVariant = SurfaceLight,
    onSurfaceVariant = MutedLight,
    error = Red,
    onError = Color.White,
    outline = BorderLight,
)

@Composable
fun OnOffMyPCTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    // Follows the system light/dark setting. The background is painted by
    // Compose (not just the platform window) so text contrast is always correct.
    MaterialTheme(colorScheme = if (darkTheme) DarkColors else LightColors) {
        AppSurface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
            content = content,
        )
    }
}
