import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { FirmwareFlasher } from "@/components/firmware-flasher";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export default function FlashPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader active="flash" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="ESP32 gateway"
          title="Flash your gateway"
          description="Connect the ESP32 over USB and install the firmware directly from your browser. An account is required to pair and control the gateway afterwards."
        />

        <Card className="mt-8 bg-card ring-border">
          <CardHeader className="border-b border-border">
            <h2 className="type-card-title text-foreground">One-click install</h2>
            <CardDescription className="type-body-sm text-muted-foreground">
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
            <div key={step} className="rounded-xl border border-border bg-card p-4">
              <div className="type-mono flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-primary">
                {step}
              </div>
              <h2 className="type-card-title mt-3 text-foreground">{title}</h2>
              <p className="type-body-sm mt-1.5 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <p className="type-body-sm mt-8 text-muted-foreground">
          Wiring, pinout and the serial monitor are in the{" "}
          <Link href="/setup" className="font-medium text-primary underline-offset-2 hover:underline">
            setup guide
          </Link>
          .
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
