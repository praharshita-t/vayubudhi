#include "api_client.h"
#include "config.h"
#include "wifi_manager.h"
#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Queue configuration
static const int MAX_QUEUE_SIZE = 120; // Holds up to 10 minutes of readings at 5s intervals
static QueuedReading offline_queue[MAX_QUEUE_SIZE];
static int queue_head = 0;
static int queue_tail = 0;
static int queue_count = 0;

static bool last_backend_status = false;

// Internal helpers to push/pop from queue
static void enqueueReading(const SensorData& data, const char* timestamp) {
    if (queue_count == MAX_QUEUE_SIZE) {
        // Queue is full, discard the oldest record to prevent memory issues
        Serial.println("[ApiClient] Buffer full. Discarding oldest cached reading.");
        queue_head = (queue_head + 1) % MAX_QUEUE_SIZE;
        queue_count--;
    }
    
    offline_queue[queue_tail].pm25 = data.pm25;
    offline_queue[queue_tail].pm10 = data.pm10;
    offline_queue[queue_tail].temp = data.temperature;
    offline_queue[queue_tail].humidity = data.humidity;
    offline_queue[queue_tail].pressure = data.pressure;
    strncpy(offline_queue[queue_tail].timestamp, timestamp, sizeof(offline_queue[queue_tail].timestamp) - 1);
    offline_queue[queue_tail].timestamp[sizeof(offline_queue[queue_tail].timestamp) - 1] = '\0';
    
    queue_tail = (queue_tail + 1) % MAX_QUEUE_SIZE;
    queue_count++;
    
    Serial.printf("[ApiClient] Reading cached. Total cached in buffer: %d\n", queue_count);
}

static bool dequeueReading(QueuedReading& item) {
    if (queue_count == 0) {
        return false;
    }
    item = offline_queue[queue_head];
    queue_head = (queue_head + 1) % MAX_QUEUE_SIZE;
    queue_count--;
    return true;
}

// Low-level helper to send JSON payload
static bool sendPayload(const char* station_id, const char* timestamp, float pm25, float pm10, float temp, float humidity, float pressure) {
    if (!WiFiManager::isConnected()) {
        Serial.println("[ApiClient] Transmission failed: WiFi disconnected.");
        return false;
    }

    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    // Construct the precise payload
    // JSON document sizing: 7 fields in root object
    StaticJsonDocument<256> doc;
    doc["station_id"] = station_id;
    doc["timestamp"] = timestamp;
    doc["pm25"] = pm25;
    doc["pm10"] = pm10;
    doc["temp"] = temp;
    doc["humidity"] = humidity;
    doc["pressure"] = pressure;

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.print("[ApiClient] Sending JSON Payload: ");
    Serial.println(jsonString);

    int httpResponseCode = http.POST(jsonString);
    bool success = false;

    if (httpResponseCode > 0) {
        Serial.printf("[ApiClient] Server response code: %d\n", httpResponseCode);
        if (httpResponseCode == HTTP_CODE_OK || httpResponseCode == 201) {
            String response = http.getString();
            Serial.printf("[ApiClient] Server response body: %s\n", response.c_str());
            success = true;
        } else {
            Serial.printf("[ApiClient] HTTP POST returned error code %d\n", httpResponseCode);
        }
    } else {
        Serial.printf("[ApiClient] POST failed, connection error: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
    return success;
}

void ApiClient::init() {
    Serial.println("[ApiClient] Initializing REST Client...");
    queue_head = 0;
    queue_tail = 0;
    queue_count = 0;
    last_backend_status = false;
}

bool ApiClient::sendReading(const SensorData& data, const char* timestamp) {
    // Attempt transmission
    bool sent = sendPayload(STATION_ID, timestamp, data.pm25, data.pm10, data.temperature, data.humidity, data.pressure);
    
    if (sent) {
        last_backend_status = true;
        return true;
    } else {
        last_backend_status = false;
        // Cache locally for later transmission
        enqueueReading(data, timestamp);
        return false;
    }
}

void ApiClient::processQueue() {
    if (queue_count == 0) {
        return;
    }

    if (!WiFiManager::isConnected()) {
        return;
    }

    Serial.printf("[ApiClient] Attempting to flush queue. Size: %d\n", queue_count);
    
    // We send one at a time to prevent blocking the main loop for too long
    // If successful, we remove from queue. If it fails, we abort and keep items in queue.
    QueuedReading item = offline_queue[queue_head];
    bool sent = sendPayload(STATION_ID, item.timestamp, item.pm25, item.pm10, item.temp, item.humidity, item.pressure);
    
    if (sent) {
        QueuedReading discarded;
        dequeueReading(discarded);
        last_backend_status = true;
        Serial.printf("[ApiClient] Queue flush success. Remaining in queue: %d\n", queue_count);
    } else {
        last_backend_status = false;
        Serial.println("[ApiClient] Queue flush failed. Aborting retry until next check.");
    }
}

bool ApiClient::isBackendConnected() {
    return last_backend_status;
}

int ApiClient::getQueueSize() {
    return queue_count;
}
