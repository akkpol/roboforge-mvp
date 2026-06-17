#include <Arduino.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <LittleFS.h>
#include <WebServer.h>
#include <WiFi.h>

#include "config.h"

namespace {

constexpr uint16_t kHttpPort = 80;
constexpr uint16_t kDnsPort = 53;
constexpr uint32_t kCommandTimeoutMs = 400;
constexpr float kMaxBetaSpeed = 0.45f;
constexpr uint8_t kLeftPwmChannel = 0;
constexpr uint8_t kRightPwmChannel = 1;
constexpr uint32_t kPwmFrequency = 20000;
constexpr uint8_t kPwmResolution = 8;
constexpr float kDividerTopOhms = 100000.0f;
constexpr float kDividerBottomOhms = 33000.0f;

DNSServer dnsServer;
WebServer server(kHttpPort);

bool armed = false;
uint32_t lastCommandAt = 0;
int64_t lastSequence = -1;
float lastThrottle = 0.0f;
float lastSteering = 0.0f;
String accessPointName;

float clampFloat(float value, float minimum, float maximum) {
  return max(minimum, min(maximum, value));
}

void writeMotor(
    uint8_t in1,
    uint8_t in2,
    uint8_t pwmChannel,
    float command,
    float speedLimit) {
  const float limitedCommand = clampFloat(command, -1.0f, 1.0f);
  const uint8_t pwm = static_cast<uint8_t>(
      roundf(abs(limitedCommand) * clampFloat(speedLimit, 0.0f, kMaxBetaSpeed) * 255.0f));

  if (pwm == 0) {
    digitalWrite(in1, LOW);
    digitalWrite(in2, LOW);
    ledcWrite(pwmChannel, 0);
    return;
  }

  digitalWrite(in1, limitedCommand > 0 ? HIGH : LOW);
  digitalWrite(in2, limitedCommand > 0 ? LOW : HIGH);
  ledcWrite(pwmChannel, pwm);
}

void stopMotors(bool disarm) {
  writeMotor(ROBOFORGE_PIN_IN1, ROBOFORGE_PIN_IN2, kLeftPwmChannel, 0.0f, 0.0f);
  writeMotor(ROBOFORGE_PIN_IN3, ROBOFORGE_PIN_IN4, kRightPwmChannel, 0.0f, 0.0f);
  lastThrottle = 0.0f;
  lastSteering = 0.0f;
  if (disarm) {
    armed = false;
  }
}

void applyDrive(float throttle, float steering, float speedLimit) {
  float left = throttle + steering;
  float right = throttle - steering;
  const float largest = max(abs(left), abs(right));

  if (largest > 1.0f) {
    left /= largest;
    right /= largest;
  }

  writeMotor(
      ROBOFORGE_PIN_IN1,
      ROBOFORGE_PIN_IN2,
      kLeftPwmChannel,
      left,
      speedLimit);
  writeMotor(
      ROBOFORGE_PIN_IN3,
      ROBOFORGE_PIN_IN4,
      kRightPwmChannel,
      right,
      speedLimit);

  lastThrottle = throttle;
  lastSteering = steering;
}

float readBatteryVoltage() {
  uint32_t millivolts = 0;
  constexpr uint8_t kSamples = 16;
  for (uint8_t sample = 0; sample < kSamples; ++sample) {
    millivolts += analogReadMilliVolts(ROBOFORGE_PIN_BATTERY_ADC);
    delayMicroseconds(180);
  }

  const float adcVoltage = (millivolts / static_cast<float>(kSamples)) / 1000.0f;
  const float dividerRatio =
      (kDividerTopOhms + kDividerBottomOhms) / kDividerBottomOhms;
  return adcVoltage * dividerRatio * ROBOFORGE_BATTERY_CALIBRATION;
}

bool batteryPlausible(float voltage) {
  const float minimum = 3.0f * ROBOFORGE_BATTERY_CELLS;
  const float maximum = 4.35f * ROBOFORGE_BATTERY_CELLS;
  return voltage >= minimum && voltage <= maximum;
}

uint8_t batteryPercent(float voltage) {
  const float minimum = 3.2f * ROBOFORGE_BATTERY_CELLS;
  const float maximum = 4.2f * ROBOFORGE_BATTERY_CELLS;
  const float percent = (voltage - minimum) / (maximum - minimum) * 100.0f;
  return static_cast<uint8_t>(roundf(clampFloat(percent, 0.0f, 100.0f)));
}

const char* wifiStrengthLabel() {
  const int32_t rssi = WiFi.softAPgetStationNum() > 0 ? WiFi.RSSI() : -100;
  if (rssi >= -58) return "strong";
  if (rssi >= -72) return "fair";
  return "weak";
}

void sendJson(int statusCode, JsonDocument& document) {
  String body;
  serializeJson(document, body);
  server.sendHeader("Cache-Control", "no-store");
  server.send(statusCode, "application/json", body);
}

void addStatusFields(JsonDocument& document) {
  const float voltage = readBatteryVoltage();
  document["connected"] = WiFi.softAPgetStationNum() > 0;
  document["armed"] = armed;
  document["batteryVoltage"] = roundf(voltage * 100.0f) / 100.0f;
  document["batteryPercent"] = batteryPercent(voltage);
  document["lastCommandAt"] = lastCommandAt;
  document["uptime"] = millis() / 1000;
  document["firmwareVersion"] = ROBOFORGE_FIRMWARE_VERSION;
  document["protocolVersion"] = ROBOFORGE_PROTOCOL_VERSION;
  document["deviceName"] = accessPointName;
  document["robotType"] = ROBOFORGE_ROBOT_TYPE;
  document["apSsid"] = accessPointName;
  document["ipAddress"] = WiFi.softAPIP().toString();
  document["maxSpeed"] = kMaxBetaSpeed;
  document["commandTimeoutMs"] = kCommandTimeoutMs;
  document["wifiStrength"] = wifiStrengthLabel();
}

void handleStatus() {
  JsonDocument response;
  addStatusFields(response);
  sendJson(200, response);
}

void handleInfo() {
  JsonDocument response;
  response["deviceName"] = accessPointName;
  response["robotType"] = ROBOFORGE_ROBOT_TYPE;
  response["firmwareVersion"] = ROBOFORGE_FIRMWARE_VERSION;
  response["protocolVersion"] = ROBOFORGE_PROTOCOL_VERSION;
  response["apiBasePath"] = "/api/v1";
  response["apSsid"] = accessPointName;
  response["ipAddress"] = WiFi.softAPIP().toString();
  response["maxSpeed"] = kMaxBetaSpeed;
  response["commandTimeoutMs"] = kCommandTimeoutMs;

  JsonArray endpoints = response["endpoints"].to<JsonArray>();
  endpoints.add("GET /api/v1/info");
  endpoints.add("GET /api/v1/status");
  endpoints.add("POST /api/v1/arm");
  endpoints.add("POST /api/v1/drive");
  endpoints.add("POST /api/v1/stop");

  JsonObject safety = response["safety"].to<JsonObject>();
  safety["requiresArm"] = true;
  safety["deadmanTimeoutMs"] = kCommandTimeoutMs;
  safety["disconnectStopsMotors"] = true;
  safety["driveSequenceMustIncrease"] = true;

  sendJson(200, response);
}

bool parseRequest(JsonDocument& document) {
  const DeserializationError error = deserializeJson(document, server.arg("plain"));
  if (!error) return true;

  JsonDocument response;
  response["ok"] = false;
  response["error"] = "invalid_json";
  sendJson(400, response);
  return false;
}

void handleArm() {
  JsonDocument request;
  if (!parseRequest(request)) return;

  const bool requestedArmed = request["armed"] | false;
  const float voltage = readBatteryVoltage();

  if (requestedArmed && WiFi.softAPgetStationNum() == 0) {
    JsonDocument response;
    response["ok"] = false;
    response["error"] = "no_control_client";
    sendJson(409, response);
    return;
  }

  if (requestedArmed && !batteryPlausible(voltage)) {
    stopMotors(true);
    JsonDocument response;
    response["ok"] = false;
    response["error"] = "battery_configuration_mismatch";
    response["batteryVoltage"] = roundf(voltage * 100.0f) / 100.0f;
    response["configuredCells"] = ROBOFORGE_BATTERY_CELLS;
    sendJson(409, response);
    return;
  }

  stopMotors(!requestedArmed);
  armed = requestedArmed;
  lastSequence = -1;
  lastCommandAt = millis();

  JsonDocument response;
  addStatusFields(response);
  sendJson(200, response);
}

void handleDrive() {
  JsonDocument request;
  if (!parseRequest(request)) return;

  if (!armed) {
    JsonDocument response;
    response["ok"] = false;
    response["error"] = "controls_not_armed";
    sendJson(409, response);
    return;
  }

  const int64_t sequence = request["sequence"] | -1;
  if (sequence <= lastSequence) {
    JsonDocument response;
    response["ok"] = false;
    response["error"] = "stale_sequence";
    sendJson(409, response);
    return;
  }

  const float throttle = clampFloat(request["throttle"] | 0.0f, -1.0f, 1.0f);
  const float steering = clampFloat(request["steering"] | 0.0f, -1.0f, 1.0f);
  const float speedLimit =
      clampFloat(request["speedLimit"] | kMaxBetaSpeed, 0.0f, kMaxBetaSpeed);

  applyDrive(throttle, steering, speedLimit);
  lastSequence = sequence;
  lastCommandAt = millis();

  JsonDocument response;
  response["ok"] = true;
  response["sequence"] = sequence;
  sendJson(200, response);
}

void handleStop() {
  stopMotors(true);
  lastCommandAt = millis();

  JsonDocument response;
  addStatusFields(response);
  sendJson(200, response);
}

String contentTypeFor(const String& path) {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".woff")) return "font/woff";
  if (path.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

bool streamStaticFile(String path) {
  if (path.endsWith("/")) path += "index.html";
  if (!LittleFS.exists(path)) return false;

  File file = LittleFS.open(path, "r");
  if (!file) return false;

  if (path.endsWith(".html")) {
    server.sendHeader("Cache-Control", "no-cache");
  } else {
    server.sendHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
  server.streamFile(file, contentTypeFor(path));
  file.close();
  return true;
}

void redirectToPortal() {
  server.sendHeader("Location", "http://192.168.4.1/", true);
  server.send(302, "text/plain", "");
}

void setupRoutes() {
  server.on("/api/v1/info", HTTP_GET, handleInfo);
  server.on("/api/v1/status", HTTP_GET, handleStatus);
  server.on("/api/v1/arm", HTTP_POST, handleArm);
  server.on("/api/v1/drive", HTTP_POST, handleDrive);
  server.on("/api/v1/stop", HTTP_POST, handleStop);

  server.on("/generate_204", HTTP_ANY, redirectToPortal);
  server.on("/gen_204", HTTP_ANY, redirectToPortal);
  server.on("/hotspot-detect.html", HTTP_ANY, redirectToPortal);
  server.on("/library/test/success.html", HTTP_ANY, redirectToPortal);
  server.on("/ncsi.txt", HTTP_ANY, redirectToPortal);
  server.on("/connecttest.txt", HTTP_ANY, redirectToPortal);

  server.onNotFound([]() {
    if (server.uri().startsWith("/api/")) {
      JsonDocument response;
      response["ok"] = false;
      response["error"] = "not_found";
      sendJson(404, response);
      return;
    }

    if (streamStaticFile(server.uri())) return;
    if (streamStaticFile("/index.html")) return;
    server.send(503, "text/plain", "RoboForge device app is not installed.");
  });
}

String buildAccessPointName() {
  const uint64_t chipId = ESP.getEfuseMac();
  char suffix[5];
  snprintf(suffix, sizeof(suffix), "%04X", static_cast<uint16_t>(chipId & 0xFFFF));
  return "RoboForge-Rover-" + String(suffix);
}

void setupMotors() {
  pinMode(ROBOFORGE_PIN_IN1, OUTPUT);
  pinMode(ROBOFORGE_PIN_IN2, OUTPUT);
  pinMode(ROBOFORGE_PIN_IN3, OUTPUT);
  pinMode(ROBOFORGE_PIN_IN4, OUTPUT);

  ledcSetup(kLeftPwmChannel, kPwmFrequency, kPwmResolution);
  ledcSetup(kRightPwmChannel, kPwmFrequency, kPwmResolution);
  ledcAttachPin(ROBOFORGE_PIN_ENA, kLeftPwmChannel);
  ledcAttachPin(ROBOFORGE_PIN_ENB, kRightPwmChannel);
  stopMotors(true);
}

void setupBatteryMonitor() {
  pinMode(ROBOFORGE_PIN_BATTERY_ADC, INPUT);
  analogSetPinAttenuation(ROBOFORGE_PIN_BATTERY_ADC, ADC_11db);
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(250);

  setupMotors();
  setupBatteryMonitor();

  if (!LittleFS.begin(true)) {
    Serial.println("[RoboForge] LittleFS mount failed");
  }

  WiFi.mode(WIFI_AP);
  accessPointName = buildAccessPointName();
  const bool accessPointStarted = WiFi.softAP(
      accessPointName.c_str(),
      ROBOFORGE_AP_PASSWORD,
      1,
      false,
      1);

  if (!accessPointStarted) {
    Serial.println("[RoboForge] Access point failed to start");
    return;
  }

  dnsServer.start(kDnsPort, "*", WiFi.softAPIP());
  setupRoutes();
  server.begin();

  Serial.printf("[RoboForge] AP: %s\n", accessPointName.c_str());
  Serial.printf("[RoboForge] Portal: http://%s/\n", WiFi.softAPIP().toString().c_str());
  Serial.printf("[RoboForge] Configured battery: %dS\n", ROBOFORGE_BATTERY_CELLS);
}

void loop() {
  dnsServer.processNextRequest();
  server.handleClient();

  if (armed && millis() - lastCommandAt > kCommandTimeoutMs) {
    Serial.println("[RoboForge] Deadman timeout: motors stopped and controls disarmed");
    stopMotors(true);
  }

  if (armed && WiFi.softAPgetStationNum() == 0) {
    Serial.println("[RoboForge] Client disconnected: motors stopped and controls disarmed");
    stopMotors(true);
  }

  delay(2);
}
