import SwiftUI

struct BillingView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = BillingViewModel()
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
                        if status.is_lifetime != true { pricingSection(status) }
                        deviceSection(status)
                        if vm.selectedDevice != nil { paymentSection(status) }
                        if !vm.history.isEmpty { historySection }
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
        .overlay(alignment: .bottom) {
            if let msg = vm.message {
                Text(msg)
                    .font(.subheadline)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.bottom, 24)
                    .task(id: msg) {
                        try? await Task.sleep(nanoseconds: 2_500_000_000)
                        vm.message = nil
                    }
            }
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
                                } else if device.pending == true {
                                    Text("Pending").font(.caption.weight(.semibold)).foregroundStyle(.orange)
                                } else if vm.selectedDeviceId == device.id {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Color.accentColor)
                                } else {
                                    Text("Select").font(.caption.weight(.semibold))
                                }
                            }
                        }
                        .disabled(device.unlocked == true || device.pending == true)
                    }

                    if devices.allSatisfy({ $0.unlocked == true }) {
                        Text("All of your devices are unlocked.").foregroundStyle(.secondary)
                    } else if devices.allSatisfy({ $0.unlocked == true || $0.pending == true }) {
                        Text("Every locked device already has a payment under review.")
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
            Section("Unlock \(device.name) — $\(price) one time") {
                if let instructions = status.payment_instructions, !instructions.isEmpty {
                    Text(instructions).font(.subheadline)
                }
                TextField("Payment method (e.g. GCash, PayPal)", text: $vm.method)
                TextField("Reference / proof", text: $vm.reference)
                TextField("Note (optional)", text: $vm.note)
                if let error = vm.error {
                    Text(error).foregroundStyle(.red).font(.caption)
                }
                Button {
                    Task { await vm.submit() }
                } label: {
                    Text(vm.submitting ? "Submitting…" : "Submit for review")
                }
                .disabled(vm.submitting)
            }
        }
    }

    private var historySection: some View {
        Section("Payment history") {
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

    private func deviceStatus(_ device: BillingDevice) -> String {
        if device.unlocked == true { return "Unlocked — no expiration" }
        if device.pending == true { return "Payment under review" }
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
        switch status {
        case "approved": return .green
        case "declined": return .red
        default: return .orange
        }
    }
}
