import SwiftUI

struct BillingView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var vm = BillingViewModel()
    @State private var awaitingExternalReturn = false
    @State private var checkoutDeviceAwaitingConfirmation: String?
    let initialDeviceId: String?

    init(initialDeviceId: String? = nil) {
        self.initialDeviceId = initialDeviceId
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.loading {
                    AppProgressState(label: "Loading device access…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let status = vm.status {
                    Form {
                        accessSection(status)
                        if let error = vm.error { errorSection(error) }
                        if !status.billingEnabled {
                            freeAccessSection
                        } else {
                            if status.is_lifetime != true { pricingSection(status) }
                            deviceSection(status)
                            if vm.selectedDevice != nil { paymentSection(status) }
                        }
                        if !vm.history.isEmpty {
                            historySection
                        }
                        if vm.portalAvailable { billingPortalSection }
                    }
                    .appFormBackground()
                } else {
                    AppEmptyState(
                        systemImage: "creditcard",
                        title: "Couldn’t load device access",
                        message: vm.error ?? "Check your connection and try again.",
                        actionTitle: "Retry",
                        action: { Task { await vm.load(initialDeviceId: initialDeviceId) } }
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .appScreenBackground()
            .navigationTitle("Device Unlocks")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                        .disabled(vm.startingCheckout || vm.openingPortal)
                }
            }
        }
        .task { await vm.load(initialDeviceId: initialDeviceId) }
        .refreshable { await vm.load(initialDeviceId: initialDeviceId) }
        .interactiveDismissDisabled(vm.startingCheckout || vm.openingPortal)
        .onChange(of: scenePhase) { phase in
            guard phase == .active else { return }
            let returnedFromExternalURL = awaitingExternalReturn
            awaitingExternalReturn = false
            let checkoutDeviceId = returnedFromExternalURL
                ? checkoutDeviceAwaitingConfirmation
                : nil
            checkoutDeviceAwaitingConfirmation = nil
            Task {
                if let checkoutDeviceId {
                    await vm.refreshAfterCheckout(
                        deviceId: checkoutDeviceId,
                        initialDeviceId: initialDeviceId
                    )
                } else {
                    await vm.load(initialDeviceId: initialDeviceId)
                }
            }
        }
    }

    private func errorSection(_ error: String) -> some View {
        Section {
            AppMessageBanner(message: error, role: .danger, announces: true)
        }
        .appListRow()
    }

    @ViewBuilder
    private func accessSection(_ status: BillingStatus) -> some View {
        let devices = status.devices ?? []
        Section("Current access") {
            if !status.billingEnabled {
                AppStatusBadge(text: "Free access", role: .positive)
                Text("All devices have full access while billing is off.")
                    .font(.subheadline)
                    .foregroundStyle(AppColors.textSecondary)
            } else {
                AppStatusBadge(
                    text: status.is_lifetime == true ? "Lifetime access" : "Per-device access",
                    role: status.is_lifetime == true ? .positive : .informational
                )
                Text(
                    status.is_lifetime == true
                        ? "All devices on this account remain unlocked."
                        : "\(devices.filter { $0.unlocked == true }.count) of \(devices.count) devices unlocked"
                )
                .font(.subheadline)
                .foregroundStyle(AppColors.textSecondary)
            }
        }
        .appListRow()
    }

    private var freeAccessSection: some View {
        Section {
            AppMessageBanner(
                message: "Billing is currently off. Every device can use remote controls without a trial limit or unlock purchase.",
                role: .positive,
                title: "Full device access"
            )
        }
        .appListRow()
    }

    @ViewBuilder
    private func pricingSection(_ status: BillingStatus) -> some View {
        let plan = status.plans?.first { $0.id == "device" }
        Section("One-time device unlock") {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(plan?.name ?? "Device Unlock") — $\(plan?.price ?? status.price ?? 15) per device")
                    .fontWeight(.semibold)
                Text("Pay once for the selected device. No subscription. Contact support before deleting a purchased device so its unlock can be transferred safely.")
                    .font(.caption)
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .appListRow()
    }

    @ViewBuilder
    private func deviceSection(_ status: BillingStatus) -> some View {
        let devices = status.devices ?? []
        if status.is_lifetime == true {
            Section {
                AppMessageBanner(
                    message: "Your legacy Lifetime access covers every device. No additional purchase is needed.",
                    role: .positive,
                    title: "Lifetime access"
                )
            }
            .appListRow()
        } else {
            Section("Choose a device") {
                if devices.isEmpty {
                    Text("Add a device before purchasing an unlock.")
                        .foregroundStyle(AppColors.textSecondary)
                } else {
                    ForEach(devices) { device in
                        Button {
                            vm.selectDevice(device.id)
                        } label: {
                            VStack(alignment: .leading, spacing: AppSpacing.small) {
                                HStack {
                                    Text(device.name)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(AppColors.textPrimary)
                                    Spacer()
                                    if vm.selectedDeviceId == device.id, device.unlocked != true {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(AppColors.action)
                                            .accessibilityLabel("Selected")
                                    }
                                }
                                AppStatusBadge(
                                    text: deviceStatus(device),
                                    role: deviceStatusRole(device)
                                )
                            }
                            .padding(.vertical, AppSpacing.xSmall)
                            .contentShape(Rectangle())
                        }
                        .disabled(!device.checkoutEligible)
                        .accessibilityAddTraits(
                            vm.selectedDeviceId == device.id && device.unlocked != true
                                ? .isSelected
                                : []
                        )
                    }

                    if devices.allSatisfy({ $0.unlocked == true }) {
                        Text("All of your devices are unlocked.").foregroundStyle(AppColors.textSecondary)
                    } else if devices.contains(where: { $0.legacyPaymentPending }) {
                        Text("A legacy payment is still under review. Contact support if it needs attention.")
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
            }
            .appListRow()
        }
    }

    @ViewBuilder
    private func paymentSection(_ status: BillingStatus) -> some View {
        if let device = vm.selectedDevice {
            let price = status.plans?.first { $0.id == "device" }?.price ?? status.price ?? 15
            Section("Secure checkout — $\(price) one time") {
                Text("Checkout for \(device.name) opens securely in your browser. Return here afterward and access will refresh automatically.")
                    .font(.subheadline)
                    .foregroundStyle(AppColors.textSecondary)
                Button {
                    Task {
                        if let url = await vm.startCheckout() {
                            openHostedURL(url, checkoutDeviceId: device.id)
                        }
                    }
                } label: {
                    Text(
                        vm.startingCheckout
                            ? "Opening checkout…"
                            : (device.polarCheckoutPending ? "Continue checkout" : "Pay now")
                    )
                }
                .buttonStyle(AppPrimaryButtonStyle())
                .disabled(vm.startingCheckout || vm.openingPortal)
                .accessibilityLabel(
                    vm.startingCheckout
                        ? "Opening checkout"
                        : (device.polarCheckoutPending ? "Continue checkout" : "Pay now")
                )
            }
            .appListRow()
        }
    }

    private var historySection: some View {
        Section("Purchase history") {
            ForEach(vm.history) { request in
                ViewThatFits(in: .horizontal) {
                    HStack {
                        purchaseDetails(request)
                        Spacer()
                        purchaseStatus(request)
                    }
                    VStack(alignment: .leading, spacing: AppSpacing.small) {
                        purchaseDetails(request)
                        purchaseStatus(request)
                    }
                }
            }
        }
        .appListRow()
    }

    private func purchaseDetails(_ request: PaymentRequestItem) -> some View {
        VStack(alignment: .leading) {
            Text(request.device_name ?? request.method ?? request.plan)
            if request.device_name != nil, let method = request.method {
                Text(method).font(.caption).foregroundStyle(AppColors.textSecondary)
            }
            Text(String(request.created_at.prefix(10)))
                .font(.caption)
                .foregroundStyle(AppColors.textSecondary)
        }
    }

    private func purchaseStatus(_ request: PaymentRequestItem) -> some View {
        AppStatusBadge(
            text: request.status.capitalized,
            role: paymentStatusRole(request.status)
        )
    }

    private var billingPortalSection: some View {
        Section("Receipts") {
            Button {
                Task {
                    if let url = await vm.openCustomerPortal() { openHostedURL(url) }
                }
            } label: {
                Text(vm.openingPortal ? "Opening…" : "Manage receipts")
            }
            .buttonStyle(AppSecondaryButtonStyle(fullWidth: false))
            .disabled(vm.openingPortal || vm.startingCheckout)
            .accessibilityLabel(vm.openingPortal ? "Opening receipts" : "Manage receipts")
        }
        .appListRow()
    }

    private func openHostedURL(_ url: URL, checkoutDeviceId: String? = nil) {
        awaitingExternalReturn = true
        checkoutDeviceAwaitingConfirmation = checkoutDeviceId
        openURL(url) { accepted in
            guard !accepted else { return }
            Task { @MainActor in
                awaitingExternalReturn = false
                checkoutDeviceAwaitingConfirmation = nil
                vm.externalURLFailed()
            }
        }
    }

    private func deviceStatus(_ device: BillingDevice) -> String {
        if device.unlocked == true { return "Unlocked — no expiration" }
        if device.polarCheckoutPending { return "Checkout pending — select to continue" }
        if device.legacyPaymentPending { return "Legacy payment under review" }
        if deviceTrialExpired(device) { return "Free trial ended" }
        if let end = device.trial_ends_at { return "Free trial ends \(String(end.prefix(10)))" }
        return "Ready to unlock"
    }

    private func deviceStatusRole(_ device: BillingDevice) -> AppStatusRole {
        if device.unlocked == true { return .positive }
        if device.pending == true { return .warning }
        if deviceTrialExpired(device) { return .warning }
        return .informational
    }

    private func deviceTrialExpired(_ device: BillingDevice) -> Bool {
        if let expired = device.trial_expired { return expired }
        guard let iso = device.trial_ends_at, let end = Date.fromISO(iso) else { return false }
        return end <= Date()
    }

    private func paymentStatusRole(_ status: String) -> AppStatusRole {
        switch status.lowercased() {
        case "approved", "paid", "succeeded", "completed": return .positive
        case "declined", "failed", "canceled", "cancelled", "refunded": return .danger
        default: return .warning
        }
    }
}
