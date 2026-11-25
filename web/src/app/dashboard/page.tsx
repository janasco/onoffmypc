"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { AppHeader } from "@/components/app-header";
import { PlatformPageHeader } from "@/components/platform-page-header";
import { ConnectionPill } from "@/components/connection-pill";
import { getPlatformInfo } from "@/lib/platform";
import { toChartPoints, type TelemetrySample } from "@/lib/telemetry";
import { commandProgress, progressFromSendResult } from "@/lib/commandLifecycle";
import { describeConnection, describePcState } from "@/lib/freshness";

interface Device {
  id: string;
  name: string;
  pc_on: number | null;
  last_seen_at: string | null;
  firmware_version: string | null;
  cpu_load: number | null;
  ram_used_mb: number | null;
  ram_total_mb: number | null;
  gpu_temp: number | null;
  telemetry_cpu: number;
  telemetry_ram: number;
  telemetry_gpu: number;
  telemetry_wifi: number;
  /** Observation time for pc_on and the hardware metrics. */
  telemetry_at: string | null;
  last_command_id: string | null;
  last_command_type: string | null;
  last_command_status: string | null;
  last_command_at: string | null;
  last_command_expires_at: string | null;
}

interface AccountInfo {
  id: string;
  email: string;
  email_verified: boolean;
}

/** Returned by `POST /devices` — the device token is shown only once. */
interface CreatedDevice {
  id: string;
  token: string;
}

interface PairCode {
  code: string;
  expires_at: string;
}

/** Latest telemetry snapshot from `GET /telemetry/:id`. */
interface TelemetryPoint {
  room_temp?: number | null;
  room_humidity?: number | null;
  rssi?: number | null;
}

interface ScheduledCommand {
  id: string;
  type: string;
  run_at: string;
  expires_at: string | null;
  status: string;
  created_at?: string;
}

interface CommandRecord {
  id: string;
  type: string;
  status: string;
  delivery_state?: string | null;
  delivered?: boolean;
  created_at: string;
  delivered_at?: string | null;
  expires_at?: string | null;
  ack_result?: string | null;
  ack_reason?: string | null;
  state_confirmed_at?: string | null;
  seq?: number | null;
}

/**
 * `POST /commands/:deviceId`. `delivered` means the frame was written to the
 * device socket — not that the device acknowledged it, and not that the PC
 * changed state. Prefer `status` / `delivery_state`.
 */
interface CommandResult {
  id?: string;
  status?: string | null;
  delivery_state?: string | null;
  expires_at?: string | null;
  delivered: boolean;
  replayed?: boolean;
  reason?: string;
}

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground shadow-sm placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card md:text-sm";

const FIELD_LABEL_CLASS = "type-label text-foreground";

const OUTLINE_ACTION_CLASS =
  "min-h-11 border-border bg-card text-foreground hover:bg-muted";

const COMMAND_TONE_CLASS: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-muted text-muted-foreground",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-muted text-muted-foreground",
};

