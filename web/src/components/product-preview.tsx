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
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
        online
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function ProductPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-32px_rgba(18,22,18,0.35)]">
        <div className="flex items-center gap-1.5 border-b border-border bg-secondary/70 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="ml-2 min-w-0 flex-1 truncate rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground">
            app.onoffmypc.com/devices
          </span>
        </div>

        <div className="bg-background p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <BrandLockup size={22} />
            <div className="hidden items-center gap-4 text-xs font-semibold text-muted-foreground sm:flex">
              <span className="text-foreground">Devices</span>
              <span>Account</span>
              <span>Billing</span>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-emerald-800">
              JM
            </span>
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="type-overline text-primary">Fleet</p>
              <p className="type-card-title mt-1 text-foreground">Devices</p>
            </div>
            <span className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">
              + Add device
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
            {[
              ["Devices", "3", "text-foreground"],
              ["Online", "2", "text-emerald-700"],
              ["Offline", "1", "text-foreground"],
            ].map(([label, value, tone]) => (
              <div key={label} className="min-w-0 px-2.5 py-2.5 sm:px-3">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{device.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {device.platform}
                      <span className="hidden sm:inline"> · {device.last}</span>
                    </p>
                  </div>
                  <StatusPill online={device.online} />
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Power controls
              </p>
              <p className="truncate text-xs text-muted-foreground">Studio PC</p>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <span className="rounded-lg bg-primary px-1.5 py-2 text-center text-xs font-semibold text-primary-foreground sm:px-2">
                Power On
              </span>
              <span className="rounded-lg border border-border bg-background px-1.5 py-2 text-center text-xs font-semibold text-foreground sm:px-2">
                Power Off
              </span>
              <span className="rounded-lg border border-border bg-background px-1.5 py-2 text-center text-xs font-semibold text-foreground sm:px-2">
                Reset
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
