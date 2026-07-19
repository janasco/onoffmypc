"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SetupPage() {
  const [port, setPort] = useState<any>(null);
  const [logs, setLogs] = useState("");
  const [statusText, setStatusText] = useState("Not connected");
  const [statusClass, setStatusClass] = useState("text-zinc-400");
  const [serialSupported, setSerialSupported] = useState(false);

  const keepReadingRef = useRef(false);
  const logEndRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setSerialSupported("serial" in navigator);
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
    }
  }, [logs]);

  // Reconnect automatically if one port is already authorized
  useEffect(() => {
    if ("serial" in navigator) {
      (navigator as any).serial.getPorts().then((ports: any[]) => {
        if (ports.length === 1) {
          openPort(ports[0]);
        }
      }).catch(() => {});
    }
    return () => {
      keepReadingRef.current = false;
    };
  }, []);

  const openPort = async (selected: any) => {
    try {
      const activePort = selected || (await (navigator as any).serial.requestPort());
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
        setStatusClass("text-zinc-500");
      })();
    } catch (e) {
      if (!selected) {
        setStatusText("No port selected");
        setStatusClass("text-red-400");
      }
      setPort(null);
    }
  };

  const handleDisconnect = async () => {
    keepReadingRef.current = false;
    if (port) {
      try {
        await port.close();
      } catch (e) {}
      setPort(null);
    }
    setStatusText("Disconnected");
    setStatusClass("text-zinc-500");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
      <Script type="module" src="/vendor/esp-web-tools/install-button.js" strategy="lazyOnload" />

      {/* Navbar */}
      <nav className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:opacity-90 transition-opacity">
            <span className="text-emerald-500">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 3v9" />
                <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
              </svg>
            </span>
            OnOffMyPC
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-zinc-400 hover:text-zinc-100 transition-colors">Home</Link>
            <Link href="/setup" className="text-emerald-400 font-semibold">Setup</Link>
            <Link href="/login" className="text-zinc-400 hover:text-zinc-100 transition-colors">Log in</Link>
            <Link href="/register">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight">Setup Guide</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Follow these steps to flash and connect your ESP32 controller to the OnOffMyPC network.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {/* Tip Notice */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 flex items-start gap-3">
            <span className="text-emerald-500 text-lg mt-0.5">💡</span>
            <div>
              <strong className="text-zinc-200">Browser Flashing:</strong> If you are using{" "}
              <strong className="text-zinc-200">Chrome or Edge on a desktop computer</strong>, you can flash your ESP32
              microcontroller in one click directly from this page in Step 4. No additional tools or command lines required.
            </div>
          </div>

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
              1
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-zinc-100">Create your account</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Register a new profile at{" "}
                <Link href="/register" className="text-emerald-400 hover:underline">
                  app.onoffmypc.com/register
                </Link>{" "}
                using your email address and password.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
              2
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-zinc-100">Add a device in the dashboard</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Access your dashboard at{" "}
                <Link href="/dashboard" className="text-emerald-400 hover:underline">
                  app.onoffmypc.com
                </Link>
                , click <strong>Add Device</strong>, and assign it a descriptive name. Note down the short{" "}
                <code className="bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-200 text-xs font-semibold">
                  pairing code
                </code>{" "}
                (e.g., <code>7QK2-9F3D</code>) displayed on-screen. This single-use code expires after 15 minutes, but you can always refresh or request a new one inside the device settings.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
              3
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-zinc-100">Identify your PC MAC Address</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Wake-on-LAN packets target your motherboard adapter's physical MAC address.
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-zinc-900/40 border-zinc-800 p-3">
                  <span className="text-xs font-semibold text-zinc-400 block mb-1">Windows OS</span>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Open Command Prompt, execute <code className="bg-zinc-950 px-1 py-0.5 rounded">ipconfig /all</code>, and locate the 12-digit physical address of your primary Ethernet connection.
                  </p>
                </Card>
                <Card className="bg-zinc-900/40 border-zinc-800 p-3">
                  <span className="text-xs font-semibold text-zinc-400 block mb-1">Linux / macOS</span>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Open Terminal and execute <code className="bg-zinc-950 px-1 py-0.5 rounded">ip link</code> or <code className="bg-zinc-950 px-1 py-0.5 rounded">ifconfig</code>. Look for the address formatted like <code className="text-zinc-400">AA:BB:CC:DD:EE:FF</code>.
                  </p>
                </Card>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
              4
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-zinc-100">Flash your board</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Plug your ESP32 module into your desktop using a USB data cable. On compatible browsers, flash the firmware directly by clicking below.
              </p>

              {/* Install Button Wrapper */}
              <div className="my-4">
                {/* @ts-ignore */}
                <esp-web-install-button manifest="/firmware/manifest.json">
                  <Button slot="activate" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-5 cursor-pointer">
                    ⚡ One-Click Flash
                  </Button>
                  <span slot="unsupported" className="text-xs text-amber-500 block mt-2">
                    ⚠️ Your browser does not support Web Serial tools. Use Chrome or Edge on desktop, or flash manually.
                  </span>
                  <span slot="not-allowed" className="text-xs text-amber-500 block mt-2">
                    ⚠️ Flashing requires an active secure (HTTPS) connection.
                  </span>
                {/* @ts-ignore */}
                </esp-web-install-button>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-850 p-3 rounded-lg text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-300 block mb-1">Manual Flash Option:</span>
                Download the binary payload from the{" "}
                <a href="https://github.com/onoffmypc/onoffmypc-release/releases" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">
                  firmware releases page
                </a>{" "}
                and use the Espressif CLI tools:
                <pre className="bg-zinc-950 text-zinc-300 p-2 rounded mt-1.5 overflow-x-auto font-mono text-[10px]">
                  esptool.py --chip esp32 write_flash 0x0 onoffmypc-firmware-latest.bin
                </pre>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
              5
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-zinc-100">Connect to setup Wi-Fi</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Upon rebooting, the board creates a temporary hot-spot named <strong>OnOffMyPC-XXXXXX</strong>. Join this network using a phone or laptop.
              </p>
              <p className="text-zinc-400 text-sm mt-2">
                A configuration page should open automatically. If it doesn't, navigate to{" "}
                <code className="text-zinc-200">http://192.168.4.1</code>. Select your local Wi-Fi, enter your password, paste the pairing code, configure the target PC's MAC address, and input the 6-digit setup PIN. Click <strong>Save &amp; Connect</strong> to finalize.
              </p>

              {/* Web Serial Logs Console */}
              <div className="mt-4 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
                <div className="bg-zinc-900 px-4 py-3 flex flex-wrap justify-between items-center gap-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
                    <span className={`text-xs ${statusClass}`}>{statusText}</span>
                  </div>
                  <div className="flex gap-2">
                    {!port ? (
                      <Button
                        size="sm"
                        disabled={!serialSupported}
                        onClick={() => openPort(null)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold h-8"
                      >
                        📟 Open Serial Logs
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setLogs("")}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs h-8"
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDisconnect}
                          className="text-xs h-8"
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
                    className="p-4 bg-zinc-950 font-mono text-[11px] text-emerald-500/90 h-[220px] overflow-y-auto whitespace-pre-wrap scrollbar-thin"
                  >
                    {logs || "Waiting for serial feed... Press the RESET button on your ESP32 board."}
                  </pre>
                )}

                <div className="p-3 bg-zinc-900/40 text-[10px] text-zinc-500">
                  {!serialSupported ? (
                    <span className="text-red-400">Live console logs are only supported in Google Chrome or Edge on desktop platforms.</span>
                  ) : (
                    <span>Allows you to read boot logs, Wi-Fi password, and the 6-digit Setup PIN directly without external software.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
              6
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-zinc-100">Hardware Wiring Pinout</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Disconnect the device from power and connect it to your motherboard headers using this guide:
              </p>

              {/* Pinout Table */}
              <div className="mt-3 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
                      <th className="p-3 font-semibold">ESP32 Pin</th>
                      <th className="p-3 font-semibold">Motherboard Target</th>
                      <th className="p-3 font-semibold">Function</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-850/60 hover:bg-zinc-800/10">
                      <td className="p-3 font-mono font-semibold text-emerald-400">GPIO 26</td>
                      <td className="p-3 text-zinc-200">PWR_BTN Header</td>
                      <td className="p-3 text-zinc-400">Pulses power lines. Hold for 6s to trigger Force Off.</td>
                    </tr>
                    <tr className="border-b border-zinc-850/60 hover:bg-zinc-800/10">
                      <td className="p-3 font-mono font-semibold text-emerald-400">GPIO 27</td>
                      <td className="p-3 text-zinc-200">RESET Header</td>
                      <td className="p-3 text-zinc-400">Pulses system lines to reset the PC.</td>
                    </tr>
                    <tr className="border-b border-zinc-850/60 hover:bg-zinc-800/10">
                      <td className="p-3 font-mono font-semibold text-emerald-400">GPIO 34</td>
                      <td className="p-3 text-zinc-200">Power-LED (+) Header</td>
                      <td className="p-3 text-zinc-400">Senses whether the computer is powered on (input-only).</td>
                    </tr>
                    <tr className="border-b border-zinc-850/60 hover:bg-zinc-800/10">
                      <td className="p-3 font-mono font-semibold text-emerald-400">GPIO 4</td>
                      <td className="p-3 text-zinc-200">DHT22 Data Line</td>
                      <td className="p-3 text-zinc-400">Reads room temperature and humidity (optional).</td>
                    </tr>
                    <tr className="border-b border-zinc-850/60 hover:bg-zinc-800/10">
                      <td className="p-3 font-mono font-semibold text-zinc-500">GND</td>
                      <td className="p-3 text-zinc-200">Ground Pins</td>
                      <td className="p-3 text-zinc-400">Common Ground (Shared). Required.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-xs leading-relaxed text-zinc-400 bg-zinc-900/20 border border-zinc-850 p-3 rounded-lg">
                <strong className="text-zinc-300">Important safety tip:</strong> Use a simple opto-isolator or transistor between the GPIOs and motherboard power/reset headers instead of a raw direct connection to avoid electrical surges or damaging maternal controllers.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 font-bold text-lg text-zinc-100">
              <span className="text-emerald-500">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 3v9" />
                  <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
                </svg>
              </span>
              OnOffMyPC
            </span>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Open-source, self-hosted, and cloud-enabled remote power controls for your workstation PCs.
            </p>
          </div>
          <div>
            <h4 className="text-zinc-400 font-semibold text-xs uppercase tracking-wider mb-3">Links</h4>
            <ul className="flex flex-col gap-2 text-xs text-zinc-500 font-medium">
              <li><Link href="/" className="hover:text-zinc-300">Home</Link></li>
              <li><Link href="/setup" className="hover:text-zinc-300">Setup Guide</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-zinc-400 font-semibold text-xs uppercase tracking-wider mb-3">Auth</h4>
            <ul className="flex flex-col gap-2 text-xs text-zinc-500 font-medium">
              <li><Link href="/login" className="hover:text-zinc-300">Log in</Link></li>
              <li><Link href="/register" className="hover:text-zinc-300">Create Account</Link></li>
            </ul>
          </div>
          <div className="text-xs text-zinc-600 flex items-end">
            &copy; 2026 OnOffMyPC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
