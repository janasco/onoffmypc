import SwiftUI
import UIKit

/// Shows a newly-created device's ID + token once, with copy buttons.
struct TokenReveal: View {
    let device: NewDevice

    var body: some View {
        Form {
            Section {
                Text("Save these now — the token is shown only once. You'll enter both on the ESP32 setup page.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            credentialRow("Device ID", device.deviceId ?? "")
            credentialRow("Device Token", device.token ?? "")
        }
    }

    private func credentialRow(_ label: String, _ value: String) -> some View {
        Section(label) {
            HStack {
                Text(value)
                    .font(.system(.footnote, design: .monospaced))
                    .lineLimit(1)
                    .truncationMode(.middle)
                Spacer()
                Button {
                    UIPasteboard.general.string = value
                } label: {
                    Image(systemName: "doc.on.doc")
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Copy \(label)")
            }
        }
    }
}
