"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { api, ApiResponse } from "@/lib/api";

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
}

interface AccountInfo {
  id: string;
  email: string;
  email_verified: boolean;
}

function getPlatformInfo(versionStr: string | null | undefined) {
  if (!versionStr) return { platform: "Unknown", version: "N/A" };
  const lower = versionStr.toLowerCase();
  if (lower.includes("desktop-agent")) {
    const match = versionStr.match(/desktop-agent\s+([^\s(]+)/i);
    return {
      platform: "Windows Software",
      version: match ? match[1] : versionStr.replace(/desktop-agent\s+/i, ""),
    };
  }
  if (lower.includes("esp32")) {
    return {
      platform: "ESP32",
      version: versionStr.replace(/-esp32/i, ""),
    };
  }
  if (lower.includes("esp8266")) {
    return {
      platform: "ESP8266",
      version: versionStr.replace(/-esp8266/i, ""),
    };
  }
  if (/^[0-9.]+/.test(versionStr)) {
    return {
      platform: "ESP32",
      version: versionStr,
    };
  }
  return {
    platform: "Unknown",
    version: versionStr,
  };
}

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
  const [detailHistory, setDetailHistory] = useState<any[]>([]);
  const [detailCommands, setDetailCommands] = useState<any[]>([]);
  const [detailTelemetry, setDetailTelemetry] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleOpenDeviceDetail = async (device: Device) => {
    setDetailDevice(device);
    setDetailLoading(true);
    setDetailHistory([]);
    setDetailCommands([]);
    setDetailTelemetry(null);
    try {
      const [historyRes, commandsRes, telemetryRes] = await Promise.all([
        api.history(device.id, 7),
        api.commands(device.id),
        api.telemetry(device.id),
      ]);
      setDetailHistory(historyRes.data || []);
      setDetailCommands(commandsRes.data || []);
      if (telemetryRes.data && Array.isArray(telemetryRes.data) && telemetryRes.data.length > 0) {
        setDetailTelemetry(telemetryRes.data[0]);
      }
    } catch (error) {
      console.error("Failed to load device details:", error);
    } finally {
      setDetailLoading(false);
    }
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

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    const [meRes, devRes] = await Promise.all([api.me(), api.devices()]);

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
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await api.logout();
    router.push("/login");
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName) return;
    const { data, error } = await api.addDevice(newDeviceName);
    if (data) {
      // Fetch pairing code immediately
      const codeRes = await api.pairCode(data.id);
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
    const { data } = await api.pairCode(id);
    if (data) {
      setPairCodeInfo(data);
      setPairOpen(true);
    }
  };

  const handleRotateToken = async (id: string) => {
    if (!confirm("Are you sure you want to replace this device's token? Pre-paired firmware will stop connecting until updated with the new token.")) return;
    const { data } = await api.rotateToken(id);
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

  const handleSendCommand = async (deviceId: string, type: string) => {
    if (commandInFlight[deviceId]) return;
    setCommandInFlight((prev) => ({ ...prev, [deviceId]: true }));
    try {
      const res = await api.sendCommand(deviceId, type);
      const data = res.data;
      const error = res.error;
      if (error) {
        showToast(error || `Failed to send command '${type}'.`, 'error');
      } else {
        const device = devices.find((d) => d.id === deviceId);
        const name = device ? device.name : "Device";
        const actionLabel = type === "power_on" ? "Power On" :
                            type === "power_off" ? "Power Off" :
                            type === "power_off_force" ? "Force Off" :
                            type === "reset" ? "Reset" :
                            type === "sleep" ? "Sleep" : type;
                            
        if (data?.delivered) {
          showToast(`${actionLabel} request delivered to ${name} successfully!`, 'success');
        } else {
          showToast(`${actionLabel} request queued for ${name}. It will execute when the device reconnects.`, 'info');
        }
        loadData(true);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to submit command.", "error");
    } finally {
      setCommandInFlight((prev) => ({ ...prev, [deviceId]: false }));
    }
  };

  const toggleSelectDevice = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkCommand = async (type: string) => {
    if (selectedIds.length === 0 || bulkInFlight) return;
    if (!confirm(`Send '${type}' command to ${selectedIds.length} selected devices?`)) return;
    setBulkInFlight(true);

    let succeeded = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        const res = await api.sendCommand(id, type);
        if (res.data) succeeded++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setBulkInFlight(false);
    setSelectedIds([]);
    setBulkMode(false);
    if (failed > 0) {
      showToast(`Bulk command complete. Delivered/Queued: ${succeeded}, Failed: ${failed}.`, 'info');
    } else {
      showToast(`Bulk command transmission complete. All ${succeeded} commands dispatched!`, 'success');
    }
    loadData(true);
  };

  // Fleet summary stats
  const onlineCount = devices.filter((d) => d.pc_on === 1).length;
  const offlineCount = devices.filter((d) => d.pc_on === 0).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Offline banner */}
      {offline && (
        <div className="bg-amber-950/80 border-b border-amber-900/50 text-amber-400 text-sm text-center py-2 font-medium animate-pulse">
          Connection lost — retrying…
        </div>
      )}

      {/* Custom toast banner */}
      {notification && (
        <div className={`text-center py-2.5 px-4 text-sm font-medium border-b flex justify-between items-center transition-all ${
          notification.type === 'success' ? 'bg-emerald-950/85 text-emerald-400 border-emerald-900/50' : 
          notification.type === 'error' ? 'bg-red-950/85 text-red-400 border-red-900/50' :
          'bg-zinc-900/90 text-zinc-300 border-zinc-850'
        }`}>
          <span className="mx-auto">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-zinc-500 hover:text-zinc-300 text-xs ml-4">✕</button>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-emerald-500">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 3v9" />
                <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
              </svg>
            </span>
            <span className="font-semibold text-lg text-zinc-100">OnOffMyPC</span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(true)}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
            >
              + Add device
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-zinc-400 hover:text-zinc-100"
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Onboarding Guide */}
        {devices.length === 0 && !onboardingDismissed && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-zinc-100 font-bold">Onboarding guide</CardTitle>
                <CardDescription className="text-zinc-400">
                  Follow these steps to connect your first hardware endpoint
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOnboardingDismissed(true)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-emerald-500 font-extrabold">Step 1</div>
                  <h4 className="font-semibold text-zinc-200">Verify email</h4>
                  <p className="text-zinc-400 text-xs">
                    {account?.email_verified ? "✓ Verified" : "Check inbox for verify link."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-emerald-500 font-extrabold">Step 2</div>
                  <h4 className="font-semibold text-zinc-200">Add first device</h4>
                  <p className="text-zinc-400 text-xs">
                    Click the "+ Add device" button to create your first endpoint.
                  </p>
                </div>
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-emerald-500 font-extrabold">Step 3</div>
                  <h4 className="font-semibold text-zinc-200">Flash ESP32</h4>
                  <p className="text-zinc-400 text-xs">
                    Flash custom firmware to your board on the{" "}
                    <Link href="/setup" target="_blank" className="text-emerald-400 underline">
                      setup page
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-emerald-500 font-extrabold">Step 4</div>
                  <h4 className="font-semibold text-zinc-200">Try a command</h4>
                  <p className="text-zinc-400 text-xs">
                    Trigger a power action from the dashboard cards.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fleet Widget */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-zinc-900 border-zinc-800 p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Devices</span>
            <span className="text-3xl font-black text-zinc-100 mt-2">{devices.length}</span>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Online PCs</span>
            <span className="text-3xl font-black text-emerald-400 mt-2">{onlineCount}</span>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Offline PCs</span>
            <span className="text-3xl font-black text-zinc-400 mt-2">{offlineCount}</span>
          </Card>
        </div>

        {/* Bulk Commands Switch */}
        {devices.length > 0 && (
          <div className="flex justify-between items-center bg-zinc-900/50 border border-zinc-850 p-4 rounded-xl">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-zinc-200 text-sm">Bulk operation mode</span>
              <span className="text-xs text-zinc-500">Perform power actions on multiple devices at once</span>
            </div>
            <Button
              variant={bulkMode ? "secondary" : "outline"}
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedIds([]);
              }}
              className="border-zinc-800 text-zinc-300"
            >
              {bulkMode ? "Exit Bulk Mode" : "Enter Bulk Mode"}
            </Button>
          </div>
        )}

        {/* Devices list */}
        {loading ? (
          <div className="text-center text-zinc-400 py-16">Loading devices…</div>
        ) : devices.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
            No devices configured yet. Click "+ Add device" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {devices.map((d) => (
              <Card key={d.id} className="bg-zinc-900 border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                <div onClick={() => handleOpenDeviceDetail(d)} className="cursor-pointer group flex-1">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        {bulkMode && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(d.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectDevice(d.id);
                            }}
                            className="h-4 w-4 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                          />
                        )}
                        <div>
                          <CardTitle className="text-zinc-100 text-lg font-bold group-hover:text-emerald-400 transition-colors">{d.name}</CardTitle>
                          <CardDescription className="text-zinc-500 text-xs mt-0.5">
                            ID: {d.id}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <span className={`inline-block h-2 w-2 rounded-full ${d.pc_on === 1 ? "bg-emerald-500" : "bg-zinc-600"}`} />
                        <span className="text-xs text-zinc-400">{d.pc_on === 1 ? "Online" : "Offline"}</span>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 text-zinc-500 hover:text-zinc-300 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer">
                            •••
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                            <DropdownMenuItem onClick={() => handleGetPairCode(d.id)}>
                              Get pairing code
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenTelemetrySettings(d)}>
                              Telemetry settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRotateToken(d.id)}>
                              Replace token
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400" onClick={() => handleDeleteDevice(d.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    {/* Telemetry Progress Bars */}
                    {(d.cpu_load !== null || d.gpu_temp !== null || d.ram_used_mb !== null) && (
                      <div className="flex flex-col gap-3 p-3 bg-zinc-950/60 rounded-lg border border-zinc-850">
                        {d.cpu_load !== null && (
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs text-zinc-400">
                              <span>CPU</span>
                              <span>{Math.round(d.cpu_load)}%</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${d.cpu_load}%` }} />
                            </div>
                          </div>
                        )}
                        {d.gpu_temp !== null && (
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs text-zinc-400">
                              <span>GPU</span>
                              <span>{Math.round(d.gpu_temp)}°C</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-red-500 h-full" style={{ width: `${d.gpu_temp}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Power Action Buttons */}
                <CardContent className="pt-0">
                  {!bulkMode && (
                    <div className="flex flex-wrap gap-2.5 pt-2 border-t border-zinc-800/50">
                      <Button 
                        size="sm" 
                        disabled={commandInFlight[d.id]} 
                        onClick={() => handleSendCommand(d.id, "power_on")} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        {commandInFlight[d.id] ? "⏳" : "On"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        disabled={commandInFlight[d.id]} 
                        onClick={() => handleSendCommand(d.id, "sleep")} 
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                      >
                        Sleep
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        disabled={commandInFlight[d.id]} 
                        onClick={() => handleSendCommand(d.id, "power_off")} 
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                      >
                        Off
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        disabled={commandInFlight[d.id]} 
                        onClick={() => handleSendCommand(d.id, "power_off_force")}
                      >
                        Force Off
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        disabled={commandInFlight[d.id]} 
                        onClick={() => handleSendCommand(d.id, "reset")}
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Bulk commands bar at bottom */}
      {bulkMode && selectedIds.length > 0 && (
        <div className="bg-zinc-900 border-t border-zinc-800 py-4 px-4 sticky bottom-0 z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-300">
              {selectedIds.length} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleBulkCommand("power_on")} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                Bulk On
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkCommand("sleep")} className="bg-zinc-800 text-zinc-100">
                Bulk Sleep
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkCommand("power_off")} className="bg-zinc-800 text-zinc-100">
                Bulk Off
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkCommand("power_off_force")}>
                Bulk Force Off
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkCommand("reset")}>
                Bulk Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); setCreatedCredentials(null); }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Add device</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a new remote endpoint for PC power control
            </DialogDescription>
          </DialogHeader>

          {createdCredentials ? (
            <div className="flex flex-col gap-4 py-4">
              {createdCredentials.code && (
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pairing Code</span>
                  <span className="text-3xl font-black text-emerald-400 tracking-widest">{createdCredentials.code}</span>
                  <span className="text-[10px] text-zinc-500 mt-1">Enter this code on your ESP32 board during setup.</span>
                </div>
              )}

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col gap-2.5">
                <span className="text-xs font-semibold text-zinc-500 uppercase">Advanced Credentials</span>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-500">DEVICE ID</span>
                  <span className="text-xs font-mono select-all bg-zinc-900 p-2 rounded text-zinc-300">{createdCredentials.id}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-500">DEVICE TOKEN</span>
                  <span className="text-xs font-mono select-all bg-zinc-900 p-2 rounded text-zinc-300">{createdCredentials.token}</span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddDevice} className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400" htmlFor="deviceName">Device Name</label>
                <input
                  id="deviceName"
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="e.g. My Desktop"
                  required
                  className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 w-full mt-2">
                  Create Device
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Pairing Code Display Dialog */}
      <Dialog open={pairOpen} onOpenChange={setPairOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Pairing credentials</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Use this code to pair your ESP32 with this device
            </DialogDescription>
          </DialogHeader>

          {pairCodeInfo && (
            <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 text-center flex flex-col gap-2.5 py-8 my-4">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pairing Code</span>
              <span className="text-4xl font-black text-emerald-400 tracking-widest">{pairCodeInfo.code}</span>
              <span className="text-[10px] text-zinc-500 mt-2">Expires at: {new Date(pairCodeInfo.expires_at).toLocaleTimeString()}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Telemetry Settings Dialog */}
      <Dialog open={telemetryOpen} onOpenChange={setTelemetryOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Telemetry settings</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure what system metrics {selectedDeviceForTelemetry?.name} reports to the server.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-950 transition-colors">
              <input
                type="checkbox"
                checked={telemetryCpu}
                onChange={(e) => setTelemetryCpu(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-zinc-200">CPU Load</span>
                <span className="text-xs text-zinc-500">Report active processor utilization percentage</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-950 transition-colors">
              <input
                type="checkbox"
                checked={telemetryRam}
                onChange={(e) => setTelemetryRam(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-zinc-200">RAM Usage</span>
                <span className="text-xs text-zinc-500">Report physical memory consumption</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-950 transition-colors">
              <input
                type="checkbox"
                checked={telemetryGpu}
                onChange={(e) => setTelemetryGpu(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-zinc-200">GPU Temperature</span>
                <span className="text-xs text-zinc-500">Report graphics processor temperature in Celsius</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-950 transition-colors">
              <input
                type="checkbox"
                checked={telemetryWifi}
                onChange={(e) => setTelemetryWifi(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-zinc-200">Wi-Fi Signal Strength</span>
                <span className="text-xs text-zinc-500">Report active wireless connection RSSI level</span>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button onClick={handleSaveTelemetrySettings} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 w-full">
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device Details Dialog */}
      <Dialog open={detailDevice !== null} onOpenChange={(open) => { if (!open) setDetailDevice(null); }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center pr-6">
              <div>
                <DialogTitle className="text-xl font-bold">{detailDevice?.name}</DialogTitle>
                <DialogDescription className="text-zinc-400 text-xs">
                  Device ID: {detailDevice?.id}
                </DialogDescription>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${detailDevice?.pc_on === 1 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400"}`}>
                {detailDevice?.pc_on === 1 ? "Online" : "Offline"}
              </span>
            </div>
          </DialogHeader>

          {detailLoading ? (
            <div className="text-center py-12 text-zinc-400">Loading device details…</div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-zinc-950/40 border-zinc-800 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Room Temp</span>
                  <span className="text-lg font-black text-zinc-200 mt-1">
                    {detailTelemetry?.room_temp !== undefined && detailTelemetry.room_temp !== null 
                      ? `${Number(detailTelemetry.room_temp).toFixed(1)}°C` 
                      : "N/A"}
                  </span>
                </Card>
                <Card className="bg-zinc-950/40 border-zinc-800 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Room Humidity</span>
                  <span className="text-lg font-black text-zinc-200 mt-1">
                    {detailTelemetry?.room_humidity !== undefined && detailTelemetry.room_humidity !== null 
                      ? `${Math.round(Number(detailTelemetry.room_humidity))}%` 
                      : "N/A"}
                  </span>
                </Card>
                <Card className="bg-zinc-950/40 border-zinc-800 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Wi-Fi RSSI</span>
                  <span className="text-lg font-black text-zinc-200 mt-1">
                    {detailTelemetry?.rssi !== undefined && detailTelemetry.rssi !== null 
                      ? `${detailTelemetry.rssi} dBm` 
                      : "N/A"}
                  </span>
                </Card>
                <Card className="bg-zinc-950/40 border-zinc-800 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Device Source</span>
                  <div className="flex flex-col mt-1">
                    {(() => {
                      const platformInfo = getPlatformInfo(detailDevice?.firmware_version);
                      return (
                        <>
                          <span className={`text-xs font-bold ${
                            platformInfo.platform === "Windows Software" ? "text-blue-400" :
                            platformInfo.platform === "ESP32" ? "text-emerald-400" :
                            platformInfo.platform === "ESP8266" ? "text-cyan-400" : "text-zinc-400"
                          }`}>
                            {platformInfo.platform}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium truncate mt-0.5" title={platformInfo.version}>
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
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Temperature (Last 7 Days)</h3>
                {detailHistory.length === 0 ? (
                  <div className="h-[150px] flex items-center justify-center border border-zinc-800 rounded-lg bg-zinc-950/40 text-xs text-zinc-500">
                    No historical temperature data available.
                  </div>
                ) : (
                  <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-950/50">
                    <HistoryTempChart history={detailHistory} />
                  </div>
                )}
              </div>

              {/* Command history */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Recent Commands</h3>
                {detailCommands.length === 0 ? (
                  <div className="text-center py-6 border border-zinc-800 rounded-lg bg-zinc-950/40 text-xs text-zinc-500">
                    No commands sent recently.
                  </div>
                ) : (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/20">
                    <div className="max-h-[220px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
                            <th className="p-2.5 font-medium">Command</th>
                            <th className="p-2.5 font-medium">Sent At</th>
                            <th className="p-2.5 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailCommands.map((cmd) => (
                            <tr key={cmd.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/10">
                              <td className="p-2.5 font-semibold text-zinc-200">
                                {cmd.type === "power_on" ? "Power On" :
                                 cmd.type === "power_off" ? "Power Off" :
                                 cmd.type === "power_off_force" ? "Force Off" :
                                 cmd.type === "reset" ? "Reset" :
                                 cmd.type === "sleep" ? "Sleep" : cmd.type}
                              </td>
                              <td className="p-2.5 text-zinc-400">
                                {new Date(cmd.created_at).toLocaleString()}
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  cmd.status === "delivered" || cmd.delivered
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : cmd.status === "pending"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}>
                                  {cmd.status === "delivered" || cmd.delivered ? "Delivered" : cmd.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryTempChart({ history }: { history: any[] }) {
  // Extract temp_avg values, filter out nulls/invalid values
  const points = history
    .map((h, i) => ({
      index: i,
      temp: h.temp_avg !== null ? Number(h.temp_avg) : null,
      hour: h.hour,
    }))
    .filter((p) => p.temp !== null) as { index: number; temp: number; hour: string }[];

  if (points.length === 0) {
    return <div className="text-zinc-500 text-xs text-center py-4">No valid temperature points to display.</div>;
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
      <div className="flex justify-between text-[10px] text-zinc-500 mb-1 px-1">
        <span>Min: {minTemp.toFixed(1)}°C</span>
        <span>Max: {maxTemp.toFixed(1)}°C</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#27272a" strokeWidth="1" />

          {/* Area Gradient fill */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Filled Area */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {/* Stroke Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#10b981"
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
              fill="#09090b"
              stroke="#10b981"
              strokeWidth="2"
              className="hover:r-5 cursor-pointer transition-all"
            />
          ))}
        </svg>
      </div>
      {/* Timeline Labels */}
      <div className="flex justify-between text-[9px] text-zinc-500 mt-1 px-1">
        <span>{new Date(points[0].hour).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(points[points.length - 1].hour).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
