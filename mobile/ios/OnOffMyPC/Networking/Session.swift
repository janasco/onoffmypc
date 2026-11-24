import Foundation
import Security

/// Persists the API `session` cookie together with the exact origin that issued
/// it. The API is cookie-based (login sets a `session` cookie; no token is
/// returned in the body).
///
/// Staging and production builds share a bundle identifier and Keychain
/// service, so an origin-less cookie could be replayed across environments. The
/// item is therefore one JSON object:
///
///     {"cookie":"...","origin":"https://host:port"}
///
/// Raw cookie items written by older builds have no origin. They are treated as
/// unusable and deleted instead of being replayed.
enum Session {
    private static let service = "com.onoffmypc.app"
    private static let account = "session-origin"
    private static let legacyAccount = "session-cookie"
    private static let pushTokenKey = "fcm-push-token"

    private struct StoredSession: Codable {
        let cookie: String
        let origin: String
    }

    /// Returns the cookie only when it was issued by `origin`. A mismatch clears
    /// the item so a staging session can never be replayed against production,
    /// or the reverse.
    static func cookie(for origin: String) -> String? {
        guard let requested = canonicalOrigin(origin),
              let stored = readStored() else { return nil }
        guard stored.origin == requested else {
            clear()
            return nil
        }
        return stored.cookie
    }

    /// Stores `cookie` with the origin that issued it. A nil/empty cookie or an
    /// invalid origin fails closed by clearing the item.
    static func setCookie(_ cookie: String?, origin: String) {
        guard let value = cookie?.trimmingCharacters(in: .whitespacesAndNewlines),
              !value.isEmpty,
              let canonical = canonicalOrigin(origin) else {
            clear()
            return
        }
        save(StoredSession(cookie: value, origin: canonical))
    }

    /// True only when the stored session was issued by the configured origin.
    static func isLoggedIn(for origin: String) -> Bool {
        cookie(for: origin) != nil
    }

    /// Removes both the origin-bound item and the legacy raw-cookie item.
    static func clear() {
        delete(account: account)
        delete(account: legacyAccount)
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

    /// Canonical scheme + host + port, always including 443 for HTTPS.
    private static func canonicalOrigin(_ raw: String) -> String? {
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty,
              let components = URLComponents(string: value),
              components.scheme?.lowercased() == "https",
              let host = components.host?.lowercased(),
              !host.isEmpty,
              components.user == nil,
              components.password == nil,
              components.query == nil,
              components.fragment == nil,
              components.path.isEmpty else { return nil }
        return "https://\(host):\(components.port ?? 443)"
    }

    private static func normalizedCookie(_ raw: String) -> String? {
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }

    private static func readStored() -> StoredSession? {
        // The pre-origin item was a raw cookie. It cannot be attributed to an
        // environment, so delete it rather than guessing which origin issued it.
        delete(account: legacyAccount)

        guard let data = read(account: account) else { return nil }
        guard let stored = try? JSONDecoder().decode(StoredSession.self, from: data),
              let origin = canonicalOrigin(stored.origin),
              origin == stored.origin,
              let cookie = normalizedCookie(stored.cookie) else {
            delete(account: account)
            return nil
        }
        return StoredSession(cookie: cookie, origin: origin)
    }

    private static func save(_ stored: StoredSession) {
        guard let data = try? JSONEncoder().encode(stored) else {
            clear()
            return
        }
        delete(account: account)
        delete(account: legacyAccount)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecAttrSynchronizable as String: false,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    private static func read(account: String) -> Data? {
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
        return data
    }

    private static func delete(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
