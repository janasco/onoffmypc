import SwiftUI
import Charts

struct DeviceDetailView: View {
    let device: Device
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = DeviceDetailViewModel()

    @State private var renameText = ""
    @State private var showDelete = false
    @State private var showReplace = false
    @State private var showBilling = false
    @State private var managementInFlight = false

    var body: some View {
        content
        .appScreenBackground()
        .navigationTitle(vm.device?.name ?? device.name)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { if renameText.isEmpty { renameText = device.name } }
        .task { await vm.autoRefresh(id: device.id, appState) }
        .overlay(alignment: .bottom) { toastView }
        .sheet(item: $vm.newToken) { token in
            NavigationStack {
                TokenReveal(device: token)
                    .navigationTitle("New device token")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("Done") { vm.newToken = nil }
                        }
                    }
            }
            .interactiveDismissDisabled()
        }
        .sheet(isPresented: $showBilling, onDismiss: {
            Task { await vm.refreshBilling() }
        }) { BillingView(initialDeviceId: device.id) }
        .alert("Device trial ended", isPresented: $vm.showUpgrade) {
            Button("Not now", role: .cancel) {}
            Button("Unlock device") { showBilling = true }
        } message: {
            Text("Unlock \(vm.device?.name ?? device.name) for $\(vm.unlockPrice) one time to continue controlling it.")
        }
        .alert("Delete device?", isPresented: $showDelete) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task { await deleteDevice() }
            }
        } message: {
            Text("\"\(vm.device?.name ?? device.name)\" will be removed permanently if it has no purchase or payment under review. Purchased access must be transferred through support before deletion.")
        }
        .confirmationDialog("Replace device token?", isPresented: $showReplace, titleVisibility: .visible) {
            Button("Generate new token") { Task { await replaceToken() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Use this if the ESP hardware was swapped or damaged. A new token is generated and the old one stops working.")
        }
    }

    @ViewBuilder
    private var content: some View {
        if vm.loading && vm.device == nil {
            AppProgressState(label: "Loading device details…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if vm.device == nil {
            AppEmptyState(
                systemImage: "wifi.exclamationmark",
                title: "Couldn’t load device",
                message: vm.error ?? "Check your connection and try again.",
                actionTitle: "Retry",
                action: { Task { await vm.refresh(id: device.id, appState) } }
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            List {
                if let warning = vm.refreshWarning {
                    Section {
                        AppMessageBanner(message: warning, role: .warning)
                        Button("Retry now") { Task { await vm.refresh(id: device.id, appState) } }
                            .font(.subheadline.weight(.semibold))
                    }
                    .appListRow()
                }
                statusSection
                telemetrySection
                controlsSection
                chartSection
                historySection
                manageSection
            }
            .appFormBackground()
            .refreshable { await vm.refresh(id: device.id, appState) }
        }
    }

    private var statusSection: some View {
        let current = vm.device ?? device
        let status = deviceStatusFromEndpoint(
            online: vm.online,
            lastSeenAt: vm.lastSeenAt ?? current.last_seen_at,
            pcOn: vm.latest?.pc_on ?? current.pc_on
        )
        return Section("Device status") {
            DeviceStatusSummary(presentation: status)
            if let version = current.firmware_version {
                LabeledContent("Firmware", value: version)
            }
        }
        .appListRow()
    }

    private var telemetrySection: some View {
        Section("Latest telemetry") {
            if let latest = vm.latest {
                if let temperature = latest.room_temp {
                    LabeledContent("Temperature", value: String(format: "%.1f°C", temperature))
                }
                if let humidity = latest.room_humidity {
                    LabeledContent("Humidity", value: String(format: "%.0f%%", humidity))
                }
                if let signal = latest.rssi {
                    LabeledContent("Signal", value: "\(signal) dBm")
                }
                LabeledContent("Recorded", value: telemetryAge(latest.recorded_at))
            } else {
                Text("No telemetry received yet.")
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .appListRow()
    }

    private var controlsSection: some View {
        Section("Controls") {
            PowerCommandControls(
                deviceName: vm.device?.name ?? device.name,
                commandInFlight: vm.commandInFlight
            ) { type in
                Task { await vm.send(type, id: device.id, appState) }
            }
        }
        .appListRow()
    }

    private var tempPoints: [(Int, Double)] {
        vm.history.enumerated().compactMap { index, point in
            point.temp_avg.map { (index, $0) }
        }
    }

    @ViewBuilder
    private var chartSection: some View {
        Section("Temperature — last 7 days") {
            if tempPoints.count >= 2 {
                Chart {
                    ForEach(tempPoints, id: \.0) { point in
                        LineMark(
                            x: .value("Point", point.0),
                            y: .value("°C", point.1)
                        )
                        .interpolationMethod(.catmullRom)
                        .foregroundStyle(AppColors.action)
                    }
                }
                .frame(height: 160)
                .accessibilityLabel("Temperature history for the last 7 days")
                .accessibilityValue(temperatureRangeAccessibility)
            } else {
                Text("Not enough telemetry yet to draw a temperature chart.")
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .appListRow()
    }

    private var historySection: some View {
        Section("Recent commands") {
            if vm.commands.isEmpty {
                Text("No commands yet.").foregroundStyle(AppColors.textSecondary)
            } else {
                ForEach(vm.commands, id: \.rowId) { command in
                    VStack(alignment: .leading, spacing: AppSpacing.small) {
                        Text(commandLabel(command.type))
                            .font(.subheadline.weight(.semibold))
                        AppStatusBadge(
                            text: commandStatusText(command.status),
                            role: commandStatusRole(command.status)
                        )
                    }
                    .padding(.vertical, AppSpacing.xSmall)
                }
            }
        }
        .appListRow()
    }

    private var manageSection: some View {
        Section("Manage") {
            if managementInFlight {
                AppInlineProgress(label: "Updating device…")
            }
            VStack(alignment: .leading, spacing: AppSpacing.small) {
                AppFieldLabel("Device name")
                TextField("Device name", text: $renameText)
                    .autocorrectionDisabled()
                    .textFieldStyle(AppTextFieldStyle())
                    .disabled(managementInFlight)
                Button("Rename") {
                    Task { await renameDevice() }
                }
                .buttonStyle(AppSecondaryButtonStyle(fullWidth: false))
                .disabled(
                    managementInFlight || renameText.trimmingCharacters(in: .whitespaces).isEmpty
                )
            }
            Button("Replace token") { showReplace = true }
                .disabled(managementInFlight)
            Button("Delete device", role: .destructive) { showDelete = true }
                .disabled(managementInFlight)
        }
        .appListRow()
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

    private var temperatureRangeAccessibility: String {
        let values = tempPoints.map { $0.1 }
        guard let minimum = values.min(), let maximum = values.max() else { return "No temperature data" }
        return String(format: "Minimum %.1f degrees Celsius, maximum %.1f degrees Celsius", minimum, maximum)
    }

    @MainActor
    private func renameDevice() async {
        guard !managementInFlight else { return }
        managementInFlight = true
        defer { managementInFlight = false }
        await vm.rename(renameText, id: device.id, appState)
    }

    @MainActor
    private func replaceToken() async {
        guard !managementInFlight else { return }
        managementInFlight = true
        defer { managementInFlight = false }
        await vm.replaceToken(id: device.id, appState)
    }

    @MainActor
    private func deleteDevice() async {
        guard !managementInFlight else { return }
        managementInFlight = true
        defer { managementInFlight = false }
        if await vm.delete(id: device.id, appState) { dismiss() }
    }

    private func telemetryAge(_ iso: String?) -> String {
        guard let iso, let date = Date.fromISO(iso) else { return "Time unavailable" }
        let seconds = Int(max(0, Date().timeIntervalSince(date)))
        switch seconds {
        case 0..<15: return "Just now"
        case 15..<60: return "\(seconds)s ago"
        case 60..<3_600: return "\(seconds / 60)m ago"
        case 3_600..<86_400: return "\(seconds / 3_600)h ago"
        default: return "\(seconds / 86_400)d ago"
        }
    }
}
