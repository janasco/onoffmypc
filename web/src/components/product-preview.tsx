import { Cpu, Monitor, Terminal } from "lucide-react";
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
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
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
      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-2xl shadow-black/60">
        <div className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
          <span className="ml-2 min-w-0 flex-1 truncate rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
            app.onoffmypc.com/devices
          </span>
        </div>

        <div className="p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <BrandLockup size={22} />
            <div className="hidden items-center gap-4 text-xs font-medium text-zinc-400 sm:flex">
              <span className="text-zinc-100">Devices</span>
              <span>Account</span>
              <span>Billing</span>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300">
              JM
            </span>
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="type-overline text-emerald-400">Fleet</p>
              <p className="type-card-title mt-1 text-zinc-100">Devices</p>
            </div>
            <span className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-950">
              + Add device
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/40">
            {[
              ["Devices", "3", "text-zinc-100"],
              ["Online", "2", "text-emerald-400"],
              ["Offline", "1", "text-zinc-300"],
            ].map(([label, value, tone]) => (
              <div key={label} className="min-w-0 px-2.5 py-2.5 sm:px-3">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
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
                    <p className="truncate text-[13px] font-semibold text-zinc-100">{device.name}</p>
                    <p className="truncate text-[11px] text-zinc-400">
                      {device.platform}
                      <span className="hidden sm:inline"> · {device.last}</span>
                    </p>
                  </div>
                  <StatusPill online={device.online} />
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Power controls
              </p>
              <p className="truncate text-[11px] text-zinc-400">Studio PC</p>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <span className="rounded-lg bg-emerald-500 px-2 py-2 text-center text-[11px] font-semibold text-zinc-950">
                Power On
              </span>
              <span className="rounded-lg border border-zinc-700 px-2 py-2 text-center text-[11px] font-semibold text-zinc-200">
                Power Off
              </span>
              <span className="rounded-lg border border-zinc-700 px-2 py-2 text-center text-[11px] font-semibold text-zinc-200">
                Reset
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
