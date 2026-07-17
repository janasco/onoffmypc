import SwiftUI
import UIKit

// MARK: - Foundations

/// SwiftUI-native adapter over the vendored @onoffmypc/design output.
/// Operational colors are intentionally reserved for status and command meaning.
enum AppColors {
    static let canvas = adaptive(\.backgroundCanvas)
    static let surface = adaptive(\.backgroundSurface)
    static let surfaceRaised = adaptive(light: \.backgroundSurface, dark: \.backgroundSubtle)
    static let surfaceMuted = adaptive(\.backgroundSubtle)
    static let border = adaptive(
        \.borderDefault,
        highContrastLight: \.textSecondary,
        highContrastDark: \.textSecondary
    )
    /// The secondary-text token provides the 3:1 non-text contrast required for input boundaries.
    static let fieldBorder = adaptive(\.textSecondary)

    static let textPrimary = adaptive(\.textPrimary)
    static let textSecondary = adaptive(\.textSecondary)

    /// Ordinary actions, links, selection, and navigation.
    static let action = adaptive(\.actionPrimaryBackground)
    static let actionOnColor = adaptive(\.actionPrimaryForeground)
    static let actionSoft = adaptive(\.statusInfoContainer)
    static let informational = adaptive(\.statusInfoForeground)

    /// Operational state colors. Never use these as general brand accents.
    static let positive = adaptive(\.statusPositiveForeground)
    static let positiveSoft = adaptive(\.statusPositiveContainer)
    static let warning = adaptive(\.statusAttentionForeground)
    static let warningSoft = adaptive(\.statusAttentionContainer)
    static let danger = adaptive(\.statusCriticalForeground)
    static let dangerSoft = adaptive(\.statusCriticalContainer)

    static let powerOnBackground = adaptive(\.powerOnBackground)
    static let powerOnForeground = adaptive(\.powerOnForeground)
    static let powerOffBackground = adaptive(\.powerOffBackground)
    static let powerOffForeground = adaptive(\.powerOffForeground)
    static let powerResetBackground = adaptive(\.powerResetBackground)
    static let powerResetForeground = adaptive(\.powerResetForeground)

    private static func adaptive(
        _ token: KeyPath<OnOffColorScheme, Color>,
        highContrastLight: KeyPath<OnOffColorScheme, Color>? = nil,
        highContrastDark: KeyPath<OnOffColorScheme, Color>? = nil
    ) -> Color {
        adaptive(
            light: token,
            dark: token,
            highContrastLight: highContrastLight,
            highContrastDark: highContrastDark
        )
    }

    private static func adaptive(
        light lightToken: KeyPath<OnOffColorScheme, Color>,
        dark darkToken: KeyPath<OnOffColorScheme, Color>,
        highContrastLight: KeyPath<OnOffColorScheme, Color>? = nil,
        highContrastDark: KeyPath<OnOffColorScheme, Color>? = nil
    ) -> Color {
        Color(uiColor: UIColor { traits in
            if traits.userInterfaceStyle == .dark {
                let token = traits.accessibilityContrast == .high
                    ? (highContrastDark ?? darkToken)
                    : darkToken
                return UIColor(OnOffColorScheme.dark[keyPath: token])
            }
            let token = traits.accessibilityContrast == .high
                ? (highContrastLight ?? lightToken)
                : lightToken
            return UIColor(OnOffColorScheme.light[keyPath: token])
        })
    }
}

enum AppSpacing {
    static let xSmall = OnOffSpacing.x1
    static let small = OnOffSpacing.x2
    static let medium = OnOffSpacing.x3
    static let standard = OnOffSpacing.x4
    static let large = OnOffSpacing.x6
    static let xLarge = OnOffSpacing.x8
    static let page = OnOffSpacing.x6
}

enum AppRadius {
    static let field = OnOffRadius.control
    static let control = OnOffRadius.card
    static let card = OnOffRadius.large
    static let large = OnOffRadius.large
}

enum AppStatusRole {
    case neutral
    case informational
    case positive
    case warning
    case danger

