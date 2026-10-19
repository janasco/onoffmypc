package com.onoffmypc.android.ui.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color
import com.onoffmypc.android.ui.theme.OnOffTheme
import com.onoffmypc.design.generated.OnOffTone

/** Semantic roles keep business state separate from arbitrary palette choices. */
enum class StatusRole {
    Online,
    Offline,
    Unknown,
    Pending,
    Information,
    Positive,
    Danger,
}

fun OnOffTone.toStatusRole(): StatusRole = when (this) {
    OnOffTone.Positive -> StatusRole.Positive
    OnOffTone.PowerOn -> StatusRole.Information
    OnOffTone.Attention, OnOffTone.PowerReset -> StatusRole.Pending
    OnOffTone.Critical, OnOffTone.Danger, OnOffTone.PowerOff -> StatusRole.Danger
    OnOffTone.Info -> StatusRole.Information
    OnOffTone.Neutral -> StatusRole.Unknown
}

@Immutable
data class StatusPalette(
    val content: Color,
    val container: Color,
)

@Composable
@ReadOnlyComposable
fun statusPalette(role: StatusRole): StatusPalette {
    val scheme = MaterialTheme.colorScheme
    val operational = OnOffTheme.status
    return when (role) {
        StatusRole.Online, StatusRole.Positive -> StatusPalette(
            content = operational.positive,
            container = operational.positiveContainer,
        )
        StatusRole.Pending -> StatusPalette(
            content = operational.warning,
            container = operational.warningContainer,
        )
        StatusRole.Offline, StatusRole.Danger -> StatusPalette(
            content = scheme.error,
            container = scheme.errorContainer,
        )
        StatusRole.Information -> StatusPalette(
            content = scheme.primary,
            container = scheme.primaryContainer,
        )
        StatusRole.Unknown -> StatusPalette(
            content = scheme.onSurfaceVariant,
            container = scheme.surfaceVariant,
        )
    }
}
