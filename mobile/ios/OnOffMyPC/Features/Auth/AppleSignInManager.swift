import AuthenticationServices
import Foundation
import UIKit

/// Sign in with Apple via AuthenticationServices. Returns the identity token
/// (JWT) to POST to /auth/apple.
///
/// Set `audienceClientID` to the App bundle ID (`com.onoffmypc.app`) or a
/// Services ID once Sign in with Apple is enabled for the App ID and listed in
/// API `APPLE_CLIENT_IDS`. Empty → hide the Continue with Apple button.
enum AppleSignInManager {

    /// Must match an audience in API APPLE_CLIENT_IDS. Empty hides the button.
    static let audienceClientID = ""

    static var isConfigured: Bool { !audienceClientID.isEmpty }

    private static var activeDelegate: AppleSignInDelegate?

    /// Presents the system Apple sign-in sheet and returns the identity token.
    @MainActor
    static func signIn() async throws -> String {
        guard isConfigured else { throw APIError.message("Apple Sign-In is not configured.") }
        return try await withCheckedThrowingContinuation { continuation in
            let delegate = AppleSignInDelegate(continuation: continuation) {
                AppleSignInManager.activeDelegate = nil
            }
            activeDelegate = delegate
            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = delegate
            controller.presentationContextProvider = delegate
            delegate.controller = controller
            controller.performRequests()
        }
    }
}

private final class AppleSignInDelegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private let continuation: CheckedContinuation<String, Error>
    private let onFinish: () -> Void
    var controller: ASAuthorizationController?

    init(continuation: CheckedContinuation<String, Error>, onFinish: @escaping () -> Void) {
        self.continuation = continuation
        self.onFinish = onFinish
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes
            .first { $0.activationState == .foregroundActive } as? UIWindowScene
        return scene?.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { onFinish() }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8),
              !idToken.isEmpty
        else {
            continuation.resume(throwing: APIError.message("Apple did not return an ID token."))
            return
        }
        continuation.resume(returning: idToken)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { onFinish() }
        if let err = error as? ASAuthorizationError, err.code == .canceled {
            continuation.resume(throwing: APIError.message("Sign-in cancelled."))
            return
        }
        continuation.resume(throwing: APIError.message(error.localizedDescription))
    }
}
