# RoboForge Robot Protocol v1

This is the stable contract between RoboForge apps and a physical robot. The
first implementation is the ESP32 Rover-01 firmware. Future boards can join the
same product path when they speak this protocol.

## Transport

- The robot hosts a local Wi-Fi access point.
- The owner connects a phone or computer to that access point.
- The local app opens `http://192.168.4.1`.
- Live motor commands stay local. Supabase stores ownership, setup outcomes,
  session summaries, important events, and feedback only.

## Required Endpoints

### `GET /api/v1/info`

Returns device identity and protocol capabilities.

```json
{
  "unitCode": "RF-RV-0001",
  "deviceName": "RoboForge-RF-RV-0001",
  "robotType": "rover",
  "firmwareVersion": "0.1.0",
  "protocolVersion": "v1",
  "apiBasePath": "/api/v1",
  "apSsid": "RoboForge-RF-RV-0001",
  "ipAddress": "192.168.4.1",
  "maxSpeed": 0.45,
  "commandTimeoutMs": 400,
  "endpoints": [
    "GET /api/v1/info",
    "GET /api/v1/status",
    "POST /api/v1/arm",
    "POST /api/v1/drive",
    "POST /api/v1/stop"
  ],
  "safety": {
    "requiresArm": true,
    "deadmanTimeoutMs": 400,
    "disconnectStopsMotors": true,
    "driveSequenceMustIncrease": true
  }
}
```

### `GET /api/v1/status`

Returns telemetry and the same important protocol metadata.

```json
{
  "connected": true,
  "armed": false,
  "unitCode": "RF-RV-0001",
  "batteryVoltage": 7.78,
  "batteryPercent": 82,
  "lastCommandAt": 123456,
  "uptime": 128,
  "firmwareVersion": "0.1.0",
  "protocolVersion": "v1",
  "deviceName": "RoboForge-RF-RV-0001",
  "robotType": "rover",
  "apSsid": "RoboForge-RF-RV-0001",
  "ipAddress": "192.168.4.1",
  "maxSpeed": 0.45,
  "commandTimeoutMs": 400,
  "wifiStrength": "strong"
}
```

### `POST /api/v1/arm`

Body:

```json
{ "armed": true }
```

The robot must reject arming when safety gates fail. The ESP32 Rover-01 blocks
arming when battery voltage does not match the configured cell count or no
control client is connected.

### `POST /api/v1/drive`

Body:

```json
{
  "sequence": 1,
  "throttle": 0.25,
  "steering": 0,
  "speedLimit": 0.3
}
```

- `sequence` must increase.
- `throttle` and `steering` are clamped from `-1` to `1`.
- `speedLimit` is clamped from `0` to the robot's `maxSpeed`.
- The client must send a zero command when the joystick is released.

### `POST /api/v1/stop`

Body:

```json
{}
```

The robot must stop motors immediately and disarm controls.

## Standard Error Codes

```text
battery_configuration_mismatch
controls_not_armed
invalid_json
network_error
no_control_client
not_found
stale_sequence
unknown
```

Lyra should translate these into plain owner guidance instead of showing raw
technical messages first.

## Required Safety Behavior

- Motor output starts locked.
- Arm must be explicit.
- Stop must disarm.
- Losing the control client stops motors.
- Missing drive commands for `commandTimeoutMs` stops motors.
- Sequence numbers prevent old drive commands from replaying.
- First drive tests require raised wheels.

## Prototype Check

Create a claim kit in `/admin` first. The generated manifest includes the
`firmware/include/config.h` values, local Wi-Fi SSID, claim URL, and test
commands for that physical unit.

With a phone or computer connected to the robot Wi-Fi:

```powershell
node scripts/rover-protocol-check.mjs --base-url=http://192.168.4.1 --evidence-out=bench-evidence.json
```

Only after the wheels are raised:

```powershell
node scripts/rover-protocol-check.mjs --raised-wheels --evidence-out=raised-wheel-evidence.json
```

The evidence JSON includes the unit code, firmware/protocol versions, battery
telemetry, check results, and the matching `/admin` Bench Checklist fields. It
does not include Wi-Fi passwords or Supabase secrets. Open `/admin`, paste the
file contents into the Bench Checklist `Evidence JSON` box, click `Import
evidence`, review the selected kit/stage/result, then save the test result.

## Hardware Info Still Needed

Before changing motor or battery code for a new prototype, collect:

- board model
- motor driver model
- battery chemistry and cell count
- wiring photo or pin list
- motor count and left/right channel mapping
- whether the prototype has an accessible power switch and fuse

Store these fields in the SaaS `/admin` Hardware Profile panel for the unit.
Then record bench, raised-wheel, and floor test results in the `/admin` Bench
Checklist panel. A robot is floor-ready after the profile is filled and the
raised-wheel protocol check has passed.
