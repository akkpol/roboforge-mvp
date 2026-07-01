import json
import machine
import network
import sys
import time
import uselect
from umqtt.simple import MQTTClient

FIRMWARE_VERSION = "roboforge-micropython-agent-0.1.0"
CONFIG_FILE = "roboforge.json"

PIN_ENA = 25
PIN_IN1 = 26
PIN_IN2 = 27
PIN_ENB = 33
PIN_IN3 = 32
PIN_IN4 = 17
PIN_BATTERY_ADC = 34
PIN_ULTRASONIC_TRIG = 18
PIN_ULTRASONIC_ECHO = 19

BATTERY_DIVIDER_TOP = 100000
BATTERY_DIVIDER_BOTTOM = 33000
DEADMAN_MS = 1200
STATUS_MS = 10000
MQTT_RETRY_MS = 5000
WIFI_RETRY_MS = 10000

DEFAULT_CONFIG = {
    "ssid": "",
    "password": "",
    "robot_id": "rf-rover",
    "token": "",
    "mqtt_host": "mqtt.roboforge.app",
    "mqtt_port": 8883,
    "mqtt_tls": True,
    "topic_prefix": "rf",
    "speed_limit": 0.55,
    "avoid": False,
    "avoid_distance_cm": 25,
}


def clamp(value, minimum, maximum):
    try:
        number = float(value)
    except Exception:
        number = 0
    return max(minimum, min(maximum, number))


def load_config():
    config = DEFAULT_CONFIG.copy()
    try:
        with open(CONFIG_FILE, "r") as fp:
            saved = json.loads(fp.read())
            if isinstance(saved, dict):
                config.update(saved)
    except Exception:
        pass
    return config


def save_config(next_config):
    with open(CONFIG_FILE, "w") as fp:
        fp.write(json.dumps(next_config))


config = load_config()

in1 = machine.Pin(PIN_IN1, machine.Pin.OUT)
in2 = machine.Pin(PIN_IN2, machine.Pin.OUT)
in3 = machine.Pin(PIN_IN3, machine.Pin.OUT)
in4 = machine.Pin(PIN_IN4, machine.Pin.OUT)
pwm_left = machine.PWM(machine.Pin(PIN_ENA), freq=1000, duty=0)
pwm_right = machine.PWM(machine.Pin(PIN_ENB), freq=1000, duty=0)

battery_adc = machine.ADC(machine.Pin(PIN_BATTERY_ADC))
battery_adc.atten(machine.ADC.ATTN_11DB)

trigger = machine.Pin(PIN_ULTRASONIC_TRIG, machine.Pin.OUT)
echo = machine.Pin(PIN_ULTRASONIC_ECHO, machine.Pin.IN)
trigger.value(0)

wlan = network.WLAN(network.STA_IF)
stdin_poll = uselect.poll()
stdin_poll.register(sys.stdin, uselect.POLLIN)

mqtt = None
mqtt_connected = False
last_drive_ms = time.ticks_ms()
last_status_ms = time.ticks_ms()
last_mqtt_try_ms = time.ticks_ms()
last_wifi_try_ms = time.ticks_ms()
last_left = 0
last_right = 0


def topic(name):
    return "{}/{}/{}".format(config["topic_prefix"], config["robot_id"], name).encode()


def stop():
    global last_left, last_right
    in1.value(0)
    in2.value(0)
    in3.value(0)
    in4.value(0)
    pwm_left.duty(0)
    pwm_right.duty(0)
    last_left = 0
    last_right = 0


def set_motor(pin_a, pin_b, pwm, value):
    speed_limit = clamp(config.get("speed_limit", 0.55), 0.1, 1.0)
    duty = int(abs(clamp(value, -1, 1)) * speed_limit * 1023)
    if duty < 90:
        pin_a.value(0)
        pin_b.value(0)
        pwm.duty(0)
    elif value > 0:
        pin_a.value(1)
        pin_b.value(0)
        pwm.duty(duty)
    else:
        pin_a.value(0)
        pin_b.value(1)
        pwm.duty(duty)


def drive(throttle, steering):
    global last_drive_ms, last_left, last_right
    throttle = clamp(throttle, -1, 1)
    steering = clamp(steering, -1, 1)
    left = throttle + steering
    right = throttle - steering
    ratio = max(abs(left), abs(right))
    if ratio > 1:
        left = left / ratio
        right = right / ratio
    set_motor(in1, in2, pwm_left, left)
    set_motor(in3, in4, pwm_right, right)
    last_left = left
    last_right = right
    last_drive_ms = time.ticks_ms()


def read_battery_v():
    raw = battery_adc.read()
    millivolts = raw * 3300 / 4095
    ratio = (BATTERY_DIVIDER_TOP + BATTERY_DIVIDER_BOTTOM) / BATTERY_DIVIDER_BOTTOM
    return round(millivolts * ratio / 1000, 2)


def battery_percent(volts):
    return max(0, min(100, int((volts - 6.4) / (8.4 - 6.4) * 100)))


def read_distance_cm():
    try:
        trigger.value(0)
        time.sleep_us(2)
        trigger.value(1)
        time.sleep_us(10)
        trigger.value(0)
        pulse = machine.time_pulse_us(echo, 1, 30000)
        if pulse < 0:
            return None
        return round((pulse / 2) / 29.1, 1)
    except Exception:
        return None


