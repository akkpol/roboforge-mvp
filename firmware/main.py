import json
import machine
import time
import network
from microWebSrv import MicroWebSrv

# ============================================================
# 🔧 RoboForge MicroPython Agent — WebSocket Direct
# ============================================================

FIRMWARE_VERSION = "roboforge-websocket-agent-0.3.0"
CONFIG_FILE = "roboforge.json"
AP_SSID_PREFIX = "Rover-"

PIN_ENA = 25
PIN_IN1 = 26
PIN_IN2 = 27
PIN_ENB = 33
PIN_IN3 = 32
PIN_IN4 = 17
PIN_BATTERY_ADC = 34

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
    payload = {
        "robot_id": config["robot_id"],
        "firmware": FIRMWARE_VERSION,
        "online": True,
        "battery_v": volts,
        "battery_pct": battery_percent(volts),
        "speed_limit": config.get("speed_limit", 0.55),
        "left": round(last_left, 2),
        "right": round(last_right, 2),
    }
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
    elif cmd == "config":
        for key in ("speed_limit",):
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
    html = _CONTROL_PAGE_HTML
    httpResponse.WriteResponseOk(
        headers=None,
        contentType="text/html",
        contentCharset="UTF-8",
        content=html % robot_id,
    )


# ============================================================
# 🔄 Idle callback (รันทุก 50ms ตอน server ว่าง)
# ============================================================

def _on_idle():
    safety_loop()
    global last_status_ms
    if time.ticks_diff(time.ticks_ms(), last_status_ms) > STATUS_INTERVAL_MS:
        last_status_ms = time.ticks_ms()
        broadcast_status()


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
srv.Start(threaded=False)

print("[HTTP] server started on 80")


# ============================================================
# 📄 หน้า control (inline HTML — 2026 design, ~3.8KB)
# ============================================================

