import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="Company"
          title="About OnOffMyPC"
          description="Remote PC power control for your desktop computer."
        />

        <div className="type-body mt-8 flex max-w-[68ch] flex-col gap-6 text-muted-foreground">
          <p>
            OnOffMyPC lets you power your desktop PC on or off from anywhere in the world using a small, inexpensive
            ESP32 microcontroller and a simple web dashboard or native mobile application.
          </p>
          <p>
            The device connects directly to your motherboard power switch headers and sits beside your PC on your local Wi-Fi. It maintains a secure, persistent WSS connection to our backend relay, allowing commands to execute instantly without setting up VPN tunnels, configuring port forwarding, or exposing your local network to security risks.
          </p>
          <p>
            System power-on actions utilize Wake-on-LAN packets dispatched over your local network. The controller also monitors physical status (sensing power supply status lines) and reports real-time state, room temperature, and humidity directly back to your dashboard feed.
          </p>
          <p>
            OnOffMyPC is completely free to get started. All users have full access to hardware status commands, settings, and telemetry history during our public beta.
          </p>
          <div className="type-body-sm flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-5 text-muted-foreground">
            <span>
              Need assistance? Drop us a line on our{" "}
              <Link href="/contact" className="font-medium text-primary underline-offset-2 hover:underline">
                Contact Page
              </Link>.
            </span>
            <span>
              Ready to wire up your board? Read our{" "}
              <Link href="/setup" className="font-semibold text-primary underline-offset-2 hover:underline">
                Setup Guide
              </Link>.
            </span>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
