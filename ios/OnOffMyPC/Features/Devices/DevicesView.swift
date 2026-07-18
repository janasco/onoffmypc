import SwiftUI

private enum DevicesSheet: Identifiable {
    case account, addDevice, dashboardMockup
    case billing(String?)
    var id: Int {
        switch self {
        case .account: return 0
        case .addDevice: return 1
        case .billing: return 2
        case .dashboardMockup: return 3
        }
    }
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
                .appScreenBackground()
                .navigationDestination(for: Device.self) { device in
                    DeviceDetailView(device: device)
                }
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        AppLogo(size: 26)
                            .accessibilityHidden(true)
                    }
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button { sheet = .addDevice } label: { Image(systemName: "plus") }
                            .accessibilityLabel("Add device")
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
                            Button {
                                sheet = .dashboardMockup
                            } label: {
                                Label("Dashboard concept", systemImage: "square.grid.2x2")
                            }
                            Button(role: .destructive) {
                                showLogoutConfirm = true
                            } label: {
                                Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                            }
                        } label: {
                            Image(systemName: "line.3.horizontal")
                        }
                        .accessibilityLabel("Open menu")
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
            case .dashboardMockup: DashboardMockupView()
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
            AppProgressState(label: "Loading devices…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error = vm.error, vm.devices.isEmpty {
            AppEmptyState(
                systemImage: "wifi.exclamationmark",
                title: "Couldn’t load devices",
                message: error,
                actionTitle: "Retry",
                action: { Task { await vm.load(appState) } }
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if vm.devices.isEmpty {
            AppEmptyState(
                systemImage: "desktopcomputer",
                title: "No devices yet",
                message: "Add your first device to view its connection and last-reported PC status.",
                actionTitle: "Add device",
                action: { sheet = .addDevice }
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            List {
                if let b = vm.billing,
                   b.billingEnabled,
                   !(b.is_lifetime ?? false),
                   b.devices == nil || b.devices?.contains(where: { $0.unlocked != true }) == true {
                    TrialBanner(billing: b) { sheet = .billing(nil) }
                        .listRowInsets(
                            EdgeInsets(
                                top: AppSpacing.small,
                                leading: AppSpacing.standard,
                                bottom: AppSpacing.small,
                                trailing: AppSpacing.standard
                            )
                        )
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                }
                ForEach(vm.devices) { device in
                    DeviceRow(
                        device: device,
                        commandInFlight: vm.commandInFlightDeviceIds.contains(device.id)
                    ) { type in
                        Task { await vm.send(type, to: device, appState) }
                    }
                    .listRowInsets(
                        EdgeInsets(
                            top: AppSpacing.small,
                            leading: AppSpacing.standard,
                            bottom: AppSpacing.small,
                            trailing: AppSpacing.standard
                        )
                    )
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
            .appFormBackground()
        }
    }

    @ViewBuilder
    private var toastView: some View {
        if let toast = vm.toast {
            AppToast(message: toast)
                .padding(.horizontal, AppSpacing.large)
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
            || (billing.devices == nil && billing.trial_expired == true)
        AppSurface {
            VStack(alignment: .leading, spacing: AppSpacing.medium) {
                AppStatusBadge(
                    text: bannerStatus(expired),
                    role: bannerRole(expired)
                )
                Text(bannerText(expired))
                    .font(.subheadline)
                    .foregroundStyle(AppColors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                Button(expired ? "Unlock device" : "Manage access", action: onUpgrade)
                    .buttonStyle(AppSecondaryButtonStyle(fullWidth: false))
            }
        }
    }

    private var pendingCheckoutCount: Int {
        let locked = billing.devices?.filter { $0.unlocked != true } ?? []
        return locked.filter(\.polarCheckoutPending).count
    }

    private var pendingReviewCount: Int {
        let locked = billing.devices?.filter { $0.unlocked != true } ?? []
        return locked.filter(\.legacyPaymentPending).count
    }

    private func bannerStatus(_ expired: Bool) -> String {
        if expired { return "Trial ended" }
        if pendingCheckoutCount > 0 { return "Checkout pending" }
        if pendingReviewCount > 0 { return "Payment review" }
        return "Device access"
    }

    private func bannerRole(_ expired: Bool) -> AppStatusRole {
        if expired { return .warning }
        if pendingCheckoutCount > 0 || pendingReviewCount > 0 { return .warning }
        return .informational
    }

    private func bannerText(_ expired: Bool) -> String {
        let locked = billing.devices?.filter { $0.unlocked != true } ?? []
        let expiredCount = locked.filter { $0.pending != true && deviceTrialExpired($0) }.count
        let days = locked.filter { $0.pending != true }.compactMap { daysLeft($0.trial_ends_at) }.min()
        if expiredCount > 0 {
            return "\(expiredCount) device trial\(expiredCount == 1 ? " has" : "s have") ended. Unlock each for $\(billing.price ?? 15) one time."
        }
        if pendingCheckoutCount > 0 {
            return "\(pendingCheckoutCount) device checkout\(pendingCheckoutCount == 1 ? " is" : "s are") ready to continue."
        }
        if pendingReviewCount > 0 {
            return "\(pendingReviewCount) legacy device payment\(pendingReviewCount == 1 ? " is" : "s are") under review."
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
        let status = deviceStatusFromLastContact(lastSeenAt: device.last_seen_at, pcOn: device.pc_on)
        AppSurface {
            VStack(alignment: .leading, spacing: AppSpacing.standard) {
                NavigationLink(value: device) {
                    HStack(spacing: AppSpacing.medium) {
                        Image(systemName: "desktopcomputer")
                            .font(.headline)
                            .foregroundStyle(AppColors.action)
                            .frame(width: 40, height: 40)
                            .background(AppColors.actionSoft, in: RoundedRectangle(cornerRadius: AppRadius.control, style: .continuous))
                            .accessibilityHidden(true)
                        Text(device.name)
                            .font(.headline)
                            .foregroundStyle(AppColors.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(AppColors.textSecondary)
                            .accessibilityHidden(true)
                    }
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityHint("Opens device details")

                Divider()
                    .overlay(AppColors.border)

                DeviceStatusSummary(presentation: status)

                if let cpuLoad = device.cpu_load {
                    HStack(spacing: AppSpacing.medium) {
                        statBar(
                            label: "CPU LOAD",
                            value: "\(Int(cpuLoad))%",
                            fraction: CGFloat(cpuLoad / 100.0),
                            color: AppColors.action
                        )
                        if let gpuTemp = device.gpu_temp {
                            statBar(
                                label: "GPU TEMP",
                                value: "\(Int(gpuTemp))°C",
                                fraction: CGFloat(gpuTemp / 100.0),
                                color: AppColors.danger
                            )
                        }
                        if let ramUsed = device.ram_used_mb, let ramTotal = device.ram_total_mb, ramTotal > 0 {
                            let ramUsedGb = ramUsed / 1024.0
                            let ramTotalGb = ramTotal / 1024.0
                            statBar(
                                label: "RAM USAGE",
                                value: String(format: "%.1fG / %.0fG", ramUsedGb, ramTotalGb),
                                fraction: CGFloat(ramUsed / ramTotal),
                                color: AppColors.positive
                            )
                        }
                    }
                }

                PowerCommandControls(
                    deviceName: device.name,
                    commandInFlight: commandInFlight,
                    includeForceOff: false,
                    onCommand: onCommand
                )
            }
        }
    }

    private func statBar(label: String, value: String, fraction: CGFloat, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(AppColors.textSecondary)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(AppColors.surfaceMuted)
                    Capsule().fill(color).frame(width: geo.size.width * min(max(fraction, 0), 1))
                }
            }
            .frame(height: 6)
            Text(value)
                .font(.caption)
                .foregroundStyle(AppColors.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
