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
        }
    }
}

/// App-wide auth state. Backed by the Keychain session (see Session.swift).
@MainActor
final class AppState: ObservableObject {
    @Published var loggedIn: Bool = Session.isLoggedIn

    func didSignIn() { loggedIn = true }

    func signOut() {
        Task { await APIClient.shared.logout() }
        loggedIn = false
    }

    /// Called when a request returns 401.
    func sessionExpired() {
        Session.cookie = nil
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
