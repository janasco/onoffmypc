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
                    AppProgressState(label: "Loading your account…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let user = vm.user {
                    form(user)
                } else {
                    AppEmptyState(
                        systemImage: "person.crop.circle",
                        title: "Couldn’t load your account",
                        message: vm.error ?? "Check your connection and try again.",
                        actionTitle: "Retry",
                        action: { Task { await vm.load() } }
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .appScreenBackground()
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .disabled(vm.busy)
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
        .interactiveDismissDisabled(vm.busy)
    }

    @ViewBuilder
    private func form(_ user: MeResponse) -> some View {
        Form {
            if vm.busy {
                Section {
                    AppInlineProgress(label: "Updating account…")
                }
                .appListRow()
            }
            if user.deletion_at != nil {
                Section {
                    AppMessageBanner(
                        message: "Your account is scheduled for deletion after the grace period.",
                        role: .danger,
                        title: "Deletion scheduled"
                    )
                    Button("Keep my account") { Task { await vm.cancelDeletion() } }
                        .buttonStyle(AppSecondaryButtonStyle(fullWidth: false))
                        .disabled(vm.busy)
                }
                .appListRow()
            }

            Section("Profile") {
                LabeledContent("Email", value: user.email)
                if user.email_verified == false {
                    VStack(alignment: .leading, spacing: AppSpacing.small) {
                        AppStatusBadge(text: "Email not verified", role: .warning)
                        Button("Resend verification email") { Task { await vm.resendVerify() } }
                            .font(.subheadline.weight(.semibold))
                            .disabled(vm.busy)
                    }
                }
                LabeledContent("Member since", value: memberSince(user.created_at))
            }
            .appListRow()

            Section("Change email") {
                TextField("New email", text: $newEmail)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textFieldStyle(AppTextFieldStyle())
                    .disabled(vm.busy)
                PasswordField(title: "Current password", text: $emailPw)
                    .disabled(vm.busy)
                Button("Update email") {
                    Task {
                        if await vm.changeEmail(newEmail: newEmail, password: emailPw) {
                            newEmail = ""; emailPw = ""
                        }
                    }
                }
                .buttonStyle(AppSecondaryButtonStyle(fullWidth: false))
                .disabled(vm.busy)
            }
            .appListRow()

            Section("Security") {
                PasswordField(title: "Current password", text: $curPw)
                    .disabled(vm.busy)
                PasswordField(title: "New password", text: $newPw, contentType: .newPassword)
                    .disabled(vm.busy)
                PasswordField(title: "Confirm new password", text: $confirmPw, contentType: .newPassword)
                    .disabled(vm.busy)
                Button("Change password") {
                    Task {
                        if await vm.changePassword(current: curPw, new: newPw, confirm: confirmPw) {
                            curPw = ""; newPw = ""; confirmPw = ""
                        }
                    }
                }
                .buttonStyle(AppSecondaryButtonStyle(fullWidth: false))
                .disabled(vm.busy)
            }
            .appListRow()

            Section {
                Button("Sign out") { showLogoutConfirm = true }
                    .buttonStyle(AppSecondaryButtonStyle(fullWidth: false))
                    .disabled(vm.busy)
            }
            .appListRow()

            Section("Danger zone") {
                if user.deletion_at == nil {
                    Text("Deletes your account after a 15-day grace period. You can cancel any time before then.")
                        .font(.footnote).foregroundStyle(AppColors.textSecondary)
                    Button("Delete account", role: .destructive) { showDeleteConfirm = true }
                        .disabled(vm.busy)
                } else {
                    Text("Your account is scheduled for deletion. Use “Keep my account” above to cancel.")
                        .font(.footnote).foregroundStyle(AppColors.textSecondary)
                }
            }
            .appListRow()
        }
        .appFormBackground()
        .alert("Delete your account?", isPresented: $showDeleteConfirm) {
            TextField("Your email", text: $deleteEmail)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button("Cancel", role: .cancel) { deleteEmail = "" }
            Button("Schedule deletion", role: .destructive) {
                deleteEmail = ""
                Task { await vm.scheduleDeletion() }
            }
            .disabled(
                deleteEmail.trimmingCharacters(in: .whitespacesAndNewlines)
                    .caseInsensitiveCompare(user.email) != .orderedSame
            )
        } message: {
            Text("Scheduled for deletion in 15 days; cancel any time before then. Type your email to confirm.")
        }
    }

    @ViewBuilder
    private var toastView: some View {
        if let message = vm.message {
            AppToast(message: message)
                .padding(.horizontal, AppSpacing.large)
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
