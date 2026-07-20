#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

class WiFiManager {
public:
    static void init();
    static void update();
    static bool isConnected();
    static const char* getSSID();
};

#endif // WIFI_MANAGER_H
