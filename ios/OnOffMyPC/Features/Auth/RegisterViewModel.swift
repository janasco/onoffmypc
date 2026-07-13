import SwiftUI

@MainActor
final class RegisterViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var confirm = ""
    @Published var loading = false
    @Published var error: String?

    var googleEnabled: Bool { GoogleSignInManager.isConfigured }

    func register(_ appState: AppState) async {
        error = nil
        let e = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !e.isEmpty, !password.isEmpty else {
            error = "Fill in all fields."
            return
        }
        guard password.count >= 8 else {
            error = "Password must be at least 8 characters."
            return
        }
        guard password == confirm else {
            error = "Passwords do not match."
            return
        }
        loading = true
        defer { loading = false }
        do {
            try await APIClient.shared.register(email: e, password: password)
            appState.didSignIn()
        } catch {
            self.error = friendly(error)
        }
    }

    func googleSignIn(_ appState: AppState) async {
        error = nil
        loading = true
        defer { loading = false }
        do {
            let idToken = try await GoogleSignInManager.signIn()
            try await APIClient.shared.googleAuth(idToken: idToken)
            appState.didSignIn()
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Google sign-in failed."
        }
    }

    private func friendly(_ error: Error) -> String {
        let msg = (error as? APIError)?.errorDescription ?? "Something went wrong."
        let lower = msg.lowercased()
        if lower.contains("already") { return "That email is already registered." }
        return msg
    }
}
