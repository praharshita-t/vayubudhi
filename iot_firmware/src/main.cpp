#include <Arduino.h>
#include <Wire.h>
#include "config.h"
#include "wifi_manager.h"
#include "sensor_manager.h"
#include "display_manager.h"
#include "api_client.h"
#include <time.h>

// Timer variables
static unsigned long last_cycle_time = 0;
const unsigned long cycle_interval = 5000; // 5 seconds cycle

static unsigned long last_queue_process_time = 0;
const unsigned long queue_process_interval = 1000; // Try sending queued items every 1 second

// NTP Server config
const char* ntp_server = "pool.ntp.org";
const long gmt_offset_sec = 0;      // UTC
const int daylight_offset_sec = 0;

void getTimestamp(char* buf, size_t len) {
    struct tm timeinfo;
    // getLocalTime returns true if NTP sync was successful and RTC has the correct time
    if (WiFiManager::isConnected() && getLocalTime(&timeinfo) && timeinfo.tm_year + 1900 > 2020) {
        strftime(buf, len, "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    } else {
        // Fallback to incrementing mock timestamp (Contract 1 compliant)
        static unsigned long reading_count = 0;
        time_t base_epoch = 1784300400; // Epoch for 2026-07-17T15:00:00Z UTC
        time_t mock_epoch = base_epoch + (reading_count * 5);
        struct tm* mock_tm = gmtime(&mock_epoch);
        strftime(buf, len, "%Y-%m-%dT%H:%M:%SZ", mock_tm);
        reading_count++;
    }
}

void setup() {
    Serial.begin(115200);
    delay(1000); // Wait for Serial Monitor to connect
    Serial.println("\n=== VayuBudhi Weather Station Starting ===");

    // Initialize Managers
    WiFiManager::init();
    SensorManager::init();
    DisplayManager::init();
    ApiClient::init();

    // Initialize time sync via NTP (non-blocking config)
    if (!MOCK_MODE) {
        configTime(gmt_offset_sec, daylight_offset_sec, ntp_server);
        Serial.println("[Main] NTP configuration initialized.");
    }
}

void loop() {
    // Keep WiFi alive (non-blocking check)
    WiFiManager::update();

    unsigned long current_time = millis();

    // 5-second cycle for reading, updating display, and transmission
    if (current_time - last_cycle_time >= cycle_interval || last_cycle_time == 0) {
        last_cycle_time = current_time;

        // 1. Read sensors
        SensorData data = SensorManager::readData();

        // 2. Generate compliant ISO8601 UTC timestamp
        char timestamp[30];
        getTimestamp(timestamp, sizeof(timestamp));

        // 3. Transmit telemetry to the backend
        // If it fails, ApiClient will automatically queue it for later retry
        bool sent = ApiClient::sendReading(data, timestamp);

        // 4. Update local OLED display (with WiFi and Backend status)
        DisplayManager::draw(data, WiFiManager::isConnected(), ApiClient::isBackendConnected());
    }

    // Attempt to flush offline cache queue if we are connected
    if (WiFiManager::isConnected() && ApiClient::getQueueSize() > 0) {
        if (current_time - last_queue_process_time >= queue_process_interval) {
            last_queue_process_time = current_time;
            ApiClient::processQueue();
        }
    }
}
