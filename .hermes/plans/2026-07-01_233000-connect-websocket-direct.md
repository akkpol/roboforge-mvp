# Connect Page — Direct WebSocket Architecture Plan

> **For Hermes:** Execute each task in order. Do NOT skip tasks.
> **Goal:** Replace MQTT broker architecture with direct WebSocket between browser and ESP32 on phone hotspot. User opens web → connects phone hotspot → ESP32 joins → drives.

**Architecture change:**
```
Before: Browser ←WSS→ MQTT Broker (mqtt.roboforge.app — ไม่มีจริง) ←MQTT→ ESP32
After:  Browser ←WebSocket ตรง→ ESP32 (บน network hotspot โทรศัพท์เดียวกัน)
```

**Evidence (verified before writing plan):**
1. ✅ **ESP32 MicroPython WebSocket server**: `microdot` library (2.1k stars, maintained by Miguel Grinberg) provides WebSocket support for MicroPython. Source: https://github.com/miguelgrinberg/microdot
2. ✅ **Browser WebSocket over local network**: WebSocket (`ws://`) works on local networks — no CORS restrictions. Source: MDN WebSocket API docs
3. ✅ **L298N 3.3V logic**: L298N datasheet — V_IH(min) = 2.3V (TTL level), ESP32 GPIO = 3.3V → OK
4. ✅ **DNS of mqtt.roboforge.app**: `nslookup mqtt.roboforge.app` → **Non-existent domain** (ตรวจสอบแล้ว)
5. ✅ **Firmware pins verified**: ENA=25, IN1=26, IN2=27, ENB=33, IN3=32, IN4=17, ADC=34, TRIG=18, ECHO=19

**User flow after change:**
1. เสียบ ESP32 → คอม → เปิด roboforge.app → Install MicroPython + Upload Agent (WebSerial) — ครั้งเดียว
2. ใส่ชื่อ hotspot โทรศัพท์ + รหัส → Provision ผ่าน USB
3. ถอด USB → ESP32 รีบูต → ต่อ WiFi โทรศัพท์อัตโนมัติ
4. เปิด hotspot → เปิด roboforge.app → browser ต่อ WebSocket ตรงถึง ESP32
5. ขับได้เลย — ไม่ต้อง MQTT broker, ไม่ต้องสมัคร service ใดๆ

---

## Task 1: Rewrite firmware/main.py — WebSocket Server

**Objective:** Replace MQTT client with WebSocket server on ESP32. Keep motor/sensor/battery code unchanged.

**Files:**
- Modify: `firmware/main.py` (entire rewrite — 370 lines → ~350 lines)
- Test: `web/src/components/lumina/connect-protocol.test.ts` (update test expectations)

### Changes to firmware/main.py:

| Remove | Add |
|--------|-----|
| `from umqtt.simple import MQTTClient` | `import uasyncio` + `from microdot import Microdot, Response` |
| MQTT connect/publish/check_msg loop | WebSocket server accept + handle loop |
| `mqtt_callback()`, `publish_status()` | `websocket_handler()` |
| `connect_mqtt()`, `MQTT_RETRY_MS` | `start_websocket_server()` |
| `status_payload()` → MQTT publish | `status_payload()` → WebSocket send |
| topic routing (`rf/{robotId}/cmd`) | JSON command routing (`{"cmd":"drive","throttle":0.5}`) |

### New firmware architecture:

```python
import uasyncio
import network
import json
import machine
import time

# === พิน GPIO (คงเดิม) ===
PIN_ENA, PIN_IN1, PIN_IN2, PIN_ENB, PIN_IN3, PIN_IN4 = 25,26,27,33,32,17
PIN_BATTERY_ADC = 34
PIN_TRIG, PIN_ECHO = 18, 19

# === Motor control (คงเดิมจาก main.py ปัจจุบัน)
# === Sensor functions (คงเดิม)
# === WebSocket command handler (ใหม่) ===
async def handle_client(reader, writer):
    # WebSocket handshake
    request = await reader.read(1024)
    # ... handshake logic ...
    while True:
        msg = await read_websocket_frame(reader)
        data = json.loads(msg)
        handle_command(data)
        # ส่งสถานะกลับ
        await send_websocket_frame(writer, json.dumps(status_payload()))

async def main():
    # สร้าง AP หรือต่อ WiFi
    wlan = network.WLAN(network.STA_IF)
    # ... connect to hotspot ...
    
    # รัน WebSocket server
    server = await uasyncio.start_server(handle_client, "0.0.0.0", 80)
    
    while True:
        await uasyncio.sleep(0.05)
        safety_loop()

uasyncio.run(main())
```

