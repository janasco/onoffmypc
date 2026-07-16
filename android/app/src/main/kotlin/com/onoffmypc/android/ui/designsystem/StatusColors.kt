package com.onoffmypc.android.ui.designsystem

import androidx.compose.ui.graphics.Color
import com.onoffmypc.android.ui.theme.Accent
import com.onoffmypc.android.ui.theme.Green
import com.onoffmypc.android.ui.theme.Muted
import com.onoffmypc.android.ui.theme.Red
import com.onoffmypc.android.ui.theme.Yellow

/**
 * Semantic status colors wrapping [com.onoffmypc.android.ui.theme.Color] brand tokens.
 * Prefer these (or MaterialTheme) over raw hex in new UI.
 */
object StatusColors {
    val online: Color = Green
    val offline: Color = Red
    val unknown: Color = Muted
    val pending: Color = Yellow
    val info: Color = Accent
    val danger: Color = Red
}
