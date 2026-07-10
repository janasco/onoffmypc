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
        List {
            statsSection
            controlsSection
            chartSection
            historySection
            manageSection
        }
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

    private var statsSection: some View {
        Section {
            LabeledContent("PC state", value: pcText)
            LabeledContent("Status", value: vm.online ? "Online" : "Offline")
            if let t = vm.latest?.room_temp {
                LabeledContent("Temperature", value: String(format: "%.1f°C", t))
            }
            if let h = vm.latest?.room_humidity {
                LabeledContent("Humidity", value: String(format: "%.0f%%", h))
            }
            if let r = vm.latest?.rssi {
                LabeledContent("Signal", value: "\(r) dBm")
            }
            LabeledContent("Last update", value: Date.ago(vm.latest?.recorded_at))
        }
    }

    private var pcText: String {
        switch vm.latest?.pc_on {
        case 1: return "On"
        case 0: return "Off"
        default: return "—"
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
        if tempPoints.count >= 2 {
            Section("Temperature — last 7 days") {
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
                .task(id: toast) {
                    try? await Task.sleep(nanoseconds: 2_500_000_000)
                    vm.toast = nil
                }
        }
    }
}
