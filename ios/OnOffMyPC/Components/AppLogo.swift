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
            .accessibilityLabel("OnOffMyPC logo")
    }
}
