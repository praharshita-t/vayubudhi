#include "wifi_manager.h"
#include "config.h"
#include <WiFi.h>
#include <Arduino.h>

static unsigned long last_wifi_check = 0;
const unsigned long wifi_check_interval = 10000; // Check state every 10 seconds

void WiFiManager::init() {
    Serial.println("[WiFi] Initializing WiFi Connection...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    // We will print the initial status in update() to avoid blocking delays
}

void WiFiManager::update() {
    unsigned long current_time = millis();
    if (current_time - last_wifi_check >= wifi_check_interval || last_wifi_check == 0) {
        last_wifi_check = current_time;
        
        wl_status_t status = WiFi.status();
        if (status == WL_CONNECTED) {
            Serial.print("[WiFi] Connected! IP Address: ");
            Serial.println(WiFi.localIP().toString());
        } else if (status == WL_CONNECT_FAILED) {
            Serial.println("[WiFi] Connection failed. Retrying...");
            WiFi.disconnect();
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        } else if (status == WL_NO_SSID_AVAIL) {
            Serial.println("[WiFi] SSID not available. Checking signal or config...");
        } else {
            Serial.printf("[WiFi] Current state: disconnected (Status code: %d). Retrying...\n", status);
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        }
    }
}

bool WiFiManager::isConnected() {
    return (WiFi.status() == WL_CONNECTED);
}

const char* WiFiManager::getSSID() {
    return WIFI_SSID;
}
