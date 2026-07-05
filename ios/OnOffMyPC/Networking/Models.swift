import Foundation

// Request/response shapes mirror the API (see the Android app's Models.kt).

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct CommandRequest: Encodable {
    let type: String
}

struct OkResponse: Decodable {
    let ok: Bool?
}

struct ApiError: Decodable {
    let error: String?
}

struct MeResponse: Decodable, Identifiable {
    let id: String
    let email: String
    var email_verified: Bool?
    var created_at: String?
    var deletion_at: String?
    var plan: String?
    var device_limit: Int?
}

struct Device: Decodable, Identifiable {
    let id: String
    let name: String
    var pc_on: Int?
    var last_seen_at: String?
    var firmware_version: String?

    /// Considered online if seen within the last 90 seconds (matches the Android app).
    var isOnline: Bool {
        guard let iso = last_seen_at, let date = Date.fromISO(iso) else { return false }
        return Date().timeIntervalSince(date) < 90
    }
}

struct CommandResponse: Decodable {
    var id: String?
    var delivered: Bool?
    var reason: String?
}

enum CommandType: String, CaseIterable, Identifiable {
    case powerOn = "power_on"
    case powerOff = "power_off"
    case powerOffForce = "power_off_force"
    case reset = "reset"

    var id: String { rawValue }
    var label: String {
        switch self {
        case .powerOn: return "Power On"
        case .powerOff: return "Power Off"
        case .powerOffForce: return "Force Off"
        case .reset: return "Reset"
        }
    }
}

extension Date {
    /// Parses ISO-8601 with or without fractional seconds.
    static func fromISO(_ s: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: s) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: s)
    }
}