    init(tone: OnOffTone) {
        switch tone {
        case .positive:
            self = .positive
        case .powerOn:
            self = .informational
        case .attention, .powerReset:
            self = .warning
        case .critical, .danger, .powerOff:
            self = .danger
        case .info:
            self = .informational
        case .neutral:
            self = .neutral
        }
    }

    var foreground: Color {
        switch self {
        case .neutral: return AppColors.textSecondary
        case .informational: return AppColors.informational
        case .positive: return AppColors.positive
        case .warning: return AppColors.warning
        case .danger: return AppColors.danger
        }
    }

    var background: Color {
        switch self {
        case .neutral: return AppColors.surfaceMuted
        case .informational: return AppColors.actionSoft
        case .positive: return AppColors.positiveSoft
        case .warning: return AppColors.warningSoft
        case .danger: return AppColors.dangerSoft
        }
    }

    var defaultIcon: String {
        switch self {
        case .neutral: return "minus.circle.fill"
        case .informational: return "info.circle.fill"
        case .positive: return "checkmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .danger: return "xmark.octagon.fill"
        }
    }
}

// MARK: - Reusable surfaces

struct AppSurface<Content: View>: View {
    private let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(AppSpacing.standard)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AppRadius.card, style: .continuous)
                    .stroke(AppColors.border, lineWidth: 1)
            }
            .shadow(color: Color.black.opacity(0.04), radius: 12, y: 4)
    }
}

struct AppStatusBadge: View {
    let text: String
    let role: AppStatusRole
    var systemImage: String? = nil

    var body: some View {
        Label(text, systemImage: systemImage ?? role.defaultIcon)
            .font(.caption.weight(.semibold))
            .foregroundStyle(role.foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(role.background, in: RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous))
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(text)
    }
}

struct AppMessageBanner: View {
    let message: String
    let role: AppStatusRole
    var title: String? = nil
    var announces = false

    var body: some View {
        HStack(alignment: .top, spacing: AppSpacing.medium) {
            Image(systemName: role.defaultIcon)
                .foregroundStyle(role.foreground)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: AppSpacing.xSmall) {
                if let title {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(AppColors.textPrimary)
                }
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(AppColors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(AppSpacing.medium)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(role.background, in: RoundedRectangle(cornerRadius: AppRadius.control, style: .continuous))
        .accessibilityElement(children: .combine)
        .onAppear { announceIfNeeded(message) }
        .onChange(of: message) { announceIfNeeded($0) }
    }

    private func announceIfNeeded(_ value: String) {
        guard announces else { return }
        UIAccessibility.post(notification: .announcement, argument: value)
    }
}

struct AppEmptyState: View {
    let systemImage: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            Image(systemName: systemImage)
                .font(.system(size: 34, weight: .medium))
                .foregroundStyle(AppColors.action)
                .frame(width: 68, height: 68)
                .background(AppColors.actionSoft, in: RoundedRectangle(cornerRadius: AppRadius.large, style: .continuous))
                .accessibilityHidden(true)
            Text(title)
                .font(.title3.weight(.semibold))
                .foregroundStyle(AppColors.textPrimary)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(AppPrimaryButtonStyle(fullWidth: false))
            }
        }
        .padding(AppSpacing.large)
        .frame(maxWidth: 480)
        .accessibilityElement(children: .contain)
    }
}

struct AppProgressState: View {
    let label: String

    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            ProgressView()
                .controlSize(.large)
                .tint(AppColors.action)
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppColors.textSecondary)
        }
        .padding(AppSpacing.large)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
    }
}

struct AppInlineProgress: View {
    let label: String

    var body: some View {
        HStack(spacing: AppSpacing.small) {
            ProgressView()
                .controlSize(.small)
                .tint(AppColors.action)
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppColors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
        .onAppear {
            UIAccessibility.post(notification: .announcement, argument: label)
        }
    }
}

struct AppToast: View {
    let message: String

