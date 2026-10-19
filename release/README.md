# OnOffMyPC — Public release artifacts

This public repository publishes stable OnOffMyPC artifacts. Source projects
remain separate: `onoffmypc-app` contains the API, `onoffmypc-web` the web UI
and flasher, `onoffmypc-mobile` the native clients, and `onoffmypc-firmware` the
ESP32 source and build pipeline. `onoffmypc-design` owns their shared visual
tokens, product-state presentation, assets, accessibility rules, and UX writing
guidance; this artifact repository has no runtime UI dependency.

This repository publishes the pre-built firmware binaries. Download the latest from the [Releases](https://github.com/onoffmypc/onoffmypc-release/releases) page and flash it to your ESP32 — no toolchain or source build required.

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

1. Download the latest **`onoffmypc-firmware-<version>.bin`** from the [Releases](https://github.com/onoffmypc/onoffmypc-release/releases) page. This is the complete image (bootloader, partition table, and application in one file).

2. (Optional) Verify your download against the published checksums:

   ```bash
   sha256sum -c SHA256SUMS-<version>.txt
   ```

3. Flash it to your ESP32 at offset `0x0`:

   ```bash
   esptool.py --port /dev/ttyUSB0 --chip esp32 write_flash 0x0 onoffmypc-firmware-<version>.bin
   ```

   On Windows the port is typically `COMx`.

## First-time setup

1. **Add a device** at [app.onoffmypc.com](https://app.onoffmypc.com), open that
   device, and request its short-lived **pairing code**.

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

Verify the matching checksum file before flashing. Checksums detect corruption,
but are not a substitute for a future device-verified firmware signature.

## License

MIT — see [LICENSE](LICENSE)
