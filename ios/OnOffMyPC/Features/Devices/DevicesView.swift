import SwiftUI

private enum DevicesSheet: Identifiable {
    case account, addDevice
    case billing(String?)
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
                                sheet = .billing(nil)
                            } label: {
                                Label("Device Unlocks", systemImage: "creditcard")
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
        .sheet(item: $sheet, onDismiss: {
            Task { await vm.refreshBilling() }
        }) { route in
            switch route {
            case .account: AccountView()
            case .addDevice: AddDeviceView(vm: vm)
            case .billing(let deviceId): BillingView(initialDeviceId: deviceId)
            }
        }
        .alert("Sign out?", isPresented: $showLogoutConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Sign out", role: .destructive) { appState.signOut() }
        } message: {
            Text("You'll need to sign in again to control your devices.")
        }
        .alert("Device trial ended", isPresented: $vm.showUpgrade) {
            Button("Not now", role: .cancel) {}
            Button("Unlock device") { sheet = .billing(vm.upgradeDeviceId) }
        } message: {
            Text("Unlock \(upgradeDeviceName) for $\(unlockPrice) one time to continue controlling it.")
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
                if let b = vm.billing,
                   !(b.is_lifetime ?? false),
                   b.devices == nil || b.devices?.contains(where: { $0.unlocked != true }) == true {
                    TrialBanner(billing: b) { sheet = .billing(nil) }
                }
                ForEach(vm.devices) { device in
                    DeviceRow(
                        device: device,
                        commandInFlight: vm.commandInFlightDeviceIds.contains(device.id)
                    ) { type in
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

    private var upgradeDeviceName: String {
        vm.devices.first { $0.id == vm.upgradeDeviceId }?.name ?? "this device"
    }

    private var unlockPrice: Int {
        vm.billing?.plans?.first { $0.id == "device" }?.price ?? vm.billing?.price ?? 15
    }
}

private struct TrialBanner: View {
    let billing: BillingStatus
    let onUpgrade: () -> Void

    var body: some View {
        let locked = billing.devices?.filter { $0.unlocked != true } ?? []
        let expired = locked.contains { $0.pending != true && deviceTrialExpired($0) }
        HStack {
            Text(bannerText(expired))
                .font(.subheadline)
                .foregroundStyle(expired ? Color.red : Color.primary)
            Spacer()
            Button(expired ? "Unlock" : "Manage", action: onUpgrade)
                .buttonStyle(.bordered)
                .controlSize(.small)
        }
        .listRowBackground((expired ? Color.red : Color.accentColor).opacity(0.12))
    }

    private func bannerText(_ expired: Bool) -> String {
        let locked = billing.devices?.filter { $0.unlocked != true } ?? []
        let expiredCount = locked.filter { $0.pending != true && deviceTrialExpired($0) }.count
        let pendingCount = locked.filter { $0.pending == true }.count
        let days = locked.filter { $0.pending != true }.compactMap { daysLeft($0.trial_ends_at) }.min()
        if expiredCount > 0 {
            return "\(expiredCount) device trial\(expiredCount == 1 ? " has" : "s have") ended. Unlock each for $\(billing.price ?? 15) one time."
        }
        if !locked.isEmpty, locked.allSatisfy({ $0.pending == true }) {
            return "\(pendingCount) device payment\(pendingCount == 1 ? " is" : "s are") under review."
        }
        if locked.isEmpty, billing.devices == nil, billing.trial_expired == true {
            return "Free trial ended. Unlock a device for $\(billing.price ?? 15) one time."
        }
        if let days {
            return "Device trial: \(days) day\(days == 1 ? "" : "s") left on the next device."
        }
        return "Each device includes a free trial."
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

    private func trialHasEnded(_ iso: String?) -> Bool {
        guard let iso, let end = Date.fromISO(iso) else { return false }
        return end <= Date()
    }

    private func deviceTrialExpired(_ device: BillingDevice) -> Bool {
        device.trial_expired ?? trialHasEnded(device.trial_ends_at)
    }
}

private struct DeviceRow: View {
    let device: Device
    let commandInFlight: Bool
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
            PowerCommandControls(
                deviceName: device.name,
                commandInFlight: commandInFlight,
                includeForceOff: false,
                onCommand: onCommand
            )
        }
        .padding(.vertical, 6)
    }
}
