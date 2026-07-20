#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include "sensor_manager.h"

class DisplayManager {
public:
    static void init();
    static void draw(const SensorData& data, bool wifiConnected, bool backendConnected);
};

#endif // DISPLAY_MANAGER_H
