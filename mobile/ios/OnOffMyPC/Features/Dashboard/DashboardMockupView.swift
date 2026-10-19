import SwiftUI

/// Static visual reference for a possible fleet-overview dashboard, adapted from a
/// Stitch mockup. All figures below (uptime, IP, hardware load, secondary-device
/// stats, latency history) are placeholder — this product's telemetry model only
/// reports pcOn/roomTemp/roomHumidity/rssi today, not per-process hardware metrics.
/// Not wired to live data or navigation beyond this screen.
struct DashboardMockupView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab = 0
    @State private var firmwareNoticeDismissed = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.large) {
                    primaryWorkstationCard
                    secondaryDevicesCard
                    latencyCard
                    if !firmwareNoticeDismissed {
                        firmwareNoticeCard
                    }
                }
                .padding(.horizontal, AppSpacing.page)
                .padding(.top, AppSpacing.standard)
                .padding(.bottom, 48)
            }
            .appScreenBackground()
            .navigationTitle("OnOffMyPC")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) {
                mockBottomTabBar
            }
        }
    }

    private var primaryWorkstationCard: some View {
        AppSurface {
            VStack(alignment: .leading, spacing: AppSpacing.standard) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: AppSpacing.xSmall) {
                        Text("Primary Workstation")
                            .font(.title2.weight(.bold))
                        HStack(spacing: 6) {
                            Circle().fill(AppColors.positive).frame(width: 10, height: 10)
                            Text("Online • Up for 4d 12h")
                                .font(.footnote)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                    }
                    Spacer()
                    Text("IP: 192.168.1.142")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppColors.action)
                        .padding(.horizontal, AppSpacing.small)
                        .padding(.vertical, 4)
                        .background(AppColors.actionSoft, in: Capsule())
                }

                PowerCommandControls(deviceName: "Primary Workstation", commandInFlight: false) { _ in }

                Text("Placeholder figures — this product does not report per-process hardware load.")
                    .font(.caption2)
                    .foregroundStyle(AppColors.textSecondary)

                HStack(spacing: AppSpacing.medium) {
                    statBar(label: "CPU LOAD", value: "42% • Ryzen 9 5950X", fraction: 0.42, color: AppColors.action)
                    statBar(label: "GPU TEMP", value: "58°C • RTX 3080", fraction: 0.58, color: AppColors.informational)
                    statBar(label: "RAM USAGE", value: "15.4GB / 64GB", fraction: 0.24, color: AppColors.positive)
                }
            }
        }
    }

    private func statBar(label: String, value: String, fraction: CGFloat, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption2.weight(.semibold)).foregroundStyle(AppColors.textSecondary)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(AppColors.surfaceMuted)
                    Capsule().fill(color).frame(width: geo.size.width * fraction)
                }
            }
            .frame(height: 6)
            Text(value).font(.caption)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var secondaryDevicesCard: some View {
        AppSurface {
            VStack(alignment: .leading, spacing: AppSpacing.medium) {
                Text("Secondary Devices").font(.headline)
                secondaryDeviceRow(name: "Home-Media-Server", subtitle: "12.4TB Storage Free", systemImage: "server.rack")
                secondaryDeviceRow(name: "Render-Rig-4090", subtitle: "Rendering Task: 18%", systemImage: "cpu")
            }
        }
    }

    private func secondaryDeviceRow(name: String, subtitle: String, systemImage: String) -> some View {
        HStack {
            HStack(spacing: AppSpacing.medium) {
                Image(systemName: systemImage)
                    .foregroundStyle(AppColors.textSecondary)
                    .frame(width: 32, height: 32)
                    .background(AppColors.surfaceMuted, in: RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(name).font(.subheadline.weight(.semibold))
                    Text(subtitle).font(.caption).foregroundStyle(AppColors.textSecondary)
                }
            }
            Spacer()
            Circle().fill(AppColors.positive).frame(width: 8, height: 8)
        }
        .padding(AppSpacing.small)
        .background(AppColors.canvas, in: RoundedRectangle(cornerRadius: AppRadius.field, style: .continuous))
    }

    private var latencyHeights: [CGFloat] = [0.40, 0.50, 0.45, 0.60, 0.80, 0.70, 0.30, 0.40, 0.55, 0.90, 0.75, 0.60, 0.50, 0.40, 0.45]

    private var latencyCard: some View {
        AppSurface {
            VStack(alignment: .leading, spacing: AppSpacing.small) {
                HStack {
                    Text("24H Latency").font(.subheadline.weight(.semibold))
                    Spacer()
                    Text("Avg 12ms").font(.caption.weight(.semibold)).foregroundStyle(AppColors.action)
                }
                HStack(alignment: .bottom, spacing: 2) {
                    ForEach(Array(latencyHeights.enumerated()), id: \.offset) { _, fraction in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(AppColors.actionSoft)
                            .frame(height: 96 * fraction)
                            .frame(maxWidth: .infinity)
                    }
                }
                .frame(height: 96, alignment: .bottom)
                Text("Past 24 Hours Network Stability")
                    .font(.caption2)
                    .foregroundStyle(AppColors.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("24 hour latency chart, placeholder data, average 12 milliseconds")
    }

    private var firmwareNoticeCard: some View {
        AppSurface {
            VStack(alignment: .leading, spacing: AppSpacing.standard) {
                HStack(spacing: AppSpacing.medium) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .foregroundStyle(AppColors.informational)
                        .frame(width: 32, height: 32)
                        .background(AppColors.actionSoft, in: Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Firmware update available (v2.4.1)").font(.subheadline.weight(.semibold))
                        Text("Illustrative only — this build has no update-check backend yet.")
                            .font(.caption)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
                HStack(spacing: AppSpacing.small) {
                    Button("Dismiss") { firmwareNoticeDismissed = true }
                        .buttonStyle(AppSecondaryButtonStyle())
                    Button("Update Now") { firmwareNoticeDismissed = true }
                        .buttonStyle(AppPrimaryButtonStyle())
                }
            }
        }
    }

    private var mockBottomTabBar: some View {
        HStack {
            ForEach(Array(["Dashboard", "Setup", "Sensors", "Profile"].enumerated()), id: \.offset) { index, label in
                let icon = ["square.grid.2x2.fill", "gearshape.fill", "waveform.path.ecg", "person.fill"][index]
                Button {
                    selectedTab = index
                } label: {
                    VStack(spacing: 2) {
                        Image(systemName: icon)
                        Text(label).font(.caption2)
                    }
                    .foregroundStyle(selectedTab == index ? AppColors.action : AppColors.textSecondary)
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.vertical, AppSpacing.small)
        .background(.bar)
    }
}
