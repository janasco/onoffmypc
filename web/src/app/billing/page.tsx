"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { AppHeader } from "@/components/app-header";
import { PlatformPageHeader } from "@/components/platform-page-header";

interface BillingDevice {
  id: string;
  name: string;
  pc_on: number | null;
  unlocked: boolean;
  price_formatted: string;
}

interface BillingRequest {
  id: string;
  checkout_id: string;
  device_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<BillingDevice[]>([]);
  const [history, setHistory] = useState<BillingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  interface BillingStatusResponse {
    devices?: BillingDevice[];
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // `loading` starts as true, so the first state write happens only after
      // the requests resolve — no cascading render on mount.
      const [statusRes, requestsRes] = await Promise.all([
        api.billingStatus<BillingStatusResponse>(),
        api.billingRequests<BillingRequest[]>(),
      ]);
      if (cancelled) return;

      if (statusRes.status === 401) {
        router.push("/login");
        return;
      }

      if (statusRes.data && Array.isArray(statusRes.data.devices)) {
        setDevices(statusRes.data.devices);
      }
      if (requestsRes.data && Array.isArray(requestsRes.data)) {
        setHistory(requestsRes.data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleCheckout = async (deviceId: string) => {
    if (checkoutBusy) return;
    setCheckoutBusy(true);

    const { data, error } = await api.billingCheckout<{ url?: string }>(deviceId);
    if (error || !data?.url) {
      alert(`Checkout failed: ${error || "Invalid response URL"}`);
      setCheckoutBusy(false);
      return;
    }

    // Redirect directly to the secure checkout destination URL
    window.location.assign(data.url);
  };

  const handleOpenPortal = async () => {
    const { data, error } = await api.billingPortal<{ url?: string }>();
    if (error || !data?.url) {
      alert(`Portal load failed: ${error || "Invalid portal response"}`);
      return;
    }
    window.location.assign(data.url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <PlatformPageHeader
          eyebrow="Billing"
          title="Billing & subscriptions"
          description="Manage power control unlocks, invoices, and billing history."
          actions={
            <Button
              onClick={handleOpenPortal}
              variant="outline"
              className="min-h-11 border-zinc-700 px-5 text-zinc-200 hover:bg-zinc-900"
            >
              Manage receipts
            </Button>
          }
        />

        {loading ? (
          <div className="py-16 text-center type-body-sm text-zinc-400">Loading billing data…</div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Device Unlocks */}
            <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
              <CardHeader>
                <CardTitle className="type-card-title text-zinc-100">Device licenses</CardTitle>
                <p className="type-body-sm text-zinc-400">
                  Power control licenses configured per device endpoint
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {devices.length === 0 ? (
                  <p className="py-6 text-center type-body-sm text-zinc-400">No devices found. Add devices in the dashboard first.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {devices.map((d) => (
                      <div key={d.id} className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="type-label text-zinc-100">{d.name}</span>
                          <span className="type-mono break-all text-zinc-400">ID: {d.id}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${d.unlocked ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
                            {d.unlocked ? "Unlocked" : "Trial status"}
                          </span>
                          {!d.unlocked && (
                            <Button
                              onClick={() => handleCheckout(d.id)}
                              disabled={checkoutBusy}
                              className="min-h-11 px-4"
                            >
                              Unlock ({d.price_formatted || "$19.00"})
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoices / Transactions history */}
            <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
              <CardHeader>
                <CardTitle className="type-card-title text-zinc-100">Billing history</CardTitle>
                <p className="type-body-sm text-zinc-400">
                  Past invoices and checkout requests
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {history.length === 0 ? (
                  <p className="py-8 text-center type-body-sm text-zinc-400">No transactions recorded yet.</p>
                ) : (
                  <Table className="text-zinc-300">
                    <TableHeader className="border-zinc-800">
                      <TableRow>
                        <TableHead className="type-overline text-zinc-400">Date</TableHead>
                        <TableHead className="type-overline text-zinc-400">Device ID</TableHead>
                        <TableHead className="type-overline text-zinc-400">Amount</TableHead>
                        <TableHead className="type-overline text-zinc-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={h.id} className="border-zinc-800 hover:bg-zinc-800/30">
                          <TableCell className="type-metadata text-zinc-300">
                            {new Date(h.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="type-mono break-all text-zinc-400">
                            {h.device_id}
                          </TableCell>
                          <TableCell className="type-mono text-zinc-100">
                            ${(h.amount / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${h.status === "paid" || h.status === "approved" ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-300"}`}>
                              {h.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
