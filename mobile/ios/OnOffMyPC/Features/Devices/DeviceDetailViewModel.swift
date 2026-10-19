import SwiftUI

@MainActor
final class DeviceDetailViewModel: ObservableObject {
    @Published var device: Device?
    @Published var online: Bool?
    @Published var lastSeenAt: String?
    @Published var latest: Telemetry?
    @Published var history: [HistoryPoint] = []
    @Published var commands: [Command] = []
    @Published var loading = true
    @Published var error: String?
    @Published var toast: String?
    @Published var newToken: NewDevice?
    @Published var showUpgrade = false
    @Published var unlockPrice = 15
    @Published var commandInFlight = false
    @Published var refreshWarning: String?

    func refreshBilling() async {
        guard let billing = try? await APIClient.shared.billingStatus() else { return }
        unlockPrice = billing.plans?.first { $0.id == "device" }?.price ?? billing.price ?? 15
    }

    func refresh(id: String, _ appState: AppState) async {
        if device == nil { loading = true }
        defer { loading = false }
        do {
            let fetchedDevice = try await APIClient.shared.device(id: id)
            device = fetchedDevice
            var partialFailure = false

            do {
                let status = try await APIClient.shared.deviceStatus(id: id)
                online = status.online
                lastSeenAt = status.last_seen_at ?? fetchedDevice.last_seen_at
            } catch APIError.unauthorized {
                appState.sessionExpired()
                return
            } catch {
                online = nil
                lastSeenAt = fetchedDevice.last_seen_at
                partialFailure = true
            }

            do {
                let telemetry = try await APIClient.shared.telemetry(id: id)
                latest = telemetry.first
            } catch APIError.unauthorized {
                appState.sessionExpired()
                return
            } catch {
                partialFailure = true
            }
            do {
                history = try await APIClient.shared.history(id: id, days: 7)
            } catch APIError.unauthorized {
                appState.sessionExpired()
                return
            } catch {
                partialFailure = true
            }
            do {
                commands = try await APIClient.shared.commands(id: id)
            } catch APIError.unauthorized {
                appState.sessionExpired()
                return
            } catch {
                partialFailure = true
            }
            refreshWarning = partialFailure ? "Some device information could not be refreshed." : nil
            error = nil
        } catch APIError.unauthorized {
            appState.sessionExpired()
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Failed to load device."
            if device != nil { refreshWarning = "Some device information could not be refreshed." }
        }
    }

    /// Refreshes every 30s until the view goes away (the .task is cancelled).
    func autoRefresh(id: String, _ appState: AppState) async {
        await refreshBilling()
        while !Task.isCancelled {
            await refresh(id: id, appState)
            try? await Task.sleep(nanoseconds: 30_000_000_000)
        }
    }

    func send(_ type: CommandType, id: String, _ appState: AppState) async {
        guard !commandInFlight else { return }
        commandInFlight = true
        defer { commandInFlight = false }
        do {
            let result = try await APIClient.shared.sendCommand(deviceId: id, type: type)
            toast = commandRequestFeedback(
                type,
                deviceName: device?.name ?? "this device",
                sentToDevice: result.delivered == true,
                reason: result.reason
            )
            await refresh(id: id, appState)
        } catch APIError.unauthorized {
            appState.sessionExpired()
        } catch APIError.trialExpired {
            showUpgrade = true
        } catch {
            toast = (error as? APIError)?.errorDescription ?? "Couldn't submit the command request."
        }
    }

    func rename(_ name: String, id: String, _ appState: AppState) async {
        let n = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !n.isEmpty else { return }
        do {
            device = try await APIClient.shared.renameDevice(id: id, name: n)
            toast = "Device renamed"
        } catch APIError.unauthorized {
            appState.sessionExpired()
        } catch {
            toast = (error as? APIError)?.errorDescription ?? "Couldn't rename the device."
        }
    }

    /// Returns true if deleted (so the screen can pop back).
    func delete(id: String, _ appState: AppState) async -> Bool {
        do {
            try await APIClient.shared.deleteDevice(id: id)
            return true
        } catch APIError.unauthorized {
            appState.sessionExpired()
            return false
        } catch {
            toast = (error as? APIError)?.errorDescription ?? "Couldn't delete the device."
            return false
        }
    }

    func replaceToken(id: String, _ appState: AppState) async {
        do {
            newToken = try await APIClient.shared.rotateToken(id: id)
        } catch APIError.unauthorized {
            appState.sessionExpired()
        } catch {
            toast = (error as? APIError)?.errorDescription ?? "Couldn't replace the token."
        }
    }
}