export default function DashboardPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  // Modals state
  const [addOpen, setAddOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{ id: string; token: string; code?: string } | null>(null);

  const [pairOpen, setPairOpen] = useState(false);
  const [pairCodeInfo, setPairCodeInfo] = useState<{ code: string; expires_at: string } | null>(null);

  // Telemetry settings state
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [selectedDeviceForTelemetry, setSelectedDeviceForTelemetry] = useState<Device | null>(null);
  const [telemetryCpu, setTelemetryCpu] = useState(true);
  const [telemetryRam, setTelemetryRam] = useState(true);
  const [telemetryGpu, setTelemetryGpu] = useState(true);
  const [telemetryWifi, setTelemetryWifi] = useState(true);

  // Onboarding state
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkInFlight, setBulkInFlight] = useState(false);

  // Notification & transient command states
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [commandInFlight, setCommandInFlight] = useState<Record<string, boolean>>({});

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => {
        if (curr && curr.message === message) return null;
        return curr;
      });
    }, 4500);
  };

  // Device detail dialog state
  const [detailDevice, setDetailDevice] = useState<Device | null>(null);
  const [detailHistory, setDetailHistory] = useState<TelemetrySample[]>([]);
  const [detailCommands, setDetailCommands] = useState<CommandRecord[]>([]);
  const [detailTelemetry, setDetailTelemetry] = useState<TelemetryPoint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSchedules, setDetailSchedules] = useState<ScheduledCommand[]>([]);
  const [scheduleType, setScheduleType] = useState("power_on");
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const handleOpenDeviceDetail = async (device: Device) => {
    setDetailDevice(device);
    setDetailLoading(true);
    setDetailHistory([]);
    setDetailCommands([]);
    setDetailTelemetry(null);
    setDetailSchedules([]);
    setScheduleError(null);
    setScheduleAt("");
    try {
      const [historyRes, commandsRes, telemetryRes, schedulesRes] = await Promise.all([
        api.history<TelemetrySample[]>(device.id, 7),
        api.commands<CommandRecord[]>(device.id),
        api.telemetry<TelemetryPoint>(device.id),
        api.schedules<ScheduledCommand[]>(device.id),
      ]);
      setDetailHistory(historyRes.data || []);
      setDetailCommands(commandsRes.data || []);
      setDetailSchedules(schedulesRes.data || []);
      if (telemetryRes.data && Array.isArray(telemetryRes.data) && telemetryRes.data.length > 0) {
        setDetailTelemetry(telemetryRes.data[0]);
      }
    } catch (error) {
      console.error("Failed to load device details:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleScheduleCommand = async () => {
    if (!detailDevice) return;
    const runAt = new Date(scheduleAt);
    if (!scheduleAt || Number.isNaN(runAt.getTime())) {
      setScheduleError("Pick a date and time.");
      return;
    }
    if (runAt.getTime() <= Date.now()) {
      setScheduleError("Pick a time in the future.");
      return;
    }
    setScheduleBusy(true);
    setScheduleError(null);
    const { data, error } = await api.schedule<ScheduledCommand>(
      detailDevice.id,
      scheduleType,
      runAt.toISOString(),
      crypto.randomUUID(),
    );
    if (error) {
      setScheduleError(error);
    } else if (data) {
      setDetailSchedules((prev) => [...prev, data].sort((a, b) => a.run_at.localeCompare(b.run_at)));
      setScheduleAt("");
    }
    setScheduleBusy(false);
  };

  const handleCancelSchedule = async (id: string) => {
    if (!detailDevice) return;
    setScheduleBusy(true);
    setScheduleError(null);
    const { error } = await api.cancelSchedule(detailDevice.id, id);
    if (error) setScheduleError(error);
    else setDetailSchedules((prev) => prev.filter((item) => item.id !== id));
    setScheduleBusy(false);
  };

  const handleOpenTelemetrySettings = (device: Device) => {
    setSelectedDeviceForTelemetry(device);
    setTelemetryCpu(device.telemetry_cpu !== 0);
    setTelemetryRam(device.telemetry_ram !== 0);
    setTelemetryGpu(device.telemetry_gpu !== 0);
    setTelemetryWifi(device.telemetry_wifi !== 0);
    setTelemetryOpen(true);
  };

  const handleSaveTelemetrySettings = async () => {
    if (!selectedDeviceForTelemetry) return;
    const { data } = await api.updateTelemetrySettings(selectedDeviceForTelemetry.id, {
      telemetry_cpu: telemetryCpu,
      telemetry_ram: telemetryRam,
      telemetry_gpu: telemetryGpu,
      telemetry_wifi: telemetryWifi,
    });
    if (data) {
      setTelemetryOpen(false);
      loadData(true);
    }
  };

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const [meRes, devRes] = await Promise.all([
      api.me<AccountInfo>(),
      api.devices<Device[]>(),
    ]);

    if (meRes.status === 401) {
      router.push("/login");
      return;
    }

    if (meRes.data) setAccount(meRes.data);
    if (devRes.data && Array.isArray(devRes.data)) {
      setDevices(devRes.data);
      setOffline(false);
    } else if (devRes.error === "network error") {
      setOffline(true);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName) return;
    const { data } = await api.addDevice<CreatedDevice>(newDeviceName);
    if (data) {
      // Fetch pairing code immediately
      const codeRes = await api.pairCode<{ code?: string }>(data.id);
      setCreatedCredentials({
        id: data.id,
        token: data.token,
        code: codeRes.data?.code,
      });
      setNewDeviceName("");
      loadData(true);
    }
  };

  const handleGetPairCode = async (id: string) => {
    const { data } = await api.pairCode<PairCode>(id);
    if (data) {
      setPairCodeInfo(data);
      setPairOpen(true);
    }
  };

  const handleRotateToken = async (id: string) => {
    if (!confirm("Are you sure you want to replace this device's token? Pre-paired firmware will stop connecting until updated with the new token.")) return;
    const { data } = await api.rotateToken<{ token: string }>(id);
    if (data) {
      alert(`New token generated:\n${data.token}\n\nUpdate your firmware configuration.`);
      loadData(true);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this device? This will permanently delete its settings and history.")) return;
    const { data } = await api.deleteDevice(id);
    if (data) {
      loadData(true);
    }
  };

  const actionLabel = (type: string) =>
    type === "power_on" ? "Power On" :
    type === "power_off" ? "Power Off" :
    type === "power_off_force" ? "Force Off" :
    type === "reset" ? "Reset" :
    type === "sleep" ? "Sleep" :
    type === "lock" ? "Lock" :
    type === "logout" ? "Log Out" : type;

  const handleSendCommand = async (deviceId: string, type: string) => {
    if (commandInFlight[deviceId]) return;
    setCommandInFlight((prev) => ({ ...prev, [deviceId]: true }));
    try {
      // A stable per-attempt key makes retries safe: the server dedupes on
      // (device_id, client_request_id) and replays the same command instead of
      // performing the physical action twice.
      const res = await api.sendCommand<CommandResult>(deviceId, type, crypto.randomUUID());
      const device = devices.find((d) => d.id === deviceId);
      const name = device?.name ?? "Device";

      if (res.error) {
        // A timeout is ambiguous: the request may have queued before the
        // connection dropped, so do not invite a blind retry.
        showToast(
          `${actionLabel(type)} for ${name}: ${res.error}. Check the device before retrying — the request may already have been queued.`,
          "error",
        );
      } else {
        const progress = progressFromSendResult(res.data ?? { delivered: false });
        const message = `${actionLabel(type)} for ${name}: ${progress.label}. ${progress.detail}`;
        showToast(message, progress.tone === "danger" ? "error" : progress.tone === "warning" ? "info" : "info");
        loadData(true);
      }
    } catch (err: unknown) {
      showToast(
        err instanceof Error
          ? `${actionLabel(type)} failed: ${err.message}. Check the device before retrying.`
          : `${actionLabel(type)} failed. Check the device before retrying.`,
        "error",
      );
    } finally {
      setCommandInFlight((prev) => ({ ...prev, [deviceId]: false }));
    }
  };

  // Physical actions with data-loss risk get an explicit, device-specific
  // confirmation instead of firing on a single click.
  const CONFIRM_TYPES = new Set(["power_off", "power_off_force", "reset"]);
  const handlePowerAction = (device: Device, type: string) => {
    if (commandInFlight[device.id]) return;
    if (!CONFIRM_TYPES.has(type)) {
      void handleSendCommand(device.id, type);
      return;
    }
    const consequence =
      type === "reset"
        ? "The PC will restart immediately and unsaved work will be lost."
        : type === "power_off_force"
          ? "This holds the power button for 6 seconds. Power may be cut immediately and unsaved work will be lost. Use it only when a normal Power Off does not work."
          : "The PC will begin shutting down and unsaved work may be lost.";
    if (confirm(`${actionLabel(type)} “${device.name}”?\n\n${consequence}`)) {
      void handleSendCommand(device.id, type);
    }
  };

  const toggleSelectDevice = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkCommand = async (type: string) => {
    if (selectedIds.length === 0 || bulkInFlight) return;

    // Never stack a bulk send on top of a single command already in flight for
    // the same device.
    const targets = selectedIds.filter((id) => !commandInFlight[id]);
    const skipped = selectedIds.length - targets.length;
    if (targets.length === 0) {
      showToast("Every selected device already has a command in flight.", "info");
      return;
    }
    if (!confirm(`${actionLabel(type)} for ${targets.length} device(s)?\n\nThis sends a physical action to each selected device.`)) return;

    setBulkInFlight(true);
    setCommandInFlight((prev) => {
      const next = { ...prev };
      for (const id of targets) next[id] = true;
      return next;
    });

    let queued = 0;
    let sent = 0;
    let failed = 0;
    for (const id of targets) {
      try {
        const res = await api.sendCommand<CommandResult>(id, type, crypto.randomUUID());
        if (res.error) {
          failed++;
        } else {
          const progress = progressFromSendResult(res.data ?? { delivered: false });
          if (progress.stage === "queued") queued++;
          else sent++;
        }
      } catch {
        failed++;
      }
    }

    setCommandInFlight((prev) => {
      const next = { ...prev };
      for (const id of targets) next[id] = false;
      return next;
    });
    setBulkInFlight(false);
    setSelectedIds([]);
    setBulkMode(false);

    const parts = [`${sent} sent`, `${queued} queued`];
    if (failed) parts.push(`${failed} failed`);
    if (skipped) parts.push(`${skipped} skipped (already in flight)`);
    showToast(
      `${actionLabel(type)} — ${parts.join(", ")}. Acknowledged does not mean the PCs changed state.`,
      failed ? "error" : "info",
    );
    loadData(true);
  };

  // Fleet summary stats
  // "Online" means we heard from the controller recently; PC power state is a
  // separate axis and may be stale/unknown.
  const onlineCount = devices.filter((d) => describeConnection(d.last_seen_at).online).length;
  const offlineCount = devices.length - onlineCount;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-600/15 selection:text-emerald-900">
      {/* Offline banner */}
      {offline && (
        <div className="border-b border-amber-200 bg-amber-50 py-2 text-center type-body-sm font-medium text-amber-800">
          Connection lost — retrying…
        </div>
      )}

      {/* Custom toast banner */}
      {/* Command outcomes are announced to assistive tech, and stay until
          dismissed so a slow reader does not lose the result. */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {notification && (
          <div className={`flex items-center justify-between border-b px-4 py-2.5 text-center type-body-sm font-medium transition-all ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            notification.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            'bg-card text-foreground border-border'
          }`}>
            <span className="mx-auto">{notification.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setNotification(null)}
              className="ml-4 flex min-h-11 min-w-11 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <AppHeader email={account?.email} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <PlatformPageHeader
          eyebrow="Fleet"
          title="Devices"
          description="Manage your PCs and ESP32 gateways."
          actions={
            <>
              {devices.length > 0 && (
                <Button
                  variant={bulkMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    setSelectedIds([]);
                  }}
                  className={bulkMode ? "min-h-11" : "min-h-11 border-border text-foreground hover:bg-muted"}
                >
                  {bulkMode ? "Exit bulk actions" : "Bulk actions"}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                className="min-h-11 px-4"
              >
                + Add device
              </Button>
            </>
          }
        />

        {/* Onboarding Guide */}
        {devices.length === 0 && !onboardingDismissed && (
          <Card className="bg-card ring-border">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <h2 className="type-card-title text-foreground">Onboarding guide</h2>
                <p className="type-body-sm mt-1 text-muted-foreground">
                  Follow these steps to connect your first hardware endpoint
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Dismiss onboarding guide"
                onClick={() => setOnboardingDismissed(true)}
                className="min-h-11 min-w-11 text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="type-overline text-emerald-700">Step 1</div>
                  <h3 className="type-label text-foreground">Verify email</h3>
                  <p className="type-body-sm text-muted-foreground">
                    {account?.email_verified ? "✓ Verified" : "Check inbox for verify link."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="type-overline text-emerald-700">Step 2</div>
                  <h3 className="type-label text-foreground">Add first device</h3>
                  <p className="type-body-sm text-muted-foreground">
                    Select &quot;+ Add device&quot; to create your first endpoint.
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="type-overline text-emerald-700">Step 3</div>
                  <h3 className="type-label text-foreground">Flash ESP32</h3>
                  <p className="type-body-sm text-muted-foreground">
                    Flash custom firmware to your board on the{" "}
                    <Link href="/setup" target="_blank" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                      setup page
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="type-overline text-emerald-700">Step 4</div>
                  <h3 className="type-label text-foreground">Try a command</h3>
                  <p className="type-body-sm text-muted-foreground">
                    Trigger a power action from the dashboard cards.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fleet summary */}
        <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {[
            { label: "Devices", value: devices.length, tone: "text-foreground" },
            { label: "Online", value: onlineCount, tone: "text-emerald-700" },
            { label: "Offline", value: offlineCount, tone: "text-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-4 sm:px-5">
              <span className="type-overline text-muted-foreground">
                {stat.label}
              </span>
              <span className={`type-mono mt-1 block text-2xl font-semibold ${stat.tone}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Devices list */}
        {loading ? (
          <div className="py-16 text-center type-body-sm text-muted-foreground">Loading devices…</div>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center type-body-sm text-muted-foreground">
            No devices configured yet. Select &quot;+ Add device&quot; to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
            {devices.map((d) => {
              const pc = describePcState(d.pc_on, d.telemetry_at);
              const connection = describeConnection(d.last_seen_at);
              const lastCommand = d.last_command_status
                ? commandProgress({
                    status: d.last_command_status,
                    expires_at: d.last_command_expires_at,
                    created_at: d.last_command_at,
                  })
                : null;
              const busy = Boolean(commandInFlight[d.id]);
              return (
              <Card key={d.id} className="flex flex-col bg-card ring-border transition-colors hover:ring-primary/30">
                <div className="group flex flex-1 flex-col rounded-t-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {bulkMode && (
                          <label
                            className="-ml-2 flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-md"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${d.name}`}
                              checked={selectedIds.includes(d.id)}
                              onChange={(event) => {
                                event.stopPropagation();
                                toggleSelectDevice(d.id);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className="h-5 w-5 cursor-pointer rounded border-input bg-card accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                            />
                          </label>
                        )}
                        <div className="min-w-0">
                          <h2 className="type-card-title text-foreground">
                            <button
                              type="button"
                              onClick={() => handleOpenDeviceDetail(d)}
                              className="rounded-md text-left transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                              aria-label={`Open details for ${d.name}`}
                            >
                              {d.name}
                            </button>
                          </h2>
                          <div className="type-metadata mt-1 flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
                            <span
                              className={
                                pc.state === "Unknown"
                                  ? "text-muted-foreground"
                                  : pc.stale
                                    ? "text-amber-800"
                                    : pc.state === "On"
                                      ? "text-emerald-700"
                                      : "text-foreground"
                              }
                            >
                              {pc.state === "Unknown" ? "PC state unknown" : `PC ${pc.state.toLowerCase()}`}
                            </span>
                            <span aria-hidden="true" className="text-muted-foreground/60">·</span>
                            <span>{pc.ageLabel}</span>
                          </div>
                          <p className="type-metadata text-muted-foreground">
                            {d.firmware_version ? `Firmware ${d.firmware_version}` : "Firmware unknown"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <span title={connection.ageLabel}>
                          <ConnectionPill online={connection.online} label={connection.label} />
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`Actions for ${d.name}`}
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-lg leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            •••
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-border bg-card text-foreground">
                            <DropdownMenuItem onClick={() => handleGetPairCode(d.id)}>
                              Get pairing code
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenTelemetrySettings(d)}>
                              Telemetry settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRotateToken(d.id)}>
                              Replace token
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteDevice(d.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    {/* Telemetry progress bars */}
                    {(d.cpu_load !== null || d.gpu_temp !== null || d.ram_used_mb !== null) && (
                      <div className="flex flex-col gap-3">
                        {d.cpu_load !== null && (
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between type-metadata text-muted-foreground">
                              <span>CPU</span>
                              <span className="type-mono text-foreground">{Math.round(d.cpu_load)}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-emerald-600" style={{ width: `${d.cpu_load}%` }} />
                            </div>
                          </div>
                        )}
                        {d.gpu_temp !== null && (
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between type-metadata text-muted-foreground">
                              <span>GPU</span>
                              <span className="type-mono text-foreground">{Math.round(d.gpu_temp)}°C</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-sky-600" style={{ width: `${d.gpu_temp}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {d.cpu_load === null && d.gpu_temp === null && d.ram_used_mb === null && (
                      <div className="rounded-lg border border-dashed border-border px-3 py-4 type-metadata text-muted-foreground">
                        {d.last_seen_at
                          ? `No live telemetry — ${connection.ageLabel}.`
                          : "No telemetry yet."}
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Power action buttons */}
                <CardContent className="mt-auto pt-0">
                  {!bulkMode && (
                    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          aria-label={`Power On ${d.name}`}
                          onClick={() => handlePowerAction(d, "power_on")}
                          className="min-h-11 px-4"
                        >
                          {busy ? "…" : "On"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          aria-label={`Sleep ${d.name}`}
                          onClick={() => handlePowerAction(d, "sleep")}
                          className={OUTLINE_ACTION_CLASS}
                        >
                          Sleep
                        </Button>
                        {d.firmware_version?.toLowerCase().includes("desktop-agent") && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              aria-label={`Lock ${d.name}`}
                              onClick={() => handlePowerAction(d, "lock")}
                              className={OUTLINE_ACTION_CLASS}
                            >
                              Lock
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              aria-label={`Log Out ${d.name}`}
                              onClick={() => handlePowerAction(d, "logout")}
                              className={OUTLINE_ACTION_CLASS}
                            >
                              Log Out
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          aria-label={`Power Off ${d.name}`}
                          onClick={() => handlePowerAction(d, "power_off")}
                          className={OUTLINE_ACTION_CLASS}
                        >
                          Off
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          aria-label={`Force Off ${d.name}`}
                          onClick={() => handlePowerAction(d, "power_off_force")}
                          className="min-h-11 border-red-200 text-red-700 hover:bg-red-50"
                        >
                          Force Off
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          aria-label={`Reset ${d.name}`}
                          onClick={() => handlePowerAction(d, "reset")}
                          className={OUTLINE_ACTION_CLASS}
                        >
                          Reset
                        </Button>
                      </div>

                      {/* Latest command outcome, so a queued/expired command is
                          visible without opening the device. */}
                      {lastCommand && (
                        <p
                          className={`type-metadata ${
                            lastCommand.tone === "danger"
                              ? "text-red-700"
                              : lastCommand.tone === "warning"
                                ? "text-amber-800"
                                : lastCommand.tone === "success"
                                  ? "text-emerald-700"
                                  : "text-muted-foreground"
                          }`}
                        >
                          Last command: {lastCommand.label}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Bulk commands bar at bottom */}
      {bulkMode && selectedIds.length > 0 && (
        <div className="sticky bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="type-label text-foreground">
              {selectedIds.length} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => handleBulkCommand("power_on")} className="min-h-11 px-4">
                Bulk On
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkCommand("sleep")} className="min-h-11">
                Bulk Sleep
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkCommand("power_off")} className="min-h-11">
                Bulk Off
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkCommand("power_off_force")} className="min-h-11">
                Bulk Force Off
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkCommand("reset")} className="min-h-11">
                Bulk Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); setCreatedCredentials(null); }}>
        <DialogContent className="bg-card text-foreground ring-border">
          <DialogHeader>
            <DialogTitle>Add device</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new remote endpoint for PC power control
            </DialogDescription>
          </DialogHeader>

          {createdCredentials ? (
            <div className="flex flex-col gap-4 py-4">
              {createdCredentials.code && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-4 text-center">
                  <span className="type-overline text-muted-foreground">Pairing code</span>
                  <span className="type-mono select-all break-all text-3xl font-semibold tracking-[0.2em] text-emerald-700">{createdCredentials.code}</span>
                  <span className="type-metadata mt-1 text-muted-foreground">Enter this code on your ESP32 board during setup.</span>
                </div>
              )}

              <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/40 p-4">
                <span className="type-overline text-muted-foreground">Advanced credentials</span>
                <div className="flex flex-col gap-1">
                  <span className="type-overline text-muted-foreground">Device ID</span>
                  <span className="type-mono select-all break-all rounded bg-card p-2 text-foreground">{createdCredentials.id}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="type-overline text-muted-foreground">Device token</span>
                  <span className="type-mono select-all break-all rounded bg-card p-2 text-foreground">{createdCredentials.token}</span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddDevice} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className={FIELD_LABEL_CLASS} htmlFor="deviceName">Device name</label>
                <input
                  id="deviceName"
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="e.g. My Desktop"
                  required
                  className={FIELD_CLASS}
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="mt-2 min-h-11 w-full">
                  Create device
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Pairing Code Display Dialog */}
      <Dialog open={pairOpen} onOpenChange={setPairOpen}>
        <DialogContent className="bg-card text-foreground ring-border">
          <DialogHeader>
            <DialogTitle>Pairing credentials</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Use this code to pair your ESP32 with this device
            </DialogDescription>
          </DialogHeader>

          {pairCodeInfo && (
            <div className="my-4 flex flex-col gap-2.5 rounded-xl border border-border bg-muted/40 px-6 py-8 text-center">
              <span className="type-overline text-muted-foreground">Pairing code</span>
              <span className="type-mono select-all break-all text-4xl font-semibold tracking-[0.2em] text-emerald-700">{pairCodeInfo.code}</span>
              <span className="type-metadata mt-2 text-muted-foreground">Expires at: {new Date(pairCodeInfo.expires_at).toLocaleTimeString()}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Telemetry Settings Dialog */}
      <Dialog open={telemetryOpen} onOpenChange={setTelemetryOpen}>
        <DialogContent className="bg-card text-foreground ring-border">
          <DialogHeader>
            <DialogTitle>Telemetry settings</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure what system metrics {selectedDeviceForTelemetry?.name} reports to the server.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 transition-colors hover:bg-muted">
              <input
                type="checkbox"
                checked={telemetryCpu}
                onChange={(e) => setTelemetryCpu(e.target.checked)}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-input bg-card accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              />
              <div className="flex flex-col gap-0.5">
                <span className="type-label text-foreground">CPU load</span>
                <span className="type-body-sm text-muted-foreground">Report active processor utilization percentage</span>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 transition-colors hover:bg-muted">
              <input
                type="checkbox"
                checked={telemetryRam}
                onChange={(e) => setTelemetryRam(e.target.checked)}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-input bg-card accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              />
              <div className="flex flex-col gap-0.5">
                <span className="type-label text-foreground">RAM usage</span>
                <span className="type-body-sm text-muted-foreground">Report physical memory consumption</span>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 transition-colors hover:bg-muted">
              <input
                type="checkbox"
                checked={telemetryGpu}
                onChange={(e) => setTelemetryGpu(e.target.checked)}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-input bg-card accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              />
              <div className="flex flex-col gap-0.5">
                <span className="type-label text-foreground">GPU temperature</span>
                <span className="type-body-sm text-muted-foreground">Report graphics processor temperature in Celsius</span>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 transition-colors hover:bg-muted">
              <input
                type="checkbox"
                checked={telemetryWifi}
                onChange={(e) => setTelemetryWifi(e.target.checked)}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-input bg-card accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              />
              <div className="flex flex-col gap-0.5">
                <span className="type-label text-foreground">Wi-Fi signal strength</span>
                <span className="type-body-sm text-muted-foreground">Report active wireless connection RSSI level</span>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button onClick={handleSaveTelemetrySettings} className="min-h-11 w-full">
              Save settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device Details Dialog */}
      <Dialog open={detailDevice !== null} onOpenChange={(open) => { if (!open) setDetailDevice(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-card text-foreground ring-border sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <div className="min-w-0">
                <DialogTitle>{detailDevice?.name}</DialogTitle>
                <DialogDescription className="mt-1 text-muted-foreground">
                  Device ID: <span className="type-mono break-all">{detailDevice?.id}</span>
                </DialogDescription>
              </div>
              {(() => {
                if (!detailDevice) return null;
                const pc = describePcState(detailDevice.pc_on, detailDevice.telemetry_at);
                return (
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      pc.state === "Unknown"
                        ? "border-border bg-muted text-foreground"
                        : pc.stale
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : pc.state === "On"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-border bg-muted text-foreground"
                    }`}
                    title={pc.ageLabel}
                  >
                    PC {pc.state.toLowerCase()}{pc.state !== "Unknown" ? ` · ${pc.ageLabel}` : ""}
                  </span>
                );
              })()}
            </div>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-12 text-center type-body-sm text-muted-foreground">Loading device details…</div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card className="flex flex-col justify-between bg-muted/30 p-3 ring-1 ring-border">
                  <span className="type-overline text-muted-foreground">Room temp</span>
                  <span className="type-mono mt-1 text-lg font-semibold text-foreground">
                    {detailTelemetry?.room_temp !== undefined && detailTelemetry.room_temp !== null 
                      ? `${Number(detailTelemetry.room_temp).toFixed(1)}°C` 
                      : "N/A"}
                  </span>
                </Card>
                <Card className="flex flex-col justify-between bg-muted/30 p-3 ring-1 ring-border">
                  <span className="type-overline text-muted-foreground">Room humidity</span>
                  <span className="type-mono mt-1 text-lg font-semibold text-foreground">
                    {detailTelemetry?.room_humidity !== undefined && detailTelemetry.room_humidity !== null 
                      ? `${Math.round(Number(detailTelemetry.room_humidity))}%` 
                      : "N/A"}
                  </span>
                </Card>
                <Card className="flex flex-col justify-between bg-muted/30 p-3 ring-1 ring-border">
                  <span className="type-overline text-muted-foreground">Wi-Fi RSSI</span>
                  <span className="type-mono mt-1 text-lg font-semibold text-foreground">
                    {detailTelemetry?.rssi !== undefined && detailTelemetry.rssi !== null 
                      ? `${detailTelemetry.rssi} dBm` 
                      : "N/A"}
                  </span>
                </Card>
                <Card className="flex flex-col justify-between bg-muted/30 p-3 ring-1 ring-border">
                  <span className="type-overline text-muted-foreground">Device source</span>
                  <div className="mt-1 flex flex-col">
                    {(() => {
                      const platformInfo = getPlatformInfo(detailDevice?.firmware_version);
                      return (
                        <>
                          <span className={`type-label ${
                            platformInfo.platform === "Windows Software" ? "text-blue-700" :
                            platformInfo.platform === "ESP32" ? "text-emerald-700" :
                            platformInfo.platform === "ESP8266" ? "text-cyan-700" : "text-foreground"
                          }`}>
                            {platformInfo.platform}
                          </span>
                          <span className="type-mono mt-0.5 truncate text-muted-foreground" title={platformInfo.version}>
                            v{platformInfo.version}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </Card>
              </div>

              {/* Telemetry charts */}
              <div>
                <h2 className="type-card-title mb-3 text-foreground">Temperature (last 7 days)</h2>
                {detailHistory.length === 0 ? (
                  <div className="flex h-[150px] items-center justify-center rounded-lg border border-border bg-muted/30 type-body-sm text-muted-foreground">
                    No historical temperature data available.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <HistoryTempChart history={detailHistory} />
                  </div>
                )}
              </div>

              {/* Command history */}
              <div>
                <h2 className="type-card-title mb-3 text-foreground">Recent commands</h2>
                {detailCommands.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 py-6 text-center type-body-sm text-muted-foreground">
                    No commands sent recently.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                    <div className="max-h-[220px] overflow-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-border bg-muted/60">
                            <th className="p-2.5 type-overline text-muted-foreground">Command</th>
                            <th className="p-2.5 type-overline text-muted-foreground">Sent at</th>
                            <th className="p-2.5 type-overline text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailCommands.map((cmd) => {
                          const progress = commandProgress(cmd);
                          const toneClass = COMMAND_TONE_CLASS[progress.tone] ?? COMMAND_TONE_CLASS.neutral;
                          return (
                            <tr key={cmd.id} className="border-b border-border hover:bg-muted/10">
                              <td className="p-2.5 type-label text-foreground">
                                 {cmd.type === "power_on" ? "Power On" :
                                  cmd.type === "power_off" ? "Power Off" :
                                  cmd.type === "power_off_force" ? "Force Off" :
                                  cmd.type === "reset" ? "Reset" :
                                  cmd.type === "sleep" ? "Sleep" :
                                  cmd.type === "lock" ? "Lock" :
                                  cmd.type === "logout" ? "Log Out" : cmd.type}
                              </td>
                              <td className="type-metadata p-2.5 text-muted-foreground">
                                {new Date(cmd.created_at).toLocaleString()}
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${toneClass}`}
                                  title={progress.detail}
                                >
                                  {progress.shortLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Scheduled commands */}
              <div>
                <h2 className="type-card-title mb-3 text-foreground">Scheduled commands</h2>
                {scheduleError && (
                  <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 type-body-sm text-red-700">
                    {scheduleError}
                  </div>
                )}

                {detailSchedules.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 py-4 text-center type-body-sm text-muted-foreground">
                    Nothing scheduled for this device.
                  </div>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {detailSchedules.map((item) => (
                      <li key={item.id} className="flex flex-col justify-between gap-2 bg-muted/20 p-3 sm:flex-row sm:items-center">
                        <div>
                          <span className="type-label text-foreground">{actionLabel(item.type)}</span>
                          <span className="type-metadata text-muted-foreground"> · {new Date(item.run_at).toLocaleString()}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={scheduleBusy}
                          onClick={() => handleCancelSchedule(item.id)}
                          className="min-h-11 border-border text-foreground hover:bg-muted"
                        >
                          Cancel
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    aria-label="Scheduled command type"
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className={FIELD_CLASS}
                  >
                    <option value="power_on">Power On</option>
                    <option value="power_off">Power Off</option>
                    <option value="reset">Reset</option>
                    <option value="sleep">Sleep</option>
                    <option value="lock">Lock</option>
                    <option value="logout">Log Out</option>
                  </select>
                  <input
                    type="datetime-local"
                    aria-label="Scheduled run time"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className={FIELD_CLASS}
                  />
                  <Button
                    size="sm"
                    onClick={handleScheduleCommand}
                    disabled={scheduleBusy || !scheduleAt}
                    className="min-h-11 shrink-0 px-4"
                  >
                    {scheduleBusy ? "Saving…" : "Schedule"}
                  </Button>
                </div>
                <p className="type-metadata mt-2 text-muted-foreground">
                  The command is sent when the time arrives. It expires 10 minutes later if the device is offline.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryTempChart({ history }: { history: TelemetrySample[] }) {
  // Extract temp_avg values, dropping null/invalid rows
  const points = toChartPoints(history);

  if (points.length === 0) {
    return <div className="py-4 text-center type-body-sm text-muted-foreground">No valid temperature points to display.</div>;
  }

  // Find min/max temperature for mapping
  const temps = points.map((p) => p.temp);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempDiff = maxTemp - minTemp === 0 ? 1 : maxTemp - minTemp;

  // Add 10% padding to bounds
  const yMin = Math.max(0, minTemp - tempDiff * 0.1);
  const yMax = maxTemp + tempDiff * 0.1;
  const valRange = yMax - yMin;

  const width = 500;
  const height = 120;
  const paddingX = 15;
  const paddingY = 15;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Map each point to coordinates
  const coords = points.map((p, idx) => {
    const x = paddingX + (points.length > 1 ? (idx / (points.length - 1)) * chartWidth : chartWidth / 2);
    // Y is inverted in SVG coordinates
    const y = paddingY + chartHeight - ((p.temp - yMin) / valRange) * chartHeight;
    return { x, y, temp: p.temp, hour: p.hour };
  });

  // Create SVG path string
  let pathD = "";
  if (coords.length > 0) {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }
  }

  // Create area path under the line
  let areaD = "";
  if (coords.length > 0) {
    areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between px-1 type-metadata text-muted-foreground">
        <span>Min: {minTemp.toFixed(1)}°C</span>
        <span>Max: {maxTemp.toFixed(1)}°C</span>
      </div>
      <div className="relative">
        <figure role="img" aria-labelledby="temp-chart-title" aria-describedby="temp-chart-desc">
        <figcaption id="temp-chart-title" className="sr-only">Hourly room temperature history</figcaption>
        <p id="temp-chart-desc" className="sr-only">
          {points.length} readings from {points[0].hour} to {points[points.length - 1].hour}.
          Minimum {Math.round(minTemp)} degrees Celsius, maximum {Math.round(maxTemp)} degrees Celsius,
          latest {Math.round(points[points.length - 1].temp)} degrees Celsius.
        </p>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" aria-hidden="true">
          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#d5dbd0" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="#d5dbd0" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#d5dbd0" strokeWidth="1" />

          {/* Area Gradient fill */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#047857" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Filled Area */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {/* Stroke Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#047857"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r="3.5"
              fill="#ffffff"
              stroke="#047857"
              strokeWidth="2"
              className="hover:r-5 cursor-pointer transition-all"
            />
          ))}
        </svg>
        </figure>
      </div>
      {/* Timeline Labels */}
      <div className="mt-1 flex justify-between px-1 type-metadata text-muted-foreground">
        <span>{new Date(points[0].hour).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(points[points.length - 1].hour).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
