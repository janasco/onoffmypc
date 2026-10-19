package com.onoffmypc.android.ui.billing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.onoffmypc.android.Graph
import com.onoffmypc.android.data.model.BillingStatus
import com.onoffmypc.android.data.model.PaymentRequestItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.net.URI

data class BillingUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val status: BillingStatus? = null,
    val history: List<PaymentRequestItem> = emptyList(),
    val selectedDeviceId: String? = null,
    val startingCheckout: Boolean = false,
    val openingPortal: Boolean = false,
    val externalUrl: String? = null,
    val error: String? = null,
)

class BillingViewModel : ViewModel() {
    private val repo = Graph.repository
    private var checkoutDeviceAwaitingRefresh: String? = null

    private val _state = MutableStateFlow(BillingUiState())
    val state: StateFlow<BillingUiState> = _state.asStateFlow()

    fun load(initialDeviceId: String? = null) {
        viewModelScope.launch {
            refresh(initialDeviceId, showLoading = true, includeHistory = true)
        }
    }

    fun refreshAfterExternalReturn(initialDeviceId: String? = null) {
        val checkoutDeviceId = checkoutDeviceAwaitingRefresh
        checkoutDeviceAwaitingRefresh = null
        if (checkoutDeviceId == null) {
            load(initialDeviceId)
            return
        }

        viewModelScope.launch {
            for (attempt in 0 until CHECKOUT_REFRESH_ATTEMPTS) {
                if (attempt > 0) delay(CHECKOUT_REFRESH_DELAY_MS)
                val status = refresh(
                    initialDeviceId = initialDeviceId ?: checkoutDeviceId,
                    showLoading = attempt == 0,
                    includeHistory = false,
                )
                if (status != null) {
                    val device = status.devices.firstOrNull { it.id == checkoutDeviceId }
                    if (device == null || device.unlocked) break
                }
            }
            refreshHistory()
        }
    }

    fun selectDevice(id: String) = _state.update { it.copy(selectedDeviceId = id, error = null) }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(refreshing = true) }
            refresh(initialDeviceId = _state.value.selectedDeviceId, showLoading = false, includeHistory = true)
            _state.update { it.copy(refreshing = false) }
        }
    }

    fun startCheckout() {
        val s = _state.value
        val device = s.status?.devices?.firstOrNull {
            it.id == s.selectedDeviceId && it.checkoutEligible
        }
        if (device == null) {
            val selected = s.status?.devices?.firstOrNull { it.id == s.selectedDeviceId }
            val message = if (selected?.legacyPaymentPending == true) {
                "This device still has a legacy payment under review. Contact support if it needs attention."
            } else {
                "Choose a device to unlock."
            }
            _state.update { it.copy(error = message) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(startingCheckout = true, error = null) }
            repo.createCheckout(device.id).fold(
                onSuccess = { checkout ->
                    if (isSecureHostedUrl(checkout.url)) {
                        checkoutDeviceAwaitingRefresh = device.id
                        _state.update { it.copy(startingCheckout = false, externalUrl = checkout.url) }
                    } else {
                        _state.update {
                            it.copy(startingCheckout = false, error = "The server returned an invalid checkout link.")
                        }
                    }
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(startingCheckout = false, error = e.message ?: "Couldn't start checkout.")
                    }
                },
            )
        }
    }

    fun openCustomerPortal() {
        viewModelScope.launch {
            _state.update { it.copy(openingPortal = true, error = null) }
            repo.customerPortal().fold(
                onSuccess = { portal ->
                    if (isSecureHostedUrl(portal.url)) {
                        checkoutDeviceAwaitingRefresh = null
                        _state.update { it.copy(openingPortal = false, externalUrl = portal.url) }
                    } else {
                        _state.update {
                            it.copy(openingPortal = false, error = "The server returned an invalid billing link.")
                        }
                    }
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(openingPortal = false, error = e.message ?: "Couldn't open billing.")
                    }
                },
            )
        }
    }

    fun externalUrlOpened() = _state.update { it.copy(externalUrl = null) }

    fun externalUrlFailed() {
        checkoutDeviceAwaitingRefresh = null
        _state.update {
            it.copy(externalUrl = null, error = "No browser is available to open this secure link.")
        }
    }

    private suspend fun refresh(
        initialDeviceId: String?,
        showLoading: Boolean,
        includeHistory: Boolean,
    ): BillingStatus? {
        if (showLoading) _state.update { it.copy(loading = true, error = null) }
        val status = repo.billingStatus().getOrNull()
        val history = if (includeHistory) repo.paymentHistory().getOrNull() ?: emptyList() else null
        _state.update {
            // Pending Polar checkouts are selectable so the server can return
            // its existing hosted checkout (reused=true).
            val currentStatus = status ?: it.status
            val eligible = currentStatus?.devices.orEmpty().filter { device -> device.checkoutEligible }
            val preferred = initialDeviceId ?: it.selectedDeviceId
            val selection = eligible.firstOrNull { device -> device.id == preferred }?.id
                ?: eligible.firstOrNull()?.id
            it.copy(
                loading = false,
                status = currentStatus,
                history = history ?: it.history,
                selectedDeviceId = selection,
                error = if (status == null) "Couldn't load billing." else null,
            )
        }
        return status
    }

    private suspend fun refreshHistory() {
        val history = repo.paymentHistory().getOrNull() ?: return
        _state.update { it.copy(history = history) }
    }

    private fun isSecureHostedUrl(value: String): Boolean = try {
        // Mirrors the backend allowlist: privileged checkout and portal URLs
        // must be HTTPS pages hosted by Polar, never an arbitrary redirect.
        val uri = URI(value)
        val host = uri.host?.lowercase()?.trimEnd('.') ?: ""
        "https".equals(uri.scheme, ignoreCase = true) &&
            (host == "polar.sh" || host.endsWith(".polar.sh")) &&
            uri.userInfo == null
    } catch (_: Exception) {
        false
    }

    private companion object {
        const val CHECKOUT_REFRESH_ATTEMPTS = 5
        const val CHECKOUT_REFRESH_DELAY_MS = 1_500L
    }
}