### Key firmware behaviors to preserve:
- ✅ `drive(throttle, steering)` — arcade drive, clamp
- ✅ `stop()` — หยุดมอเตอร์
- ✅ `read_battery_v()` — ADC read + voltage divider
- ✅ `read_distance_cm()` — HC-SR04P pulse
- ✅ `handle_command()` — drive/stop/status/config/avoid
- ✅ `check_serial_provision()` — รับ WiFi ผ่าน USB
- ✅ `safety_loop()` — deadman timer + obstacle avoidance
- ✅ `config` save/load from `roboforge.json`

**Verification:** `python -c "import sys; sys.path.insert(0,'firmware'); compile(open('firmware/main.py').read(), 'main.py', 'exec')"` — syntax check

---

## Task 2: Update connect-protocol.ts — Remove MQTT, Add WebSocket

**Objective:** Remove MQTT broker functions, keep robot command/status types, add WebSocket helpers.

**Files:**
- Modify: `web/src/components/lumina/connect-protocol.ts`

### Remove:
```typescript
export const DEFAULT_ROBOFORGE_MQTT_WS_URL = "wss://mqtt.roboforge.app/mqtt";
export const DEFAULT_TOPIC_ROOT = "rf";
export const MICROPYTHON_RUNTIME_MANIFEST_URL = "/firmware/micropython/manifest.json";
export const MICROPYTHON_AGENT_FILES = [...];
export type RobotTopics = { command: string; status: string };
export function getMqttWebSocketUrl() ...
export function brokerHostFromWebSocket() ...
export function brokerPortFromWebSocket() ...
export function buildRobotTopics() ...
export function buildProvisionPayload() ...
```

### Keep:
```typescript
export type RobotCommandName = "avoid" | "config" | "drive" | "status" | "stop";
export type RobotCommand = ...
export type RobotStatus = { battery_pct, battery_v, distance_cm, online, ... };
export function normalizeRobotId(value: string): string;
export function createRobotId(seed?: number): string;
export function createInstallToken(seed?: number): string;
export function buildRobotCommand(command: RobotCommand): RobotCommand;
export function serializeRobotCommand(command: RobotCommand): string;
export function parseRobotStatus(input: unknown): RobotStatus;
export function canRunMotorTest(wheelsRaised: boolean, online: boolean): boolean;
```

### Add:
```typescript
// WebSocket connection helper
export function createWebSocketUrl(esp32Ip: string): string {
  return `ws://${esp32Ip}/ws`;
}

