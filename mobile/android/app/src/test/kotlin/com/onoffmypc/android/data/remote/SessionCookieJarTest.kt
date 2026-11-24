package com.onoffmypc.android.data.remote

import com.onoffmypc.android.data.ApiSession
import com.onoffmypc.android.data.SessionTokenStore
import okhttp3.Cookie
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionCookieJarTest {
    private val api = "https://api.onoffmypc.com/".toHttpUrl()

    private class FakeStore(override var storedSession: ApiSession? = null) :
        SessionTokenStore {
        override fun clear() {
            storedSession = null
        }
    }

    private fun origin(url: HttpUrl) = "${url.scheme}://${url.host}:${url.port}"

    private fun stored(value: String, url: HttpUrl = api) =
        ApiSession(value, origin(url))

    private fun cookie(
        value: String,
        host: String = "api.onoffmypc.com",
        expiresAt: Long = System.currentTimeMillis() + 60_000,
    ) = Cookie.Builder()
        .name("session")
        .value(value)
        .domain(host)
        .path("/")
        .expiresAt(expiresAt)
        .build()

    @Test
    fun `sends a host-only secure cookie to the API origin`() {
        val store = FakeStore(stored("secret"))
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
        val jar = SessionCookieJar(FakeStore(stored("secret")), api)
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
        assertNull(store.storedSession)

        jar.saveFromResponse(api, listOf(cookie("valid")))
        assertEquals("valid", store.storedSession?.value)
        assertEquals(origin(api), store.storedSession?.origin)
    }

    @Test
    fun `staging session is not replayed against production and vice versa`() {
        val staging = "https://onoffmypc-api-staging.onoffmypc.workers.dev/".toHttpUrl()
        val store = FakeStore()
        val stagingJar = SessionCookieJar(store, staging)
        val productionJar = SessionCookieJar(store, api)

        stagingJar.saveFromResponse(
            staging,
            listOf(cookie("staging-secret", host = staging.host)),
        )
        assertEquals("staging-secret", stagingJar.loadForRequest(staging).single().value)

        assertTrue(productionJar.loadForRequest(api).isEmpty())
        assertNull(store.storedSession)

        productionJar.saveFromResponse(api, listOf(cookie("production-secret")))
        assertEquals("production-secret", productionJar.loadForRequest(api).single().value)

        assertTrue(stagingJar.loadForRequest(staging).isEmpty())
        assertNull(store.storedSession)
    }

    @Test
    fun `clears a stored session issued by the same host on another port`() {
        val alternatePort = "https://api.onoffmypc.com:8443/".toHttpUrl()
        val store = FakeStore(stored("secret", alternatePort))

        assertTrue(SessionCookieJar(store, api).loadForRequest(api).isEmpty())
        assertNull(store.storedSession)
    }

    @Test
    fun `rejects an insecure cookie response and clears an expired session`() {
        val store = FakeStore()
        val jar = SessionCookieJar(store, api)

        jar.saveFromResponse("http://api.onoffmypc.com/".toHttpUrl(), listOf(cookie("downgraded")))
        assertNull(store.storedSession)

        jar.saveFromResponse(
            api,
            listOf(cookie("expired", expiresAt = System.currentTimeMillis() - 1_000)),
        )
        assertNull(store.storedSession)
    }

    @Test
    fun `does not expose a session when the store is empty`() {
        assertTrue(SessionCookieJar(FakeStore(), api).loadForRequest(api).isEmpty())
    }
}
