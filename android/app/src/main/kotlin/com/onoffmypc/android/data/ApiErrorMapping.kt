package com.onoffmypc.android.data

import com.onoffmypc.shared.model.ApiError
import com.onoffmypc.shared.model.ApiException

/** Maps a non-2xx HTTP response into [ApiException] (pure; unit-tested). */
fun mapHttpFailure(httpCode: Int, apiError: ApiError?): ApiException =
    ApiException(
        httpCode = httpCode,
        serverCode = apiError?.code,
        message = apiError?.error ?: "Request failed ($httpCode)",
    )

/** True when the API signals a device trial/lock that should open unlock UI. */
fun isTrialLockError(error: Throwable): Boolean =
    error is ApiException && (
        error.httpCode == 402 ||
            error.serverCode == "trial_expired" ||
            error.serverCode == "device_locked"
        )
