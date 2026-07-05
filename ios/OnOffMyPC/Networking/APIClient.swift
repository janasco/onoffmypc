import Foundation

enum APIError: Error, LocalizedError {
    case message(String)
    case network
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .message(let m): return m
        case .network: return "Network error. Check your connection."
        case .unauthorized: return "Session expired. Please sign in again."
        }
    }
}

/// Type-erases an Encodable so `request(body:)` can accept any model.
private struct AnyEncodable: Encodable {
    let wrapped: any Encodable
    func encode(to encoder: Encoder) throws { try wrapped.encode(to: encoder) }
}

/// Minimal API client. Cookie-based auth: we capture the `session` cookie from
/// login's Set-Cookie and send it back on each request (URLSession's own cookie
/// storage is disabled so we control persistence via the Keychain).
final class APIClient {
    static let shared = APIClient()

    private let base = URL(string: "https://api.onoffmypc.com")!
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        config.timeoutIntervalForRequest = 20
        return URLSession(configuration: config)
    }()

    private func send(_ method: String, _ path: String, body: (any Encodable)? = nil) async throws -> Data {
        var req = URLRequest(url: base.appendingPathComponent(path))
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
            let msg = (try? JSONDecoder().decode(ApiError.self, from: data))?.error
                ?? "Request failed (\(http.statusCode))."
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

    // MARK: - Endpoints

    func login(email: String, password: String) async throws {
        _ = try await send("POST", "auth/login", body: LoginRequest(email: email, password: password))
    }

    func me() async throws -> MeResponse {
        try decode(try await send("GET", "auth/me"))
    }

    func devices() async throws -> [Device] {
        try decode(try await send("GET", "devices"))
    }

    func sendCommand(deviceId: String, type: CommandType) async throws -> CommandResponse {
        try decode(try await send("POST", "commands/\(deviceId)", body: CommandRequest(type: type.rawValue)))
    }

    func logout() async {
        _ = try? await send("POST", "auth/logout")
        Session.cookie = nil
    }
}
