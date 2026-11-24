import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { FirmwareFlasher } from "@/components/firmware-flasher";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export default function FlashPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
      <PublicHeader active="flash" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="ESP32 gateway"
          title="Flash your gateway"
          description="Connect the ESP32 over USB and install the firmware directly from your browser. An account is required to pair and control the gateway afterwards."
        />

        <Card className="mt-8 ring-zinc-800/80 bg-zinc-900/40">
          <CardHeader>
            <h2 className="type-card-title text-zinc-100">One-click install</h2>
            <CardDescription className="type-body-sm text-zinc-400">
              Chrome or Edge on a desktop computer, over HTTPS. No drivers or CLI needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FirmwareFlasher />
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["1", "Create an account", "Register or sign in so the gateway can be paired to your account."],
            ["2", "Connect the board", "USB data cable. Hold BOOT while plugging in if it is not detected."],
            ["3", "Flash and set up Wi-Fi", "After flashing, join the board's setup network and save your Wi-Fi."],
          ].map(([step, title, body]) => (
            <div key={step} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="type-mono flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-emerald-400">
                {step}
              </div>
              <h2 className="type-card-title mt-3 text-zinc-100">{title}</h2>
              <p className="type-body-sm mt-1.5 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>

        <p className="type-body-sm mt-8 text-zinc-400">
          Wiring, pinout and the serial monitor are in the{" "}
          <Link href="/setup" className="text-emerald-400 underline-offset-2 hover:underline">
            setup guide
          </Link>
          .
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
