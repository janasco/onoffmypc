import SwiftUI

@MainActor
final class ForgotPasswordViewModel: ObservableObject {
    @Published var email = ""
    @Published var loading = false
    @Published var sent = false
    @Published var error: String?

    func submit() async {
        error = nil
        let e = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !e.isEmpty else {
            error = "Enter your email."
            return
        }
        loading = true
        defer { loading = false }
        do {
            try await APIClient.shared.forgotPassword(email: e)
            sent = true
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Something went wrong."
        }
    }
}
