import SwiftUI

private enum DevicesSheet: Identifiable {
    case account, addDevice, billing
    var id: Int { switch self { case .account: return 0; case .addDevice: return 1; case .billing: return 2 } }
}

struct DevicesView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = DevicesViewModel()
    @State private var sheet: DevicesSheet?
    @State private var showLogoutConfirm = false

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Your Devices")
                .navigationDestination(for: Device.self) { device in
                    DeviceDetailView(device: device)
                }
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        AppLogo(size: 26)
                    }
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button { sheet = .addDevice } label: { Image(systemName: "plus") }
                    }
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Menu {
                            Button {
                                sheet = .account
                            } label: {
                                Label("Account", systemImage: "person.crop.circle")
                            }
                            Button {
                                sheet = .billing
                            } label: {
                                Label("Plan & Billing", systemImage: "creditcard")
                            }
                            Button(role: .destructive) {
                                showLogoutConfirm = true
                            } label: {
                                Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                            }
                        } label: {
                            Image(systemName: "line.3.horizontal")
                        }
                    }
                }
        }
        .task { await vm.load(appState) }
        .refreshable { await vm.load(appState) }
        .overlay(alignment: .bottom) { toastView }
        .sheet(item: $sheet) { route in
            switch route {
            case .account: AccountView()
            case .addDevice: AddDeviceView(vm: vm)
            case .billing: BillingView()
            }
        }
        .alert("Sign out?", isPresented: $showLogoutConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Sign out", role: .destructive) { appState.signOut() }
        } message: {
            Text("You'll need to sign in again to control your devices.")
        }
        .alert("Free trial ended", isPresented: $vm.showUpgrade) {
            Button("Not now", role: .cancel) {}
            Button("Upgrade") { sheet = .billing }
        } message: {
            Text("Make a one-time payment to keep controlling your devices.")
        }
    }

    @ViewBuilder
    private var content: some View {
        if vm.loading && vm.devices.isEmpty {
            ProgressView()
        } else if let error = vm.error, vm.devices.isEmpty {
            VStack(spacing: 12) {
                Text(error).foregroundStyle(.secondary).multilineTextAlignment(.center)
                Button("Retry") { Task { await vm.load(appState) } }
            }
            .padding()
        } else if vm.devices.isEmpty {
            VStack(spacing: 8) {
                Image(systemName: "desktopcomputer").font(.largeTitle).foregroundStyle(.secondary)
                Text("No devices yet").font(.headline)
                Text("Tap + to add your first device.").foregroundStyle(.secondary)
            }
            .padding()
        } else {
            List {
                if let b = vm.billing, !(b.is_lifetime ?? false) {
                    TrialBanner(billing: b) { sheet = .billing }
                }
                ForEach(vm.devices) { device in
                    DeviceRow(device: device) { type in
                        Task { await vm.send(type, to: device, appState) }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var toastView: some View {
        if let toast = vm.toast {
            Text(toast)
                .font(.subheadline)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial, in: Capsule())
                .padding(.bottom, 24)
                .task(id: toast) {
                    try? await Task.sleep(nanoseconds: 2_500_000_000)
                    vm.toast = nil
                }
        }
    }
}

private struct TrialBanner: View {
    let billing: BillingStatus
    let onUpgrade: () -> Void

    var body: some View {
        let expired = billing.trial_expired ?? false
        HStack {
            Text(bannerText(expired))
                .font(.subheadline)
                .foregroundStyle(expired ? Color.red : Color.primary)
            Spacer()
            Button(expired ? "Unlock" : "Upgrade", action: onUpgrade)
                .buttonStyle(.bordered)
                .controlSize(.small)
        }
        .listRowBackground((expired ? Color.red : Color.accentColor).opacity(0.12))
    }

    private func bannerText(_ expired: Bool) -> String {
        if expired { return "Free trial ended. Pay $\(billing.price ?? 15) once to keep control." }
        if let days = daysLeft(billing.trial_ends_at) {
            return "Free trial: \(days) day\(days == 1 ? "" : "s") left."
        }
        return "You're on the free trial."
    }

    private func daysLeft(_ iso: String?) -> Int? {
        guard let iso else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let end = f.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
        guard let end else { return nil }
        let secs = end.timeIntervalSinceNow
        return secs <= 0 ? 0 : Int(secs / 86_400)
    }
}

private struct DeviceRow: View {
    let device: Device
    let onCommand: (CommandType) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            NavigationLink(value: device) {
                HStack {
                    Text(device.name).font(.headline)
                    Spacer()
                    Text(device.isOnline ? "Online" : "Offline")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(device.isOnline ? Color.green : Color.secondary)
                }
            }
            HStack(spacing: 8) {
                commandButton(.powerOn, tint: .green)
                commandButton(.powerOff, tint: .red)
                commandButton(.reset, tint: .orange)
            }
        }
        .padding(.vertical, 6)
    }

    private func commandButton(_ type: CommandType, tint: Color) -> some View {
        Button(type.label) { onCommand(type) }
            .buttonStyle(.bordered)
            .tint(tint)
            .controlSize(.small)
    }
}
