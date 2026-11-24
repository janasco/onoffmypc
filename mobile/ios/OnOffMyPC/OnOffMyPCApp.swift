import SwiftUI
import GoogleSignIn

@main
struct OnOffMyPCApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .tint(AppColors.action)
                .onOpenURL { url in _ = GoogleSignInManager.handle(url) }
                .onReceive(NotificationCenter.default.publisher(for: .sessionExpired)) { _ in
                    appState.sessionExpired()
                }
        }
    }
}

/// App-wide auth state. Backed by the Keychain session (see Session.swift).
@MainActor
final class AppState: ObservableObject {
    /// A persisted session counts only when it was issued by this build's
    /// configured API origin. An invalid/missing `API_BASE_URL` starts logged out.
    @Published var loggedIn: Bool = {
        guard let origin = APIClient.shared.configuredOrigin else { return false }
        return Session.isLoggedIn(for: origin)
    }()

    func didSignIn() { loggedIn = true }

    func signOut() {
        Task { await APIClient.shared.logout() }
        loggedIn = false
    }

    /// Called when a request returns 401.
    func sessionExpired() {
        Session.clear()
        loggedIn = false
    }
}

struct RootView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            AppColors.canvas.ignoresSafeArea()
            if appState.loggedIn {
                DevicesView()
            } else {
                LoginView()
            }
        }
    }
}
