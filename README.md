# RoboForge MVP

RoboForge is a plug-and-play setup flow for people who source their own ESP32 rover kit. The product path is:

1. Open `https://roboforge.app/install` on a desktop Chrome or Edge browser.
2. Connect an ESP32 DevKit by USB and install the RoboForge MQTT Agent firmware.
3. Enter the user Wi-Fi credentials, robot ID, and RoboForge broker settings in the installer.
4. Open `https://roboforge.app/connect` on desktop or mobile.
5. Let the app find the robot, read status, send STOP, and run short raised-wheel tests.

Desktop is required only for the first firmware install because browsers expose USB serial flashing through desktop Web Serial/WebUSB. After the ESP32 has the agent and Wi-Fi config, the phone can connect to the same RoboForge web app for testing and driving.

## Source Of Truth

The current RoboForge flow is:

- Self-sourced ESP32 rover kit.
- RoboForge Web Installer at `/install`.
- RoboForge guided connection doctor at `/connect`.
- RoboForge MQTT broker configured through environment variables.
- MQTT topics scoped per robot:
  - `rf/{robotId}/cmd`
  - `rf/{robotId}/status`

The app must not ask users to type raw MQTT topics, JSON payloads, or use a third-party MQTT console as the main path. Thonny, MicroPython examples, and public MQTT demo pages are fallback or learning tools only.

## User Responsibilities

The user needs:

- ESP32 DevKit.
- L298N motor driver.
- Two TT DC motors.
- 2S 18650 battery pack with BMS, fuse, and physical power switch.
- A real USB data cable.
- A 2.4GHz Wi-Fi network or hotspot.
- Optional HC-SR04P ultrasonic sensor for obstacle avoid mode.

The installer guides the checklist and wiring assumptions before provisioning firmware.

## App Responsibilities

The web app handles:

- Generating and storing a robot ID and install token in the browser.
- Installing the firmware package through the browser installer.
- Sending Wi-Fi, broker host, broker port, TLS flag, robot ID, topic prefix, and token to the ESP32 over USB serial.
- Connecting to MQTT through `NEXT_PUBLIC_ROBOFORGE_MQTT_WS_URL`.
- Subscribing to `rf/{robotId}/status`.
- Publishing safe commands to `rf/{robotId}/cmd`.
- Gating motor tests behind an online robot status and a raised-wheel safety checkbox.

The Wi-Fi password is used only to provision the ESP32 over USB serial. The web app does not persist it in local storage.

## Firmware Responsibilities

The ESP32 firmware is the RoboForge MQTT Agent. It should:

- Join the configured 2.4GHz Wi-Fi network.
- Connect to the matching RoboForge MQTT broker host, port, and TLS setting.
- Subscribe to `rf/{robotId}/cmd`.
- Publish telemetry to `rf/{robotId}/status`.
- Support commands: `status`, `stop`, `drive`, `avoid`, and `config`.
- Drive the L298N motor outputs with a short deadman timeout.
- Publish battery telemetry and optional HC-SR04P distance readings.
- Stop motors when commands time out or broker connectivity is lost.

## Development

Web app:

```powershell
cd web
npm install
npm run lint
npm run test:foundation
npm run build
```

Firmware:

```powershell
cd firmware
platformio run
```

Important environment variable:

```text
NEXT_PUBLIC_ROBOFORGE_MQTT_WS_URL=wss://mqtt.roboforge.app/mqtt
```

Production can point this variable at a managed RoboForge broker. The product should never rely on a public demo broker as a dependency.