def status_payload():
    volts = read_battery_v()
    distance = read_distance_cm()
    payload = {
        "robot_id": config["robot_id"],
        "firmware": FIRMWARE_VERSION,
        "online": True,
        "battery_v": volts,
        "battery_pct": battery_percent(volts),
        "avoid": bool(config.get("avoid")),
        "speed_limit": clamp(config.get("speed_limit", 0.55), 0.1, 1.0),
        "left": round(last_left, 2),
        "right": round(last_right, 2),
    }
    try:
        payload["rssi"] = wlan.status("rssi")
    except Exception:
        pass
    if distance is not None:
        payload["distance_cm"] = distance
    return payload


def publish_status():
    if mqtt_connected and mqtt:
        try:
            mqtt.publish(topic("status"), json.dumps(status_payload()))
        except Exception:
            pass


def apply_config_patch(data):
    changed = False
    for key in ("avoid_distance_cm", "speed_limit", "mqtt_host", "mqtt_port", "mqtt_tls", "topic_prefix", "token"):
        if key in data:
            config[key] = data[key]
            changed = True
    if "robot_id" in data:
        config["robot_id"] = str(data["robot_id"])
        changed = True
    if changed:
        save_config(config)


def handle_command(data):
    cmd = data.get("cmd", "")
    if cmd == "stop":
        stop()
        publish_status()
    elif cmd == "drive":
        drive(data.get("throttle", 0), data.get("steering", 0))
    elif cmd == "status":
        publish_status()
    elif cmd == "avoid":
        config["avoid"] = bool(data.get("enable"))
        save_config(config)
        publish_status()
    elif cmd == "config":
        apply_config_patch(data)
        publish_status()


def mqtt_callback(_topic, msg):
    try:
        handle_command(json.loads(msg))
    except Exception as exc:
        print("[MQTT] bad command", exc)


def connect_wifi():
    global last_wifi_try_ms
    if not config.get("ssid"):
        print("[WiFi] waiting for provision")
        return False
    if not wlan.active():
        wlan.active(True)
    if wlan.isconnected():
        return True
    now = time.ticks_ms()
    if time.ticks_diff(now, last_wifi_try_ms) < WIFI_RETRY_MS:
        return False
    last_wifi_try_ms = now
    print("[WiFi] connecting to", config["ssid"])
    wlan.connect(config["ssid"], config.get("password", ""))
    for _ in range(40):
        if wlan.isconnected():
            print("[WiFi] online", wlan.ifconfig()[0])
            return True
        time.sleep_ms(250)
    return False


def connect_mqtt():
    global mqtt, mqtt_connected, last_mqtt_try_ms
    if mqtt_connected:
        return True
    if not wlan.isconnected():
        return False
    now = time.ticks_ms()
    if time.ticks_diff(now, last_mqtt_try_ms) < MQTT_RETRY_MS:
        return False
    last_mqtt_try_ms = now
    try:
        client_id = "{}-{}".format(config["robot_id"], time.ticks_ms())
        kwargs = {}
        if config.get("mqtt_tls"):
            kwargs["ssl"] = True
            kwargs["ssl_params"] = {}
        mqtt = MQTTClient(
            client_id,
            config["mqtt_host"],
            port=int(config.get("mqtt_port", 8883)),
            user=config["robot_id"],
            password=config.get("token", ""),
            keepalive=30,
            **kwargs
        )
        mqtt.set_callback(mqtt_callback)
        mqtt.connect()
        mqtt.subscribe(topic("cmd"))
        mqtt_connected = True
        print("[MQTT] online", config["mqtt_host"], topic("cmd"))
        publish_status()
        return True
    except Exception as exc:
        mqtt_connected = False
        mqtt = None
        print("[MQTT] connect failed", exc)
        return False


def check_serial_provision():
    global config, mqtt_connected
    if not stdin_poll.poll(0):
        return
    line = sys.stdin.readline()
    if not line:
        return
    try:
        data = json.loads(line)
    except Exception:
        print(json.dumps({"ok": False, "error": "invalid_json"}))
        return
    if data.get("cmd") == "ping":
        print(json.dumps({"ok": True, "firmware": FIRMWARE_VERSION}))
        return
    if data.get("cmd") != "provision":
        print(json.dumps({"ok": False, "error": "unknown_cmd"}))
        return
    next_config = DEFAULT_CONFIG.copy()
    next_config.update(config)
    for key in ("ssid", "password", "robot_id", "token", "mqtt_host", "mqtt_port", "mqtt_tls", "topic_prefix"):
        if key in data:
            next_config[key] = data[key]
    save_config(next_config)
    config = next_config
    mqtt_connected = False
    stop()
    print(json.dumps({"ok": True, "robot_id": config["robot_id"], "saved": True}))
    time.sleep_ms(300)
    machine.reset()


def safety_loop():
    if time.ticks_diff(time.ticks_ms(), last_drive_ms) > DEADMAN_MS:
        stop()
    if config.get("avoid"):
        distance = read_distance_cm()
        if distance is not None and distance <= int(config.get("avoid_distance_cm", 25)):
            stop()


stop()
print("RoboForge MicroPython Agent", FIRMWARE_VERSION)
print("Robot ID:", config["robot_id"])

while True:
    try:
        check_serial_provision()
        connect_wifi()
        if connect_mqtt() and mqtt:
            try:
                mqtt.check_msg()
            except Exception:
                mqtt_connected = False
                mqtt = None
                stop()
        safety_loop()
        if time.ticks_diff(time.ticks_ms(), last_status_ms) > STATUS_MS:
            last_status_ms = time.ticks_ms()
            publish_status()
        time.sleep_ms(40)
    except Exception as exc:
        print("[loop]", exc)
        stop()
        time.sleep_ms(500)
