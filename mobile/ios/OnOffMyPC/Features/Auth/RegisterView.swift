import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = RegisterViewModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.large) {
                AuthHeader(
                    title: "Create account",
                    subtitle: "Add your first device and control it securely from anywhere."
                )

                AppSurface {
                    VStack(alignment: .leading, spacing: AppSpacing.standard) {
                        VStack(alignment: .leading, spacing: AppSpacing.small) {
                            AppFieldLabel("Email")
                            TextField("you@example.com", text: $vm.email)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .textContentType(.username)
                                .textFieldStyle(AppTextFieldStyle())
                                .accessibilityLabel("Email")
                                .disabled(vm.loading)
                        }

                        VStack(alignment: .leading, spacing: AppSpacing.small) {
                            AppFieldLabel("Password")
                            PasswordField(title: "Password", text: $vm.password, contentType: .newPassword)
                                .disabled(vm.loading)
                        }

                        VStack(alignment: .leading, spacing: AppSpacing.small) {
                            AppFieldLabel("Confirm password")
                            PasswordField(title: "Confirm password", text: $vm.confirm, contentType: .newPassword)
                                .disabled(vm.loading)
                        }

                        if let error = vm.error {
                            AppMessageBanner(message: error, role: .danger, announces: true)
                        }

                        Button {
                            Task { await vm.register(appState) }
                        } label: {
                            if vm.loading {
                                ProgressView()
                                    .tint(AppColors.actionOnColor)
                                    .frame(maxWidth: .infinity)
                            } else {
                                Text("Create account")
                            }
                        }
                        .buttonStyle(AppPrimaryButtonStyle())
                        .disabled(vm.loading)
                        .accessibilityLabel(vm.loading ? "Creating account…" : "Create account")
                    }
                }

                if vm.googleEnabled || vm.appleEnabled || vm.microsoftEnabled {
                    AppSurface {
                        VStack(alignment: .leading, spacing: AppSpacing.medium) {
                            Text("Or continue with")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(AppColors.textSecondary)
                            if vm.googleEnabled {
                                Button("Continue with Google") {
                                    Task { await vm.googleSignIn(appState) }
                                }
                                .buttonStyle(AppSecondaryButtonStyle())
                                .disabled(vm.loading)
                            }
                            if vm.appleEnabled {
                                Button("Continue with Apple") {
                                    Task { await vm.appleSignIn(appState) }
                                }
                                .buttonStyle(AppSecondaryButtonStyle())
                                .disabled(vm.loading)
                            }
                            if vm.microsoftEnabled {
                                Button("Continue with Microsoft") {
                                    Task { await vm.microsoftSignIn(appState) }
                                }
                                .buttonStyle(AppSecondaryButtonStyle())
                                .disabled(vm.loading)
                            }
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
        .navigationTitle("Register")
        .navigationBarTitleDisplayMode(.inline)
    }
}
