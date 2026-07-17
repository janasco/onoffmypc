import SwiftUI

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = AuthViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.large) {
                    AuthHeader(
                        title: "OnOffMyPC",
                        subtitle: "Control your PC from anywhere, with every device state clearly explained."
                    )

                    AppSurface {
                        VStack(alignment: .leading, spacing: AppSpacing.standard) {
                            Text("Sign in")
                                .font(.title2.weight(.semibold))

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
                                PasswordField(title: "Password", text: $vm.password)
                                    .disabled(vm.loading)
                            }

                            if let error = vm.error {
                                AppMessageBanner(message: error, role: .danger, announces: true)
                            }

                            Button {
                                Task { await vm.login(appState) }
                            } label: {
                                if vm.loading {
                                    ProgressView()
                                        .tint(AppColors.actionOnColor)
                                        .frame(maxWidth: .infinity)
                                } else {
                                    Text("Sign in")
                                }
                            }
                            .buttonStyle(AppPrimaryButtonStyle())
                            .disabled(vm.loading)
                            .accessibilityLabel(vm.loading ? "Signing in…" : "Sign in")
                        }
                    }

                    socialSignIn

                    ViewThatFits(in: .horizontal) {
                        HStack {
                            NavigationLink("Forgot password?") { ForgotPasswordView() }
                            Spacer()
                            NavigationLink("Create account") { RegisterView() }
                        }
                        VStack(alignment: .leading, spacing: AppSpacing.medium) {
                            NavigationLink("Forgot password?") { ForgotPasswordView() }
                            NavigationLink("Create account") { RegisterView() }
                        }
                    }
                    .font(.subheadline.weight(.semibold))
                    .disabled(vm.loading)
                }
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, AppSpacing.page)
                .padding(.top, AppSpacing.xLarge)
                .padding(.bottom, 48)
            }
            .appScreenBackground()
        }
    }

    @ViewBuilder
    private var socialSignIn: some View {
        if vm.googleEnabled || vm.appleEnabled || vm.microsoftEnabled {
            AppSurface {
                VStack(alignment: .leading, spacing: AppSpacing.medium) {
                    Text("Or continue with")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(AppColors.textSecondary)

                    if vm.googleEnabled {
                        Button {
                            Task { await vm.googleSignIn(appState) }
                        } label: {
                            Text("Continue with Google")
                        }
                        .buttonStyle(AppSecondaryButtonStyle())
                        .disabled(vm.loading)
                    }
                    if vm.appleEnabled {
                        Button {
                            Task { await vm.appleSignIn(appState) }
                        } label: {
                            Text("Continue with Apple")
                        }
                        .buttonStyle(AppSecondaryButtonStyle())
                        .disabled(vm.loading)
                    }
                    if vm.microsoftEnabled {
                        Button {
                            Task { await vm.microsoftSignIn(appState) }
                        } label: {
                            Text("Continue with Microsoft")
                        }
                        .buttonStyle(AppSecondaryButtonStyle())
                        .disabled(vm.loading)
                    }
                }
            }
        }
    }
}
