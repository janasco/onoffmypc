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
import kotlinx.coroutines.launch

data class BillingUiState(
    val loading: Boolean = true,
    val status: BillingStatus? = null,
    val history: List<PaymentRequestItem> = emptyList(),
    val method: String = "",
    val reference: String = "",
    val note: String = "",
    val submitting: Boolean = false,
    val error: String? = null,
    val message: String? = null,
)

class BillingViewModel : ViewModel() {
    private val repo = Graph.repository

    private val _state = MutableStateFlow(BillingUiState())
    val state: StateFlow<BillingUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            val status = repo.billingStatus().getOrNull()
            val history = repo.paymentHistory().getOrNull() ?: emptyList()
            _state.update {
                it.copy(
                    loading = false,
                    status = status,
                    history = history,
                    error = if (status == null) "Couldn't load billing." else null,
                )
            }
        }
    }

    fun onMethod(v: String) = _state.update { it.copy(method = v, error = null) }
    fun onReference(v: String) = _state.update { it.copy(reference = v, error = null) }
    fun onNote(v: String) = _state.update { it.copy(note = v) }

    fun submit() {
        val s = _state.value
        if (s.method.isBlank() || s.reference.isBlank()) {
            _state.update { it.copy(error = "Enter the payment method and reference.") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null) }
            repo.submitPayment(s.method, s.reference, s.note.ifBlank { null }).fold(
                onSuccess = {
                    _state.update { it.copy(submitting = false, method = "", reference = "", note = "", message = "Payment submitted for review.") }
                    load()
                },
                onFailure = { e -> _state.update { it.copy(submitting = false, error = e.message ?: "Submission failed.") } },
            )
        }
    }

    fun consumeMessage() = _state.update { it.copy(message = null) }
}
