#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials
const char* ssid = "SKY158EY";
const char* password = "WM4nAvEcfVXJL8";

// Django server address - your PC's local IP
const char* serverUrl = "http://192.168.0.159:8000/validate/";

// Camera pins - Elegoo ESP32-WROVER Camera V1.5
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    15
#define XCLK_GPIO_NUM     27
#define SIOD_GPIO_NUM     22
#define SIOC_GPIO_NUM     23
#define Y9_GPIO_NUM       19
#define Y8_GPIO_NUM       36
#define Y7_GPIO_NUM       18
#define Y6_GPIO_NUM       39
#define Y5_GPIO_NUM        5
#define Y4_GPIO_NUM       34
#define Y3_GPIO_NUM       35
#define Y2_GPIO_NUM       32
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     26
#define PCLK_GPIO_NUM     21

void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_CIF;  // 400x296 - clean on this board
  config.jpeg_quality = 10;
  config.fb_count     = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return;
  }
  Serial.println("Camera init SUCCESS");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Connect to WiFi
  Serial.printf("Connecting to %s\n", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nWiFi connected — IP: %s\n", WiFi.localIP().toString().c_str());

  initCamera();
}

void loop() {
  Serial.println("\nCapturing image...");

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Frame capture failed");
    delay(3000);
    return;
  }

  Serial.printf("Image captured — %d bytes\n", fb->len);
  Serial.println("Sending to Django...");

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "multipart/form-data; boundary=boundary123");

  // Build multipart body
  String head = "--boundary123\r\nContent-Disposition: form-data; name=\"image\"; filename=\"note.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--boundary123--\r\n";

  uint32_t totalLen = head.length() + fb->len + tail.length();
  uint8_t* payload = (uint8_t*)malloc(totalLen);

  if (!payload) {
    Serial.println("Memory allocation failed");
    esp_camera_fb_return(fb);
    delay(3000);
    return;
  }

  memcpy(payload, head.c_str(), head.length());
  memcpy(payload + head.length(), fb->buf, fb->len);
  memcpy(payload + head.length() + fb->len, tail.c_str(), tail.length());

  esp_camera_fb_return(fb);

  int httpCode = http.POST(payload, totalLen);
  free(payload);

  if (httpCode == 200) {
    String response = http.getString();
    Serial.printf("Response: %s\n", response.c_str());

    if (response.indexOf("accept") >= 0) {
      Serial.println("VERDICT: ACCEPT");
      Serial2.println("ACCEPT");
    } else {
      Serial.println("VERDICT: REJECT");
      Serial2.println("REJECT");
    }
  } else {
    Serial.printf("HTTP error: %d\n", httpCode);
  }

  http.end();

  // Wait 5 seconds before next capture
  delay(5000);
}
