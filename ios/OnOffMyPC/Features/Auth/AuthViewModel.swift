import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var loading = false
    @Published var error: String?

    func login(_ appState: AppState) async {
        error = nil
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !password.isEmpty else {
            error = "Enter your email and password."
            return
        }
        loading = true
        defer { loading = false }
        do {
            try await APIClient.shared.login(email: trimmed, password: password)
            appState.didSignIn()
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Sign-in failed."
        }
    }
}
