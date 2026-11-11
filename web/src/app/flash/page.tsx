import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FirmwareFlasher } from "@/components/firmware-flasher";
import { PublicHeader } from "@/components/public-header";

export default function FlashPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <PublicHeader active="flash" />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">ESP32 gateway</span>
          <h1 className="text-4xl font-extrabold tracking-tight mt-1">Flash your gateway</h1>
          <p className="text-zinc-400 mt-3 leading-relaxed">
            Connect the ESP32 over USB and install the firmware directly from your browser.
            An account is required to pair and control the gateway afterwards.
          </p>
        </div>

        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">One-click install</CardTitle>
            <CardDescription className="text-zinc-400">
              Chrome or Edge on a desktop computer, over HTTPS. No drivers or CLI needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FirmwareFlasher />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 mt-8">
          {[
            ["1", "Create an account", "Register or sign in so the gateway can be paired to your account."],
            ["2", "Connect the board", "USB data cable. Hold BOOT while plugging in if it is not detected."],
            ["3", "Flash and set up Wi-Fi", "After flashing, join the board's setup network and save your Wi-Fi."],
          ].map(([step, title, body]) => (
            <div key={step} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-sm font-bold text-emerald-400">
                {step}
              </div>
              <h2 className="mt-3 text-sm font-bold text-zinc-100">{title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{body}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-zinc-500 mt-8">
          Wiring, pinout and the serial monitor are in the{" "}
          <Link href="/setup" className="text-emerald-400 hover:underline">
            setup guide
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
