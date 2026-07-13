import SwiftUI

struct AccountView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = AccountViewModel()

    @State private var newEmail = ""
    @State private var emailPw = ""
    @State private var curPw = ""
    @State private var newPw = ""
    @State private var confirmPw = ""
    @State private var showLogoutConfirm = false
    @State private var showDeleteConfirm = false
    @State private var deleteEmail = ""

    var body: some View {
        NavigationStack {
            Group {
                if vm.loading && vm.user == nil {
                    ProgressView()
                } else if let user = vm.user {
                    form(user)
                } else {
                    Text(vm.error ?? "Couldn't load your account.")
                        .foregroundStyle(.secondary)
                        .padding()
                }
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Sign out?", isPresented: $showLogoutConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Sign out", role: .destructive) { appState.signOut(); dismiss() }
            } message: {
                Text("You'll need to sign in again to control your devices.")
            }
        }
        .task { await vm.load() }
        .refreshable { await vm.load() }
        .overlay(alignment: .bottom) { toastView }
    }

    @ViewBuilder
    private func form(_ user: MeResponse) -> some View {
        Form {
            if user.deletion_at != nil {
                Section {
                    Text("Account scheduled for deletion.").foregroundStyle(.red)
                    Button("Keep my account") { Task { await vm.cancelDeletion() } }
                        .disabled(vm.busy)
                }
            }

            Section("Profile") {
                LabeledContent("Email", value: user.email)
                if user.email_verified == false {
                    HStack {
                        Text("Email not verified").foregroundStyle(.orange)
                        Spacer()
                        Button("Resend") { Task { await vm.resendVerify() } }.disabled(vm.busy)
                    }
                }
                LabeledContent("Member since", value: memberSince(user.created_at))
            }

            Section("Change email") {
                TextField("New email", text: $newEmail)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                PasswordField(title: "Current password", text: $emailPw)
                Button("Update email") {
                    Task {
                        if await vm.changeEmail(newEmail: newEmail, password: emailPw) {
                            newEmail = ""; emailPw = ""
                        }
                    }
                }
                .disabled(vm.busy)
            }

            Section("Security") {
                PasswordField(title: "Current password", text: $curPw)
                PasswordField(title: "New password", text: $newPw)
                PasswordField(title: "Confirm new password", text: $confirmPw)
                Button("Change password") {
                    Task {
                        if await vm.changePassword(current: curPw, new: newPw, confirm: confirmPw) {
                            curPw = ""; newPw = ""; confirmPw = ""
                        }
                    }
                }
                .disabled(vm.busy)
            }

            Section {
                Button("Sign out") { showLogoutConfirm = true }
            }

            Section("Danger zone") {
                if user.deletion_at == nil {
                    Text("Deletes your account after a 15-day grace period. You can cancel any time before then.")
                        .font(.footnote).foregroundStyle(.secondary)
                    Button("Delete account", role: .destructive) { showDeleteConfirm = true }
                } else {
                    Text("Your account is scheduled for deletion. Use “Keep my account” above to cancel.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
        .alert("Delete your account?", isPresented: $showDeleteConfirm) {
            TextField("Your email", text: $deleteEmail)
            Button("Cancel", role: .cancel) { deleteEmail = "" }
            Button("Schedule deletion", role: .destructive) {
                let match = deleteEmail.trimmingCharacters(in: .whitespaces).lowercased() == user.email.lowercased()
                deleteEmail = ""
                if match { Task { await vm.scheduleDeletion() } }
            }
        } message: {
            Text("Scheduled for deletion in 15 days; cancel any time before then. Type your email to confirm.")
        }
    }

    @ViewBuilder
    private var toastView: some View {
        if let message = vm.message {
            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
                .task(id: message) {
                    try? await Task.sleep(nanoseconds: 3_000_000_000)
                    vm.message = nil
                }
        }
    }

    private func memberSince(_ iso: String?) -> String {
        guard let iso, let date = Date.fromISO(iso) else { return "—" }
        let f = DateFormatter()
        f.dateStyle = .medium
        return f.string(from: date)
    }
}
