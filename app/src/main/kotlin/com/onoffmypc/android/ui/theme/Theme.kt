package com.onoffmypc.android.ui.theme

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface as AppSurface
import androidx.compose.material3.darkColorScheme
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

@Composable
fun OnOffMyPCTheme(content: @Composable () -> Unit) {
    // Dark-first, mirroring the web app — always dark, regardless of the system
    // light/dark setting, and the background is painted by Compose (not just the
    // platform window) so text contrast is always correct.
    MaterialTheme(colorScheme = DarkColors) {
        AppSurface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
            content = content,
        )
    }
}
