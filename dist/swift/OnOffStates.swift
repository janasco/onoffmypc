// Generated from @onoffmypc/design 0.1.0. Do not edit.
import Foundation

enum OnOffTone: String { case positive = "positive"; case attention = "attention"; case critical = "critical"; case info = "info"; case neutral = "neutral"; case powerOn = "power-on"; case powerOff = "power-off"; case powerReset = "power-reset"; case danger = "danger" }

struct OnOffStatePresentation {
    let label: String
    let tone: OnOffTone
    let icon: String
}

let onOffCommandStates: [String: OnOffStatePresentation] = [
        "pending": OnOffStatePresentation(label: "Queued", tone: .attention, icon: "clock"),
        "sent": OnOffStatePresentation(label: "Awaiting acknowledgement", tone: .info, icon: "send"),
        "delivered": OnOffStatePresentation(label: "Device acknowledged", tone: .info, icon: "device-check"),
        "expired": OnOffStatePresentation(label: "Expired", tone: .critical, icon: "expired"),
        "confirmed": OnOffStatePresentation(label: "PC state confirmed", tone: .positive, icon: "check")
]
