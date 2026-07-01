# RoboForge MVP

RoboForge is a plug-and-play setup flow for people who source their own ESP32 rover kit. The source of truth is MicroPython on an ESP32 DevKit/WROOM board with the ESP32S 30P expansion base.

## Product Path

1. Open `https://roboforge.app/install` on desktop Chrome or Edge.
2. Connect the ESP32 DevKit by USB with a real data cable.
3. Flash the official ESP32/WROOM MicroPython runtime from the RoboForge installer.
4. Upload the RoboForge MicroPython Agent files: `boot.py` and `main.py`.
5. Provision Wi-Fi 2.4GHz, robot ID, token, and RoboForge MQTT broker settings over USB.
6. Open `https://roboforge.app/connect` on desktop or mobile.
7. Let the app find the robot, read status, send STOP, and run short raised-wheel tests.

Desktop is required only for the first MicroPython install and USB provisioning. After that, the phone can use the same RoboForge web app for connection checks, safety tests, and driving.

## Source Of Truth

The current RoboForge flow is:

- Self-sourced ESP32 DevKit/WROOM rover kit.
- ESP32S 30P expansion base is supported by the pin plan below.
- RoboForge Web Installer at `/install`.
- RoboForge guided connection doctor at `/connect`.
- RoboForge MQTT broker configured through environment variables.
- MicroPython firmware in `firmware/boot.py` and `firmware/main.py`.
- MQTT topics scoped per robot:
  - `rf/{robotId}/cmd`
  - `rf/{robotId}/status`

The app must not ask users to type raw MQTT topics, JSON payloads, or use a third-party MQTT console as the main path. Thonny and public MQTT demo pages are fallback or learning references only.

## User Responsibilities

The user needs:

- ESP32 DevKit/WROOM board.
- ESP32S 30P expansion base.
- L298N motor driver.
- Two TT DC motors.
- 2S 18650 battery pack with BMS, fuse, and physical power switch.
- A real USB data cable.
- A 2.4GHz Wi-Fi network or hotspot.
- Optional HC-SR04P ultrasonic sensor for obstacle avoid mode.

## Pin Plan

Use this wiring for the RoboForge MicroPython Agent:

| Part | ESP32 GPIO |
| --- | --- |
| L298N ENA | GPIO25 |
| L298N IN1 | GPIO26 |
| L298N IN2 | GPIO27 |
| L298N ENB | GPIO33 |
| L298N IN3 | GPIO32 |
| L298N IN4 | GPIO17 |
| Battery divider ADC | GPIO34 |
| HC-SR04P TRIG | GPIO18 |
| HC-SR04P ECHO | GPIO19 |

The motor driver, ESP32, and sensor must share common GND. Remove the ENA/ENB jumpers from the L298N when using PWM from GPIO25/GPIO33.

## App Responsibilities

The web app handles:

- Generating and storing a robot ID and install token in the browser.
- Flashing MicroPython runtime through the browser installer.
- Uploading `boot.py` and `main.py` to the MicroPython filesystem over USB serial.
- Sending Wi-Fi, broker host, broker port, TLS flag, robot ID, topic prefix, and token to the ESP32 over USB serial.
- Connecting to MQTT through `NEXT_PUBLIC_ROBOFORGE_MQTT_WS_URL`.
- Subscribing to `rf/{robotId}/status`.
- Publishing safe commands to `rf/{robotId}/cmd`.
- Gating motor tests behind an online robot status and a raised-wheel safety checkbox.

The Wi-Fi password is used only to provision the ESP32 over USB serial. The web app does not persist it in local storage.

## Firmware Responsibilities

The ESP32 firmware is the RoboForge MicroPython Agent. It:

- Runs from MicroPython source files: `boot.py` and `main.py`.
- Joins the configured 2.4GHz Wi-Fi network.
- Connects to the matching RoboForge MQTT broker host, port, and TLS setting.
- Subscribes to `rf/{robotId}/cmd`.
- Publishes telemetry to `rf/{robotId}/status`.
- Supports commands: `status`, `stop`, `drive`, `avoid`, and `config`.
- Drives the L298N motor outputs with a short deadman timeout.
- Publishes battery telemetry and optional HC-SR04P distance readings.
- Stops motors when commands time out, obstacle avoid triggers, or broker connectivity is lost.

## Development

Web app:

```powershell
cd web
npm install
npm run lint
npm run test:foundation
npm run build
```

Firmware source files:

```text
firmware/boot.py
firmware/main.py
web/public/firmware/micropython/boot.py
web/public/firmware/micropython/main.py
web/public/firmware/micropython/manifest.json
```

Important environment variable:

```text
NEXT_PUBLIC_ROBOFORGE_MQTT_WS_URL=wss://mqtt.roboforge.app/mqtt
```

Production can point this variable at a managed RoboForge broker. The product should never rely on a public demo broker as a dependency.
