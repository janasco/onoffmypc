import SwiftUI

@MainActor
final class BillingViewModel: ObservableObject {
    @Published var loading = true
    @Published var status: BillingStatus?
    @Published var history: [PaymentRequestItem] = []
    @Published var method = ""
    @Published var reference = ""
    @Published var note = ""
    @Published var submitting = false
    @Published var error: String?
    @Published var message: String?

    func load() async {
        loading = true
        defer { loading = false }
        status = try? await APIClient.shared.billingStatus()
        history = (try? await APIClient.shared.paymentHistory()) ?? []
        if status == nil { error = "Couldn't load billing." }
    }

    func submit() async {
        let m = method.trimmingCharacters(in: .whitespacesAndNewlines)
        let r = reference.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !m.isEmpty, !r.isEmpty else {
            error = "Enter the payment method and reference."
            return
        }
        error = nil
        submitting = true
        defer { submitting = false }
        do {
            try await APIClient.shared.submitPayment(method: m, reference: r,
                                                     note: note.isEmpty ? nil : note)
            method = ""; reference = ""; note = ""
            message = "Payment submitted for review."
            await load()
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Submission failed."
        }
    }
}
