import SwiftUI

/// Secure text field with a Show/Hide eye toggle (mirrors the Android app).
struct PasswordField: View {
    let title: String
    @Binding var text: String
    @State private var visible = false

    var body: some View {
        HStack(spacing: 8) {
            Group {
                if visible {
                    TextField(title, text: $text)
                } else {
                    SecureField(title, text: $text)
                }
            }
            .textContentType(.password)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)

            Button { visible.toggle() } label: {
                Image(systemName: visible ? "eye.slash" : "eye")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(visible ? "Hide password" : "Show password")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.secondary.opacity(0.35), lineWidth: 1)
        )
    }
}
