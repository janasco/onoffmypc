import SwiftUI
import Charts

struct DeviceDetailView: View {
    let device: Device
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = DeviceDetailViewModel()

    var body: some View {
        List {
            statsSection
            controlsSection
            chartSection
            historySection
        }
        .navigationTitle(vm.device?.name ?? device.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.autoRefresh(id: device.id, appState) }
        .overlay(alignment: .bottom) { toastView }
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
            HStack(spacing: 8) {
                commandButton(.powerOn, .green)
                commandButton(.powerOff, .red)
                commandButton(.powerOffForce, .red)
                commandButton(.reset, .orange)
            }
        }
    }

    private func commandButton(_ type: CommandType, _ tint: Color) -> some View {
        Button(type.label) {
            Task { await vm.send(type, id: device.id, appState) }
        }
        .buttonStyle(.bordered)
        .tint(tint)
        .controlSize(.small)
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
                    HStack {
                        Text(commandLabel(command.type))
                        Spacer()
                        Text(command.status ?? "—")
                            .font(.caption)
                            .foregroundStyle(.secondary)
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