_CONTROL_PAGE_HTML = """\
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>%s — RoboForge</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{color-scheme:light dark}
body{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  background:linear-gradient(145deg,#eef5ff 0%,#dceafb 40%,#f0f6ff 100%);
  color:#0d2448;
  min-height:100dvh;min-height:100vh;
  display:grid;place-items:center;padding:16px;
  -webkit-tap-highlight-color:transparent;
  -webkit-font-smoothing:antialiased;
}
.card{
  background:rgba(255,255,255,.78);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border:1px solid rgba(255,255,255,.6);
  border-radius:28px;
  padding:20px 18px 16px;
  width:100%;max-width:400px;
  display:grid;gap:12px;
  box-shadow:
    0 8px 40px rgba(49,99,155,.1),
    0 2px 8px rgba(49,99,155,.06),
    inset 0 1px 0 rgba(255,255,255,.7);
}
h1{
  font-size:20px;font-weight:700;
  display:flex;align-items:center;gap:8px;
  letter-spacing:-.02em;
  color:#0d2448;
}
h1 .emoji{font-size:26px;line-height:1}
.status-row{
  display:flex;align-items:center;gap:8px;
  padding:8px 12px;
  background:rgba(69,196,157,.08);
  border-radius:16px;
  font-size:13px;font-weight:600;
  color:#179677;
}
.status-dot{
  width:10px;height:10px;border-radius:50%;
  background:#f0b84d;flex-shrink:0;
  transition:background .3s ease,box-shadow .3s ease;
}
.status-dot.online{
  background:#35c9b2;
  box-shadow:0 0 0 5px rgba(53,201,178,.16);
  animation:pulse 2s ease-in-out infinite;
}
@keyframes pulse{
  0%,100%{box-shadow:0 0 0 5px rgba(53,201,178,.16)}
  50%{box-shadow:0 0 0 10px rgba(53,201,178,.06)}
}
.battery-card{
  display:grid;grid-template-columns:1fr auto;
  align-items:center;
  padding:12px 14px;
  background:rgba(74,184,255,.06);
  border:1px solid rgba(74,184,255,.12);
  border-radius:18px;
  gap:4px;
}
.battery-label{font-size:12px;color:#5e7599;font-weight:600}
.battery-value{font-size:26px;font-weight:700;color:#0d2448;line-height:1}
.battery-icon{
  font-size:28px;line-height:1;
  filter:drop-shadow(0 2px 4px rgba(74,184,255,.2));
}
.dpad{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  grid-template-rows:repeat(3,1fr);
  gap:8px;justify-items:center;
  max-width:240px;margin:0 auto;
}
.dpad button{
  width:64px;height:56px;
  border:1px solid rgba(74,184,255,.18);
  border-radius:18px;
  font-size:16px;font-weight:700;
  cursor:pointer;
  background:rgba(255,255,255,.88);
  color:#0d2448;
  display:grid;place-items:center;
  -webkit-user-select:none;user-select:none;
  -webkit-tap-highlight-color:transparent;
  transition:transform .1s ease,background .1s ease,box-shadow .1s ease;
  box-shadow:0 4px 14px rgba(49,99,155,.08);
}
.dpad button:active{
  transform:scale(.94);
  background:rgba(74,184,255,.22);
  box-shadow:0 2px 6px rgba(49,99,155,.04);
}
.dpad .stop-btn{
  background:#ff5b64;color:#fff;
  border-color:rgba(255,91,100,.4);
  font-size:22px;
  box-shadow:0 4px 18px rgba(255,91,100,.18);
}
.dpad .stop-btn:active{
  background:#e04850;
  box-shadow:0 2px 8px rgba(255,91,100,.1);
}
.emergency{
  width:100%;height:48px;
  border:1px solid rgba(255,91,100,.3);
  border-radius:18px;
  background:rgba(255,91,100,.08);
  color:#d6303a;
  font-size:15px;font-weight:700;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:6px;
  -webkit-user-select:none;user-select:none;
  transition:transform .1s ease,background .1s ease;
}
.emergency:active{
  transform:scale(.97);
  background:rgba(255,91,100,.18);
}
.safety{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;
  background:rgba(244,193,80,.1);
  border:1px solid rgba(244,193,80,.25);
  border-radius:16px;
  font-size:12px;font-weight:600;color:#8a6400;
  cursor:pointer;-webkit-user-select:none;user-select:none;
}
.safety input{width:18px;height:18px;accent-color:#f4c150;cursor:pointer}
.wifi-details{cursor:pointer}
.wifi-details summary{
  font-size:12px;color:#5e7599;font-weight:700;
  padding:8px 0;list-style:none;
  display:flex;align-items:center;gap:6px;
}
.wifi-details summary::before{
  content:"⚙️";font-size:14px;
}
.wifi-details summary::after{
  content:"▼";font-size:10px;margin-left:auto;
  transition:transform .2s ease;
}
.wifi-details[open] summary::after{transform:rotate(180deg)}
.wifi-form{
  display:grid;gap:8px;padding:8px 0 4px;
}
.wifi-form input{
  padding:10px 14px;
  border:1px solid rgba(85,151,209,.22);
  border-radius:14px;
  font-size:13px;width:100%;
  background:rgba(255,255,255,.82);
  color:#0d2448;
  outline:none;
  transition:border-color .15s ease,box-shadow .15s ease;
}
.wifi-form input:focus{
  border-color:rgba(34,109,219,.5);
  box-shadow:0 0 0 4px rgba(74,184,255,.1);
}
.wifi-form button{
  width:100%;padding:10px;
  border:0;border-radius:14px;
  background:linear-gradient(135deg,#4ab8ff,#226ddb);
  color:#fff;font-size:13px;font-weight:700;
  cursor:pointer;
  transition:transform .1s ease,box-shadow .1s ease;
  box-shadow:0 6px 20px rgba(34,109,219,.2);
}
.wifi-form button:active{
  transform:scale(.97);
  box-shadow:0 3px 10px rgba(34,109,219,.12);
}
.help-text{
  text-align:center;font-size:11px;color:#92a4bf;
  line-height:1.4;padding-top:4px;
}
@media(prefers-color-scheme:dark){
  body{background:linear-gradient(145deg,#0f1a2e 0%,#16223a 40%,#101a2c 100%)}
  .card{
    background:rgba(25,35,55,.82);
    border-color:rgba(255,255,255,.08);
    box-shadow:0 8px 40px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.04);
  }
  h1,.battery-value{color:#e8f0ff}
  .battery-label,.help-text{color:#6b7d99}
  .status-row{background:rgba(69,196,157,.12);color:#45c49d}
  .battery-card{background:rgba(74,184,255,.08);border-color:rgba(74,184,255,.14)}
  .dpad button{
    background:rgba(255,255,255,.06);
    border-color:rgba(255,255,255,.1);
    color:#d8e3f5;
    box-shadow:0 4px 14px rgba(0,0,0,.12);
  }
  .dpad button:active{background:rgba(74,184,255,.14)}
  .emergency{background:rgba(255,91,100,.1);color:#ff7b82}
  .safety{background:rgba(244,193,80,.08);border-color:rgba(244,193,80,.15);color:#c9a02a}
  .wifi-form input{
    background:rgba(255,255,255,.06);
    border-color:rgba(255,255,255,.1);
    color:#e8f0ff;
  }
  .wifi-details summary{color:#6b7d99}
}
</style>
</head>
<body>
<div class="card" id="app">
  <h1><span class="emoji">🔵</span><span id="title">%s</span></h1>
  <div class="status-row">
    <span class="status-dot" id="dot"></span>
    <span id="status-text">กำลังเชื่อมต่อ…</span>
  </div>
  <div class="battery-card">
    <div>
      <div class="battery-label">🔋 แบตเตอรี่</div>
      <div class="battery-value" id="battery">--</div>
    </div>
    <div class="battery-icon" id="battery-emoji">🔋</div>
  </div>
  <div class="dpad">
    <div></div>
    <button id="btn-fwd" title="เดินหน้า">▲</button>
    <div></div>
    <button id="btn-left" title="เลี้ยวซ้าย">◀</button>
    <button class="stop-btn" id="btn-stop" title="หยุด">■</button>
    <button id="btn-right" title="เลี้ยวขวา">▶</button>
    <div></div>
    <button id="btn-back" title="ถอยหลัง">▼</button>
    <div></div>
  </div>
  <button class="emergency" id="btn-emergency">🛑 STOP ด่วน</button>
  <label class="safety">
    <input type="checkbox" id="chk-raised">
    <span>ยกรถขึ้นจากพื้นแล้ว (ปลดล็อค)</span>
  </label>
  <details class="wifi-details" id="wifi-section">
    <summary>ตั้งค่า Wi-Fi</summary>
    <div class="wifi-form">
      <input id="wifi-ssid" placeholder="📶 ชื่อ hotspot มือถือ" autocomplete="off">
      <input id="wifi-pass" type="password" placeholder="🔑 รหัส (อย่างน้อย 8 ตัว)" autocomplete="off">
      <button id="btn-wifi-save">💾 บันทึก และรีบูต</button>
    </div>
  </details>
  <div class="help-text">
    ❤️ WebSocket ตรง — ไม่ต้องใช้ broker, internet, หรือสมัคร service
  </div>
</div>
<script>
var ws=null, connected=false, driveTimer=null;
function connect(){
  try{
    ws=new WebSocket('ws://'+location.hostname+'/ws');
    ws.onopen=function(){
      connected=true;
      document.getElementById('dot').className='status-dot online';
      document.getElementById('status-text').textContent='🟢 พร้อมใช้งาน';
    };
    ws.onmessage=function(e){
      try{
        var d=JSON.parse(e.data);
        if(d.battery_pct!==undefined){
          var pct=d.battery_pct;
          var e=document.getElementById('battery-emoji');
          document.getElementById('battery').textContent=pct+'%';
          if(pct>=80)e.textContent='🔋';
          else if(pct>=50)e.textContent='🪫';
          else if(pct>=20)e.textContent='🪫';
          else e.textContent='⚠️';
        }
        if(d.battery_v!==undefined){
          document.getElementById('battery').textContent+=(' '+d.battery_v+'V');
        }
      }catch(e){}
    };
    ws.onclose=function(){
      connected=false;
      document.getElementById('dot').className='status-dot';
      document.getElementById('status-text').textContent='⚠️ ไม่ได้เชื่อมต่อ — กำลังลองใหม่…';
      setTimeout(connect,2000);
    }
  }catch(e){setTimeout(connect,3000)}
}
connect();
function send(cmd){
  if(connected)ws.send(JSON.stringify(cmd));
}
function drive(t,s){
  if(!connected||!document.getElementById('chk-raised').checked)return;
  send({cmd:'drive',throttle:t,steering:s});
  if(driveTimer)clearTimeout(driveTimer);
  driveTimer=setTimeout(function(){send({cmd:'stop'})},900);
}
document.getElementById('btn-fwd').onpointerdown=function(e){e.preventDefault();drive(0.35,0)};
document.getElementById('btn-back').onpointerdown=function(e){e.preventDefault();drive(-0.35,0)};
document.getElementById('btn-left').onpointerdown=function(e){e.preventDefault();drive(0,-0.45)};
document.getElementById('btn-right').onpointerdown=function(e){e.preventDefault();drive(0,0.45)};
document.getElementById('btn-stop').onclick=function(){send({cmd:'status'})};
document.getElementById('btn-emergency').onclick=function(){
  send({cmd:'stop'});
  document.getElementById('chk-raised').checked=false;
};
document.getElementById('chk-raised').onchange=function(){
  if(!this.checked)send({cmd:'stop'});
};
document.getElementById('btn-wifi-save').onclick=function(){
  var s=document.getElementById('wifi-ssid').value.trim();
  var p=document.getElementById('wifi-pass').value;
  if(s&&p.length>=8){
    send({cmd:'provision',ssid:s,password:p});
    alert('✅ บันทึก Wi-Fi แล้ว — ESP32 กำลังรีบูต');
  }else{
    alert('⚠️ กรุณาใส่ชื่อ hotspot และรหัสอย่างน้อย 8 ตัว');
  }
};
</script>
</body>
</html>"""
