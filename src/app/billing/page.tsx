"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

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

  const loadBillingData = async () => {
    setLoading(true);
    const [statusRes, requestsRes] = await Promise.all([
      api.billingStatus(),
      api.billingRequests(),
    ]);

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
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleCheckout = async (deviceId: string) => {
    if (checkoutBusy) return;
    setCheckoutBusy(true);

    const { data, error } = await api.billingCheckout(deviceId);
    if (error || !data?.url) {
      alert(`Checkout failed: ${error || "Invalid response URL"}`);
      setCheckoutBusy(false);
      return;
    }

    // Redirect directly to the secure checkout destination URL
    window.location.href = data.url;
  };

  const handleOpenPortal = async () => {
    const { data, error } = await api.billingPortal();
    if (error || !data?.url) {
      alert(`Portal load failed: ${error || "Invalid portal response"}`);
      return;
    }
    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-emerald-500">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 3v9" />
                <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
              </svg>
            </span>
            <span className="font-semibold text-lg text-zinc-100">OnOffMyPC</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                ← Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Billing & subscriptions</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage power control unlocks, invoices, and billing history</p>
          </div>
          <Button onClick={handleOpenPortal} className="bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 h-10 px-5 self-start">
            Manage receipts
          </Button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-400 py-16">Loading billing data…</div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Device Unlocks */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100 text-lg font-bold">Device Licenses</CardTitle>
                <CardDescription className="text-zinc-400">
                  Power control licenses configured per device endpoints
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {devices.length === 0 ? (
                  <p className="text-center text-zinc-500 py-6 text-sm">No devices found. Add devices in the dashboard first.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {devices.map((d) => (
                      <div key={d.id} className="flex justify-between items-center p-4 bg-zinc-950/65 rounded-xl border border-zinc-850">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-zinc-200 text-sm">{d.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">ID: {d.id}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${d.unlocked ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                            {d.unlocked ? "Unlocked" : "Trial status"}
                          </span>
                          {!d.unlocked && (
                            <Button
                              onClick={() => handleCheckout(d.id)}
                              disabled={checkoutBusy}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 text-xs"
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
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100 text-lg font-bold">Billing History</CardTitle>
                <CardDescription className="text-zinc-400">
                  Past invoices and checkout requests
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {history.length === 0 ? (
                  <p className="text-center text-zinc-500 py-8 text-sm">No transactions recorded yet.</p>
                ) : (
                  <Table className="text-zinc-300">
                    <TableHeader className="border-zinc-800">
                      <TableRow>
                        <TableHead className="text-zinc-400">Date</TableHead>
                        <TableHead className="text-zinc-400">Device ID</TableHead>
                        <TableHead className="text-zinc-400">Amount</TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={h.id} className="border-zinc-800 hover:bg-zinc-850/30">
                          <TableCell className="text-sm">
                            {new Date(h.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {h.device_id}
                          </TableCell>
                          <TableCell className="text-sm font-semibold">
                            ${(h.amount / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${h.status === "paid" || h.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}>
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
