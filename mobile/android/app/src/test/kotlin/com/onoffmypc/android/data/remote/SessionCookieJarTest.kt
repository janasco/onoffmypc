package com.onoffmypc.android.data.remote

import com.onoffmypc.android.data.SessionTokenStore
import okhttp3.Cookie
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionCookieJarTest {
    private val api = "https://api.onoffmypc.com/".toHttpUrl()

    private class FakeStore(override var session: String? = null) : SessionTokenStore {
        override fun clear() {
            session = null
        }
    }

    private fun cookie(value: String, expiresAt: Long = System.currentTimeMillis() + 60_000) =
        Cookie.Builder()
            .name("session")
            .value(value)
            .domain("api.onoffmypc.com")
            .path("/")
            .expiresAt(expiresAt)
            .build()

    @Test
    fun `sends a host-only secure cookie to the API origin`() {
        val store = FakeStore("secret")
        val cookies = SessionCookieJar(store, api).loadForRequest(api)

        assertEquals(1, cookies.size)
        with(cookies.single()) {
            assertEquals("secret", value)
            assertEquals("api.onoffmypc.com", domain)
            assertTrue(hostOnly)
            assertTrue(secure)
            assertTrue(httpOnly)
            assertEquals("/", path)
        }
    }

    @Test
    fun `never sends the session to another host, scheme, or port`() {
        val jar = SessionCookieJar(FakeStore("secret"), api)
        assertTrue(jar.loadForRequest("https://attacker.example/".toHttpUrl()).isEmpty())
        assertTrue(jar.loadForRequest("https://api.onoffmypc.com.evil/".toHttpUrl()).isEmpty())
        assertTrue(jar.loadForRequest("http://api.onoffmypc.com/".toHttpUrl()).isEmpty())
        assertTrue(jar.loadForRequest("https://api.onoffmypc.com:8443/".toHttpUrl()).isEmpty())
    }

    @Test
    fun `accepts a session only from the API origin`() {
        val store = FakeStore()
        val jar = SessionCookieJar(store, api)

        jar.saveFromResponse("https://attacker.example/".toHttpUrl(), listOf(cookie("stolen")))
        assertNull(store.session)

        jar.saveFromResponse(api, listOf(cookie("valid")))
        assertEquals("valid", store.session)
    }

    @Test
    fun `rejects an insecure cookie response and clears an expired session`() {
        val store = FakeStore()
        val jar = SessionCookieJar(store, api)

        jar.saveFromResponse("http://api.onoffmypc.com/".toHttpUrl(), listOf(cookie("downgraded")))
        assertNull(store.session)

        jar.saveFromResponse(api, listOf(cookie("expired", System.currentTimeMillis() - 1_000)))
        assertNull(store.session)
    }

    @Test
    fun `does not expose a session when the store is empty`() {
        assertTrue(SessionCookieJar(FakeStore(), api).loadForRequest(api).isEmpty())
    }
}
