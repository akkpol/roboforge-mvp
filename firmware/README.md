# RoboForge Rover-01 Firmware

ESP32 firmware for the local Rover-01 cockpit. The ESP32 creates a private Wi-Fi access point, serves the Preact app from LittleFS, and exposes the same-origin `/api/v1` control API.

## Standard Wiring

| Function | GPIO | Note |
|---|---:|---|
| ENA / left PWM | 25 | Remove the L298N ENA jumper |
| IN1 | 26 | Left direction |
| IN2 | 27 | Left direction |
| ENB / right PWM | 33 | Remove the L298N ENB jumper |
| IN3 | 32 | Right direction |
| IN4 | 14 | Right direction |
| Battery ADC | 34 | 100k/33k divider and 100 nF capacitor |

Connect the two left motors as one channel and the two right motors as the other channel. Confirm motor polarity with the wheels raised. Never change motor or battery wiring while powered.

## Battery Gate

Set `ROBOFORGE_BATTERY_CELLS` in `include/config.h` to `1` or `2` only after identifying the pack. The firmware blocks arming when the measured voltage is outside the plausible range for the configured cell count.

For every Beta kit use:

- protected cells or a suitable BMS
- an accessible power switch
- an inline fuse sized for the motor system
- a rigid battery mount
- a common ground between ESP32 and motor driver

Calibrate `ROBOFORGE_BATTERY_CALIBRATION` against a multimeter. Do not field-test until the displayed voltage is within 0.2 V of the meter.

## Build And Upload

From `app/`:

```powershell
npm run build:device
```

This writes the optimized web build to `firmware/data/`.

From `firmware/`:

```powershell
pio run
pio run --target upload
pio run --target uploadfs
pio device monitor
```

Connect the phone to `RoboForge-Rover-XXXX` and open `http://192.168.4.1`. The default password is in `include/config.h`; assign a unique password before distributing a kit.

## Safety Behavior

- Control is locked until `/api/v1/arm` succeeds.
- Requested speed is clamped to 45% in both the app and firmware.
- Drive sequence numbers must increase.
- No valid drive command for 400 ms stops and disarms the rover.
- Losing the Wi-Fi client stops and disarms the rover.
- `/api/v1/stop` immediately stops and disarms the rover.
- Test with wheels raised before every first floor run after wiring or firmware changes.
