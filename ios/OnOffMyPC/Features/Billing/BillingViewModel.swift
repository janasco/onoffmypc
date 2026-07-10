import SwiftUI

@MainActor
final class BillingViewModel: ObservableObject {
    @Published var loading = true
    @Published var status: BillingStatus?
    @Published var history: [PaymentRequestItem] = []
    @Published var selectedDeviceId: String?
    @Published var method = ""
    @Published var reference = ""
    @Published var note = ""
    @Published var submitting = false
    @Published var error: String?
    @Published var message: String?

    func load(initialDeviceId: String? = nil) async {
        loading = true
        defer { loading = false }
        status = try? await APIClient.shared.billingStatus()
        history = (try? await APIClient.shared.paymentHistory()) ?? []
        let eligible = status?.devices?.filter { $0.unlocked != true && $0.pending != true } ?? []
        let preferred = initialDeviceId ?? selectedDeviceId
        selectedDeviceId = eligible.first { $0.id == preferred }?.id ?? eligible.first?.id
        if status == nil { error = "Couldn't load billing." }
    }

    var selectedDevice: BillingDevice? {
        status?.devices?.first {
            $0.id == selectedDeviceId && $0.unlocked != true && $0.pending != true
        }
    }

    func selectDevice(_ id: String) {
        selectedDeviceId = id
        error = nil
    }

    func submit() async {
        let m = method.trimmingCharacters(in: .whitespacesAndNewlines)
        let r = reference.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let device = selectedDevice else {
            error = "Choose a device to unlock."
            return
        }
        guard !m.isEmpty, !r.isEmpty else {
            error = "Enter the payment method and reference."
            return
        }
        error = nil
        submitting = true
        defer { submitting = false }
        do {
            try await APIClient.shared.submitPayment(deviceId: device.id, method: m, reference: r,
                                                     note: note.isEmpty ? nil : note)
            method = ""; reference = ""; note = ""
            message = "Payment submitted for \(device.name)."
            await load(initialDeviceId: device.id)
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Submission failed."
        }
    }
}
