# RoboForge Modular Robotics Platform

RoboForge should grow from one guided Rover-01 path into a modular robotics
platform. The useful mental model is:

> Robot = brain + mechanism + muscle + senses + communication.

The product version of that model is three layers. These layers are the
canonical RoboForge architecture, not optional ideas. Build order is only an
execution sequence so the platform ships without pretending every capability is
already production-ready.

## Layer A: Physical Modular Hardware

Layer A is the kit and hardware marketplace.

Start with popular boards instead of custom electronics:

- ESP32 for the first local-Wi-Fi Rover-01 path.
- Raspberry Pi when video, heavier compute, or Linux tools are required.
- Arduino-class boards when a simple teaching kit is the right product.

The first standard kit is the narrow paid pilot and the first marketplace seed:

> RoboForge Rover-01 Beta Kit + guided setup workshop + Web Garage.

The first physical standard should include only the parts needed for the full
owner journey:

- control board
- motor driver
- two drive motors
- battery pack
- power switch and fuse or protected pack
- wiring map
- local Wi-Fi control protocol
- claim QR/code

Modules can use I2C, CAN, serial, or a keyed header. The product contract is
not only the connector; the product contract is that every module can identify
itself and map to a safe RoboForge profile.

## Layer B: Abstraction Engine

Layer B is the software layer that hides firmware, protocol, and hardware
complexity from the owner.

The first implementation is profile-first, then grows into firmware/config
generation and visual programming:

- the owner sees a virtual robot profile in Web Garage
- Ops stores the real hardware profile for a claimed kit
- the dashboard displays hardware slots and readiness
- the robot exposes `/api/v1/info` and `/api/v1/status`
- the app maps the physical facts into a `robot_profile`

The first useful abstraction is a readable profile:

```json
{
  "profileVersion": "0.1",
  "robotType": "rover",
  "unitCode": "RF-RV-0001",
  "brain": {
    "board": "ESP32 DevKit V1",
    "firmware": "0.1.0",
    "protocol": "v1"
  },
  "mechanism": {
    "drive": "differential_drive",
    "motorDriver": "L298N dual H-bridge"
  },
  "power": {
    "chemistry": "li-ion",
    "cells": 2,
    "hasPowerSwitch": true,
    "hasFuse": true
  },
  "senses": [],
  "communication": {
    "mode": "local_wifi",
    "ssid": "RoboForge-RF-RV-0001",
    "localUrl": "http://192.168.4.1"
  },
  "safety": {
    "requiresArm": true,
    "raisedWheelTestRequired": true,
    "readiness": "ready_for_bench"
  }
}
```

A self-describing module advertises itself with a manifest. MQTT is useful when
a cloud/device broker exists; the first Rover-01 path can expose the same idea
through the local robot API until the broker exists.

```json
{
  "manifestVersion": "0.1",
  "moduleId": "rf.sensor.distance.vl53l0x",
  "moduleType": "sensor",
  "displayName": "Distance Sensor",
  "bus": "i2c",
  "capabilities": ["distance_mm", "mission_telemetry"],
  "requiresFirmware": ">=0.2.0",
  "safetyNotes": ["Mount away from wheel path"]
}
```

Blockly, flow-based programming, OTA flashing, ROS, MQTT, and WebRTC belong
behind this layer. They must be introduced through the abstraction engine so
the customer works with robot profiles and behaviors instead of raw protocols.

## Layer C: Control And Sharing

Layer C is the owner experience:

- Web Garage for ownership, profile, readiness, and next step
- Connection Quest for local Wi-Fi setup
- Local Cockpit for live motor control
- Missions for simple behavior and learning loops
- Blueprint sharing and paid marketplace listings after the profile contract is
  stable
- Automation, video/data streams, and swarm grouping after the robot runtime can
  prove safe local control

The first dashboard surface should show three things:

- Hardware Profile: what physical facts are known
- Module Slots: which parts are installed, pending, or future
- Blueprint: the cloneable robot profile, not a marketplace listing yet

Blueprints begin as read-only profiles. A shared blueprint can copy the digital
setup, lessons, and compatible module list. As hardware and automation mature,
the same blueprint model becomes the marketplace item.

## Build Sequence

### Phase 1: Standard Kit And Profile

Build the first complete path:

- one Rover-01 standard kit path
- one hardware profile model
- one module-slot dashboard panel
- one blueprint preview tied to the Web Garage
- one local robot protocol path using `docs/ROBOT_PROTOCOL.md`

Use simple config generation before firmware generation:

- config values are produced in `/admin`
- hardware contracts live under `hardware/standards`, `hardware/kits`, and
  `hardware/modules`
- firmware config is generated from `hardware/templates/esp32_rover_config.h.mustache`
- firmware still follows the checked-in ESP32 path
- firmware identity, compatibility, and recovery steps are visible in Firmware
  Lab

### Phase 2: Device Cockpit Under The Web Architecture

Unify the product architecture:

- move the device cockpit source under `web/`
- keep a separate static device build target for ESP32 LittleFS
- keep live motor commands local to the robot Wi-Fi
- keep Supabase as the system of record for accounts, kits, profiles, sessions,
  and summaries

### Phase 3: Plug-And-Play Modules

Add hardware discovery:

- module manifests over the local robot API
- I2C/CAN/serial module records in the robot profile
- compatibility checks before enabling controls or behaviors
- Standard Kit partner validation with Thai/Chinese suppliers

### Phase 4: Firmware And Behavior Engine

Add safe update and behavior authoring:

- signed firmware/config packages
- OTA route may exist earlier, but must stay disabled until USB recovery,
  signed package verification, and rollback are proven on real kits
- Blockly or flow-based behavior programming
- per-board compatibility for ESP32, Raspberry Pi, and Arduino-class boards

### Phase 5: Sharing, Marketplace, And Swarm

Add the network effects:

- paid blueprint marketplace
- shared robot profiles
- automation recipes
- video/data streaming
- swarm grouping and fleet-level controls

## Safety Gates

Hardware features move forward only when the evidence exists:

- hardware profile is filled from real kit facts
- power switch and fuse or protected pack are verified
- bench protocol check passes
- raised-wheel movement and emergency stop pass
- floor readiness is recorded in Ops

The stable boundary remains the robot protocol. Boards and modules can change
only if they still speak the RoboForge control language.
