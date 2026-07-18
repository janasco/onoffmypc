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
}

interface AccountInfo {
  id: string;
  email: string;
  email_verified: boolean;
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

  // Onboarding state
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkInFlight, setBulkInFlight] = useState(false);

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    const [meRes, devRes] = await Promise.all([api.me(), api.devices()]);

    if (meRes.status === 401) {
      router.push("/login.html");
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
    router.push("/login.html");
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
    await api.sendCommand(deviceId, type);
    alert(`Command '${type}' sent successfully!`);
    loadData(true);
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

    for (const id of selectedIds) {
      await api.sendCommand(id, type);
    }

    setBulkInFlight(false);
    setSelectedIds([]);
    setBulkMode(false);
    alert("Bulk command transmission complete.");
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
                    <Link href="/setup.html" target="_blank" className="text-emerald-400 underline">
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
              <Card key={d.id} className="bg-zinc-900 border-zinc-800 flex flex-col justify-between">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(d.id)}
                          onChange={() => toggleSelectDevice(d.id)}
                          className="h-4 w-4 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                        />
                      )}
                      <div>
                        <CardTitle className="text-zinc-100 text-lg font-bold">{d.name}</CardTitle>
                        <CardDescription className="text-zinc-500 text-xs mt-0.5">
                          ID: {d.id}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
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

                <CardContent className="flex flex-col gap-6">
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

                  {/* Power Action Buttons */}
                  {!bulkMode && (
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      <Button size="sm" onClick={() => handleSendCommand(d.id, "power_on")} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                        On
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleSendCommand(d.id, "sleep")} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100">
                        Sleep
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleSendCommand(d.id, "power_off")} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100">
                        Off
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleSendCommand(d.id, "power_off_force")}>
                        Force Off
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleSendCommand(d.id, "reset")}>
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
    </div>
  );
}
