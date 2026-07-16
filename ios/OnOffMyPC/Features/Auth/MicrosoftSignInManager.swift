import AuthenticationServices
import Foundation
import UIKit

/// Microsoft / Entra sign-in via ASWebAuthenticationSession (OIDC). Returns
/// the ID token to POST to /auth/microsoft. Leave `clientID` empty to hide the
/// button until Entra credentials are configured.
enum MicrosoftSignInManager {

    /// Entra app (client) ID — public value. Empty → hide Continue with Microsoft.
    static let clientID = ""

    /// Must match a redirect URI registered on the Entra app (public client / SPA).
    static let redirectURI = "msauth.com.onoffmypc.app://auth"

    static var isConfigured: Bool { !clientID.isEmpty }

    @MainActor
    static func signIn() async throws -> String {
        guard isConfigured else { throw APIError.message("Microsoft Sign-In is not configured.") }

        var components = URLComponents(string: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize")!
        let nonce = UUID().uuidString.replacingOccurrences(of: "-", with: "")
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "response_type", value: "id_token"),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_mode", value: "fragment"),
            URLQueryItem(name: "scope", value: "openid profile email"),
            URLQueryItem(name: "nonce", value: nonce),
            URLQueryItem(name: "prompt", value: "select_account"),
        ]
        guard let authURL = components.url else {
            throw APIError.message("Could not start Microsoft sign-in.")
        }

        let callbackScheme = "msauth.com.onoffmypc.app"
        return try await withCheckedThrowingContinuation { continuation in
            let presenter = WebAuthPresenter()
            let session = ASWebAuthenticationSession(url: authURL, callbackURLScheme: callbackScheme) { callbackURL, error in
                activeSession = nil
                activePresenter = nil
                if let error {
                    if let authErr = error as? ASWebAuthenticationSessionError,
                       authErr.code == .canceledLogin {
                        continuation.resume(throwing: APIError.message("Sign-in cancelled."))
                    } else {
                        continuation.resume(throwing: APIError.message(error.localizedDescription))
                    }
                    return
                }
                guard let callbackURL,
                      let idToken = extractIdToken(from: callbackURL)
                else {
                    continuation.resume(throwing: APIError.message("Microsoft did not return an ID token."))
                    return
                }
                continuation.resume(returning: idToken)
            }
            session.prefersEphemeralWebBrowserSession = true
            session.presentationContextProvider = presenter
            activePresenter = presenter
            activeSession = session
            if !session.start() {
                activeSession = nil
                activePresenter = nil
                continuation.resume(throwing: APIError.message("Could not present Microsoft sign-in."))
            }
        }
    }

    private static var activeSession: ASWebAuthenticationSession?
    private static var activePresenter: WebAuthPresenter?

    private static func extractIdToken(from url: URL) -> String? {
        if let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems,
           let token = items.first(where: { $0.name == "id_token" })?.value,
           !token.isEmpty {
            return token
        }
        guard let fragment = url.fragment else { return nil }
        for part in fragment.split(separator: "&") {
            let kv = part.split(separator: "=", maxSplits: 1).map(String.init)
            if kv.count == 2, kv[0] == "id_token", !kv[1].isEmpty {
                return kv[1].removingPercentEncoding ?? kv[1]
            }
        }
        return nil
    }
}

private final class WebAuthPresenter: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes
            .first { $0.activationState == .foregroundActive } as? UIWindowScene
        return scene?.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
