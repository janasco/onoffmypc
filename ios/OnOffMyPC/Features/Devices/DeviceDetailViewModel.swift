import SwiftUI

@MainActor
final class DeviceDetailViewModel: ObservableObject {
    @Published var device: Device?
    @Published var online = false
    @Published var latest: Telemetry?
    @Published var history: [HistoryPoint] = []
    @Published var commands: [Command] = []
    @Published var loading = true
    @Published var error: String?
    @Published var toast: String?
    @Published var newToken: NewDevice?
    @Published var showUpgrade = false
    @Published var unlockPrice = 15

    func refreshBilling() async {
        guard let billing = try? await APIClient.shared.billingStatus() else { return }
        unlockPrice = billing.plans?.first { $0.id == "device" }?.price ?? billing.price ?? 15
    }

    func refresh(id: String, _ appState: AppState) async {
        do {
            device = try await APIClient.shared.device(id: id)
            online = (try? await APIClient.shared.deviceStatus(id: id))?.online ?? false
            latest = (try? await APIClient.shared.telemetry(id: id))?.first
            if let h = try? await APIClient.shared.history(id: id, days: 7) { history = h }
            if let c = try? await APIClient.shared.commands(id: id) { commands = c }
            error = nil
            loading = false
        } catch APIError.unauthorized {
            appState.sessionExpired()
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Failed to load device."
            loading = false
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
        do {
            let result = try await APIClient.shared.sendCommand(deviceId: id, type: type)
            toast = (result.delivered == true) ? "\(type.label) sent" : "\(type.label): device offline"
            await refresh(id: id, appState)
        } catch APIError.unauthorized {
            appState.sessionExpired()
        } catch APIError.trialExpired {
            showUpgrade = true
        } catch {
            toast = (error as? APIError)?.errorDescription ?? "Command failed."
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
