package com.onoffmypc.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Surface as AppSurface
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Immutable
data class OnOffStatusColors(
    val positive: Color,
    val positiveContainer: Color,
    val onPositiveContainer: Color,
    val warning: Color,
    val warningContainer: Color,
    val onWarningContainer: Color,
    val powerOnBackground: Color,
    val powerOnForeground: Color,
    val powerOffBackground: Color,
    val powerOffForeground: Color,
    val powerResetBackground: Color,
    val powerResetForeground: Color,
)

private val LightStatusColors = OnOffStatusColors(
    positive = OperationalGreenLight,
    positiveContainer = OperationalGreenContainerLight,
    onPositiveContainer = OperationalGreenLight,
    warning = OperationalAmberLight,
    warningContainer = OperationalAmberContainerLight,
    onWarningContainer = OperationalAmberLight,
    powerOnBackground = PowerOnBackgroundLight,
    powerOnForeground = PowerOnForegroundLight,
    powerOffBackground = PowerOffBackgroundLight,
    powerOffForeground = PowerOffForegroundLight,
    powerResetBackground = PowerResetBackgroundLight,
    powerResetForeground = PowerResetForegroundLight,
)

private val DarkStatusColors = OnOffStatusColors(
    positive = OperationalGreenDark,
    positiveContainer = OperationalGreenContainerDark,
    onPositiveContainer = OperationalGreenDark,
    warning = OperationalAmberDark,
    warningContainer = OperationalAmberContainerDark,
    onWarningContainer = OperationalAmberDark,
    powerOnBackground = PowerOnBackgroundDark,
    powerOnForeground = PowerOnForegroundDark,
    powerOffBackground = PowerOffBackgroundDark,
    powerOffForeground = PowerOffForegroundDark,
    powerResetBackground = PowerResetBackgroundDark,
    powerResetForeground = PowerResetForegroundDark,
)

private val LocalOnOffStatusColors = staticCompositionLocalOf { LightStatusColors }

object OnOffTheme {
    val status: OnOffStatusColors
        @Composable
        @ReadOnlyComposable
        get() = LocalOnOffStatusColors.current
}

private val DarkColors = darkColorScheme(
    primary = ActionBlueDark,
    onPrimary = ActionBlueForegroundDark,
    primaryContainer = ActionBlueContainerDark,
    onPrimaryContainer = ActionBlueOnContainerDark,
    inversePrimary = ActionBlueLight,
    secondary = TextSecondaryDark,
    onSecondary = CanvasDark,
    secondaryContainer = SurfaceStrongDark,
    onSecondaryContainer = TextPrimaryDark,
    tertiary = PowerOnBackgroundDark,
    onTertiary = PowerOnForegroundDark,
    tertiaryContainer = OperationalGreenContainerDark,
    onTertiaryContainer = OperationalGreenDark,
    background = CanvasDark,
    onBackground = TextPrimaryDark,
    surface = SurfaceDark,
    onSurface = TextPrimaryDark,
    surfaceVariant = SurfaceSubtleDark,
    onSurfaceVariant = TextSecondaryDark,
    surfaceTint = ActionBlueDark,
    inverseSurface = BackgroundInverseDark,
    inverseOnSurface = TextInverseDark,
    error = OperationalRedDark,
    onError = DangerActionForegroundDark,
    errorContainer = OperationalRedContainerDark,
    onErrorContainer = OperationalRedDark,
    outline = BorderDark,
    outlineVariant = BorderSubtleDark,
    surfaceBright = SurfaceStrongDark,
    surfaceContainer = SurfaceDark,
    surfaceContainerHigh = SurfaceSubtleDark,
    surfaceContainerHighest = SurfaceStrongDark,
    surfaceContainerLow = CanvasDark,
    surfaceContainerLowest = CanvasDark,
    surfaceDim = CanvasDark,
)

private val LightColors = lightColorScheme(
    primary = ActionBlueLight,
    onPrimary = ActionBlueForegroundLight,
    primaryContainer = ActionBlueContainerLight,
    onPrimaryContainer = ActionBlueOnContainerLight,
    inversePrimary = ActionBlueDark,
    secondary = TextSecondaryLight,
    onSecondary = TextInverseLight,
    secondaryContainer = SurfaceStrongLight,
    onSecondaryContainer = TextPrimaryLight,
    tertiary = PowerOnBackgroundLight,
    onTertiary = PowerOnForegroundLight,
    tertiaryContainer = OperationalGreenContainerLight,
    onTertiaryContainer = OperationalGreenLight,
    background = CanvasLight,
    onBackground = TextPrimaryLight,
    surface = SurfaceLight,
    onSurface = TextPrimaryLight,
    surfaceVariant = SurfaceSubtleLight,
    onSurfaceVariant = TextSecondaryLight,
    surfaceTint = ActionBlueLight,
    inverseSurface = BackgroundInverseLight,
    inverseOnSurface = TextInverseLight,
    error = OperationalRedLight,
    onError = DangerActionForegroundLight,
    errorContainer = OperationalRedContainerLight,
    onErrorContainer = OperationalRedLight,
    outline = BorderLight,
    outlineVariant = BorderSubtleLight,
    surfaceBright = SurfaceLight,
    surfaceContainer = SurfaceSubtleLight,
    surfaceContainerHigh = SurfaceStrongLight,
    surfaceContainerHighest = SurfaceStrongLight,
    surfaceContainerLow = CanvasLight,
    surfaceContainerLowest = SurfaceLight,
    surfaceDim = SurfaceStrongLight,
)

private val OnOffTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 38.sp,
        letterSpacing = (-0.4).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.25).sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 30.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
        letterSpacing = 0.sp,
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 14.sp,
        lineHeight = 21.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 12.sp,
        lineHeight = 18.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 17.sp,
        letterSpacing = 0.2.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.35.sp,
    ),
)

private val OnOffShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp),
)

@Composable
fun OnOffMyPCTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(
        LocalOnOffStatusColors provides if (darkTheme) DarkStatusColors else LightStatusColors,
    ) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkColors else LightColors,
            typography = OnOffTypography,
            shapes = OnOffShapes,
        ) {
            AppSurface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background,
                content = content,
            )
        }
    }
}