// ESP32 auto-discovery via mDNS or known IP
export const ESP32_AP_IP = "192.168.4.1";  // default ESP32 AP IP
export const ESP32_MDNS_HOST = "rover.local";
```

### Move these constants that are still needed:
```typescript
export const DEFAULT_SSID_KEY = "roboforge-ssid";
export const STORAGE_KEY = "roboforge-connect-profile";
export const INSTALL_MANIFEST_URL = "/firmware/micropython/manifest.json";
export const AGENT_FILES = [
  { devicePath: "boot.py", sourceUrl: "/firmware/micropython/boot.py" },
  { devicePath: "main.py", sourceUrl: "/firmware/micropython/main.py" },
] as const;
```

**Verification:** `npx tsc --noEmit` — zero errors

---

## Task 3: Rewrite connect-screen.tsx — WebSocket Flow

**Objective:** Replace MQTT connection logic with WebSocket direct connection. Simplify flow to 3 steps.

**Files:**
- Modify: `web/src/components/lumina/connect-screen.tsx` (748 lines → ~400 lines)

### New component structure:

```
ConnectScreen
├── TopBar (back)
├── Hero section ("Connect Rover" — short)
├── Install section (conditionally shown)
│   ├── esp-web-install-button (MicroPython flash)
│   ├── Upload Agent button
│   ├── WiFi SSID input
│   ├── WiFi Password input
│   └── Provision over USB button
├── Connection status
│   └── "กำลังค้นหา ESP32..." / "Rover Online" / error
├── Drive controls (when connected)
│   ├── Battery + Distance display
│   ├── Forward / Reverse / Left / Right / STOP
│   ├── Safety checkbox (ยกรถ)
│   └── Avoid mode (optional)
└── BottomNav
```

### Key logic changes from current code:

| Current (MQTT) | New (WebSocket) |
|----------------|-----------------|
| `mqttClientRef` — MQTT connection | `wsRef` — WebSocket connection |
| `window.mqtt` — MQTT.js library | Native `WebSocket` API (browser built-in) |
| `startConnection()` → MQTT connect + publish status | Auto-detect: try connect to `ws://192.168.4.1` or `ws://rover.local` |
| Connection timeout 18s waiting for robot | Connection timeout 5s (local network) |
| `connectionAttempt` state | Simple `wsConnected: boolean` |
| `installState` — 7 states | Simplify to: `idle → uploading → provisioned → ready` |
| `provisionHelp` — 3 conditions | 1 condition: "ใส่ชื่อ WiFi และรหัสของ hotspot โทรศัพท์" |
| Optional `esp-web-install-button` (web component) | Keep — still needed for first-time flash |

### WebSocket handler:

