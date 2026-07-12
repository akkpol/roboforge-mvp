import json
import machine
import sys
import time
import network
import uselect
from microWebSrv import MicroWebSrv

# ============================================================
# 🔧 RoboForge MicroPython Agent — WebSocket Direct
# ============================================================

FIRMWARE_VERSION = "roboforge-websocket-agent-0.2.0"
CONFIG_FILE = "roboforge.json"
AP_SSID_PREFIX = "Rover-"

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
STATUS_INTERVAL_MS = 2000
SAFE_DUTY_MIN = 90

DEFAULT_CONFIG = {
    "ssid": "",
    "password": "",
    "robot_id": "rf-rover",
    "speed_limit": 0.55,
    "avoid": False,
    "avoid_distance_cm": 25,
}

# ============================================================
# ⚙️ Hardware setup
# ============================================================

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

wlan_ap = network.WLAN(network.AP_IF)
wlan_sta = network.WLAN(network.STA_IF)

# ============================================================
# 💾 Config
# ============================================================

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

# ============================================================
# 🔋 Battery
# ============================================================

def read_battery_v():
    raw = battery_adc.read()
    millivolts = raw * 3300 / 4095
    ratio = (BATTERY_DIVIDER_TOP + BATTERY_DIVIDER_BOTTOM) / BATTERY_DIVIDER_BOTTOM
    return round(millivolts * ratio / 1000, 2)


def battery_percent(volts):
    return max(0, min(100, int((volts - 6.4) / (8.4 - 6.4) * 100)))


# ============================================================
# 📏 Distance
# ============================================================

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


# ============================================================
# 🚗 Motor control
# ============================================================

last_drive_ms = time.ticks_ms()
last_left = 0
last_right = 0
last_status_ms = time.ticks_ms()
ws_clients = []


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
    speed_limit = max(0.1, min(1.0, config.get("speed_limit", 0.55)))
    duty = int(abs(value) * speed_limit * 1023)
    if duty < SAFE_DUTY_MIN:
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
    throttle = max(-1.0, min(1.0, throttle))
    steering = max(-1.0, min(1.0, steering))
    left = throttle + steering
    right = throttle - steering
    ratio = max(abs(left), abs(right))
    if ratio > 1:
        left /= ratio
        right /= ratio
    set_motor(in1, in2, pwm_left, left)
    set_motor(in3, in4, pwm_right, right)
    last_left = left
    last_right = right
    last_drive_ms = time.ticks_ms()


# ============================================================
# 📡 Status
# ============================================================

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
        "speed_limit": config.get("speed_limit", 0.55),
        "left": round(last_left, 2),
        "right": round(last_right, 2),
    }
    if distance is not None:
        payload["distance_cm"] = distance
    try:
        rssi = wlan_sta.status("rssi")
        payload["rssi"] = rssi
    except Exception:
        pass
    return payload


