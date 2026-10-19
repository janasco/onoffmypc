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
        VStack(spacing: AppSpacing.medium) {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 124), spacing: AppSpacing.small)],
                spacing: AppSpacing.small
            ) {
                commandButton(.powerOn, role: .informational)
                commandButton(.sleep, role: .neutral)
                commandButton(.powerOff, role: .danger)
                if includeForceOff { commandButton(.powerOffForce, role: .danger) }
                commandButton(.reset, role: .warning)
            }
            if commandInFlight {
                HStack(spacing: 8) {
                    ProgressView()
                        .controlSize(.small)
                        .tint(AppColors.action)
                    Text("Submitting command request…")
                        .font(.caption)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .padding(AppSpacing.small)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.actionSoft, in: RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous))
                .accessibilityElement(children: .combine)
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

    private func commandButton(_ type: CommandType, role: AppStatusRole) -> some View {
        Button {
            if type == .powerOn || type == .sleep {
                onCommand(type)
            } else {
                confirmation = type
            }
        } label: {
            Label(type.label, systemImage: icon(for: type))
        }
        .buttonStyle(AppCommandButtonStyle(role: role))
        .disabled(commandInFlight)
        .accessibilityLabel("\(type.label) \(deviceName)")
    }

    private func icon(for type: CommandType) -> String {
        switch type {
        case .powerOn: return "power"
        case .powerOff: return "power.circle"
        case .powerOffForce: return "exclamationmark.octagon"
        case .reset: return "arrow.clockwise"
        case .sleep: return "moon.fill"
        case .lock: return "lock.fill"
        case .logout: return "rectangle.portrait.and.arrow.right"
        }
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
        case .sleep:
            return "This asks “\(deviceName)” to sleep. Open apps stay in memory; nothing is closed."
        case .lock:
            return "This will lock the current user session on “\(deviceName)”."
        case .logout:
            return "This will log out the current user session on “\(deviceName)”. Unsaved work could be lost."
        }
    }
}

func commandStatusColor(_ status: String?) -> Color {
    commandStatusRole(status).foreground
}

func commandStatusRole(_ status: String?) -> AppStatusRole {
    guard let status, let presentation = onOffCommandStates[status] else { return .neutral }
    return AppStatusRole(tone: presentation.tone)
}
