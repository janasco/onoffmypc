import Foundation
import UIKit
import GoogleSignIn

/// Wraps the Google Sign-In SDK. Returns the Google ID token, which we POST to
/// /auth/google. Configure `clientID` with the iOS OAuth client ID from Google
/// Cloud Console (public value). While empty, the app hides the Google button.
enum GoogleSignInManager {

    /// iOS OAuth 2.0 client ID, e.g. "1234-abc.apps.googleusercontent.com".
    static let clientID = ""

    static var isConfigured: Bool { !clientID.isEmpty }

    /// Presents the Google sign-in sheet and returns the ID token.
    @MainActor
    static func signIn() async throws -> String {
        guard isConfigured else { throw APIError.message("Google Sign-In is not configured.") }
        guard let root = topViewController() else {
            throw APIError.message("Unable to present Google Sign-In.")
        }

        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: root)
        guard let idToken = result.user.idToken?.tokenString else {
            throw APIError.message("Google did not return an ID token.")
        }
        return idToken
    }

    /// Forwards the OAuth callback URL to the SDK (called from the app's onOpenURL).
    static func handle(_ url: URL) -> Bool {
        GIDSignIn.sharedInstance.handle(url)
    }

    @MainActor
    private static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .first { $0.activationState == .foregroundActive } as? UIWindowScene
        var top = scene?.windows.first { $0.isKeyWindow }?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}
