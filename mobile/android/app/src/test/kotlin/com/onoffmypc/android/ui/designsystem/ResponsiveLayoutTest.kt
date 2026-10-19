package com.onoffmypc.android.ui.designsystem

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ResponsiveLayoutTest {
    @Test
    fun `compact width uses one column`() {
        assertTrue(shouldUseSingleColumnLayout(256f, 1f))
    }

    @Test
    fun `large text uses one column even when wide`() {
        assertTrue(shouldUseSingleColumnLayout(420f, 1.3f))
    }

    @Test
    fun `standard text and sufficient width retain two columns`() {
        assertFalse(shouldUseSingleColumnLayout(320f, 1f))
    }
}
