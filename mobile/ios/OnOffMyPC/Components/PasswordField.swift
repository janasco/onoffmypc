import SwiftUI
import UIKit

/// Secure text field with a Show/Hide eye toggle (mirrors the Android app).
struct PasswordField: View {
    let title: String
    @Binding var text: String
    let contentType: UITextContentType
    @State private var visible = false
    @FocusState private var fieldFocused: Bool

    init(
        title: String,
        text: Binding<String>,
        contentType: UITextContentType = .password
    ) {
        self.title = title
        _text = text
        self.contentType = contentType
    }

    var body: some View {
        HStack(spacing: 8) {
            Group {
                if visible {
                    TextField(title, text: $text)
                        .focused($fieldFocused)
                } else {
                    SecureField(title, text: $text)
                        .focused($fieldFocused)
                }
            }
            .textContentType(contentType)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)

            Button {
                let restoreFocus = fieldFocused
                visible.toggle()
                if restoreFocus {
                    Task { @MainActor in
                        await Task.yield()
                        fieldFocused = true
                    }
                }
            } label: {
                Image(systemName: visible ? "eye.slash" : "eye")
                    .foregroundStyle(AppColors.textSecondary)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(visible ? "Hide password" : "Show password")
            .accessibilityValue(visible ? "Password visible" : "Password hidden")
        }
        .padding(.leading, 14)
        .padding(.trailing, 8)
        .padding(.vertical, 1)
        .background(AppColors.surfaceMuted, in: RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous)
                .stroke(AppColors.fieldBorder, lineWidth: 1)
        }
    }
}
