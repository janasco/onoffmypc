import { Cpu, Laptop, Monitor, Terminal } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";

const devices = [
  {
    name: "Studio PC",
    platform: "Windows",
    last: "Last contact just now",
    online: true,
    icon: Monitor,
  },
  {
    name: "Home Server",
    platform: "Linux",
    last: "Last contact 2h ago",
    online: false,
    icon: Terminal,
  },
  {
    name: "Workshop PC",
    platform: "ESP32 gateway",
    last: "Last contact 12m ago",
    online: true,
    icon: Cpu,
  },
];

function StatusPill({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
        online
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function ProductPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="absolute -inset-8 rounded-[2.75rem] bg-emerald-500/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-2xl shadow-black/60">
        <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-zinc-700" />
          <span className="h-2 w-2 rounded-full bg-zinc-700" />
          <span className="h-2 w-2 rounded-full bg-zinc-700" />
          <span className="ml-3 truncate rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[9px] text-zinc-500">
            app.onoffmypc.com/devices
          </span>
          <span className="ml-auto text-[9px] text-zinc-600">Secure</span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <BrandLockup size={22} />
            <div className="hidden items-center gap-4 text-[10px] font-medium text-zinc-500 sm:flex">
              <span className="text-zinc-200">Devices</span>
              <span>Account</span>
              <span>Billing</span>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] font-semibold text-emerald-300">
              JM
            </span>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-400/80">
                Fleet
              </p>
              <p className="font-heading mt-1 text-xl font-semibold tracking-tight text-zinc-100">
                Devices
              </p>
            </div>
            <span className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[9px] font-semibold text-zinc-950">
              + Add device
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/40">
            {[
              ["Devices", "3", "text-zinc-100"],
              ["Online", "2", "text-emerald-400"],
              ["Offline", "1", "text-zinc-400"],
            ].map(([label, value, tone]) => (
              <div key={label} className="px-3 py-2.5">
                <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {label}
                </p>
                <p className={`mt-0.5 text-lg font-semibold ${tone}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1.5">
            {devices.map((device) => {
              const Icon = device.icon;
              return (
                <div
                  key={device.name}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 px-2.5 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-400">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-zinc-100">{device.name}</p>
                    <p className="truncate text-[9px] text-zinc-500">
                      {device.platform} · {device.last}
                    </p>
                  </div>
                  <StatusPill online={device.online} />
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Power controls
              </p>
              <p className="text-[9px] text-zinc-500">Studio PC</p>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <span className="rounded-lg bg-emerald-500 px-2 py-2 text-center text-[9px] font-semibold text-zinc-950">
                Power On
              </span>
              <span className="rounded-lg border border-zinc-700 px-2 py-2 text-center text-[9px] font-semibold text-zinc-300">
                Power Off
              </span>
              <span className="rounded-lg border border-zinc-700 px-2 py-2 text-center text-[9px] font-semibold text-zinc-300">
                Reset
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-3 -left-3 hidden items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-[10px] font-medium text-zinc-300 shadow-xl shadow-black/40 sm:flex">
        <Laptop className="h-3.5 w-3.5 text-emerald-400" />
        Desktop agent and ESP32 paths supported
      </div>
    </div>
  );
}
