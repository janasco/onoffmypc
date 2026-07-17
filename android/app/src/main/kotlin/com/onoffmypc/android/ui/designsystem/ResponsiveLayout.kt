package com.onoffmypc.android.ui.designsystem

/**
 * Dense two-column controls become difficult to read on 320 dp devices and at
 * accessibility font scales. Keep this decision shared so command, telemetry,
 * and billing layouts all adapt at the same point.
 */
internal fun shouldUseSingleColumnLayout(
    availableWidthDp: Float,
    fontScale: Float,
): Boolean = availableWidthDp < 288f || fontScale >= 1.3f
