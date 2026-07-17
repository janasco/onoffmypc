package com.onoffmypc.android.ui.designsystem

import androidx.compose.ui.unit.Dp
import com.onoffmypc.design.generated.OnOffRadius
import com.onoffmypc.design.generated.OnOffSpacing

/** Shared spacing scale — aliases common paddings used across screens. */
object Spacing {
    val xs: Dp = OnOffSpacing.x1
    val sm: Dp = OnOffSpacing.x2
    val smMd: Dp = OnOffSpacing.x3
    val md: Dp = OnOffSpacing.x4
    val mdLg: Dp = OnOffSpacing.x5
    val lg: Dp = OnOffSpacing.x6
    val xlg: Dp = OnOffSpacing.x8
    val xl: Dp = OnOffSpacing.x12
}

/** Corner radii used by new design-system surfaces. */
object Radius {
    val compact: Dp = OnOffRadius.compact
    val sm: Dp = OnOffRadius.small
    val md: Dp = OnOffRadius.card
    val lg: Dp = OnOffRadius.large
    val pill: Dp = OnOffRadius.pill
}
