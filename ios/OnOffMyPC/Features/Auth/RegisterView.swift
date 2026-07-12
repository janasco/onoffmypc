import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = RegisterViewModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AppLogo()
                Text("Create account").font(.largeTitle.bold())
                Text("Create your account to get started.")
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 8)

                TextField("Email", text: $vm.email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textContentType(.username)
                    .textFieldStyle(.roundedBorder)

                PasswordField(title: "Password", text: $vm.password)
                PasswordField(title: "Confirm password", text: $vm.confirm)

                TextField("Invite code", text: $vm.inviteCode)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .textFieldStyle(.roundedBorder)

                if let error = vm.error {
                    Text(error).foregroundStyle(.red).font(.footnote)
                }

                Button {
                    Task { await vm.register(appState) }
                } label: {
                    if vm.loading {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Create account").frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(vm.loading)
            }
            .padding(24)
        }
        .navigationTitle("Register")
        .navigationBarTitleDisplayMode(.inline)
    }
}
