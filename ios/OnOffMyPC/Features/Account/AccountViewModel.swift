import SwiftUI

@MainActor
final class AccountViewModel: ObservableObject {
    @Published var user: MeResponse?
    @Published var loading = true
    @Published var error: String?
    @Published var message: String?
    @Published var busy = false

    func load() async {
        loading = true
        error = nil
        defer { loading = false }
        do { user = try await APIClient.shared.me() }
        catch { self.error = (error as? APIError)?.errorDescription ?? "Failed to load account." }
    }

    private func reload() async { user = try? await APIClient.shared.me() }

    func resendVerify() async {
        busy = true; defer { busy = false }
        do {
            try await APIClient.shared.resendVerify()
            message = "Verification email sent — check your inbox."
        } catch {
            message = (error as? APIError)?.errorDescription ?? "Couldn't resend the email."
        }
    }

    func changeEmail(newEmail: String, password: String) async -> Bool {
        let e = newEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !e.isEmpty, !password.isEmpty else {
            message = "Enter a new email and your current password."
            return false
        }
        busy = true; defer { busy = false }
        do {
            try await APIClient.shared.changeEmail(newEmail: e, password: password)
            message = "Email updated — check your new inbox to verify it."
            await reload()
            return true
        } catch {
            message = (error as? APIError)?.errorDescription ?? "Couldn't change email."
            return false
        }
    }

    func changePassword(current: String, new: String, confirm: String) async -> Bool {
        guard !current.isEmpty, !new.isEmpty else {
            message = "Enter your current and new password."
            return false
        }
        guard new.count >= 8 else {
            message = "New password must be at least 8 characters."
            return false
        }
        guard new == confirm else {
            message = "New passwords do not match."
            return false
        }
        busy = true; defer { busy = false }
        do {
            try await APIClient.shared.changePassword(current: current, new: new)
            message = "Password changed. Other devices have been signed out."
            return true
        } catch {
            message = (error as? APIError)?.errorDescription ?? "Couldn't change password."
            return false
        }
    }

    func scheduleDeletion() async {
        busy = true; defer { busy = false }
        do {
            try await APIClient.shared.deleteAccount()
            message = "Account scheduled for deletion."
            await reload()
        } catch {
            message = (error as? APIError)?.errorDescription ?? "Couldn't schedule deletion."
        }
    }

    func cancelDeletion() async {
        busy = true; defer { busy = false }
        do {
            try await APIClient.shared.cancelDeletion()
            message = "Account deletion cancelled."
            await reload()
        } catch {
            message = (error as? APIError)?.errorDescription ?? "Couldn't cancel deletion."
        }
    }
}
