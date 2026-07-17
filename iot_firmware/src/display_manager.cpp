#include "display_manager.h"
#include "config.h"
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#if !MOCK_MODE
static Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET_PIN);
static bool oled_connected = false;
#endif

void DisplayManager::init() {
    Serial.println("[DisplayManager] Initializing OLED Display...");
    
#if MOCK_MODE
    Serial.println("[DisplayManager] MOCK_MODE is enabled. Bypassing physical OLED screen initialization.");
#else
    // SSD1306_SWITCHCAPVCC = generate display voltage from 3.3V internally
    if (display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR)) {
        Serial.println("[DisplayManager] SSD1306 OLED screen initialized successfully.");
        oled_connected = true;
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(0, 0);
        display.println("VayuBudhi Booting...");
        display.display();
    } else {
        Serial.println("[DisplayManager] WARNING: SSD1306 OLED display not found! Will bypass screen updates.");
        oled_connected = false;
    }
#endif
}

void DisplayManager::draw(const SensorData& data, bool wifiConnected, bool backendConnected) {
    // Print to serial console for debugging in both modes
    Serial.println("------------- STATION TELEMETRY -------------");
    Serial.printf("[Debug] PM2.5: %.1f ug/m3 | PM10: %.1f ug/m3\n", data.pm25, data.pm10);
    Serial.printf("[Debug] Temp: %.1f C | Humidity: %.1f %% | Pressure: %.1f hPa\n", data.temperature, data.humidity, data.pressure);
    Serial.printf("[Debug] Connection States -> WiFi: %s | Backend: %s\n", 
                  wifiConnected ? "CONNECTED" : "DISCONNECTED",
                  backendConnected ? "CONNECTED" : "DISCONNECTED");
    if (data.pm25 > PM25_ALERT_THRESHOLD) {
        Serial.println("[Debug] !!! WARNING: PM2.5 EXCEEDS SAFETY LIMIT (150 ug/m3) !!!");
    }
    Serial.println("---------------------------------------------");

#if !MOCK_MODE
    if (!oled_connected) {
        return;
    }

    display.clearDisplay();
    
    // Status Bar
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.print("WiFi:");
    display.print(wifiConnected ? "OK " : "ERR");
    
    display.setCursor(64, 0);
    display.print("API:");
    display.print(backendConnected ? "OK" : "ERR");
    
    // Divider line
    display.drawFastHLine(0, 10, SCREEN_WIDTH, SSD1306_WHITE);

    // Warning Banner if PM2.5 level is critical
    if (data.pm25 > PM25_ALERT_THRESHOLD) {
        display.fillRect(0, 12, SCREEN_WIDTH, 12, SSD1306_WHITE);
        display.setTextColor(SSD1306_BLACK);
        display.setCursor(4, 14);
        display.print("WARNING: HIGH PM2.5!");
        display.setTextColor(SSD1306_WHITE);
    } else {
        display.setCursor(0, 14);
        display.print("VayuBudhi Station");
    }

    // Telemetry Values
    display.setCursor(0, 28);
    display.printf("PM2.5: %.1f ug/m3", data.pm25);
    
    display.setCursor(0, 37);
    display.printf("PM10 : %.1f ug/m3", data.pm10);
    
    display.setCursor(0, 46);
    display.printf("Temp : %.1f C", data.temperature);
    
    display.setCursor(0, 55);
    display.printf("Humid: %.1f%%  P:%.0f", data.humidity, data.pressure);
    
    display.display();
#endif
}
