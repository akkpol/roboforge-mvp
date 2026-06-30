#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>

#include "config.h"

namespace {

constexpr uint8_t kLeftPwmChannel = 0;
constexpr uint8_t kRightPwmChannel = 1;
constexpr uint32_t kPwmFrequency = 20000;
constexpr uint8_t kPwmResolution = 10;
constexpr uint16_t kPwmMax = (1 << kPwmResolution) - 1;
constexpr uint32_t kCommandDeadmanMs = 650;
constexpr uint32_t kWifiRetryMs = 5000;
constexpr uint32_t kMqttRetryMs = 3000;
constexpr uint32_t kStatusIntervalMs = 5000;
constexpr uint32_t kAvoidIntervalMs = 180;
constexpr uint32_t kSerialMaxBytes = 900;
constexpr uint32_t kUltrasonicTimeoutUs = 25000;

struct RuntimeConfig {
  String ssid;
  String password;
  String robotId;
  String token;
  String topicPrefix;
  String mqttHost;
  uint16_t mqttPort = ROBOFORGE_DEFAULT_MQTT_PORT;
  bool mqttTls = ROBOFORGE_DEFAULT_MQTT_TLS;
};

Preferences preferences;
WiFiClient plainClient;
WiFiClientSecure secureClient;
PubSubClient mqttClient;
RuntimeConfig config;

String commandTopic;
String statusTopic;
String serialBuffer;

uint32_t lastDriveAt = 0;
uint32_t lastWifiAttemptAt = 0;
uint32_t lastMqttAttemptAt = 0;
uint32_t lastStatusAt = 0;
uint32_t lastAvoidAt = 0;
bool motorsActive = false;
bool avoidEnabled = false;
float speedLimit = 0.45f;
float lastThrottle = 0.0f;
float lastSteering = 0.0f;
uint16_t avoidDistanceCm = 25;
uint16_t latestDistanceCm = 0;

float clampFloat(float value, float minimum, float maximum) {
  return max(minimum, min(maximum, value));
}

String defaultRobotId() {
  const uint64_t chipId = ESP.getEfuseMac();
  char value[16];
  snprintf(value, sizeof(value), "rf-%06x", static_cast<uint32_t>(chipId & 0xFFFFFF));
  return String(value);
}

String normalizeToken(String value) {
  value.trim();
  return value;
}

String normalizeRobotId(String value) {
  value.trim();
  value.toLowerCase();
  value.replace(" ", "-");
  value.replace("_", "-");

  String cleaned;
  for (uint16_t index = 0; index < value.length(); ++index) {
    const char character = value.charAt(index);
    if ((character >= 'a' && character <= 'z') ||
        (character >= '0' && character <= '9') ||
        character == '-') {
      cleaned += character;
    }
  }

  if (cleaned.length() == 0) {
    return defaultRobotId();
  }

  return cleaned.substring(0, 32);
}

void rebuildTopics() {
  config.topicPrefix.trim();
  if (config.topicPrefix.length() == 0) {
    config.topicPrefix = ROBOFORGE_TOPIC_PREFIX;
  }

  commandTopic = config.topicPrefix + "/" + config.robotId + "/cmd";
  statusTopic = config.topicPrefix + "/" + config.robotId + "/status";
}

void loadRuntimeConfig() {
  preferences.begin("rf-agent", true);
  config.ssid = preferences.getString("ssid", ROBOFORGE_DEFAULT_WIFI_SSID);
  config.password = preferences.getString("password", ROBOFORGE_DEFAULT_WIFI_PASSWORD);
  config.robotId = normalizeRobotId(preferences.getString("robot_id", defaultRobotId()));
  config.token = normalizeToken(preferences.getString("token", ROBOFORGE_DEFAULT_TOKEN));
  config.topicPrefix = preferences.getString("topic", ROBOFORGE_TOPIC_PREFIX);
  config.mqttHost = preferences.getString("mqtt_host", ROBOFORGE_DEFAULT_MQTT_HOST);
  config.mqttPort = preferences.getUShort("mqtt_port", ROBOFORGE_DEFAULT_MQTT_PORT);
  config.mqttTls = preferences.getBool("mqtt_tls", ROBOFORGE_DEFAULT_MQTT_TLS);
  preferences.end();
  rebuildTopics();
}

void saveRuntimeConfig() {
  preferences.begin("rf-agent", false);
  preferences.putString("ssid", config.ssid);
  preferences.putString("password", config.password);
  preferences.putString("robot_id", config.robotId);
  preferences.putString("token", config.token);
  preferences.putString("topic", config.topicPrefix);
  preferences.putString("mqtt_host", config.mqttHost);
  preferences.putUShort("mqtt_port", config.mqttPort);
  preferences.putBool("mqtt_tls", config.mqttTls);
  preferences.end();
}

void configureMqttClient() {
  if (config.mqttTls) {
    secureClient.setInsecure();
    mqttClient.setClient(secureClient);
  } else {
    mqttClient.setClient(plainClient);
  }

  mqttClient.setServer(config.mqttHost.c_str(), config.mqttPort);
  mqttClient.setBufferSize(768);
}

void writeMotor(uint8_t in1, uint8_t in2, uint8_t pwmChannel, float command) {
  const float limited = clampFloat(command, -1.0f, 1.0f);
  const uint16_t duty = static_cast<uint16_t>(roundf(abs(limited) * clampFloat(speedLimit, 0.0f, 1.0f) * kPwmMax));

  if (duty == 0) {
    digitalWrite(in1, LOW);
    digitalWrite(in2, LOW);
    ledcWrite(pwmChannel, 0);
    return;
  }

  digitalWrite(in1, limited > 0.0f ? HIGH : LOW);
  digitalWrite(in2, limited > 0.0f ? LOW : HIGH);
  ledcWrite(pwmChannel, duty);
}

void stopMotors() {
  writeMotor(ROBOFORGE_PIN_IN1, ROBOFORGE_PIN_IN2, kLeftPwmChannel, 0.0f);
  writeMotor(ROBOFORGE_PIN_IN3, ROBOFORGE_PIN_IN4, kRightPwmChannel, 0.0f);
  motorsActive = false;
  lastThrottle = 0.0f;
  lastSteering = 0.0f;
}

void applyDrive(float throttle, float steering) {
  float left = clampFloat(throttle + steering, -1.0f, 1.0f);
  float right = clampFloat(throttle - steering, -1.0f, 1.0f);
  const float largest = max(abs(left), abs(right));

  if (largest > 1.0f) {
    left /= largest;
    right /= largest;
  }

  writeMotor(ROBOFORGE_PIN_IN1, ROBOFORGE_PIN_IN2, kLeftPwmChannel, left);
  writeMotor(ROBOFORGE_PIN_IN3, ROBOFORGE_PIN_IN4, kRightPwmChannel, right);
  motorsActive = abs(throttle) > 0.01f || abs(steering) > 0.01f;
  lastDriveAt = millis();
  lastThrottle = throttle;
  lastSteering = steering;
}

float readBatteryVoltage() {
  uint32_t millivolts = 0;
  constexpr uint8_t kSamples = 12;

  for (uint8_t sample = 0; sample < kSamples; ++sample) {
    millivolts += analogReadMilliVolts(ROBOFORGE_PIN_BATTERY_ADC);
    delayMicroseconds(160);
  }

  const float adcVoltage = (millivolts / static_cast<float>(kSamples)) / 1000.0f;
  const float dividerRatio =
      (ROBOFORGE_BATTERY_DIVIDER_TOP_OHMS + ROBOFORGE_BATTERY_DIVIDER_BOTTOM_OHMS) /
      ROBOFORGE_BATTERY_DIVIDER_BOTTOM_OHMS;
  return adcVoltage * dividerRatio * ROBOFORGE_BATTERY_CALIBRATION;
}

uint8_t batteryPercent(float voltage) {
  const float minimum = 3.2f * ROBOFORGE_BATTERY_CELLS;
  const float maximum = 4.2f * ROBOFORGE_BATTERY_CELLS;
  const float percent = (voltage - minimum) / (maximum - minimum) * 100.0f;
  return static_cast<uint8_t>(roundf(clampFloat(percent, 0.0f, 100.0f)));
}

uint16_t readDistanceCm() {
  digitalWrite(ROBOFORGE_PIN_ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(ROBOFORGE_PIN_ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(ROBOFORGE_PIN_ULTRASONIC_TRIG, LOW);

  const uint32_t duration = pulseIn(ROBOFORGE_PIN_ULTRASONIC_ECHO, HIGH, kUltrasonicTimeoutUs);
  if (duration == 0) {
    return 0;
  }

  return static_cast<uint16_t>(duration / 58);
}

void publishStatus(const char* reason = "periodic") {
  if (!mqttClient.connected()) {
    return;
  }

  const float batteryVoltage = readBatteryVoltage();
  latestDistanceCm = readDistanceCm();

  JsonDocument status;
  status["type"] = "status";
  status["reason"] = reason;
  status["robot_id"] = config.robotId;
  status["firmware"] = ROBOFORGE_FIRMWARE_VERSION;
  status["battery_v"] = roundf(batteryVoltage * 100.0f) / 100.0f;
  status["battery_pct"] = batteryPercent(batteryVoltage);
  status["distance_cm"] = latestDistanceCm;
  status["avoid"] = avoidEnabled;
  status["speed_limit"] = speedLimit;
  status["throttle"] = lastThrottle;
  status["steering"] = lastSteering;
  status["motors_active"] = motorsActive;
  status["wifi_rssi"] = WiFi.RSSI();
  status["uptime_ms"] = millis();

  String payload;
  serializeJson(status, payload);
  mqttClient.publish(statusTopic.c_str(), payload.c_str());
  lastStatusAt = millis();
}

void handleCommand(JsonDocument& command) {
  const String name = command["cmd"] | "";

  if (name == "status") {
    publishStatus("requested");
    return;
  }

  if (name == "stop") {
    stopMotors();
    publishStatus("stopped");
    return;
  }

  if (name == "drive") {
    const float throttle = clampFloat(command["throttle"] | 0.0f, -1.0f, 1.0f);
    const float steering = clampFloat(command["steering"] | 0.0f, -1.0f, 1.0f);
    applyDrive(throttle, steering);
    return;
  }

  if (name == "avoid") {
    avoidEnabled = command["enable"] | false;
    stopMotors();
    publishStatus(avoidEnabled ? "avoid_enabled" : "avoid_disabled");
    return;
  }

  if (name == "config") {
    if (command["avoid_distance_cm"].is<uint16_t>()) {
      avoidDistanceCm = constrain(command["avoid_distance_cm"].as<uint16_t>(), 15, 80);
    }
    if (command["speed_limit"].is<float>()) {
      speedLimit = clampFloat(command["speed_limit"].as<float>(), 0.15f, 0.75f);
    }
    publishStatus("configured");
    return;
  }
}

void handleMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (String(topic) != commandTopic) {
    return;
  }

  JsonDocument command;
  const DeserializationError error = deserializeJson(command, payload, length);
  if (error) {
    publishStatus("bad_command_json");
    return;
  }

  handleCommand(command);
}

void sendSerialJson(const char* status, const char* message) {
  JsonDocument response;
  response["ok"] = strcmp(status, "ok") == 0;
  response["status"] = status;
  response["message"] = message;
  response["robot_id"] = config.robotId;
  response["topic_cmd"] = commandTopic;
  response["topic_status"] = statusTopic;

  serializeJson(response, Serial);
  Serial.println();
}

void processProvisioningLine(String line) {
  line.trim();
  if (line.length() == 0) {
    return;
  }

  JsonDocument document;
  const DeserializationError error = deserializeJson(document, line);
  if (error) {
    sendSerialJson("error", "invalid_json");
    return;
  }

  const String command = document["cmd"] | "";
  if (command != "provision") {
    sendSerialJson("error", "unsupported_command");
    return;
  }

  if (document["ssid"].is<const char*>()) {
    config.ssid = document["ssid"].as<String>();
  }
  if (document["password"].is<const char*>()) {
    config.password = document["password"].as<String>();
  }
  if (document["robot_id"].is<const char*>()) {
    config.robotId = normalizeRobotId(document["robot_id"].as<String>());
  }
  if (document["token"].is<const char*>()) {
    config.token = normalizeToken(document["token"].as<String>());
  }
  if (document["topic_prefix"].is<const char*>()) {
    config.topicPrefix = document["topic_prefix"].as<String>();
  }
  if (document["mqtt_host"].is<const char*>()) {
    config.mqttHost = document["mqtt_host"].as<String>();
  }
  if (document["mqtt_port"].is<uint16_t>()) {
    config.mqttPort = document["mqtt_port"].as<uint16_t>();
  }
  if (document["mqtt_tls"].is<bool>()) {
    config.mqttTls = document["mqtt_tls"].as<bool>();
  }

  rebuildTopics();
  saveRuntimeConfig();
  configureMqttClient();
  mqttClient.disconnect();
  WiFi.disconnect(true);
  lastWifiAttemptAt = 0;
  lastMqttAttemptAt = 0;
  sendSerialJson("ok", "provisioned");
}

void handleSerialProvisioning() {
  while (Serial.available() > 0) {
    const char character = static_cast<char>(Serial.read());
    if (character == '\n') {
      processProvisioningLine(serialBuffer);
      serialBuffer = "";
      continue;
    }

    if (character != '\r' && serialBuffer.length() < kSerialMaxBytes) {
      serialBuffer += character;
    }
  }
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED || config.ssid.length() == 0) {
    return;
  }

  if (lastWifiAttemptAt != 0 && millis() - lastWifiAttemptAt < kWifiRetryMs) {
    return;
  }

  lastWifiAttemptAt = millis();
  WiFi.mode(WIFI_STA);
  WiFi.begin(config.ssid.c_str(), config.password.c_str());
  Serial.printf("[RoboForge] Connecting Wi-Fi: %s\n", config.ssid.c_str());
}

void ensureMqtt() {
  if (WiFi.status() != WL_CONNECTED || mqttClient.connected()) {
    return;
  }

  if (lastMqttAttemptAt != 0 && millis() - lastMqttAttemptAt < kMqttRetryMs) {
    return;
  }

  lastMqttAttemptAt = millis();
  const String clientId = "roboforge-agent-" + config.robotId;
  const bool connected = config.token.length() > 0
      ? mqttClient.connect(clientId.c_str(), config.robotId.c_str(), config.token.c_str())
      : mqttClient.connect(clientId.c_str());

  if (!connected) {
    Serial.printf("[RoboForge] MQTT connect failed: %d\n", mqttClient.state());
    return;
  }

  mqttClient.subscribe(commandTopic.c_str());
  publishStatus("online");
  Serial.printf("[RoboForge] MQTT online: %s\n", commandTopic.c_str());
}

void runAvoidMode() {
  if (!avoidEnabled || millis() - lastAvoidAt < kAvoidIntervalMs) {
    return;
  }

  lastAvoidAt = millis();
  latestDistanceCm = readDistanceCm();
  if (latestDistanceCm > 0 && latestDistanceCm < avoidDistanceCm) {
    applyDrive(-0.22f, 0.36f);
  }
}

void setupMotors() {
  pinMode(ROBOFORGE_PIN_IN1, OUTPUT);
  pinMode(ROBOFORGE_PIN_IN2, OUTPUT);
  pinMode(ROBOFORGE_PIN_IN3, OUTPUT);
  pinMode(ROBOFORGE_PIN_IN4, OUTPUT);
  pinMode(ROBOFORGE_PIN_ENA, OUTPUT);
  pinMode(ROBOFORGE_PIN_ENB, OUTPUT);

  ledcSetup(kLeftPwmChannel, kPwmFrequency, kPwmResolution);
  ledcSetup(kRightPwmChannel, kPwmFrequency, kPwmResolution);
  ledcAttachPin(ROBOFORGE_PIN_ENA, kLeftPwmChannel);
  ledcAttachPin(ROBOFORGE_PIN_ENB, kRightPwmChannel);
  stopMotors();
}

void setupSensors() {
  pinMode(ROBOFORGE_PIN_BATTERY_ADC, INPUT);
  analogSetPinAttenuation(ROBOFORGE_PIN_BATTERY_ADC, ADC_11db);
  pinMode(ROBOFORGE_PIN_ULTRASONIC_TRIG, OUTPUT);
  pinMode(ROBOFORGE_PIN_ULTRASONIC_ECHO, INPUT);
  digitalWrite(ROBOFORGE_PIN_ULTRASONIC_TRIG, LOW);
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(250);

  setupMotors();
  setupSensors();
  loadRuntimeConfig();
  configureMqttClient();
  mqttClient.setCallback(handleMqttMessage);

  Serial.printf("[RoboForge] Firmware: %s\n", ROBOFORGE_FIRMWARE_VERSION);
  Serial.printf("[RoboForge] Robot ID: %s\n", config.robotId.c_str());
  Serial.printf("[RoboForge] Command topic: %s\n", commandTopic.c_str());

  ensureWiFi();
}

void loop() {
  handleSerialProvisioning();
  ensureWiFi();
  ensureMqtt();
  mqttClient.loop();
  runAvoidMode();

  if (motorsActive && millis() - lastDriveAt > kCommandDeadmanMs) {
    stopMotors();
  }

  if (motorsActive && (WiFi.status() != WL_CONNECTED || !mqttClient.connected())) {
    stopMotors();
  }

  if (mqttClient.connected() && millis() - lastStatusAt > kStatusIntervalMs) {
    publishStatus();
  }

  delay(2);
}
