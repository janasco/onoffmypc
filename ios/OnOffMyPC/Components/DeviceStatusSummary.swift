import SwiftUI

enum DeviceConnectionState: Equatable {
    case online
    case offline
    case unknown
}

struct DeviceStatusPresentation {
    let connection: DeviceConnectionState
    let connectionLabel: String
    let connectionColor: Color
    let pcStateLabel: String
    let lastContactLabel: String

    var accessibilityLabel: String {
        "\(connectionLabel). \(pcStateLabel). \(lastContactLabel)."
    }
}

func deviceStatusFromLastContact(lastSeenAt: String?, pcOn: Int?) -> DeviceStatusPresentation {
    makeDeviceStatus(
        connection: connectionFromLastContact(lastSeenAt),
        lastSeenAt: lastSeenAt,
        pcOn: pcOn,
        onlineLabel: "Recently online"
    )
}

func deviceStatusFromEndpoint(
    online: Bool?,
    lastSeenAt: String?,
    pcOn: Int?
) -> DeviceStatusPresentation {
    let connection: DeviceConnectionState
    if online == true {
        connection = .online
    } else if online == false, connectionFromLastContact(lastSeenAt) != .unknown {
        connection = .offline
    } else {
        connection = .unknown
    }
    return makeDeviceStatus(
        connection: connection,
        lastSeenAt: lastSeenAt,
        pcOn: pcOn,
        onlineLabel: "Online"
    )
}

struct DeviceStatusSummary: View {
    let presentation: DeviceStatusPresentation

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Label(presentation.connectionLabel, systemImage: "circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(presentation.connectionColor)
                Spacer()
                Text(presentation.lastContactLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text(presentation.pcStateLabel)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(presentation.accessibilityLabel)
    }
}

private func makeDeviceStatus(
    connection: DeviceConnectionState,
    lastSeenAt: String?,
    pcOn: Int?,
    onlineLabel: String
) -> DeviceStatusPresentation {
    let connectionLabel: String
    let connectionColor: Color
    switch connection {
    case .online:
        connectionLabel = onlineLabel
        connectionColor = .green
    case .offline:
        connectionLabel = "Offline"
        connectionColor = .red
    case .unknown:
        connectionLabel = "Status unknown"
        connectionColor = .secondary
    }

    let pcStateLabel: String
    switch pcOn {
    case 1:
        pcStateLabel = "Last reported PC state: on"
    case 0:
        pcStateLabel = "Last reported PC state: off"
    default:
        pcStateLabel = "PC state not reported"
    }

    return DeviceStatusPresentation(
        connection: connection,
        connectionLabel: connectionLabel,
        connectionColor: connectionColor,
        pcStateLabel: pcStateLabel,
        lastContactLabel: lastContactText(lastSeenAt)
    )
}

private func connectionFromLastContact(_ value: String?) -> DeviceConnectionState {
    guard let value, let date = Date.fromISO(value) else { return .unknown }
    return max(0, Date().timeIntervalSince(date)) < 90 ? .online : .offline
}

private func lastContactText(_ value: String?) -> String {
    guard let value else { return "No device contact yet" }
    guard let date = Date.fromISO(value) else { return "Last contact unavailable" }
    let seconds = Int(max(0, Date().timeIntervalSince(date)))
    switch seconds {
    case 0..<15: return "Last contact just now"
    case 15..<60: return "Last contact \(seconds)s ago"
    case 60..<3_600: return "Last contact \(seconds / 60)m ago"
    case 3_600..<86_400: return "Last contact \(seconds / 3_600)h ago"
    default: return "Last contact \(seconds / 86_400)d ago"
    }
}
