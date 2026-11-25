"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FirmwareFlasher } from "@/components/firmware-flasher";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";
import { Lightbulb } from "lucide-react";

/**
 * Minimal Web Serial surface used by this page. Only Chromium exposes
 * `navigator.serial`, and the shipped DOM lib does not type it.
 */
interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
}

interface SerialLike {
  getPorts(): Promise<SerialPortLike[]>;
  requestPort(): Promise<SerialPortLike>;
}

function getSerial(): SerialLike | undefined {
  return "serial" in navigator
    ? (navigator as Navigator & { serial: SerialLike }).serial
    : undefined;
}

/** Web Serial support is a browser capability, not React state. */
function useSerialSupported(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => "serial" in navigator,
    () => false,
  );
}

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3.5 sm:gap-4">
      <div className="type-label flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary">
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="type-card-title text-foreground">{title}</h2>
        <div className="type-body-sm mt-1.5 space-y-3 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const [port, setPort] = useState<SerialPortLike | null>(null);
  const [logs, setLogs] = useState("");
  const [statusText, setStatusText] = useState("Not connected");
  const [statusClass, setStatusClass] = useState("text-muted-foreground");
  const serialSupported = useSerialSupported();

  const keepReadingRef = useRef(false);
  const logEndRef = useRef<HTMLPreElement>(null);

  const openPort = useCallback(async (selected: SerialPortLike | null) => {
    try {
      const serial = getSerial();
      const activePort = selected ?? (await serial?.requestPort());
      if (!activePort) {
        setStatusText("No port selected");
        setStatusClass("text-red-700");
        setPort(null);
        return;
      }
      await activePort.open({ baudRate: 115200 });
      setPort(activePort);
      setStatusText("Connected — press the board's RESET button to see boot logs");
      setStatusClass("text-emerald-700 font-semibold");

      const decoder = new TextDecoder();
      keepReadingRef.current = true;

      // Run the read loop in background
      (async () => {
        while (keepReadingRef.current && activePort.readable) {
          const reader = activePort.readable.getReader();
          try {
            while (keepReadingRef.current) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                const chunk = decoder.decode(value, { stream: true });
                setLogs((prev) => {
                  const combined = prev + chunk;
                  return combined.length > 60000 ? combined.slice(-40000) : combined;
                });
              }
            }
          } catch (e) {
            console.error("Serial read error:", e);
            break;
          } finally {
            try {
              reader.releaseLock();
            } catch {}
          }
        }
        setPort(null);
        setStatusText("Disconnected");
        setStatusClass("text-muted-foreground");
      })();
    } catch {
      if (!selected) {
        setStatusText("No port selected");
        setStatusClass("text-red-700");
      }
      setPort(null);
    }
  }, []);

  // Reconnect automatically if one port is already authorized.
  useEffect(() => {
    const serial = getSerial();
    if (!serial) return;
    serial.getPorts().then((ports) => {
      if (ports.length === 1) openPort(ports[0]);
    }).catch(() => {});
    return () => {
      keepReadingRef.current = false;
    };
  }, [openPort]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
    }
  }, [logs]);

  const handleDisconnect = async () => {
    keepReadingRef.current = false;
    if (port) {
      try {
        await port.close();
      } catch {}
      setPort(null);
    }
    setStatusText("Disconnected");
    setStatusClass("text-muted-foreground");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader active="setup" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:py-12">
        <PublicPageHeader
          eyebrow="ESP32 gateway"
          title="Setup Guide"
          description="Follow these steps to flash and connect your ESP32 controller to the OnOffMyPC network."
        />

        <div className="mt-8 flex flex-col gap-8 sm:gap-10">
          {/* Tip Notice */}
          <div className="type-body-sm flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-foreground">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <strong className="font-semibold text-foreground">Browser Flashing:</strong> If you are using{" "}
              <strong className="font-semibold text-foreground">Chrome or Edge on a desktop computer</strong>, you can flash your ESP32
              microcontroller in one click directly from this page in Step 4. No additional tools or command lines required.
            </div>
          </div>

          <Step number="1" title="Create your account">
            <p>
              Register a new profile at{" "}
              <Link href="/register" className="font-medium text-primary underline-offset-2 hover:underline">
                app.onoffmypc.com/register
              </Link>{" "}
              using your email address and password.
            </p>
          </Step>

          <Step number="2" title="Add a device in the dashboard">
            <p>
              Access your dashboard at{" "}
              <Link href="/dashboard" className="font-medium text-primary underline-offset-2 hover:underline">
                app.onoffmypc.com
              </Link>
              , click <strong className="font-semibold text-foreground">Add Device</strong>, and assign it a descriptive name. Note down the short{" "}
              <code className="type-mono rounded border border-border bg-secondary px-1.5 py-0.5 text-foreground">
                pairing code
              </code>{" "}
              (e.g., <code className="type-mono text-foreground">7QK2-9F3D</code>) displayed on-screen. This single-use code expires after 15 minutes, but you can always refresh or request a new one inside the device settings.
            </p>
          </Step>

          <Step number="3" title="Identify your PC MAC Address">
            <p>
              Wake-on-LAN packets target your motherboard adapter&apos;s physical MAC address.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Card className="bg-card p-3.5 ring-border">
                <span className="type-label block text-foreground">Windows OS</span>
                <p className="type-metadata mt-1 text-muted-foreground">
                  Open Command Prompt, execute <code className="type-mono rounded border border-border bg-secondary px-1 py-0.5 text-foreground">ipconfig /all</code>, and locate the 12-digit physical address of your primary Ethernet connection.
                </p>
              </Card>
              <Card className="bg-card p-3.5 ring-border">
                <span className="type-label block text-foreground">Linux / macOS</span>
                <p className="type-metadata mt-1 text-muted-foreground">
                  Open Terminal and execute <code className="type-mono rounded border border-border bg-secondary px-1 py-0.5 text-foreground">ip link</code> or <code className="type-mono rounded border border-border bg-secondary px-1 py-0.5 text-foreground">ifconfig</code>. Look for the address formatted like <code className="type-mono text-foreground">AA:BB:CC:DD:EE:FF</code>.
                </p>
              </Card>
            </div>
          </Step>

          <Step number="4" title="Flash your board">
            <p>
              Plug your ESP32 module into your desktop using a USB data cable. On compatible browsers, flash the firmware directly by clicking below.
            </p>

            <FirmwareFlasher />

            <div className="rounded-lg border border-border bg-card p-3">
              <span className="type-label block text-foreground">Manual Flash Option:</span>
              <p className="mt-1">
                Download the binary payload from the{" "}
                <a href="/firmware/onoffmypc-firmware-1.3.7.bin" className="font-medium text-primary underline underline-offset-2">
                  firmware binary
                </a>{" "}
                and use the Espressif CLI tools:
              </p>
              <pre className="type-mono mt-2 max-w-full whitespace-pre-wrap break-all rounded border border-border bg-secondary/60 p-2.5 text-foreground">
                esptool.py --chip esp32 write_flash 0x0 onoffmypc-firmware-latest.bin
              </pre>
            </div>
          </Step>

          <Step number="5" title="Connect to setup Wi-Fi">
            <p>
              Upon rebooting, the board creates a temporary hot-spot named <strong className="font-semibold text-foreground">OnOffMyPC-XXXXXX</strong>. Join this network using a phone or laptop.
            </p>
            <p>
              A configuration page should open automatically. If it doesn&apos;t, navigate to{" "}
              <code className="type-mono text-foreground">http://192.168.4.1</code>. Select your local Wi-Fi, enter your password, paste the pairing code, configure the target PC&apos;s MAC address, and input the 6-digit setup PIN. Click <strong className="font-semibold text-foreground">Save &amp; Connect</strong> to finalize.
            </p>

            {/* Web Serial Logs Console */}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/60 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/60" />
                  <span className={`type-metadata min-w-0 break-words ${statusClass}`}>{statusText}</span>
                </div>
                <div className="flex gap-2">
                  {!port ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!serialSupported}
                      onClick={() => openPort(null)}
                      className="h-9 px-3 text-xs font-semibold"
                    >
                      📟 Open Serial Logs
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLogs("")}
                        className="h-9 px-3 text-xs"
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDisconnect}
                        className="h-9 text-xs"
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {port && (
                <pre
                  ref={logEndRef}
                  className="type-mono h-[220px] max-w-full overflow-y-auto whitespace-pre-wrap break-words rounded border-t border-border bg-secondary/40 p-4 text-emerald-900"
                >
                  {logs || "Waiting for serial feed... Press the RESET button on your ESP32 board."}
                </pre>
              )}

              <div className="type-metadata border-t border-border bg-secondary/30 p-3 text-muted-foreground">
                {!serialSupported ? (
                  <span className="text-red-700">Live console logs are only supported in Google Chrome or Edge on desktop platforms.</span>
                ) : (
                  <span>Allows you to read boot logs, Wi-Fi password, and the 6-digit Setup PIN directly without external software.</span>
                )}
              </div>
            </div>
          </Step>

          <Step number="6" title="Hardware Wiring Pinout">
            <p>
              Disconnect the device from power and connect it to your motherboard headers using this guide:
            </p>

            {/* Pinout Table */}
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="type-metadata w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-secondary/60 text-foreground">
                    <th className="type-label p-3">ESP32 Pin</th>
                    <th className="type-label p-3">Motherboard Target</th>
                    <th className="type-label p-3">Function</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border hover:bg-secondary/40">
                    <td className="type-mono p-3 font-semibold text-emerald-800">GPIO 26</td>
                    <td className="p-3 text-foreground">PWR_BTN Header</td>
                    <td className="p-3 text-muted-foreground">Pulses power lines. Hold for 6s to trigger Force Off.</td>
                  </tr>
                  <tr className="border-b border-border hover:bg-secondary/40">
                    <td className="type-mono p-3 font-semibold text-emerald-800">GPIO 27</td>
                    <td className="p-3 text-foreground">RESET Header</td>
                    <td className="p-3 text-muted-foreground">Pulses system lines to reset the PC.</td>
                  </tr>
                  <tr className="border-b border-border hover:bg-secondary/40">
                    <td className="type-mono p-3 font-semibold text-emerald-800">GPIO 34</td>
                    <td className="p-3 text-foreground">Power-LED (+) Header</td>
                    <td className="p-3 text-muted-foreground">Senses whether the computer is powered on (input-only).</td>
                  </tr>
                  <tr className="border-b border-border hover:bg-secondary/40">
                    <td className="type-mono p-3 font-semibold text-emerald-800">GPIO 4</td>
                    <td className="p-3 text-foreground">DHT22 Data Line</td>
                    <td className="p-3 text-muted-foreground">Reads room temperature and humidity (optional).</td>
                  </tr>
                  <tr className="border-b border-border hover:bg-secondary/40">
                    <td className="type-mono p-3 font-semibold text-muted-foreground">GND</td>
                    <td className="p-3 text-foreground">Ground Pins</td>
                    <td className="p-3 text-muted-foreground">Common Ground (Shared). Required.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="type-metadata rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
              <strong className="font-semibold text-amber-950">Important safety tip:</strong> Use a simple opto-isolator or transistor between the GPIOs and motherboard power/reset headers instead of a raw direct connection to avoid electrical surges or damaging maternal controllers.
            </div>
          </Step>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
