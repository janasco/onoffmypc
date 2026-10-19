# Release artifacts, security policy, and firmware config

This directory is part of the consolidated `onoffmypc` repository. It no longer
publishes binaries itself — GitHub holds source only.

| What | Where it lives |
|---|---|
| Desktop installers, Android APK | Cloudflare R2, `https://releases.onoffmypc.com` |
| ESP32 firmware | `web/public/firmware/`, shipped with the web app |
| Machine-readable index | `https://releases.onoffmypc.com/releases/manifest.json` |
| Vulnerability reporting | [`SECURITY.md`](SECURITY.md) |
| Firmware build config example | [`src/config.example.h`](src/config.example.h) |

The downloads page at `/downloads` in the web app reads
`web/src/lib/releases.ts` and links straight to R2, with the size and SHA-256 of
every artifact. See [`R2-RELEASES.md`](R2-RELEASES.md) for how artifacts are
published.

## Features

- Wake-on-LAN to power on your PC
- Power off and reset via GPIO-controlled transistors
- Room temperature and humidity monitoring (DHT22)
- Secure, encrypted connection to the OnOffMyPC service
- Browser-based Wi-Fi setup — no config files to edit
- Automatic reconnection after a network outage or router reboot
- LED status indicator (fast blink = connecting to Wi-Fi, slow blink = connecting to the service, solid = online)

Device acknowledgements mean a command was received or initiated; they do not
guarantee that the controlled PC reached the requested state.

## Requirements

- ESP32 development board (e.g. ESP32 DevKit V1)
- DHT22 temperature/humidity sensor
- A USB cable and [esptool](https://github.com/espressif/esptool) (or any ESP32 flashing tool) to flash the binary

## Wiring

| Signal          | ESP32 Pin |
|-----------------|-----------|
| DHT22 data      | D4        |
| Status LED      | D2        |
| PC power sense  | D34       |
| Power button    | D26       |
| Reset button    | D27       |

Use a 330Ω resistor in series with the status LED.
Use NPN transistors (e.g. 2N2222) driven by D26/D27 to simulate button presses.
Connect D34 to the PC's power LED header (3.3 V max).

## Flashing

The easiest path is the browser flasher on the `/setup` page — no toolchain or
source build required.

To flash manually, build or download `onoffmypc-firmware-<version>.bin` (the
complete image: bootloader, partition table, and application in one file), then:

```bash
esptool.py --port /dev/ttyUSB0 --chip esp32 write_flash 0x0 onoffmypc-firmware-<version>.bin
```

On Windows the port is typically `COMx`. See
[`../firmware/RELEASE.md`](../firmware/RELEASE.md) for how a firmware binary is
produced and verified.

## First-time setup

1. **Add a device** in the dashboard, open that device, and request its
   short-lived **pairing code**.

2. **Power on the ESP32.** On first boot it creates a Wi-Fi network named
   **`OnOffMyPC-XXXXXX`**. Connect with the setup-network password shown in the
   ESP Web Tools or serial output. The setup page should open automatically;
   otherwise visit `http://192.168.4.1`.

3. **Enter the pairing code**, your Wi-Fi details, your PC's MAC address for
   Wake-on-LAN, and the six-digit setup PIN shown in the serial output. Save the
   form; the device restarts and begins connecting. Manual Device ID/token entry
   remains available under **Advanced**.

   The LED blinks while connecting and stays solid once online.

To reconfigure later, send `r` over the serial monitor to factory-reset and
reopen the setup network.

## Artifact verification

Every R2 artifact publishes its SHA-256 in the manifest and on the downloads
page, so a download can be checked against what was published. Checksums detect
corruption; they are not a substitute for device-verified firmware signing,
which is still open work.

## License

MIT — see [LICENSE](LICENSE)
