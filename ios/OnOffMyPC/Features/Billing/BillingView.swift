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
                    ProgressView()
                } else if let status = vm.status {
                    Form {
                        accessSection(status)
                        if let error = vm.error { errorSection(error) }
                        if status.is_lifetime != true { pricingSection(status) }
                        deviceSection(status)
                        if vm.selectedDevice != nil { paymentSection(status) }
                        if !vm.history.isEmpty {
                            historySection
                        }
                        if vm.portalAvailable { billingPortalSection }
                    }
                } else {
                    Text(vm.error ?? "Couldn't load billing.")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Device Unlocks")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .task { await vm.load(initialDeviceId: initialDeviceId) }
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
            Text(error).foregroundStyle(.red).font(.caption)
        }
    }

    @ViewBuilder
    private func accessSection(_ status: BillingStatus) -> some View {
        let devices = status.devices ?? []
        Section("Current access") {
            LabeledContent(
                "Access model",
                value: status.is_lifetime == true ? "Lifetime (legacy)" : "Per device"
            )
            Text(
                status.is_lifetime == true
                    ? "All devices on this account remain unlocked."
                    : "\(devices.filter { $0.unlocked == true }.count) of \(devices.count) devices unlocked"
            )
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
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
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func deviceSection(_ status: BillingStatus) -> some View {
        let devices = status.devices ?? []
        if status.is_lifetime == true {
            Section {
                Label(
                    "Your legacy Lifetime access covers every device. No additional purchase is needed.",
                    systemImage: "checkmark.seal.fill"
                )
                .foregroundStyle(.green)
            }
        } else {
            Section("Choose a device") {
                if devices.isEmpty {
                    Text("Add a device before purchasing an unlock.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(devices) { device in
                        Button {
                            vm.selectDevice(device.id)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(device.name)
                                        .foregroundStyle(.primary)
                                    Text(deviceStatus(device))
                                        .font(.caption)
                                        .foregroundStyle(deviceStatusColor(device))
                                }
                                Spacer()
                                if device.unlocked == true {
                                    Image(systemName: "checkmark.seal.fill").foregroundStyle(.green)
                                } else if device.legacyPaymentPending {
                                    Text("Under review")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(.orange)
                                } else if vm.selectedDeviceId == device.id {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Color.accentColor)
                                } else {
                                    Text(device.polarCheckoutPending ? "Continue" : "Select")
                                        .font(.caption.weight(.semibold))
                                }
                            }
                        }
                        .disabled(!device.checkoutEligible)
                    }

                    if devices.allSatisfy({ $0.unlocked == true }) {
                        Text("All of your devices are unlocked.").foregroundStyle(.secondary)
                    } else if devices.contains(where: { $0.legacyPaymentPending }) {
                        Text("A legacy payment is still under review. Contact support if it needs attention.")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func paymentSection(_ status: BillingStatus) -> some View {
        if let device = vm.selectedDevice {
            let price = status.plans?.first { $0.id == "device" }?.price ?? status.price ?? 15
            Section("Secure checkout — $\(price) one time") {
                Text("Checkout for \(device.name) opens securely in your browser. Return here afterward and access will refresh automatically.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
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
                .disabled(vm.startingCheckout || vm.openingPortal)
            }
        }
    }

    private var historySection: some View {
        Section("Purchase history") {
            ForEach(vm.history) { request in
                HStack {
                    VStack(alignment: .leading) {
                        Text(request.device_name ?? request.method ?? request.plan)
                        if request.device_name != nil, let method = request.method {
                            Text(method).font(.caption).foregroundStyle(.secondary)
                        }
                        Text(String(request.created_at.prefix(10)))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(request.status)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(statusColor(request.status))
                }
            }
        }
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
            .disabled(vm.openingPortal || vm.startingCheckout)
        }
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

    private func deviceStatusColor(_ device: BillingDevice) -> Color {
        if device.unlocked == true { return .green }
        if device.pending == true { return .orange }
        if deviceTrialExpired(device) { return .red }
        return .secondary
    }

    private func deviceTrialExpired(_ device: BillingDevice) -> Bool {
        if let expired = device.trial_expired { return expired }
        guard let iso = device.trial_ends_at, let end = Date.fromISO(iso) else { return false }
        return end <= Date()
    }

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "approved", "paid", "succeeded", "completed": return .green
        case "declined", "failed", "canceled", "cancelled", "refunded": return .red
        default: return .orange
        }
    }
}
