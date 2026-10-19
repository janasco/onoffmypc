import Foundation
import SwiftUI

@MainActor
final class BillingViewModel: ObservableObject {
    @Published var loading = true
    @Published var status: BillingStatus?
    @Published var history: [PaymentRequestItem] = []
    @Published var selectedDeviceId: String?
    @Published var startingCheckout = false
    @Published var openingPortal = false
    @Published var error: String?

    func load(initialDeviceId: String? = nil) async {
        loading = true
        error = nil
        defer { loading = false }
        if let freshStatus = try? await APIClient.shared.billingStatus() {
            applyStatus(freshStatus, initialDeviceId: initialDeviceId)
        } else {
            status = nil
        }
        history = (try? await APIClient.shared.paymentHistory()) ?? []
        if status == nil { error = "Couldn't load billing." }
    }

    func refreshAfterCheckout(deviceId: String, initialDeviceId: String? = nil) async {
        loading = true
        error = nil
        for attempt in 0..<Self.checkoutRefreshAttempts {
            if Task.isCancelled { loading = false; return }
            if attempt > 0 {
                do { try await Task.sleep(nanoseconds: Self.checkoutRefreshDelay) }
                catch { loading = false; return }
            }

            if let freshStatus = try? await APIClient.shared.billingStatus() {
                applyStatus(freshStatus, initialDeviceId: initialDeviceId ?? deviceId)
                error = nil
                if let device = freshStatus.devices?.first(where: { $0.id == deviceId }),
                   device.unlocked == true {
                    break
                }
                if freshStatus.devices?.contains(where: { $0.id == deviceId }) == false { break }
            } else if attempt == Self.checkoutRefreshAttempts - 1 {
                error = "Couldn't refresh billing."
            }
            loading = false
        }
        history = (try? await APIClient.shared.paymentHistory()) ?? history
        loading = false
    }

    var selectedDevice: BillingDevice? {
        status?.devices?.first {
            $0.id == selectedDeviceId && $0.checkoutEligible
        }
    }

    var portalAvailable: Bool {
        status?.portal_available == true || history.contains {
            $0.provider?.lowercased() == "polar" || $0.method?.lowercased() == "polar"
        }
    }

    func selectDevice(_ id: String) {
        guard let device = status?.devices?.first(where: { $0.id == id }),
              device.checkoutEligible else {
            if status?.devices?.first(where: { $0.id == id })?.legacyPaymentPending == true {
                error = "This device still has a legacy payment under review. Contact support if it needs attention."
            }
            return
        }
        selectedDeviceId = device.id
        error = nil
    }

    func startCheckout() async -> URL? {
        guard let device = selectedDevice else {
            error = "Choose a device to unlock."
            return nil
        }
        error = nil
        startingCheckout = true
        defer { startingCheckout = false }
        do {
            let checkout = try await APIClient.shared.createCheckout(deviceId: device.id)
            guard let url = secureHostedURL(checkout.url) else {
                error = "The server returned an invalid checkout link."
                return nil
            }
            return url
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Couldn't start checkout."
            return nil
        }
    }

    func openCustomerPortal() async -> URL? {
        error = nil
        openingPortal = true
        defer { openingPortal = false }
        do {
            let portal = try await APIClient.shared.customerPortal()
            guard let url = secureHostedURL(portal.url) else {
                error = "The server returned an invalid billing link."
                return nil
            }
            return url
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Couldn't open billing."
            return nil
        }
    }

    func externalURLFailed() {
        error = "No browser is available to open this secure link."
    }

    private func secureHostedURL(_ value: String) -> URL? {
        // Mirrors the backend allowlist: privileged checkout and portal URLs
        // must be HTTPS pages hosted by Polar, never an arbitrary redirect.
        guard let url = URL(string: value) else { return nil }
        let host = (url.host ?? "").lowercased().trimmingCharacters(in: CharacterSet(charactersIn: "."))
        guard url.scheme?.lowercased() == "https",
              (host == "polar.sh" || host.hasSuffix(".polar.sh")),
              url.user == nil,
              url.password == nil else { return nil }
        return url
    }

    private func applyStatus(_ value: BillingStatus, initialDeviceId: String?) {
        status = value
        // Pending Polar checkouts remain selectable so the server can return
        // the existing hosted checkout (reused=true).
        let eligible = value.devices?.filter(\.checkoutEligible) ?? []
        let preferred = initialDeviceId ?? selectedDeviceId
        selectedDeviceId = eligible.first { $0.id == preferred }?.id ?? eligible.first?.id
    }

    private static let checkoutRefreshAttempts = 5
    private static let checkoutRefreshDelay: UInt64 = 1_500_000_000
}
