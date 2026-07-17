#include "sensor_manager.h"
#include "config.h"
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

#if !MOCK_MODE
static Adafruit_BME280 bme;
static bool bme_connected = false;

// SDS011 Parsing State Machine
enum SDSState {
    WAIT_HEADER,
    WAIT_CMD,
    COLLECT_DATA,
    WAIT_CHECKSUM,
    WAIT_TAIL
};

static SDSState sds_state = WAIT_HEADER;
static uint8_t sds_buf[6];
static uint8_t sds_idx = 0;
static uint8_t sds_checksum = 0;

static float last_real_pm25 = 0.0;
static float last_real_pm10 = 0.0;
static bool real_sds_updated = false;
#endif

void SensorManager::init() {
    Serial.println("[SensorManager] Initializing Sensors...");
    
#if MOCK_MODE
    Serial.println("[SensorManager] MOCK_MODE is enabled. Bypassing physical hardware init.");
#else
    // Init I2C for BME280
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
    
    if (bme.begin(BME280_I2C_ADDR, &Wire)) {
        Serial.println("[SensorManager] BME280 sensor initialized successfully.");
        bme_connected = true;
    } else {
        Serial.println("[SensorManager] WARNING: BME280 sensor not found! Will fall back to mock environment data.");
        bme_connected = false;
    }
    
    // Init Serial2 for SDS011 (9600 baud, 8N1)
    Serial2.begin(9600, SERIAL_8N1, SDS_RX_PIN, SDS_TX_PIN);
    Serial.println("[SensorManager] SDS011 Serial2 initialized (9600 baud).");
#endif
}

SensorData SensorManager::readData() {
    SensorData data;
    
    // Default mock values from instructions
    data.pm25 = 82.5;
    data.pm10 = 115.2;
    data.temperature = 30.4;
    data.humidity = 58.1;
    data.pressure = 1008.5;
    data.bme_valid = false;
    data.sds_valid = false;

#if MOCK_MODE
    // Generate mock values with slight variation to allow software testing
    // static random seed is handled in main.cpp if needed, random() works on ESP32
    data.pm25 = 82.5 + (random(-50, 50) / 10.0);
    data.pm10 = 115.2 + (random(-50, 50) / 10.0);
    data.temperature = 30.4 + (random(-10, 10) / 10.0);
    data.humidity = 58.1 + (random(-20, 20) / 10.0);
    data.pressure = 1008.5 + (random(-30, 30) / 10.0);
    data.bme_valid = true;
    data.sds_valid = true;
#else
    // Read physical BME280
    if (bme_connected) {
        float t = bme.readTemperature();
        float h = bme.readHumidity();
        float p = bme.readPressure() / 100.0F; // Pa to hPa
        
        // Sanity check values
        if (!isnan(t) && !isnan(h) && !isnan(p)) {
            data.temperature = t;
            data.humidity = h;
            data.pressure = p;
            data.bme_valid = true;
        } else {
            Serial.println("[SensorManager] BME280 read NaN! Falling back to mock environment data.");
        }
    }
    
    // Parse SDS011 incoming bytes from Serial2
    while (Serial2.available() > 0) {
        uint8_t b = Serial2.read();
        switch (sds_state) {
            case WAIT_HEADER:
                if (b == 0xAA) {
                    sds_state = WAIT_CMD;
                }
                break;
            case WAIT_CMD:
                if (b == 0xC0) {
                    sds_state = COLLECT_DATA;
                    sds_idx = 0;
                    sds_checksum = 0;
                } else {
                    sds_state = WAIT_HEADER;
                }
                break;
            case COLLECT_DATA:
                sds_buf[sds_idx++] = b;
                sds_checksum += b;
                if (sds_idx >= 6) {
                    sds_state = WAIT_CHECKSUM;
                }
                break;
            case WAIT_CHECKSUM:
                if (b == sds_checksum) {
                    sds_state = WAIT_TAIL;
                } else {
                    Serial.printf("[SensorManager] SDS011 checksum mismatch: calculated %02X, received %02X\n", sds_checksum, b);
                    sds_state = WAIT_HEADER;
                }
                break;
            case WAIT_TAIL:
                if (b == 0xAB) {
                    // Success! Decode PM2.5 and PM10
                    uint16_t pm25_raw = (sds_buf[1] << 8) | sds_buf[0];
                    uint16_t pm10_raw = (sds_buf[3] << 8) | sds_buf[2];
                    last_real_pm25 = pm25_raw / 10.0;
                    last_real_pm10 = pm10_raw / 10.0;
                    real_sds_updated = true;
                }
                sds_state = WAIT_HEADER;
                break;
        }
    }
    
    if (real_sds_updated) {
        data.pm25 = last_real_pm25;
        data.pm10 = last_real_pm10;
        data.sds_valid = true;
    } else {
        Serial.println("[SensorManager] SDS011 data not received yet. Falling back to mock particulate data.");
    }
#endif

    return data;
}
