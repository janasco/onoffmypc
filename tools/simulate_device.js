let WebSocket;
try {
  WebSocket = require('ws');
} catch {
  console.error('[sim] Missing dependency: run `npm install` inside onoffmypc-firmware/tools');
  process.exit(1);
}

const CURRENT_FIRMWARE_VERSION = '1.3.7';
const deviceId = process.argv[2];
const token = process.argv[3];
const apiHost = process.env.API_HOST || 'localhost:8787';
const isLocal = apiHost.includes('localhost') || apiHost.includes('127.0.0.1');

if (!deviceId || !token) {
  console.error('Usage: node tools/simulate_device.js DEVICE_ID DEVICE_TOKEN');
  process.exit(1);
}
if (!isLocal) {
  console.error('[sim] Refusing to connect to a non-local API without an explicit DEVICE_TOKEN');
  process.exit(1);
}

const protocol = isLocal ? 'ws' : 'wss';
const url = `${protocol}://${apiHost}/ws/${deviceId}`;

console.log(`[sim] Connecting to ${url} with token ${token}`);

let pcOn = false;
let lastTelemetryTime = 0;
const TELEMETRY_INTERVAL = 5000; // 5 seconds
let ws = null;

function makeTelemetry(devId, isPcOn, t) {
  const temp = 22.5 + 1.5 * Math.sin(t / 60000);
  const humidity = 55.0 + 5.0 * Math.sin(t / 90000 + 1);
  const rssi = -50 - Math.floor(Math.random() * 20);
  
  // add cpu, ram, gpu telemetry (based on new schema columns)
  const cpuLoad = isPcOn ? Math.floor(10 + Math.random() * 40) : 0;
  const ramUsed = isPcOn ? Math.floor(2000 + Math.random() * 1000) : 0;
  const ramTotal = 16384;
  const gpuTemp = isPcOn ? Math.floor(35 + Math.random() * 20) : 0;

  return {
    type: 'telemetry',
    device_id: devId,
    pc_on: isPcOn,
    room_temp: parseFloat(temp.toFixed(1)),
    room_humidity: parseFloat(humidity.toFixed(1)),
    rssi: rssi,
    cpu_load: cpuLoad,
    ram_used_mb: ramUsed,
    ram_total_mb: ramTotal,
    gpu_temp: gpuTemp,
    firmware_version: CURRENT_FIRMWARE_VERSION
  };
}

function connect() {
  ws = new WebSocket(url, {
    headers: {
      'X-Device-Token': token
    }
  });

  ws.on('open', () => {
    console.log('[sim] Connected successfully');
    sendTelemetryLoop();
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('[sim] Received message:', msg);
      
      if (msg.type === 'settings') {
        console.log('[sim] Applied settings:', msg);
      } else if (msg.command_id && msg.type) {
        const cmdId = msg.command_id;
        const cmdType = msg.type;
        console.log(`[sim] Received command: ${cmdType} (id=${cmdId})`);

        if (cmdType === 'power_on') {
          pcOn = true;
          console.log('[sim] PC powered ON');
        } else if (cmdType === 'power_off') {
          pcOn = false;
          console.log('[sim] PC powered OFF');
        } else if (cmdType === 'power_off_force') {
          pcOn = false;
          console.log('[sim] PC FORCE OFF');
        } else if (cmdType === 'reset') {
          console.log('[sim] PC RESET');
        }

        // Send Ack
        const ack = { type: 'ack', command_id: cmdId };
        ws.send(JSON.stringify(ack));
        console.log(`[sim] Sent ack for command: ${cmdId}`);

        // Immediate telemetry update
        sendTelemetry();
      }
    } catch (e) {
      console.error('[sim] Error parsing message:', e.message);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[sim] Connection closed: ${code} - ${reason}`);
    setTimeout(connect, 5000); // Reconnect after 5 seconds
  });

  ws.on('error', (err) => {
    console.error('[sim] Connection error:', err.message);
  });
}

function sendTelemetry() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const t = Date.now();
    const tel = makeTelemetry(deviceId, pcOn, t);
    ws.send(JSON.stringify(tel));
    console.log(`[sim] Sent telemetry: pc=${pcOn ? 'ON' : 'OFF'} temp=${tel.room_temp}°C hum=${tel.room_humidity}% rssi=${tel.rssi} cpu=${tel.cpu_load}% ram=${tel.ram_used_mb}MB`);
    lastTelemetryTime = t;
  }
}

let intervalId = null;
function sendTelemetryLoop() {
  if (intervalId) clearInterval(intervalId);
  sendTelemetry(); // send first immediately
  intervalId = setInterval(sendTelemetry, TELEMETRY_INTERVAL);
}

connect();
