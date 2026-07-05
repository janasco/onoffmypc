import SwiftUI

struct AddDeviceView: View {
    @ObservedObject var vm: DevicesViewModel
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var busy = false
    @State private var error: String?
    @State private var created: NewDevice?

    var body: some View {
        NavigationStack {
            Group {
                if let created {
                    TokenReveal(device: created)
                } else {
                    Form {
                        Section {
                            TextField("Device name", text: $name)
                                .autocorrectionDisabled()
                        } footer: {
                            Text("e.g. Home PC")
                        }
                        if let error {
                            Section { Text(error).foregroundStyle(.red).font(.footnote) }
                        }
                        Section {
                            Button {
                                Task { await create() }
                            } label: {
                                if busy { ProgressView() } else { Text("Create") }
                            }
                            .disabled(busy || name.trimmingCharacters(in: .whitespaces).isEmpty)
                        }
                    }
                }
            }
            .navigationTitle(created == nil ? "Add device" : "Device credentials")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(created == nil ? "Cancel" : "Done") { dismiss() }
                }
            }
        }
    }

    private func create() async {
        error = nil
        busy = true
        let result = await vm.addDevice(name.trimmingCharacters(in: .whitespaces), appState)
        busy = false
        if let result {
            created = result
        } else {
            // vm.addDevice set the toast; surface it here and clear it from the list.
            error = vm.toast ?? "Couldn't add device."
            vm.toast = nil
        }
    }
}