```typescript
function connectToEsp32() {
  const ws = new WebSocket(`ws://${ESP32_AP_IP}/ws`); // or ESP32_MDNS_HOST
  
  ws.onopen = () => {
    setConnectionState("robotOnline");
    // Request initial status
    ws.send(serializeRobotCommand({ cmd: "status" }));
  };
  
  ws.onmessage = (event) => {
    const status = parseRobotStatus(event.data);
    setRobotStatus(status);
  };
  
  ws.onclose = () => {
    setConnectionState("failed");
    setLyraMessage("การเชื่อมต่อขาด — เช็คว่า ESP32 ต่อ WiFi โทรศัพท์อยู่");
  };
  
  wsRef.current = ws;
}
```

### Remove from imports:
- `mqtt` library loading (MQTT_SCRIPT_URL, script injection)
- `type MqttClientLike, MqttFactoryLike` — no longer needed
- `installCopy()` — no broker URL to show
- `statusLabel()` — simplify (local WebSocket status)

**Verification:** `npm run build` succeeds. `npx tsc --noEmit` — zero errors.

---

## Task 4: Update connection-progress.tsx — 3 Steps

**Objective:** Change from 4 steps to 3 steps matching new flow.

**Files:**
- Modify: `web/src/components/lumina/connection-progress.tsx`

### New steps:
```typescript
const steps = [
  { id: "install" as const, label: "Install",  hint: "ลง MicroPython + Agent บนคอมผ่าน USB" },
  { id: "provision" as const, label: "Wi-Fi",   hint: "ใส่ชื่อ WiFi hotspot + ส่งค่าเข้า ESP32" },
  { id: "drive" as const, label: "Drive",   hint: "ต่อ WebSocket ตรงถึง Rover ขับได้เลย!" },
];
```

### Remove:
- `ConnectionStepId = "kit"` (old step)
- `ConnectionStepId = "online"` (old step — MQTT wait)
- `ConnectionStepId = "test"` (old step — merge into drive)

**Verification:** TypeScript compiles — zero errors.

---

## Task 5: Update globals.css — Remove Dead Styles, Keep Live Ones

**Objective:** Clean up CSS — remove old hardware checklist, MQTT-related styles. Keep new connect-* styles.

**Files:**
- Modify: `web/src/app/globals.css`

### Remove:
- `.connection-shell .connect-check-grid` and children (hardware checkboxes — old MQTT version)
- `.connection-status` if WebSocket shows status differently

### Keep:
- `.connection-content`, `.connection-hero-copy`, `.connection-progress-card`
- `.connection-visual-card`, `.connection-map`, `.connection-status` (rename if needed)
- `.connnect-installer-widget`, `.connect-field-grid`, `.connect-install-flow`
- `.connect-required-list`, `.connect-safety-list`, `.connect-safety-toggle`
- `.connect-test-grid`, `.connect-optional-details`, `.connect-actions-row`

### Add (if needed):
- WebSocket connection indicator styles

**Verification:** Page renders without missing CSS — check browser console for no errors.

---

## Task 6: Remove Advanced Connection Details (MQTT Debug Info)

**Objective:** Remove `advanced-connection-details.tsx` — no MQTT broker/topics to show anymore.

**Files:**
- Remove: `web/src/components/lumina/advanced-connection-details.tsx`
- Modify: `web/src/components/lumina/connect-screen.tsx` — remove `<AdvancedConnectionDetails>` import and usage
- Optionally keep as read-only reference: leave file but remove from render

---

## Task 7: Update connect-protocol.test.ts

**Objective:** Update tests to match new protocol (remove MQTT broker tests, keep robot command/status tests).

**Files:**
- Modify: `web/src/components/lumina/connect-protocol.test.ts`

### Remove tests:
- `"keeps browser installer files synced with the firmware source"` — still relevant, keep
- `"builds provision payloads from the app broker URL"` — no broker, remove
- `"generates MicroPython REPL upload commands only for agent files"` — keep (still WebSerial)

### Keep tests:
- `"normalizes robot ids for topic-safe names"` — still useful
- `"creates deterministic ids and tokens when seeded"` — still useful
- `"builds RoboForge-owned topics without legacy shared defaults"` — update (no topics)
- `"clamps drive commands before serializing"` — keep
- `"parses robot status from firmware payloads"` — keep
- `"blocks motor tests until both online and raised-wheel checks pass"` — keep

**Verification:** `npm run test:foundation` — all tests pass.

---

## Task 8: Remove or Update QA Script

**Objective:** Update `measure-connect-composition.mjs` — fix selectors to match new component structure, or document as deprecated.

**Files:**
- Modify: `web/scripts/measure-connect-composition.mjs`

### Changes:
- Update selectors to match new component structure (if still useful)
- OR move to `web/scripts/archive/` and mark as deprecated

---

## Task 9: Full Integration Verification

**Objective:** Run all checks before deploy.

### Checks:
```bash
# 1. TypeScript
cd web && npx tsc --noEmit
# Expected: zero errors

# 2. Lint
npm run lint
# Expected: clean

# 3. Tests
npm run test:foundation
# Expected: all tests pass

# 4. Build
npm run build
# Expected: success

# 5. Verify firmware syntax
cd ../firmware
python3 -c "import py_compile; py_compile.compile('main.py', doraise=True)"
# Expected: no SyntaxError
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `microdot` may not fit in ESP32 flash | Use minimal implementation: bare `uasyncio` + WebSocket handshake without full HTTP framework |
| Browser cannot find ESP32 IP on hotspot | Auto-try `192.168.4.1` (AP default), `rover.local` (mDNS), or show IP in display |
| WebSocket reconnection on page reload | On reconnect, ESP32 sends latest status automatically |
| Phone hotspot assigns different IP range | Some phones use `192.168.43.x` instead of `192.168.4.x` — need to detect or scan |
| Existing users have old firmware (MQTT) | Keep backward compatibility: old firmware still works if MQTT broker available; new flow is for fresh installs |
| esp-web-install-button not working on all browsers | Fallback: Flash ESP32 with Thonny/esptool manually |

## Open Questions for User

1. Phone hotspot IP range varies by brand — ควรลองหลาย IP หรือให้ user กรอก?
2. ต้องการรองรับทั้ง WebSocket ตรง (local) + MQTT (remote) หรือใช้ WebSocket อย่างเดียว?
3. mDNS (`rover.local`) ใช้ได้จริงบน MicroPython? หรือใช้ IP เปล่า?