def broadcast_status():
    payload = json.dumps(status_payload())
    dead = []
    for ws in ws_clients:
        try:
            ws.SendText(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        try:
            ws_clients.remove(ws)
        except Exception:
            pass


# ============================================================
# 🎮 Command handler
# ============================================================

def handle_command(data):
    cmd = data.get("cmd", "")
    if cmd == "stop":
        stop()
        broadcast_status()
    elif cmd == "drive":
        drive(data.get("throttle", 0), data.get("steering", 0))
    elif cmd == "status":
        broadcast_status()
    elif cmd == "avoid":
        config["avoid"] = bool(data.get("enable", False))
        save_config(config)
        broadcast_status()
    elif cmd == "config":
        for key in ("avoid_distance_cm", "speed_limit"):
            if key in data:
                config[key] = data[key]
        if "robot_id" in data:
            config["robot_id"] = str(data["robot_id"])
        save_config(config)
        broadcast_status()
    elif cmd == "provision":
        for key in ("ssid", "password", "robot_id"):
            if key in data:
                config[key] = data[key]
        save_config(config)
        broadcast_status()
        time.sleep_ms(300)
        machine.reset()


# ============================================================
# 🔄 Safety
# ============================================================

def safety_loop():
    if time.ticks_diff(time.ticks_ms(), last_drive_ms) > DEADMAN_MS:
        stop()
    if config.get("avoid"):
        distance = read_distance_cm()
        if distance is not None and distance <= config.get("avoid_distance_cm", 25):
            stop()


# ============================================================
# 🌐 WiFi — STA ต่อ hotspot หรือ AP
# ============================================================

def setup_wifi():
    ssid = config.get("ssid", "").strip()
    password = config.get("password", "")

    if ssid and len(password) >= 8:
        # Station mode: ต่อ hotspot
        wlan_ap.active(False)
        wlan_sta.active(True)
        print("[WiFi] connecting to", ssid)
        wlan_sta.connect(ssid, password)
        for _ in range(40):
            if wlan_sta.isconnected():
                print("[WiFi] connected:", wlan_sta.ifconfig()[0])
                return
            time.sleep_ms(250)
        print("[WiFi] station failed, fallback to AP")

    # AP mode: สร้าง WiFi ของตัวเอง
    wlan_sta.active(False)
    wlan_ap.active(True)
    robot_id = config.get("robot_id", "rf-rover")
    ap_ssid = AP_SSID_PREFIX + robot_id[-5:]
    ap_pass = "12345678"
    wlan_ap.config(essid=ap_ssid, password=ap_pass, authmode=network.AUTH_WPA_WPA2_PSK)
    print("[WiFi] AP mode:", ap_ssid, "/", ap_pass, "/ IP:", wlan_ap.ifconfig()[0])


# ============================================================
# 🔌 WebSocket callbacks
# ============================================================

def _accept_ws(webSocket, httpClient):
    print("[WS] client connected")
    webSocket.RecvTextCallback = _recv_text
    webSocket.ClosedCallback = _closed_ws
    ws_clients.append(webSocket)
    # ส่งสถานะให้ client ใหม่
    try:
        webSocket.SendText(json.dumps(status_payload()))
    except Exception:
        pass


def _recv_text(webSocket, msg):
    try:
        data = json.loads(msg)
        handle_command(data)
    except Exception as exc:
        print("[WS] bad message:", exc)


def _closed_ws(webSocket):
    print("[WS] client disconnected")
    try:
        ws_clients.remove(webSocket)
    except Exception:
        pass


# ============================================================
# 🌐 HTTP route — หน้า control
# ============================================================

@MicroWebSrv.route('/', 'GET')
def _http_control_page(httpClient, httpResponse):
    robot_id = config.get("robot_id", "Rover")
    html = _CONTROL_PAGE_HTML.replace("__ROBOT_ID__", robot_id)
    httpResponse.WriteResponseOk(
        headers=None,
        contentType="text/html",
        contentCharset="UTF-8",
        content=html,
    )


# ============================================================
# 🔌 Serial provision — รับ WiFi ผ่าน USB (WebSerial)
#    ใช้ uselect + sys.stdin — ไม่ชนกับ REPL
# ============================================================

stdin_poll = uselect.poll()
stdin_poll.register(sys.stdin, uselect.POLLIN)


def check_serial_provision():
    global config
    if not stdin_poll.poll(50):
        return
    try:
        line = sys.stdin.readline()
    except Exception:
        return
    if not line or len(line) < 10:
        return
    try:
        data = json.loads(line)
    except Exception:
        return
    if data.get("cmd") != "provision":
        return
    next_config = DEFAULT_CONFIG.copy()
    next_config.update(config)
    for key in ("ssid", "password", "robot_id"):
        if key in data:
            next_config[key] = data[key]
    save_config(next_config)
    config = next_config
    stop()
    sys.stdout.write(json.dumps({"ok": True, "robot_id": config["robot_id"], "saved": True}) + "\n")
    time.sleep_ms(300)
    machine.reset()


# ============================================================
# 🔄 Idle callback (รันทุก 50ms ตอน server ว่าง) — ต้องอยู่ก่อน srv._idleCallback assignment
# ============================================================

def _on_idle():
    check_serial_provision()
    safety_loop()
    global last_status_ms
    if time.ticks_diff(time.ticks_ms(), last_status_ms) > STATUS_INTERVAL_MS:
        last_status_ms = time.ticks_ms()
        broadcast_status()


# ============================================================
# 📄 หน้า control (ในตัว ไม่ต้องใช้ static file)
# ============================================================

_CONTROL_PAGE_HTML = """\
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>__ROBOT_ID__ - RoboForge</title>
<style>
*{box-sizing:border-box;margin:0}
body{font-family:-apple-system,sans-serif;background:#f0f6ff;color:#0d2448;min-height:100dvh;display:grid;place-items:center;padding:16px}
.card{background:rgba(255,255,255,.88);backdrop-filter:blur(8px);border:1px solid rgba(85,151,209,.2);border-radius:24px;padding:20px;width:100%;max-width:400px;display:grid;gap:14px;box-shadow:0 8px 32px rgba(49,99,155,.12)}
h1{font-size:22px;display:flex;align-items:center;gap:8px}
.status{display:flex;align-items:center;gap:8px;font-size:14px;color:#179677}
.status-dot{width:10px;height:10px;border-radius:50%;background:#f0b84d}
.status-dot.online{background:#35c9b2;box-shadow:0 0 0 5px rgba(53,201,178,.16)}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center}
.stat-box{padding:8px;background:rgba(74,184,255,.08);border-radius:14px;font-size:13px;color:#315981}
.stat-box strong{display:block;font-size:18px;color:#0d2448}
.dpad{display:grid;grid-template-columns:64px 64px 64px;gap:6px;justify-content:center}
.dpad button{height:56px;border:0;border-radius:16px;font-size:18px;cursor:pointer;background:rgba(74,184,255,.14);color:#0d2448;font-weight:700}
.dpad button:active{background:rgba(74,184,255,.3)}
.stop-btn{background:#ff4444!important;color:#fff!important;width:100%;height:48px;border:0;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer}
.stop-btn:active{background:#cc0000!important}
.safety{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:8px;background:rgba(69,196,157,.08);border-radius:14px}
.safety input{width:18px;height:18px;accent-color:#35c9b2}
.avoid-row{display:flex;gap:8px;align-items:center}
button.secondary{flex:1;height:40px;border:0;border-radius:14px;cursor:pointer;background:rgba(74,184,255,.1);font-size:13px;font-weight:700}
button.secondary:active{background:rgba(74,184,255,.25)}
input[type=range]{flex:1;accent-color:#35c9b2}
.help{font-size:12px;color:#5e7599;text-align:center}
</style>
</head>
<body>
<div class="card" id="app">
  <h1>🔵 <span id="title">__ROBOT_ID__</span></h1>
  <div class="status"><span class="status-dot" id="dot"></span><span id="status-text">กำลังเชื่อมต่อ...</span></div>
  <div class="stats">
    <div class="stat-box">แบตเตอรี่<strong id="battery">--</strong></div>
    <div class="stat-box">ระยะ<strong id="distance">--</strong></div>
  </div>
  <div class="dpad">
    <div></div><button id="btn-fwd">▲<br><small>หน้า</small></button><div></div>
    <button id="btn-left">◀<br><small>ซ้าย</small></button><button id="btn-stop">■</button><button id="btn-right">▶<br><small>ขวา</small></button>
    <div></div><button id="btn-back">▼<br><small>ถอย</small></button><div></div>
  </div>
  <button class="stop-btn" id="btn-emergency">🛑 STOP ด่วน</button>
  <label class="safety"><input type="checkbox" id="chk-raised"> ยกรถขึ้นจากพื้นแล้ว (ปลดล็อคปุ่มล้อ)</label>
  <div class="avoid-row">
    <button class="secondary" id="btn-avoid">🚧 หลบหลีก</button>
    <input type="range" id="slider-distance" min="15" max="50" value="25">
    <span id="dist-label" style="font-size:12px;min-width:40px">25cm</span>
    <button class="secondary" id="btn-apply">ตั้ง</button>
  </div>
  <details style="cursor:pointer;border-top:1px solid rgba(85,151,209,.12);padding-top:8px">
    <summary style="font-size:12px;color:#5e7599;font-weight:700">⚙️ Wi-Fi</summary>
    <div style="display:grid;gap:6px;margin-top:8px">
      <input id="wifi-ssid" placeholder="ชื่อ hotspot โทรศัพท์" style="padding:6px 10px;border:1px solid rgba(85,151,209,.3);border-radius:10px;font-size:13px;width:100%">
      <input id="wifi-pass" type="password" placeholder="รหัสอย่างน้อย 8 ตัว" style="padding:6px 10px;border:1px solid rgba(85,151,209,.3);border-radius:10px;font-size:13px;width:100%">
      <button id="btn-wifi-save" style="padding:8px;border:0;border-radius:12px;background:rgba(74,184,255,.14);cursor:pointer;font-size:13px;font-weight:700;width:100%">💾 บันทึก Wi-Fi</button>
    </div>
  </details>
  <div class="help">❤️ ต่อ WebSocket ตรง — ไม่ต้องใช้ broker, internet, หรือสมัคร service</div>
</div>
<script>
var ws=null, connected=false, driveTimer=null, robotId='';
function connect(){try{ws=new WebSocket('ws://'+location.hostname+'/ws');ws.onopen=function(){connected=true;document.getElementById('dot').className='status-dot online';document.getElementById('status-text').textContent='🟢 พร้อมใช้งาน'};ws.onmessage=function(e){try{var d=JSON.parse(e.data);if(d.battery_pct!==undefined)document.getElementById('battery').textContent=d.battery_pct+'%';if(d.battery_v!==undefined)document.getElementById('battery').textContent+=' ('+d.battery_v+'V)';if(d.distance_cm!==undefined)document.getElementById('distance').textContent=d.distance_cm+'cm';if(d.robot_id)robotId=d.robot_id}catch(e){}};ws.onclose=function(){connected=false;document.getElementById('dot').className='status-dot';document.getElementById('status-text').textContent='⚠️ ไม่ได้เชื่อมต่อ — หน้าเว็บจะลองใหม่';setTimeout(connect,2000)}}catch(e){setTimeout(connect,3000)}}
connect();
function send(cmd){if(connected){ws.send(JSON.stringify(cmd))}}function drive(t,s){if(!connected||!document.getElementById('chk-raised').checked)return;send({cmd:'drive',throttle:t,steering:s});if(driveTimer)clearTimeout(driveTimer);driveTimer=setTimeout(function(){send({cmd:'stop'})},900)}
document.getElementById('btn-fwd').onclick=function(){drive(0.35,0)};document.getElementById('btn-back').onclick=function(){drive(-0.35,0)};document.getElementById('btn-left').onclick=function(){drive(0, -0.45)};document.getElementById('btn-right').onclick=function(){drive(0,0.45)};
document.getElementById('btn-stop').onclick=function(){send({cmd:'status'})};document.getElementById('btn-emergency').onclick=function(){send({cmd:'stop'});document.getElementById('chk-raised').checked=false};
var avoidOn=false;document.getElementById('btn-avoid').onclick=function(){avoidOn=!avoidOn;send({cmd:'avoid',enable:avoidOn});this.textContent=avoidOn?'✅ หลบ ON':'🚧 หลบหลีก'};
document.getElementById('slider-distance').oninput=function(){document.getElementById('dist-label').textContent=this.value+'cm'};document.getElementById('btn-apply').onclick=function(){send({cmd:'config',avoid_distance_cm:parseInt(document.getElementById('slider-distance').value)})};
document.getElementById('chk-raised').onchange=function(){if(!this.checked)send({cmd:'stop'})};
document.getElementById('btn-wifi-save').onclick=function(){var s=document.getElementById('wifi-ssid').value.trim(),p=document.getElementById('wifi-pass').value;if(s&&p.length>=8){send({cmd:'provision',ssid:s,password:p});alert('Wi-Fi บันทึกแล้ว ESP32 จะรีบูต');}else{alert('กรุณาใส่ชื่อ hotspot และรหัสอย่างน้อย 8 ตัว');}};
</script>
</body>
</html>"""


# ============================================================
# ▶️ MAIN
# ============================================================

stop()
print("\nRoboForge WebSocket Agent", FIRMWARE_VERSION)
print("Robot ID:", config["robot_id"])

setup_wifi()

srv = MicroWebSrv(webPath=None)  # no static files — all routes
srv.MaxWebSocketRecvLen = 2048
srv.WebSocketThreaded = False
srv.AcceptWebSocketCallback = _accept_ws
srv._idleCallback = _on_idle
print("[HTTP] server starting on 80")
srv.Start(threaded=False)
