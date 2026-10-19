import SwiftUI

struct AddDeviceView: View {
    @ObservedObject var vm: DevicesViewModel
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var busy = false
    @State private var error: String?
    @State private var created: NewDevice?
    @FocusState private var nameFocused: Bool

    var body: some View {
        NavigationStack {
            Group {
                if let created {
                    TokenReveal(device: created)
                } else {
                    Form {
                        Section {
                            AppMessageBanner(
                                message: "Give this controller a name you’ll recognize in command confirmations.",
                                role: .informational,
                                title: "Name your device"
                            )
                        }
                        .appListRow()

                        Section {
                            TextField("Device name", text: $name)
                                .autocorrectionDisabled()
                                .submitLabel(.done)
                                .focused($nameFocused)
                                .onSubmit {
                                    guard !busy, !name.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                                    Task { await create() }
                                }
                                .textFieldStyle(AppTextFieldStyle())
                                .disabled(busy)
                        } footer: {
                            Text("e.g. Home PC")
                        }
                        .appListRow()

                        if let error {
                            Section {
                                AppMessageBanner(message: error, role: .danger, announces: true)
                            }
                            .appListRow()
                        }

                        Section {
                            Button {
                                Task { await create() }
                            } label: {
                                if busy {
                                    ProgressView()
                                        .tint(AppColors.actionOnColor)
                                        .frame(maxWidth: .infinity)
                                } else {
                                    Text("Create device")
                                }
                            }
                            .buttonStyle(AppPrimaryButtonStyle())
                            .disabled(busy || name.trimmingCharacters(in: .whitespaces).isEmpty)
                            .accessibilityLabel(busy ? "Creating device…" : "Create device")
                        }
                        .appListRow()
                    }
                    .appFormBackground()
                }
            }
            .appScreenBackground()
            .navigationTitle(created == nil ? "Add device" : "Device credentials")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(created == nil ? "Cancel" : "Done") { dismiss() }
                        .disabled(busy)
                }
            }
        }
        .interactiveDismissDisabled(busy || created != nil)
        .onAppear { nameFocused = created == nil }
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
