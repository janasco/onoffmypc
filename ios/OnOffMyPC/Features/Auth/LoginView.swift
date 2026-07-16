import SwiftUI

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = AuthViewModel()

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Spacer()
                AppLogo()
                Text("OnOffMyPC").font(.largeTitle.bold())
                Text("Control your PC from anywhere.")
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 8)

                TextField("Email", text: $vm.email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textContentType(.username)
                    .textFieldStyle(.roundedBorder)

                PasswordField(title: "Password", text: $vm.password)

                if let error = vm.error {
                    Text(error).foregroundStyle(.red).font(.footnote)
                }

                Button {
                    Task { await vm.login(appState) }
                } label: {
                    if vm.loading {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Sign in").frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(vm.loading)

                if vm.googleEnabled {
                    Button {
                        Task { await vm.googleSignIn(appState) }
                    } label: {
                        Text("Continue with Google").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    .disabled(vm.loading)
                }
                if vm.appleEnabled {
                    Button {
                        Task { await vm.appleSignIn(appState) }
                    } label: {
                        Text("Continue with Apple").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    .disabled(vm.loading)
                }
                if vm.microsoftEnabled {
                    Button {
                        Task { await vm.microsoftSignIn(appState) }
                    } label: {
                        Text("Continue with Microsoft").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    .disabled(vm.loading)
                }

                HStack {
                    NavigationLink("Forgot password?") { ForgotPasswordView() }
                    Spacer()
                    NavigationLink("Register") { RegisterView() }
                }
                .font(.footnote)
                .padding(.top, 4)

                Spacer()
            }
            .padding(24)
        }
    }
}
