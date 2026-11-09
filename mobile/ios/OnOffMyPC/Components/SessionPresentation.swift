import Foundation

/// Recognisable label for a session's User-Agent.
func describeSessionAgent(_ ua: String?) -> String {
    guard let ua, !ua.isEmpty else { return "Unknown device" }
    let s = ua.lowercased()
    let client: String
    if s.contains("edg/") { client = "Edge" }
    else if s.contains("chrome/") && !s.contains("chromium") { client = "Chrome" }
    else if s.contains("firefox/") { client = "Firefox" }
    else if s.contains("safari/") && !s.contains("chrome") { client = "Safari" }
    else if s.contains("okhttp") { client = "Android app" }
    else if s.contains("cfnetwork") || s.contains("darwin") { client = "iOS app" }
    else { client = "Browser" }

    let os: String
    if s.contains("android") { os = "Android" }
    else if s.contains("iphone") || s.contains("ipad") { os = "iOS" }
    else if s.contains("windows") { os = "Windows" }
    else if s.contains("mac os") || s.contains("macintosh") { os = "macOS" }
    else if s.contains("linux") { os = "Linux" }
    else { os = "" }

    return os.isEmpty ? client : "\(client) on \(os)"
}

/// Relative "last active" text; "unknown" for missing/invalid input.
func relativeSessionTime(_ iso: String?, now: Date = Date()) -> String {
    guard let iso, let date = Date.fromISO(iso) else { return "unknown" }
    let minutes = max(0, Int(now.timeIntervalSince(date) / 60))
    if minutes < 1 { return "just now" }
    if minutes < 60 { return "\(minutes) min ago" }
    if minutes < 1_440 { return "\(minutes / 60) h ago" }
    return "\(minutes / 1_440) d ago"
}
