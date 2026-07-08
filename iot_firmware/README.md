# Member 4: IoT Hardware Firmware

This directory contains the ESP32 microcontroller firmware source code and toolchain setup.

## Hardware Configuration
- Microcontroller: **ESP32** (NodeMCU or similar)
- Particle Sensor: **SDS011** (PM2.5, PM10)
- Environmental Sensor: **BME280** (Temperature, Humidity, Pressure)
- Screen: **SSD1306 OLED** (I2C)

## Key Tasks & Roles
1. **OLED & Sensor Reads**: Read raw telemetry values from BME280/SDS011 and update the SSD1306 locally.
2. **Wi-Fi REST Client**: Format records matching [sensor_backend.json](file:///c:/Users/lalit/OneDrive/Documents/vayubudhi/contracts/sensor_backend.json) and post them to `/ingest` endpoint on Member 2's backend.

## Checkpoints
- **Day 3**: Complete the first end-to-end data post to Member 2's stub endpoint using a mobile hotspot.