    var body: some View {
        Label(message, systemImage: "info.circle.fill")
            .font(.subheadline.weight(.medium))
            .foregroundStyle(AppColors.textPrimary)
            .multilineTextAlignment(.leading)
            .padding(.horizontal, AppSpacing.standard)
            .padding(.vertical, AppSpacing.medium)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: AppRadius.card, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AppRadius.card, style: .continuous)
                    .stroke(AppColors.border, lineWidth: 1)
            }
            .shadow(color: Color.black.opacity(0.12), radius: 18, y: 8)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(message)
            .onAppear {
                UIAccessibility.post(notification: .announcement, argument: message)
            }
    }
}

struct AuthHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.small) {
            AppLogo()
                .padding(.bottom, AppSpacing.small)
                .accessibilityHidden(true)
            Text(title)
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(AppColors.textPrimary)
                .accessibilityAddTraits(.isHeader)
            Text(subtitle)
                .font(.body)
                .foregroundStyle(AppColors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
    }
}

struct AppFieldLabel: View {
    let text: String

    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(AppColors.textPrimary)
    }
}

// MARK: - Native controls

struct AppTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(AppColors.surfaceMuted, in: RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous)
                    .stroke(AppColors.fieldBorder, lineWidth: 1)
            }
    }
}

struct AppPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    var fullWidth = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .padding(.horizontal, AppSpacing.standard)
            .padding(.vertical, 13)
            .foregroundStyle(isEnabled ? AppColors.actionOnColor : AppColors.textSecondary)
            .background(
                isEnabled ? AppColors.action : AppColors.surfaceMuted,
                in: RoundedRectangle(cornerRadius: AppRadius.control, style: .continuous)
            )
            .opacity(configuration.isPressed ? 0.78 : 1)
            .contentShape(RoundedRectangle(cornerRadius: AppRadius.control, style: .continuous))
    }
}

struct AppSecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    var fullWidth = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .padding(.horizontal, AppSpacing.standard)
            .padding(.vertical, 12)
            .foregroundStyle(isEnabled ? AppColors.action : AppColors.textSecondary)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AppRadius.control, style: .continuous)
                    .stroke(AppColors.fieldBorder, lineWidth: 1)
            }
            .opacity(configuration.isPressed ? 0.72 : (isEnabled ? 1 : 0.7))
            .contentShape(RoundedRectangle(cornerRadius: AppRadius.control, style: .continuous))
    }
}

struct AppCommandButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    let role: AppStatusRole

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .padding(.horizontal, AppSpacing.small)
            .padding(.vertical, AppSpacing.xSmall)
            .foregroundStyle(isEnabled ? commandForeground : AppColors.textSecondary)
            .background(
                isEnabled ? commandBackground : AppColors.surfaceMuted,
                in: RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous)
                    .stroke(
                        isEnabled ? commandForeground.opacity(0.35) : AppColors.fieldBorder,
                        lineWidth: 1
                    )
            }
            .opacity(configuration.isPressed ? 0.7 : 1)
    }

    private var commandBackground: Color {
        switch role {
        case .positive: return AppColors.powerOnBackground
        case .danger: return AppColors.powerOffBackground
        case .warning: return AppColors.powerResetBackground
        case .informational: return AppColors.powerOnBackground
        case .neutral: return AppColors.surfaceMuted
        }
    }

    private var commandForeground: Color {
        switch role {
        case .positive: return AppColors.powerOnForeground
        case .danger: return AppColors.powerOffForeground
        case .warning: return AppColors.powerResetForeground
        case .informational: return AppColors.powerOnForeground
        case .neutral: return AppColors.textSecondary
        }
    }
}

// MARK: - Screen modifiers

private struct AppScreenBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(AppColors.canvas.ignoresSafeArea())
            .foregroundStyle(AppColors.textPrimary)
            .tint(AppColors.action)
            .toolbarBackground(AppColors.canvas, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
    }
}

private struct AppFormBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .scrollContentBackground(.hidden)
            .background(AppColors.canvas)
            .tint(AppColors.action)
    }
}

extension View {
    func appScreenBackground() -> some View {
        modifier(AppScreenBackground())
    }

    func appFormBackground() -> some View {
        modifier(AppFormBackground())
    }

    func appListRow() -> some View {
        listRowBackground(AppColors.surface)
    }
}
