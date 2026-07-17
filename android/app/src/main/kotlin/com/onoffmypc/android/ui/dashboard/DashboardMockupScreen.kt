package com.onoffmypc.android.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.onoffmypc.android.ui.components.AppLogo
import com.onoffmypc.android.ui.components.PowerControls
import com.onoffmypc.android.ui.designsystem.Spacing
import com.onoffmypc.android.ui.theme.OnOffTheme

/**
 * Static visual reference for a possible fleet-overview dashboard, adapted from a
 * Stitch mockup. All figures below (uptime, IP, hardware load, secondary-device
 * stats, latency history) are placeholder — this product's telemetry model only
 * reports pc_on/room_temp/room_humidity/rssi, not per-process hardware metrics.
 * Not wired to live data or navigation beyond this screen. This project deliberately
 * avoids the material-icons dependency (see PasswordField.kt), so tab/row markers
 * below are plain text glyphs rather than Icon().
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardMockupScreen(onBack: () -> Unit) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AppLogo(size = 28.dp, contentDescription = null)
                        Spacer(Modifier.width(Spacing.sm))
                        Text("OnOffMyPC", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    }
                },
                actions = {
                    TextButton(onClick = onBack) { Text("Close") }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                val items = listOf("⊞ Dashboard", "⚙ Setup", "≈ Sensors", "◍ Profile")
                items.forEachIndexed { index, label ->
                    val (glyph, text) = label.split(" ", limit = 2)
                    NavigationBarItem(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        icon = { Text(glyph) },
                        label = { Text(text) },
                    )
                }
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.lg),
        ) {
            PrimaryWorkstationCard()
            SecondaryDevicesCard()
            LatencyCard()
            FirmwareNoticeCard()
        }
    }
}

@Composable
private fun PrimaryWorkstationCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(Spacing.lg)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column {
                    Text("Primary Workstation", style = MaterialTheme.typography.headlineSmall)
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = Spacing.xs)) {
                        Box(
                            Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(OnOffTheme.status.positive),
                        )
                        Spacer(Modifier.width(Spacing.xs))
                        Text(
                            "Online • Up for 4d 12h",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Box(
                    Modifier
                        .clip(RoundedCornerShape(50))
                        .background(MaterialTheme.colorScheme.primaryContainer)
                        .padding(horizontal = Spacing.sm, vertical = Spacing.xs),
                ) {
                    Text(
                        "IP: 192.168.1.142",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
            }

            Spacer(Modifier.height(Spacing.lg))
            PowerControls(
                deviceName = "Primary Workstation",
                commandInFlight = false,
                onCommand = {},
            )

            Spacer(Modifier.height(Spacing.lg))
            Text(
                "Placeholder figures — this product does not report per-process hardware load.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(Spacing.sm))
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                StatBar("CPU LOAD", "42% • Ryzen 9 5950X", 0.42f, MaterialTheme.colorScheme.primary, Modifier.weight(1f))
                StatBar("GPU TEMP", "58°C • RTX 3080", 0.58f, MaterialTheme.colorScheme.tertiary, Modifier.weight(1f))
                StatBar("RAM USAGE", "15.4GB / 64GB", 0.24f, MaterialTheme.colorScheme.secondary, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun StatBar(label: String, value: String, fraction: Float, color: Color, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(Spacing.xs))
        Box(
            Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(50))
                .background(MaterialTheme.colorScheme.surfaceContainerHighest),
        ) {
            Box(
                Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraction)
                    .clip(RoundedCornerShape(50))
                    .background(color),
            )
        }
        Spacer(Modifier.height(Spacing.xs))
        Text(value, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun SecondaryDevicesCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(Spacing.lg)) {
            Text("Secondary Devices", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(Spacing.md))
            SecondaryDeviceRow("Home-Media-Server", "12.4TB Storage Free", "▤")
            Spacer(Modifier.height(Spacing.sm))
            SecondaryDeviceRow("Render-Rig-4090", "Rendering Task: 18%", "▦")
        }
    }
}

@Composable
private fun SecondaryDeviceRow(name: String, subtitle: String, glyph: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(Spacing.md),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.secondaryContainer)
                    .padding(Spacing.sm),
            ) {
                Text(glyph, color = MaterialTheme.colorScheme.secondary)
            }
            Spacer(Modifier.width(Spacing.md))
            Column {
                Text(name, style = MaterialTheme.typography.labelLarge)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Box(
            Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(OnOffTheme.status.positive),
        )
    }
}

@Composable
private fun LatencyCard() {
    val heights = listOf(0.40f, 0.50f, 0.45f, 0.60f, 0.80f, 0.70f, 0.30f, 0.40f, 0.55f, 0.90f, 0.75f, 0.60f, 0.50f, 0.40f, 0.45f)
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            Modifier
                .padding(Spacing.lg)
                .semantics { contentDescription = "24 hour latency chart, placeholder data, average 12 milliseconds" },
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("24H Latency", style = MaterialTheme.typography.labelLarge)
                Text("Avg 12ms", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.height(Spacing.md))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(96.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                heights.forEach { fraction ->
                    Box(
                        Modifier
                            .weight(1f)
                            .fillMaxHeight(fraction)
                            .clip(RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer),
                    )
                }
            }
            Spacer(Modifier.height(Spacing.sm))
            Text(
                "Past 24 Hours Network Stability",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun FirmwareNoticeCard() {
    var dismissed by remember { mutableStateOf(false) }
    if (dismissed) return

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(Spacing.md)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.tertiaryContainer)
                        .padding(Spacing.sm),
                ) {
                    Text("⇪", color = MaterialTheme.colorScheme.tertiary)
                }
                Spacer(Modifier.width(Spacing.md))
                Column(Modifier.weight(1f)) {
                    Text("Firmware update available (v2.4.1)", style = MaterialTheme.typography.labelLarge)
                    Text(
                        "Illustrative only — this build has no update-check backend yet.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(Spacing.md))
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                OutlinedButton(onClick = { dismissed = true }) { Text("Dismiss") }
                Button(onClick = { dismissed = true }) { Text("Update Now") }
            }
        }
    }
}
