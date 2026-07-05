import SwiftUI

struct DevicesView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = DevicesViewModel()

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Your Devices")
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        AppLogo(size: 26)
                    }
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Menu {
                            Button(role: .destructive) {
                                appState.signOut()
                            } label: {
                                Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
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
                Text("Add a device from the web dashboard.").foregroundStyle(.secondary)
            }
            .padding()
        } else {
            List(vm.devices) { device in
                DeviceRow(device: device) { type in
                    Task { await vm.send(type, to: device, appState) }
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

private struct DeviceRow: View {
    let device: Device
    let onCommand: (CommandType) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(device.name).font(.headline)
                Spacer()
                Text(device.isOnline ? "Online" : "Offline")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(device.isOnline ? Color.green : Color.secondary)
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
