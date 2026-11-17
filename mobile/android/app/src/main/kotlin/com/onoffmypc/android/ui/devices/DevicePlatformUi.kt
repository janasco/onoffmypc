package com.onoffmypc.android.ui.devices

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DevicesOther
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.LaptopMac
import androidx.compose.material.icons.outlined.Memory
import androidx.compose.material.icons.outlined.Terminal
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun PlatformBadge(
    platform: DevicePlatform,
    modifier: Modifier = Modifier,
    size: Dp = 44.dp,
) {
    Surface(
        modifier = modifier.size(size),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = platformIcon(platform.os),
                contentDescription = platform.label,
                modifier = Modifier.size(size * 0.52f),
            )
        }
    }
}

private fun platformIcon(os: DeviceOs): ImageVector = when (os) {
    DeviceOs.WINDOWS -> Icons.Outlined.GridView
    DeviceOs.LINUX -> Icons.Outlined.Terminal
    DeviceOs.MACOS -> Icons.Outlined.LaptopMac
    DeviceOs.ESP32, DeviceOs.ESP8266 -> Icons.Outlined.Memory
    DeviceOs.UNKNOWN -> Icons.Outlined.DevicesOther
}
