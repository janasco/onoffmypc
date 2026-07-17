import SwiftUI

/// The OnOffMyPC brand mark (self-contained background, so it reads on light or
/// dark), clipped to a rounded square like the app icon.
struct AppLogo: View {
    var size: CGFloat = 72

    var body: some View {
        Image("Logo")
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.22, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: size * 0.22, style: .continuous)
                    .stroke(AppColors.border.opacity(0.7), lineWidth: 1)
            }
            .shadow(color: Color.black.opacity(0.08), radius: size * 0.12, y: size * 0.04)
            .accessibilityLabel("OnOffMyPC logo")
    }
}
