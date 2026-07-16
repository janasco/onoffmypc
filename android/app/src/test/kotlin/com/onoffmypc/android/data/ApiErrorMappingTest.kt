package com.onoffmypc.android.data

import com.onoffmypc.shared.model.ApiError
import com.onoffmypc.shared.model.ApiException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ApiErrorMappingTest {

    @Test
    fun mapHttpFailure_usesServerMessage() {
        val ex = mapHttpFailure(402, ApiError(error = "Device locked", code = "device_locked"))
        assertEquals(402, ex.httpCode)
        assertEquals("device_locked", ex.serverCode)
        assertEquals("Device locked", ex.message)
    }

    @Test
    fun mapHttpFailure_fallbackMessage() {
        val ex = mapHttpFailure(500, null)
        assertEquals(500, ex.httpCode)
        assertEquals("Request failed (500)", ex.message)
    }

    @Test
    fun isTrialLockError_detectsCodes() {
        assertTrue(isTrialLockError(ApiException(402, "device_locked", "locked")))
        assertTrue(isTrialLockError(ApiException(403, "trial_expired", "expired")))
        assertTrue(isTrialLockError(ApiException(402, null, "pay")))
        assertFalse(isTrialLockError(ApiException(401, "unauthorized", "nope")))
        assertFalse(isTrialLockError(Exception("Network error")))
    }
}
