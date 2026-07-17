import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = ForgotPasswordViewModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.large) {
                AuthHeader(
                    title: "Reset password",
                    subtitle: "We’ll send a secure reset link if an account exists for that email."
                )

                AppSurface {
                    VStack(alignment: .leading, spacing: AppSpacing.standard) {
                        if vm.sent {
                            AppMessageBanner(
                                message: "If an account exists for that email, we’ve sent a password-reset link. Open it on this device or the web to choose a new password.",
                                role: .positive,
                                title: "Check your inbox",
                                announces: true
                            )
                            Button("Back to sign in") { dismiss() }
                                .buttonStyle(AppPrimaryButtonStyle())
                        } else {
                            VStack(alignment: .leading, spacing: AppSpacing.small) {
                                AppFieldLabel("Email")
                                TextField("you@example.com", text: $vm.email)
                                    .keyboardType(.emailAddress)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .textContentType(.emailAddress)
                                    .textFieldStyle(AppTextFieldStyle())
                                    .accessibilityLabel("Email")
                                    .disabled(vm.loading)
                            }

                            if let error = vm.error {
                                AppMessageBanner(message: error, role: .danger, announces: true)
                            }

                            Button {
                                Task { await vm.submit() }
                            } label: {
                                if vm.loading {
                                    ProgressView()
                                        .tint(AppColors.actionOnColor)
                                        .frame(maxWidth: .infinity)
                                } else {
                                    Text("Send reset link")
                                }
                            }
                            .buttonStyle(AppPrimaryButtonStyle())
                            .disabled(vm.loading)
                            .accessibilityLabel(vm.loading ? "Sending reset link…" : "Send reset link")
                        }
                    }
                }
            }
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, AppSpacing.page)
            .padding(.top, AppSpacing.large)
            .padding(.bottom, 48)
        }
        .appScreenBackground()
        .navigationTitle("Reset password")
        .navigationBarTitleDisplayMode(.inline)
    }
}
