import Foundation

// MARK: - Requests

struct LoginRequest: Encodable { let email: String; let password: String }
struct GoogleAuthRequest: Encodable { let credential: String }
struct RegisterRequest: Encodable { let email: String; let password: String; let invite_code: String }
struct ForgotPasswordRequest: Encodable { let email: String }
struct ChangeEmailRequest: Encodable { let new_email: String; let password: String }
struct ChangePasswordRequest: Encodable { let current_password: String; let new_password: String }
struct CommandRequest: Encodable { let type: String }

// MARK: - Responses

struct OkResponse: Decodable { let ok: Bool? }
struct ApiError: Decodable {
    let error: String?
    var code: String?
}

struct Plan: Decodable, Identifiable {
    let id: String
    let name: String
    var devices: Int?
    var price: Int
    var oneTime: Bool?
    var description: String?
}

struct PaymentRequestItem: Decodable, Identifiable {
    let id: String
    let plan: String
    var device_id: String?
    var device_name: String?
    var amount: String?
    var method: String?
    var reference: String?
    let status: String
    let created_at: String
}

struct BillingDevice: Decodable, Identifiable {
    let id: String
    let name: String
    var unlocked: Bool?
    var pending: Bool?
    var trial_ends_at: String?
    // Optional for compatibility with API versions that predate per-device status.
    var trial_expired: Bool?
}

struct BillingStatus: Decodable {
    let plan: String
    var is_lifetime: Bool?
    var has_access: Bool?
    var trial_ends_at: String?
    var trial_expired: Bool?
    var device_limit: Int?
    var device_count: Int?
    var plans: [Plan]?
    var price: Int?
    var devices: [BillingDevice]?
    var payment_instructions: String?
    var pending_request: PaymentRequestItem?
}

struct SubmitPaymentRequest: Encodable {
    var plan: String = "device"
    let device_id: String
    let method: String
    let reference: String
    var note: String?
}

struct MeResponse: Decodable {
    let id: String
    let email: String
    var email_verified: Bool?
    var created_at: String?
    var deletion_at: String?
    var plan: String?
    var device_limit: Int?
}

struct Device: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    var pc_on: Int?
    var last_seen_at: String?
    var firmware_version: String?

    /// Online if seen within the last 90 seconds (matches the Android app).
    var isOnline: Bool {
        guard let iso = last_seen_at, let date = Date.fromISO(iso) else { return false }
        return Date().timeIntervalSince(date) < 90
    }
}

struct DeviceStatus: Decodable {
    var online: Bool?
    var last_seen_at: String?
}

struct Telemetry: Decodable {
    var recorded_at: String?
    var pc_on: Int?
    var room_temp: Double?
    var room_humidity: Double?
    var rssi: Int?
}

struct HistoryPoint: Decodable {
    var hour: String?
    var temp_avg: Double?
    var temp_min: Double?
    var temp_max: Double?
    var humidity_avg: Double?
    var rssi_avg: Double?
}

struct Command: Decodable {
    var id: String?
    var created_at: String?
    var type: String?
    var status: String?

    /// Stable key for ForEach (the API rows carry an id).
    var rowId: String { id ?? [created_at, type].compactMap { $0 }.joined(separator: "-") }
}

struct DeviceNameRequest: Encodable { let name: String }
struct DeletedResponse: Decodable { let deleted: Bool? }

/// Response of POST /devices and rotate-token — carries the raw token, shown once.
struct NewDevice: Decodable, Identifiable {
    let deviceId: String?
    let name: String?
    let token: String?
    let created_at: String?

    enum CodingKeys: String, CodingKey { case deviceId = "id", name, token, created_at }
    var id: String { deviceId ?? token ?? UUID().uuidString }
}

// MARK: - Command types

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

func commandLabel(_ type: String?) -> String {
    guard let type, let c = CommandType(rawValue: type) else { return type ?? "—" }
    return c.label
}

/// Feedback for request acceptance only; device acknowledgement is reported later.
func commandRequestFeedback(
    _ type: CommandType,
    deviceName: String,
    sentToDevice: Bool,
    reason: String? = nil
) -> String {
    if sentToDevice {
        return "\(type.label) sent to \(deviceName); awaiting device acknowledgement."
    }
    switch reason {
    case "device_offline":
        return "\(type.label) queued for \(deviceName); the device is offline."
    case "relay_error":
        return "\(type.label) queued for \(deviceName); the delivery service is temporarily unavailable."
    default:
        return "\(type.label) queued for \(deviceName); it has not reached the device yet."
    }
}

/// Honest lifecycle labels shared by every command-history presentation.
func commandStatusText(_ status: String?) -> String {
    switch status {
    case "pending": return "Queued"
    case "sent": return "Awaiting device acknowledgement"
    case "delivered": return "Device acknowledged (PC state not confirmed)"
    case "expired": return "Expired — not acknowledged"
    case nil: return "Unknown"
    default: return status?.replacingOccurrences(of: "_", with: " ").capitalized ?? "Unknown"
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

    /// Short relative label like "3m ago".
    static func ago(_ iso: String?) -> String {
        guard let iso, let date = Date.fromISO(iso) else { return "—" }
        let s = Int(Date().timeIntervalSince(date))
        if s < 60 { return "\(s)s ago" }
        if s < 3600 { return "\(s / 60)m ago" }
        if s < 86400 { return "\(s / 3600)h ago" }
        return "\(s / 86400)d ago"
    }
}
