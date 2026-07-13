import Foundation

enum APIError: Error, LocalizedError {
    case message(String)
    case network
    case unauthorized
    case trialExpired(String)

    var errorDescription: String? {
        switch self {
        case .message(let m): return m
        case .network: return "Network error. Check your connection."
        case .unauthorized: return "Session expired. Please sign in again."
        case .trialExpired(let m): return m
        }
    }
}

/// Type-erases an Encodable so `send(body:)` can accept any model.
private struct AnyEncodable: Encodable {
    let wrapped: any Encodable
    func encode(to encoder: Encoder) throws { try wrapped.encode(to: encoder) }
}

/// Minimal API client. Cookie-based auth: the `session` cookie from login is
/// captured and sent back on each request (URLSession cookie storage is disabled
/// so persistence is via the Keychain — see Session.swift).
final class APIClient {
    static let shared = APIClient()

    private let base = "https://api.onoffmypc.com"
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        config.timeoutIntervalForRequest = 20
        return URLSession(configuration: config)
    }()

    private func send(_ method: String, _ path: String, body: (any Encodable)? = nil) async throws -> Data {
        guard let url = URL(string: base + "/" + path) else { throw APIError.network }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let cookie = Session.cookie {
            req.setValue("session=\(cookie)", forHTTPHeaderField: "Cookie")
        }
        if let body { req.httpBody = try JSONEncoder().encode(AnyEncodable(wrapped: body)) }

        let data: Data, response: URLResponse
        do { (data, response) = try await session.data(for: req) }
        catch { throw APIError.network }

        guard let http = response as? HTTPURLResponse else { throw APIError.network }
        captureCookie(from: http)

        if http.statusCode == 401 {
            Session.cookie = nil
            throw APIError.unauthorized
        }
        guard (200..<300).contains(http.statusCode) else {
            let apiError = try? JSONDecoder().decode(ApiError.self, from: data)
            let msg = apiError?.error ?? "Request failed (\(http.statusCode))."
            // A locked device gets a distinct error so the UI can open its unlock flow.
            if http.statusCode == 402 || apiError?.code == "trial_expired" || apiError?.code == "device_locked" {
                throw APIError.trialExpired(msg)
            }
            throw APIError.message(msg)
        }
        return data
    }

    private func captureCookie(from http: HTTPURLResponse) {
        guard let url = http.url,
              let fields = http.allHeaderFields as? [String: String] else { return }
        let cookies = HTTPCookie.cookies(withResponseHeaderFields: fields, for: url)
        if let session = cookies.first(where: { $0.name == "session" }) {
            Session.cookie = session.value
        }
    }

    private func decode<T: Decodable>(_ data: Data) throws -> T {
        do { return try JSONDecoder().decode(T.self, from: data) }
        catch { throw APIError.message("Unexpected response from server.") }
    }

    // MARK: - Auth

    func login(email: String, password: String) async throws {
        _ = try await send("POST", "auth/login", body: LoginRequest(email: email, password: password))
    }

    /// Exchange a Google ID token for a session (the API sets the session cookie).
    func googleAuth(idToken: String) async throws {
        _ = try await send("POST", "auth/google", body: GoogleAuthRequest(credential: idToken))
    }

    /// Register then sign in (registration doesn't set a session cookie; login does).
    func register(email: String, password: String) async throws {
        _ = try await send("POST", "auth/register",
                           body: RegisterRequest(email: email, password: password))
        try await login(email: email, password: password)
    }

    func forgotPassword(email: String) async throws {
        _ = try await send("POST", "auth/forgot-password", body: ForgotPasswordRequest(email: email))
    }

    func me() async throws -> MeResponse { try decode(try await send("GET", "auth/me")) }

    // MARK: - Billing

    func billingStatus() async throws -> BillingStatus { try decode(try await send("GET", "billing/status")) }
    func paymentHistory() async throws -> [PaymentRequestItem] { try decode(try await send("GET", "billing/requests")) }
    func createCheckout(deviceId: String) async throws -> CheckoutResponse {
        try decode(try await send("POST", "billing/checkout", body: CheckoutRequest(device_id: deviceId)))
    }
    func customerPortal() async throws -> PortalResponse {
        try decode(try await send("POST", "billing/portal"))
    }

    func changeEmail(newEmail: String, password: String) async throws {
        _ = try await send("POST", "auth/change-email", body: ChangeEmailRequest(new_email: newEmail, password: password))
    }

    func changePassword(current: String, new: String) async throws {
        _ = try await send("POST", "auth/change-password", body: ChangePasswordRequest(current_password: current, new_password: new))
    }

    func resendVerify() async throws { _ = try await send("POST", "auth/resend-verify") }
    func deleteAccount() async throws { _ = try await send("DELETE", "auth/account") }
    func cancelDeletion() async throws { _ = try await send("POST", "auth/account/cancel-deletion") }

    func logout() async {
        _ = try? await send("POST", "auth/logout")
        Session.cookie = nil
    }

    // MARK: - Devices

    func devices() async throws -> [Device] { try decode(try await send("GET", "devices")) }
    func addDevice(name: String) async throws -> NewDevice {
        try decode(try await send("POST", "devices", body: DeviceNameRequest(name: name)))
    }
    func renameDevice(id: String, name: String) async throws -> Device {
        try decode(try await send("PATCH", "devices/\(id)", body: DeviceNameRequest(name: name)))
    }
    func deleteDevice(id: String) async throws {
        _ = try await send("DELETE", "devices/\(id)")
    }
    func rotateToken(id: String) async throws -> NewDevice {
        try decode(try await send("POST", "devices/\(id)/rotate-token"))
    }
    func device(id: String) async throws -> Device { try decode(try await send("GET", "devices/\(id)")) }
    func deviceStatus(id: String) async throws -> DeviceStatus { try decode(try await send("GET", "devices/\(id)/status")) }
    func telemetry(id: String) async throws -> [Telemetry] { try decode(try await send("GET", "telemetry/\(id)")) }
    func history(id: String, days: Int) async throws -> [HistoryPoint] {
        try decode(try await send("GET", "telemetry/\(id)/history?days=\(days)"))
    }
    func commands(id: String) async throws -> [Command] { try decode(try await send("GET", "commands/\(id)")) }

    func sendCommand(deviceId: String, type: CommandType) async throws -> CommandResponse {
        try decode(try await send("POST", "commands/\(deviceId)", body: CommandRequest(type: type.rawValue)))
    }
}

struct CommandResponse: Decodable {
    var id: String?
    var delivered: Bool?
    var reason: String?
}
