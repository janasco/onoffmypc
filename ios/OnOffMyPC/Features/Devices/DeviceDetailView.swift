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

    var body: some View {
        content
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
                Task { if await vm.delete(id: device.id, appState) { dismiss() } }
            }
        } message: {
            Text("\"\(vm.device?.name ?? device.name)\" will be removed permanently if it has no purchase or payment under review. Purchased access must be transferred through support before deletion.")
        }
        .confirmationDialog("Replace device token?", isPresented: $showReplace, titleVisibility: .visible) {
            Button("Generate new token") { Task { await vm.replaceToken(id: device.id, appState) } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Use this if the ESP hardware was swapped or damaged. A new token is generated and the old one stops working.")
        }
    }

    @ViewBuilder
    private var content: some View {
        if vm.loading && vm.device == nil {
            ProgressView("Loading device details…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityLabel("Loading device details")
        } else if vm.device == nil {
            VStack(spacing: 10) {
                Image(systemName: "wifi.exclamationmark")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
                    .accessibilityHidden(true)
                Text("Couldn't load device").font(.headline)
                Text(vm.error ?? "Check your connection and try again.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button("Retry") { Task { await vm.refresh(id: device.id, appState) } }
            }
            .padding()
        } else {
            List {
                if let warning = vm.refreshWarning {
                    Section {
                        Label(warning, systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.orange)
                        Button("Retry now") { Task { await vm.refresh(id: device.id, appState) } }
                    }
                }
                statusSection
                telemetrySection
                controlsSection
                chartSection
                historySection
                manageSection
            }
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
                    .foregroundStyle(.secondary)
            }
        }
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
                    }
                }
                .frame(height: 160)
                .accessibilityLabel("Temperature history for the last 7 days")
                .accessibilityValue(temperatureRangeAccessibility)
            } else {
                Text("Not enough telemetry yet to draw a temperature chart.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var historySection: some View {
        Section("Recent commands") {
            if vm.commands.isEmpty {
                Text("No commands yet.").foregroundStyle(.secondary)
            } else {
                ForEach(vm.commands, id: \.rowId) { command in
                    VStack(alignment: .leading, spacing: 3) {
                        Text(commandLabel(command.type))
                        Text(commandStatusText(command.status))
                            .font(.caption)
                            .foregroundStyle(commandStatusColor(command.status))
                    }
                }
            }
        }
    }

    private var manageSection: some View {
        Section("Manage") {
            HStack {
                TextField("Device name", text: $renameText)
                    .autocorrectionDisabled()
                Button("Rename") {
                    Task { await vm.rename(renameText, id: device.id, appState) }
                }
                .disabled(renameText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            Button("Replace token") { showReplace = true }
            Button("Delete device", role: .destructive) { showDelete = true }
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
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(toast)
                .accessibilityAddTraits(.updatesFrequently)
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
