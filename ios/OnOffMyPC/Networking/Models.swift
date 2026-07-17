import Foundation

// MARK: - Requests

struct LoginRequest: Encodable { let email: String; let password: String }
struct GoogleAuthRequest: Encodable { let credential: String }
struct SocialAuthRequest: Encodable { let credential: String }
struct RegisterRequest: Encodable { let email: String; let password: String }
struct ForgotPasswordRequest: Encodable { let email: String }
struct PushRegisterRequest: Encodable {
    let token: String
    let platform: String = "ios"
}
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
    var currency: String?
    var method: String?
    var reference: String?
    var provider: String?
    let status: String
    let created_at: String
}

struct BillingDevice: Decodable, Identifiable {
    let id: String
    let name: String
    var unlocked: Bool?
    var pending: Bool?
    var pending_provider: String?
    var trial_ends_at: String?
    // Optional for compatibility with API versions that predate per-device status.
    var trial_expired: Bool?

    var polarCheckoutPending: Bool {
        pending == true && pending_provider?.lowercased() == "polar"
    }

    var legacyPaymentPending: Bool {
        pending == true && !polarCheckoutPending
    }

    var checkoutEligible: Bool {
        unlocked != true && (pending != true || polarCheckoutPending)
    }
}

struct BillingStatus: Decodable {
    let plan: String
    var is_lifetime: Bool?
    var billing_enabled: Bool?
    var has_access: Bool?
    var trial_ends_at: String?
    var trial_expired: Bool?
    var device_limit: Int?
    var device_count: Int?
    var plans: [Plan]?
    var price: Int?
    var devices: [BillingDevice]?
    var billing_provider: String?
    var portal_available: Bool?
    var payment_instructions: String?
    var pending_request: PaymentRequestItem?

    var billingEnabled: Bool { billing_enabled ?? true }
}

struct CheckoutRequest: Encodable { let device_id: String }

struct CheckoutResponse: Decodable {
    let checkout_id: String
    let url: String
    var expires_at: String?
    var reused: Bool?
}

struct PortalResponse: Decodable { let url: String }

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
    case sleep = "sleep"

    var id: String { rawValue }
    var label: String {
        switch self {
        case .powerOn: return "Power On"
        case .powerOff: return "Power Off"
        case .powerOffForce: return "Force Off"
        case .reset: return "Reset"
        case .sleep: return "Sleep"
        }
    }
}

func commandLabel(_ type: String?) -> String {
    guard let type, let c = CommandType(rawValue: type) else { return type ?? "Unknown command" }
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
    guard let status else { return "Unknown" }
    guard let generated = onOffCommandStates[status] else {
        return status.replacingOccurrences(of: "_", with: " ").capitalized
    }
    switch status {
    case "delivered": return "\(generated.label) (PC state not confirmed)"
    case "expired": return "\(generated.label) — not acknowledged"
    default: return generated.label
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
