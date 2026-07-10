import SwiftUI

/// Power controls shared by the dashboard and device details. Power On is
/// direct; disruptive commands name the target and explain their consequence.
struct PowerCommandControls: View {
    let deviceName: String
    let commandInFlight: Bool
    var includeForceOff = true
    let onCommand: (CommandType) -> Void

    @State private var confirmation: CommandType?

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                commandButton(.powerOn, tint: .green)
                commandButton(.powerOff, tint: .red)
            }
            HStack(spacing: 8) {
                if includeForceOff { commandButton(.powerOffForce, tint: .red) }
                commandButton(.reset, tint: .orange)
            }
            if commandInFlight {
                HStack(spacing: 8) {
                    ProgressView().controlSize(.small)
                    Text("Submitting command request…")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .alert(item: $confirmation) { type in
            Alert(
                title: Text("\(type.label) “\(deviceName)”?"),
                message: Text(consequence(of: type)),
                primaryButton: .destructive(Text(type.label)) { onCommand(type) },
                secondaryButton: .cancel()
            )
        }
    }

    private func commandButton(_ type: CommandType, tint: Color) -> some View {
        Button(type.label) {
            if type == .powerOn {
                onCommand(type)
            } else {
                confirmation = type
            }
        }
        .buttonStyle(.bordered)
        .tint(tint)
        .controlSize(.small)
        .frame(maxWidth: .infinity)
        .disabled(commandInFlight)
    }

    private func consequence(of type: CommandType) -> String {
        switch type {
        case .powerOff:
            return "This asks “\(deviceName)” to press the PC power button. The computer may begin shutting down, and unsaved work could be lost."
        case .reset:
            return "This asks “\(deviceName)” to press the PC reset switch. The computer will restart immediately and unsaved work could be lost."
        case .powerOffForce:
            return "This asks “\(deviceName)” to hold the PC power button for 6 seconds. Power may be cut immediately and unsaved work could be lost. Use only when normal Power Off does not work."
        case .powerOn:
            return "This asks “\(deviceName)” to turn the PC on."
        }
    }
}

func commandStatusColor(_ status: String?) -> Color {
    switch status {
    case "delivered": return .accentColor
    case "expired": return .red
    case "pending", "sent": return .orange
    default: return .secondary
    }
}
