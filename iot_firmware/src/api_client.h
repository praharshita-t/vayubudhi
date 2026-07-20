#ifndef API_CLIENT_H
#define API_CLIENT_H

#include "sensor_manager.h"

struct QueuedReading {
    float pm25;
    float pm10;
    float temp;
    float humidity;
    float pressure;
    char timestamp[30]; // Stores ISO8601 format, e.g. "2026-07-17T15:00:00Z"
};

class ApiClient {
public:
    static void init();
    static bool sendReading(const SensorData& data, const char* timestamp);
    static void processQueue();
    static bool isBackendConnected();
    static int getQueueSize();
};

#endif // API_CLIENT_H
