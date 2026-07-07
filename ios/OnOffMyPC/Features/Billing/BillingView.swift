import SwiftUI

struct BillingView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = BillingViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.loading {
                    ProgressView()
                } else if let s = vm.status {
                    Form {
                        planSection(s)
                        unlockSection(s)
                        if let pending = s.pending_request {
                            Section {
                                Text("Payment is pending review (\(pending.status)). We'll unlock your account once it's verified.")
                                    .foregroundStyle(.orange)
                            }
                        } else if !(s.is_lifetime ?? false) {
                            paymentSection(s)
                        }
                        if !vm.history.isEmpty { historySection }
                    }
                } else {
                    Text(vm.error ?? "Couldn't load billing.").foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Plan & Billing")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .task { await vm.load() }
        .overlay(alignment: .bottom) {
            if let msg = vm.message {
                Text(msg).font(.subheadline)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.bottom, 24)
                    .task(id: msg) { try? await Task.sleep(nanoseconds: 2_500_000_000); vm.message = nil }
            }
        }
    }

    @ViewBuilder
    private func planSection(_ s: BillingStatus) -> some View {
        Section("Your plan") {
            HStack {
                Text("Current plan")
                Spacer()
                Text((s.is_lifetime ?? false) ? "Lifetime" : "Free Trial")
                    .foregroundStyle((s.is_lifetime ?? false) ? Color.green : Color.accentColor)
                    .fontWeight(.semibold)
            }
            Text(statusText(s))
                .font(.subheadline)
                .foregroundStyle((s.trial_expired ?? false) ? Color.red : Color.secondary)
            HStack {
                Text("Devices")
                Spacer()
                Text("\(s.device_count ?? 0) / \(s.device_limit.map(String.init) ?? "∞")")
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func unlockSection(_ s: BillingStatus) -> some View {
        let lifetime = s.plans?.first { $0.id == "lifetime" }
        Section("Unlock everything") {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(lifetime?.name ?? "Lifetime") — $\(lifetime?.price ?? s.price ?? 15) one-time")
                    .fontWeight(.semibold)
                Text(lifetime?.description ?? "Up to 5 devices · all features · one-time payment")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func paymentSection(_ s: BillingStatus) -> some View {
        if let instr = s.payment_instructions, !instr.isEmpty {
            Section("How to pay") { Text(instr).font(.subheadline) }
        }
        Section("Submit your payment") {
            TextField("Payment method (e.g. GCash, PayPal)", text: $vm.method)
            TextField("Reference / proof", text: $vm.reference)
            TextField("Note (optional)", text: $vm.note)
            if let error = vm.error { Text(error).foregroundStyle(.red).font(.caption) }
            Button {
                Task { await vm.submit() }
            } label: {
                Text(vm.submitting ? "Submitting…" : "Submit for review")
            }
            .disabled(vm.submitting)
        }
    }

    private var historySection: some View {
        Section("Payment history") {
            ForEach(vm.history) { r in
                HStack {
                    VStack(alignment: .leading) {
                        Text(r.method ?? r.plan)
                        Text(String(r.created_at.prefix(10))).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(r.status)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(statusColor(r.status))
                }
            }
        }
    }

    private func statusText(_ s: BillingStatus) -> String {
        if s.is_lifetime ?? false { return "All features unlocked — never expires." }
        if s.trial_expired ?? false { return "Your trial has ended. Pay $\(s.price ?? 15) once to keep controlling your devices." }
        if let ends = s.trial_ends_at { return "Free trial · ends \(String(ends.prefix(10)))" }
        return "You're on the free trial."
    }

    private func statusColor(_ status: String) -> Color {
        switch status { case "approved": return .green; case "declined": return .red; default: return .orange }
    }
}
