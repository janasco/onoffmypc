import SwiftUI

@MainActor
final class DevicesViewModel: ObservableObject {
    @Published var devices: [Device] = []
    @Published var billing: BillingStatus?
    @Published var loading = false
    @Published var error: String?
    @Published var toast: String?
    @Published var showUpgrade = false
    @Published var upgradeDeviceId: String?
    @Published var commandInFlightDeviceIds: Set<String> = []

    func load(_ appState: AppState) async {
        if devices.isEmpty { loading = true }
        error = nil
        defer { loading = false }
        do {
            devices = try await APIClient.shared.devices()
            billing = try? await APIClient.shared.billingStatus()
        } catch APIError.unauthorized {
            appState.sessionExpired()
        } catch {
            let message = (error as? APIError)?.errorDescription ?? "Couldn't load your devices."
            if devices.isEmpty {
                self.error = message
            } else {
                toast = "Couldn't refresh devices. Your existing information is still shown."
            }
        }
    }

    private func silentReload() async {
        if let d = try? await APIClient.shared.devices() { devices = d }
        await refreshBilling()
    }

    func refreshBilling() async {
        if let current = try? await APIClient.shared.billingStatus() {
            billing = current
        }
    }

    func send(_ type: CommandType, to device: Device, _ appState: AppState) async {
        guard !commandInFlightDeviceIds.contains(device.id) else { return }
        commandInFlightDeviceIds.insert(device.id)
        defer { commandInFlightDeviceIds.remove(device.id) }
        do {
            let result = try await APIClient.shared.sendCommand(deviceId: device.id, type: type)
            toast = commandRequestFeedback(
                type,
                deviceName: device.name,
                sentToDevice: result.delivered == true,
                reason: result.reason
            )
        } catch APIError.unauthorized {
            appState.sessionExpired()
        } catch APIError.trialExpired {
            upgradeDeviceId = device.id
            showUpgrade = true
        } catch {
            toast = (error as? APIError)?.errorDescription ?? "Couldn't submit the command request."
        }
    }

    /// Adds a device and returns it (token shown once) on success; nil on failure.
    func addDevice(_ name: String, _ appState: AppState) async -> NewDevice? {
        do {
            let created = try await APIClient.shared.addDevice(name: name)
            await silentReload()
            return created
        } catch APIError.unauthorized {
            appState.sessionExpired()
            return nil
        } catch {
            toast = (error as? APIError)?.errorDescription ?? "Couldn't add device."
            return nil
        }
    }
}
