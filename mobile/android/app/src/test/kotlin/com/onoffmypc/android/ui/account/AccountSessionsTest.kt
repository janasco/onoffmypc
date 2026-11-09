package com.onoffmypc.android.ui.account

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant

class AccountSessionsTest {
    @Test
    fun describeSessionAgent_recognisesClients() {
        assertEquals(
            "Chrome on Windows",
            describeSessionAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            ),
        )
        assertEquals("Safari on macOS", describeSessionAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
        ))
        assertEquals("Firefox on Linux", describeSessionAgent("Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0"))
        assertEquals("Android app", describeSessionAgent("okhttp/4.12.0"))
        assertEquals("iOS app", describeSessionAgent("OnOffMyPC/0.4.4 CFNetwork/1490 Darwin/23.0.0"))
    }

    @Test
    fun describeSessionAgent_handlesUnknown() {
        assertEquals("Unknown device", describeSessionAgent(null))
        assertEquals("Unknown device", describeSessionAgent(""))
        assertEquals("Browser", describeSessionAgent("curl/8.14.1"))
    }

    @Test
    fun relativeTime_rendersUsefulBuckets() {
        val now = Instant.parse("2026-03-01T12:00:00Z")
        fun ago(seconds: Long) = now.minusSeconds(seconds).toString()
        assertEquals("just now", relativeTime(ago(5), now))
        assertEquals("5 min ago", relativeTime(ago(5 * 60), now))
        assertEquals("3 h ago", relativeTime(ago(3 * 3600), now))
        assertEquals("2 d ago", relativeTime(ago(2 * 86400), now))
    }

    @Test
    fun relativeTime_toleratesMissingAndInvalid() {
        assertEquals("unknown", relativeTime(null))
        assertEquals("unknown", relativeTime("not-a-date"))
    }
}
