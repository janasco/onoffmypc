import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var loading = false
    @Published var error: String?

    var googleEnabled: Bool { GoogleSignInManager.isConfigured }
    var appleEnabled: Bool { AppleSignInManager.isConfigured }
    var microsoftEnabled: Bool { MicrosoftSignInManager.isConfigured }

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

    func googleSignIn(_ appState: AppState) async {
        await socialSignIn(appState, label: "Google") {
            let idToken = try await GoogleSignInManager.signIn()
            try await APIClient.shared.googleAuth(idToken: idToken)
        }
    }

    func appleSignIn(_ appState: AppState) async {
        await socialSignIn(appState, label: "Apple") {
            let idToken = try await AppleSignInManager.signIn()
            try await APIClient.shared.appleAuth(idToken: idToken)
        }
    }

    func microsoftSignIn(_ appState: AppState) async {
        await socialSignIn(appState, label: "Microsoft") {
            let idToken = try await MicrosoftSignInManager.signIn()
            try await APIClient.shared.microsoftAuth(idToken: idToken)
        }
    }

    private func socialSignIn(_ appState: AppState, label: String, _ work: () async throws -> Void) async {
        error = nil
        loading = true
        defer { loading = false }
        do {
            try await work()
            appState.didSignIn()
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "\(label) sign-in failed."
        }
    }
}
