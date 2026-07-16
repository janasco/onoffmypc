import Foundation
import Security

/// Persists the API `session` cookie value in the Keychain, mirroring the
/// Android app's encrypted SessionStore. The API is cookie-based (login sets a
/// `session` cookie; no token is returned in the body).
enum Session {
    private static let service = "com.onoffmypc.app"
    private static let account = "session-cookie"
    private static let pushTokenKey = "fcm-push-token"

    static var isLoggedIn: Bool { cookie != nil }

    static var cookie: String? {
        get { read() }
        set {
            if let value = newValue { save(value) } else { delete() }
        }
    }

    /// FCM registration token for this install (set when push is wired). Cleared on logout.
    static var pushToken: String? {
        get { UserDefaults.standard.string(forKey: pushTokenKey) }
        set {
            if let value = newValue, !value.isEmpty {
                UserDefaults.standard.set(value, forKey: pushTokenKey)
            } else {
                UserDefaults.standard.removeObject(forKey: pushTokenKey)
            }
        }
    }

    private static func save(_ value: String) {
        delete()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: Data(value.utf8),
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    private static func read() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var out: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func delete() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
