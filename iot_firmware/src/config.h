#ifndef CONFIG_H
#define CONFIG_H

// Mock mode compilation flag
// Set to true to bypass hardware and return simulated values
// Set to false for tomorrow's hardware deployment
#define MOCK_MODE true

// WiFi Configuration
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Station ID (Contract requires "esp32_01" for this station)
#define STATION_ID "esp32_01"

// Backend endpoint configuration (from config.h)
#define BACKEND_URL "http://192.168.1.100:8000/ingest"

// Timing configurations (in milliseconds)
#define MEASUREMENT_INTERVAL_MS 5000
#define TRANSMIT_INTERVAL_MS 5000

// SDS011 UART Settings (Hardware Serial2 on ESP32)
#define SDS_RX_PIN 16
#define SDS_TX_PIN 17

// BME280 & SSD1306 OLED I2C Settings (Default ESP32 I2C pins)
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define BME280_I2C_ADDR 0x76
#define OLED_I2C_ADDR 0x3C

// OLED Screen settings
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET_PIN -1

// PM2.5 Alert Threshold
#define PM25_ALERT_THRESHOLD 150.0

#endif // CONFIG_H
