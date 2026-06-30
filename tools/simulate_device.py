#!/usr/bin/env python3
"""
Simulates an ESP32 device connecting to api.onoffmypc.com.
Sends telemetry every 5s, handles and acks power commands.
Use this to test the full system without hardware.

Usage:
  python3 tools/simulate_device.py DEVICE_ID DEVICE_TOKEN
"""

import asyncio
import json
import math
import random
import sys
import time

try:
    import websockets
except ImportError:
    print("Missing: apt install python3-websockets")
    sys.exit(1)

API_HOST = "api.onoffmypc.com"
TELEMETRY_INTERVAL = 5  # seconds


def make_telemetry(device_id: str, pc_on: bool, t: float) -> dict:
    # Simulate gentle temperature/humidity drift
    temp     = 22.5 + 1.5 * math.sin(t / 60)
    humidity = 55.0 + 5.0 * math.sin(t / 90 + 1)
    rssi     = random.randint(-75, -45)
    return {
        "type":         "telemetry",
        "device_id":    device_id,
        "pc_on":        pc_on,
        "room_temp":    round(temp, 1),
        "room_humidity": round(humidity, 1),
        "rssi":         rssi,
    }


async def run(device_id: str, token: str) -> None:
    url = f"wss://{API_HOST}/ws/{device_id}"
    print(f"[sim] connecting to {url}")

    pc_on = False  # simulated PC state

    async with websockets.connect(url, extra_headers={"X-Device-Token": token}) as ws:
        print("[sim] connected")
        last_telemetry = 0.0

        async def send_telemetry():
            msg = make_telemetry(device_id, pc_on, time.time())
            await ws.send(json.dumps(msg))
            state = "ON" if pc_on else "off"
            print(f"[tel] pc={state}  temp={msg['room_temp']}°C  "
                  f"hum={msg['room_humidity']}%  rssi={msg['rssi']} dBm")

        while True:
            now = time.time()

            # Send telemetry on interval
            if now - last_telemetry >= TELEMETRY_INTERVAL:
                await send_telemetry()
                last_telemetry = now

            # Check for incoming messages with a short timeout
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=0.5)
                msg = json.loads(raw)
                command_id = msg.get("command_id")
                cmd_type   = msg.get("type")

                if command_id and cmd_type:
                    print(f"[cmd] received: {cmd_type} (id={command_id})")

                    if cmd_type == "power_on":
                        pc_on = True
                        print("[cmd] PC powered ON (WoL sent)")
                    elif cmd_type == "power_off":
                        pc_on = False
                        print("[cmd] PC powered OFF (button press)")
                    elif cmd_type == "power_off_force":
                        pc_on = False
                        print("[cmd] PC FORCE OFF (6s hold)")
                    elif cmd_type == "reset":
                        print("[cmd] PC RESET (button press)")
                    else:
                        print(f"[cmd] unknown command: {cmd_type}")
                        continue

                    # Send ack
                    ack = {"type": "ack", "command_id": command_id}
                    await ws.send(json.dumps(ack))
                    print(f"[ack] sent for {command_id}")

                    # Immediately send updated telemetry to reflect new state
                    await send_telemetry()
                    last_telemetry = time.time()

            except asyncio.TimeoutError:
                pass  # no message, loop back


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    device_id, token = sys.argv[1], sys.argv[2]

    print("OnOffMyPC device simulator")
    print(f"  device_id : {device_id}")
    print(f"  token     : {token[:8]}...")
    print()

    try:
        asyncio.run(run(device_id, token))
    except KeyboardInterrupt:
        print("\n[sim] stopped")
    except websockets.exceptions.InvalidStatus as e:
        print(f"[sim] connection rejected: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
