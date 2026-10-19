import SwiftUI
import UIKit

/// Shows a newly-created device's ID + token once, with copy buttons.
struct TokenReveal: View {
    let device: NewDevice
    @State private var copiedLabel: String? = nil
    @AccessibilityFocusState private var credentialsFocused: Bool

    var body: some View {
        Form {
            Section {
                AppMessageBanner(
                    message: "Save these now. The token is shown only once, and you’ll enter both values on the ESP32 setup page.",
                    role: .warning,
                    title: "One-time credentials"
                )
                .accessibilityFocused($credentialsFocused)
            }
            .appListRow()
            credentialRow("Device ID", device.deviceId ?? "")
            credentialRow("Device Token", device.token ?? "")
        }
        .appFormBackground()
        .appScreenBackground()
        .onAppear { credentialsFocused = true }
    }

    private func credentialRow(_ label: String, _ value: String) -> some View {
        Section(label) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: AppSpacing.medium) {
                    credentialText(value)
                        .fixedSize(horizontal: true, vertical: true)
                    Spacer(minLength: AppSpacing.small)
                    copyButton(label: label, value: value)
                }
                VStack(alignment: .leading, spacing: AppSpacing.small) {
                    credentialText(value)
                        .fixedSize(horizontal: false, vertical: true)
                    HStack {
                        Spacer()
                        copyButton(label: label, value: value)
                    }
                }
            }
            if copiedLabel == label {
                AppStatusBadge(text: "Copied", role: .positive, systemImage: "checkmark")
            }
        }
        .appListRow()
    }

    private func credentialText(_ value: String) -> some View {
        Text(value)
            .font(.system(.footnote, design: .monospaced))
            .foregroundStyle(AppColors.textPrimary)
            .textSelection(.enabled)
    }

    private func copyButton(label: String, value: String) -> some View {
        Button {
            UIPasteboard.general.string = value
            copiedLabel = label
            UIAccessibility.post(notification: .announcement, argument: "\(label) copied")
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                if copiedLabel == label { copiedLabel = nil }
            }
        } label: {
            Image(systemName: copiedLabel == label ? "checkmark" : "doc.on.doc")
                .foregroundStyle(copiedLabel == label ? AppColors.positive : AppColors.action)
                .frame(width: 44, height: 44)
                .background(
                    copiedLabel == label ? AppColors.positiveSoft : AppColors.actionSoft,
                    in: RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous)
                )
        }
        .buttonStyle(.borderless)
        .accessibilityLabel("Copy \(label)")
        .accessibilityHint("Copies the value to the clipboard")
    }
}
