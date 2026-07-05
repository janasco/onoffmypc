import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = ForgotPasswordViewModel()

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            AppLogo()
            Text("Reset password").font(.largeTitle.bold())

            if vm.sent {
                Text("If an account exists for that email, we've sent a password-reset link. Open it on this device or the web to choose a new password.")
                    .foregroundStyle(.secondary)
                Button("Back to sign in") { dismiss() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            } else {
                Text("Enter your email and we'll send a link to reset your password.")
                    .foregroundStyle(.secondary)

                TextField("Email", text: $vm.email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textFieldStyle(.roundedBorder)

                if let error = vm.error {
                    Text(error).foregroundStyle(.red).font(.footnote)
                }

                Button {
                    Task { await vm.submit() }
                } label: {
                    if vm.loading {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Send reset link").frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(vm.loading)
            }
            Spacer()
        }
        .padding(24)
        .navigationTitle("Reset password")
        .navigationBarTitleDisplayMode(.inline)
    }
}
