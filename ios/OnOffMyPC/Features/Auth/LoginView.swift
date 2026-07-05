import SwiftUI

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = AuthViewModel()

    var body: some View {
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

            SecureField("Password", text: $vm.password)
                .textContentType(.password)
                .textFieldStyle(.roundedBorder)

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

            Spacer()
        }
        .padding(24)
    }
}
