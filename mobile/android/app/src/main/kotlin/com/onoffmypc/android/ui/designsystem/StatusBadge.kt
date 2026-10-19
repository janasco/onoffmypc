package com.onoffmypc.android.ui.designsystem

import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/** Compact text+tint badge for connection, command, or attention states. */
@Composable
fun StatusBadge(
    label: String,
    role: StatusRole,
    modifier: Modifier = Modifier,
) {
    val palette = statusPalette(role)
    Surface(
        modifier = modifier
            .defaultMinSize(minHeight = 28.dp)
            .clearAndSetSemantics { contentDescription = label },
        shape = RoundedCornerShape(Radius.pill),
        color = palette.container,
        contentColor = palette.content,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(
                horizontal = Spacing.smMd,
                vertical = Spacing.xs,
            ),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
