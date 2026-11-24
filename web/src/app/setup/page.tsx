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
      <div className="type-label flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-emerald-400">
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="type-card-title text-zinc-100">{title}</h2>
        <div className="type-body-sm mt-1.5 space-y-3 text-zinc-400">{children}</div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const [port, setPort] = useState<SerialPortLike | null>(null);
  const [logs, setLogs] = useState("");
  const [statusText, setStatusText] = useState("Not connected");
  const [statusClass, setStatusClass] = useState("text-zinc-400");
  const serialSupported = useSerialSupported();

  const keepReadingRef = useRef(false);
  const logEndRef = useRef<HTMLPreElement>(null);

  const openPort = useCallback(async (selected: SerialPortLike | null) => {
    try {
      const serial = getSerial();
      const activePort = selected ?? (await serial?.requestPort());
      if (!activePort) {
        setStatusText("No port selected");
        setStatusClass("text-red-400");
        setPort(null);
        return;
      }
      await activePort.open({ baudRate: 115200 });
      setPort(activePort);
      setStatusText("Connected — press the board's RESET button to see boot logs");
      setStatusClass("text-emerald-400 font-semibold");

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
        setStatusClass("text-zinc-400");
      })();
    } catch {
      if (!selected) {
        setStatusText("No port selected");
        setStatusClass("text-red-400");
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
    setStatusClass("text-zinc-400");
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
      <PublicHeader active="setup" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:py-12">
        <PublicPageHeader
          eyebrow="ESP32 gateway"
          title="Setup Guide"
          description="Follow these steps to flash and connect your ESP32 controller to the OnOffMyPC network."
        />

        <div className="mt-8 flex flex-col gap-8 sm:gap-10">
          {/* Tip Notice */}
          <div className="type-body-sm flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-300">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <div>
              <strong className="font-semibold text-zinc-100">Browser Flashing:</strong> If you are using{" "}
              <strong className="font-semibold text-zinc-100">Chrome or Edge on a desktop computer</strong>, you can flash your ESP32
              microcontroller in one click directly from this page in Step 4. No additional tools or command lines required.
            </div>
          </div>

          <Step number="1" title="Create your account">
            <p>
              Register a new profile at{" "}
              <Link href="/register" className="text-emerald-400 underline-offset-2 hover:underline">
                app.onoffmypc.com/register
              </Link>{" "}
              using your email address and password.
            </p>
          </Step>

          <Step number="2" title="Add a device in the dashboard">
            <p>
              Access your dashboard at{" "}
              <Link href="/dashboard" className="text-emerald-400 underline-offset-2 hover:underline">
                app.onoffmypc.com
              </Link>
              , click <strong className="font-semibold text-zinc-200">Add Device</strong>, and assign it a descriptive name. Note down the short{" "}
              <code className="type-mono rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-200">
                pairing code
              </code>{" "}
              (e.g., <code className="type-mono text-xs text-zinc-300">7QK2-9F3D</code>) displayed on-screen. This single-use code expires after 15 minutes, but you can always refresh or request a new one inside the device settings.
            </p>
          </Step>

          <Step number="3" title="Identify your PC MAC Address">
            <p>
              Wake-on-LAN packets target your motherboard adapter&apos;s physical MAC address.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Card className="ring-zinc-800/80 bg-zinc-900/40 p-3.5">
                <span className="type-label block text-zinc-300">Windows OS</span>
                <p className="type-metadata mt-1 text-zinc-400">
                  Open Command Prompt, execute <code className="type-mono rounded bg-zinc-950 px-1 py-0.5 text-xs text-zinc-200">ipconfig /all</code>, and locate the 12-digit physical address of your primary Ethernet connection.
                </p>
              </Card>
              <Card className="ring-zinc-800/80 bg-zinc-900/40 p-3.5">
                <span className="type-label block text-zinc-300">Linux / macOS</span>
                <p className="type-metadata mt-1 text-zinc-400">
                  Open Terminal and execute <code className="type-mono rounded bg-zinc-950 px-1 py-0.5 text-xs text-zinc-200">ip link</code> or <code className="type-mono rounded bg-zinc-950 px-1 py-0.5 text-xs text-zinc-200">ifconfig</code>. Look for the address formatted like <code className="type-mono text-xs text-zinc-300">AA:BB:CC:DD:EE:FF</code>.
                </p>
              </Card>
            </div>
          </Step>

          <Step number="4" title="Flash your board">
            <p>
              Plug your ESP32 module into your desktop using a USB data cable. On compatible browsers, flash the firmware directly by clicking below.
            </p>

            <div className="[&_a[href^='/register']]:bg-emerald-500 [&_a[href^='/register']]:text-zinc-950 [&_a[href^='/register']]:hover:bg-emerald-400 [&_button[slot='activate']]:bg-emerald-500 [&_button[slot='activate']]:text-zinc-950 [&_button[slot='activate']]:hover:bg-emerald-400">
              <FirmwareFlasher />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
              <span className="type-label block text-zinc-300">Manual Flash Option:</span>
              <p className="mt-1">
                Download the binary payload from the{" "}
                <a href="/firmware/onoffmypc-firmware-1.3.7.bin" className="text-emerald-400 underline underline-offset-2">
                  firmware binary
                </a>{" "}
                and use the Espressif CLI tools:
              </p>
              <pre className="type-mono mt-2 max-w-full whitespace-pre-wrap break-all rounded bg-zinc-950 p-2.5 text-xs text-zinc-300">
                esptool.py --chip esp32 write_flash 0x0 onoffmypc-firmware-latest.bin
              </pre>
            </div>
          </Step>

          <Step number="5" title="Connect to setup Wi-Fi">
            <p>
              Upon rebooting, the board creates a temporary hot-spot named <strong className="font-semibold text-zinc-200">OnOffMyPC-XXXXXX</strong>. Join this network using a phone or laptop.
            </p>
            <p>
              A configuration page should open automatically. If it doesn&apos;t, navigate to{" "}
              <code className="type-mono text-xs text-zinc-200">http://192.168.4.1</code>. Select your local Wi-Fi, enter your password, paste the pairing code, configure the target PC&apos;s MAC address, and input the 6-digit setup PIN. Click <strong className="font-semibold text-zinc-200">Save &amp; Connect</strong> to finalize.
            </p>

            {/* Web Serial Logs Console */}
            <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-500" />
                  <span className={`type-metadata min-w-0 break-words ${statusClass}`}>{statusText}</span>
                </div>
                <div className="flex gap-2">
                  {!port ? (
                    <Button
                      size="sm"
                      disabled={!serialSupported}
                      onClick={() => openPort(null)}
                      className="h-9 bg-zinc-800 px-3 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
                    >
                      📟 Open Serial Logs
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setLogs("")}
                        className="h-9 bg-zinc-800 px-3 text-xs text-zinc-100 hover:bg-zinc-700"
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
                  className="type-mono h-[220px] max-w-full overflow-y-auto whitespace-pre-wrap break-words rounded bg-zinc-950 p-4 text-xs text-emerald-300"
                >
                  {logs || "Waiting for serial feed... Press the RESET button on your ESP32 board."}
                </pre>
              )}

              <div className="type-metadata bg-zinc-900/40 p-3 text-zinc-400">
                {!serialSupported ? (
                  <span className="text-red-400">Live console logs are only supported in Google Chrome or Edge on desktop platforms.</span>
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
            <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/20">
              <table className="type-metadata w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-300">
                    <th className="type-label p-3">ESP32 Pin</th>
                    <th className="type-label p-3">Motherboard Target</th>
                    <th className="type-label p-3">Function</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/10">
                    <td className="type-mono p-3 font-semibold text-emerald-400">GPIO 26</td>
                    <td className="p-3 text-zinc-100">PWR_BTN Header</td>
                    <td className="p-3 text-zinc-400">Pulses power lines. Hold for 6s to trigger Force Off.</td>
                  </tr>
                  <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/10">
                    <td className="type-mono p-3 font-semibold text-emerald-400">GPIO 27</td>
                    <td className="p-3 text-zinc-100">RESET Header</td>
                    <td className="p-3 text-zinc-400">Pulses system lines to reset the PC.</td>
                  </tr>
                  <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/10">
                    <td className="type-mono p-3 font-semibold text-emerald-400">GPIO 34</td>
                    <td className="p-3 text-zinc-100">Power-LED (+) Header</td>
                    <td className="p-3 text-zinc-400">Senses whether the computer is powered on (input-only).</td>
                  </tr>
                  <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/10">
                    <td className="type-mono p-3 font-semibold text-emerald-400">GPIO 4</td>
                    <td className="p-3 text-zinc-100">DHT22 Data Line</td>
                    <td className="p-3 text-zinc-400">Reads room temperature and humidity (optional).</td>
                  </tr>
                  <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/10">
                    <td className="type-mono p-3 font-semibold text-zinc-400">GND</td>
                    <td className="p-3 text-zinc-100">Ground Pins</td>
                    <td className="p-3 text-zinc-400">Common Ground (Shared). Required.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="type-metadata rounded-lg border border-zinc-800 bg-zinc-900/20 p-3">
              <strong className="font-semibold text-zinc-200">Important safety tip:</strong> Use a simple opto-isolator or transistor between the GPIOs and motherboard power/reset headers instead of a raw direct connection to avoid electrical surges or damaging maternal controllers.
            </div>
          </Step>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
