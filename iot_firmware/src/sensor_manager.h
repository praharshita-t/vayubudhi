#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

struct SensorData {
    float pm25;
    float pm10;
    float temperature;
    float humidity;
    float pressure;
    bool bme_valid;
    bool sds_valid;
};

class SensorManager {
public:
    static void init();
    static SensorData readData();
};

#endif // SENSOR_MANAGER_H
