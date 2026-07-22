# 🔧 VayuBudhi Sensor Node — Complete Build Guide (Zero Experience Required)

> **Goal:** Wire up the ESP32 + SDS011 + BME280 + OLED, flash the firmware, and have sensor data flowing to your teammates' backend dashboard.

> [!CAUTION]
> **READ THE ENTIRE STEP before doing anything.** Electronics are not forgiving — one wrong wire can fry a component.

---

## Part 0: Understand Your Breadboard (30 seconds)

A breadboard has rows of holes. Each row of 5 holes is electrically connected internally.

```
     a  b  c  d  e     f  g  h  i  j
  1  o  o  o  o  o  |  o  o  o  o  o
  2  o  o  o  o  o  |  o  o  o  o  o
  3  o  o  o  o  o  |  o  o  o  o  o
     ... (rows continue) ...
```

- Holes `a-e` in the same row are connected (one group)
- Holes `f-j` in the same row are connected (another group)
- The center gap separates the two sides
- The `+` and `−` rails on the sides run the full length (power and ground)

**When you push a component pin into a hole, anything else in that same row-group is electrically connected to it.**

---

## Part 1: Identify Your Components

Lay everything out on a clean, dry table. Identify each:

| # | Component | What It Looks Like |
|:---:|:---|:---|
| 1 | **ESP32 DevKit V1** | Blue/black board with a micro USB port. Has two rows of metal pins on each side. Labels like `3V3`, `GND`, `D21`, `D22`, etc. printed on the board. |
| 2 | **SDS011 PM Sensor** | Silver/blue metal box with a fan inside. Has a small white connector on one side. Comes with a **cable** (small white plug on one end, loose colored wires on the other). |
| 3 | **BME280 Breakout** | Tiny purple/blue board with 4-6 pins. Labels: `VCC`, `GND`, `SDA`, `SCL`. |
| 4 | **SSD1306 OLED** | Small screen (0.96"). Has 7 pins along the top/bottom edge. |
| 5 | **Breadboard** | White/transparent plastic board with grid of holes. |
| 6 | **Jumper wires** | Colored wires with metal pins on each end. |

---

## Part 2: Wiring — The Master Connection Table

Here is **every single wire** you need to connect. There are exactly **14 connections** total.

### 2A. ESP32 → Breadboard

**Push the ESP32 into the breadboard** so it straddles the center gap. Each row of pins goes into a different side. Make sure the USB port faces the edge of the breadboard so you can plug in the cable.

```
                    USB PORT
                    ┌──────┐
        3V3  ─── │ ■    ■ │ ─── GND
         EN  ─── │ ■    ■ │ ─── D23
         VP  ─── │ ■    ■ │ ─── D22  ← SCL (I2C clock)
         VN  ─── │ ■    ■ │ ─── TX0
        D34  ─── │ ■    ■ │ ─── RX0
        D35  ─── │ ■    ■ │ ─── D21  ← SDA (I2C data)
        D32  ─── │ ■    ■ │ ─── D19
        D33  ─── │ ■    ■ │ ─── D18
        D25  ─── │ ■    ■ │ ─── D5
        D26  ─── │ ■    ■ │ ─── D17  ← SDS011 RX
        D27  ─── │ ■    ■ │ ─── D16  ← SDS011 TX
        D14  ─── │ ■    ■ │ ─── D4   ← OLED Reset
        D12  ─── │ ■    ■ │ ─── D2
        D13  ─── │ ■    ■ │ ─── D15
        GND  ─── │ ■    ■ │ ─── GND
        VIN  ─── │ ■    ■ │ ─── 3V3
                    └──────┘
```

> [!IMPORTANT]
> **Pin labels may vary** between ESP32 boards. Look at the text printed ON your board. Find these 7 pins: `3V3`, `GND` (any of them), `D21`, `D22`, `D16`, `D17`, `D4`, `VIN`.

### 2B. SDS011 Air Quality Sensor (4 wires)

The SDS011 comes with a cable. Plug the **small white connector** into the sensor. The other end has **loose wires** (usually with female DuPont connectors).

**Find which wire is which.** Look at the SDS011 datasheet or the text near the connector on the sensor PCB. The standard color coding is:

| Wire Color (typical) | Function | Connects To |
|:---|:---|:---|
| **Red** | 5V Power | ESP32 **VIN** pin (this provides 5V from USB) |
| **Black** | Ground | ESP32 **GND** pin |
| **Green** | TXD (sensor sends data) | ESP32 **GPIO16** (labeled `D16` or `RX2`) |
| **Yellow** or Blue | RXD (sensor receives) | ESP32 **GPIO17** (labeled `D17` or `TX2`) |

> [!WARNING]
> **Wire colors are NOT standardized.** If your cable has different colors, look at the sensor PCB for tiny text labels near the connector pins (TXD, RXD, GND, 5V). Match by function, not color.

> [!CAUTION]
> **The SDS011 needs 5V, not 3.3V.** Connect it to `VIN`, NOT to `3V3`. The `VIN` pin provides 5V directly from USB power.

**How to physically connect:** The SDS011 cable has female connectors. Push a **male-to-male jumper wire** into the breadboard row where the ESP32's target pin sits. Then slip the SDS011's female connector onto the exposed end of that jumper wire.

### 2C. BME280 Temperature/Humidity Sensor (4 wires)

The BME280 breakout has pins labeled on the PCB. Push it into the breadboard (in a row that's NOT occupied by the ESP32).

| BME280 Pin | Connects To | Wire |
|:---|:---|:---|
| **VCC** | ESP32 **3V3** | jumper wire |
| **GND** | ESP32 **GND** | jumper wire |
| **SDA** | ESP32 **GPIO21** (labeled `D21`) | jumper wire |
| **SCL** | ESP32 **GPIO22** (labeled `D22`) | jumper wire |

### 2D. OLED Display — SSD1306 7-Pin (7 wires)

Your OLED has 7 pins. We use it in **I2C mode** (not SPI). Push it into the breadboard.

| OLED Pin Label | Connects To | Why |
|:---|:---|:---|
| **GND** | ESP32 **GND** | Ground |
| **VCC** | ESP32 **3V3** | Power (3.3V) |
| **D0** (or SCK/CLK) | ESP32 **GPIO22** (`D22`) | I2C clock — **same wire/row as BME280 SCL** |
| **D1** (or SDA/MOSI) | ESP32 **GPIO21** (`D21`) | I2C data — **same wire/row as BME280 SDA** |
| **RES** (Reset) | ESP32 **GPIO4** (`D4`) | Display reset (controlled by firmware) |
| **DC** | ESP32 **GND** | Tie to ground = selects I2C mode |
| **CS** | ESP32 **GND** | Tie to ground = chip always selected |

> [!IMPORTANT]
> **The BME280 and OLED share the same SDA and SCL wires.** This is normal — I2C is a shared bus. Both devices have different addresses so they don't conflict. Just connect both SDA pins to the same ESP32 GPIO21 row, and both SCL pins to the same GPIO22 row.

### 2E. Wiring Summary Diagram

```
                    ┌─────────────┐
                    │   ESP32     │
                    │             │
    SDS011 5V ────→ │ VIN     3V3 │ ←──── BME280 VCC + OLED VCC
    SDS011 GND ───→ │ GND     GND │ ←──── BME280 GND + OLED GND + OLED DC + OLED CS
                    │             │
    SDS011 TXD ───→ │ D16    D22  │ ←──── BME280 SCL + OLED D0 (SCK)
    SDS011 RXD ───→ │ D17    D21  │ ←──── BME280 SDA + OLED D1 (SDA)
                    │             │
                    │        D4   │ ←──── OLED RES (Reset)
                    │             │
                    └──────┬──────┘
                           │
                      Micro USB
                      to your Mac
```

**Total wires: 14** (4 for SDS011, 4 for BME280, 6 for OLED — but some share pins, so you'll use shared breadboard rows).

---

## Part 3: Software Setup on Mac

### Step 3A: Install Arduino IDE

1. Go to: https://www.arduino.cc/en/software
2. Download **Arduino IDE 2.x** for macOS (Apple Silicon)
3. Drag to Applications. Open it.

### Step 3B: Add ESP32 Board Support

1. In Arduino IDE, go to **File → Preferences**
2. In **"Additional boards manager URLs"**, paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Click OK
4. Go to **Tools → Board → Boards Manager**
5. Search for **"esp32"**
6. Install **"esp32 by Espressif Systems"** (latest version)
7. Wait for it to finish (takes 2-3 minutes)

### Step 3C: Select Your Board

1. Plug in the ESP32 via the USB cable (Micro-B → USB-A cable → USB-C adapter → Mac)
2. Go to **Tools → Board → esp32** → Select **"ESP32 Dev Module"**
3. Go to **Tools → Port** → Select the port that appeared (it will say something like `/dev/cu.usbserial-XXXXX` or `/dev/cu.SLAB_USBtoUART`)

> [!WARNING]
> **If no port appears:** You may need to install the CP2102 or CH340 USB-to-serial driver for your ESP32 board. 
> - For CP2102 chips: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
> - For CH340 chips: Search "CH340 driver mac" and install
> After installing, restart your Mac and try again.

### Step 3D: Install Required Libraries

In Arduino IDE, go to **Sketch → Include Library → Manage Libraries**. Search for and install each:

| Library | Author | Search Term |
|:---|:---|:---|
| **Adafruit SSD1306** | Adafruit | `ssd1306` |
| **Adafruit GFX Library** | Adafruit | `adafruit gfx` (installs as dependency) |
| **Adafruit BME280** | Adafruit | `adafruit bme280` |
| **Adafruit Unified Sensor** | Adafruit | `adafruit unified sensor` (installs as dependency) |
| **WiFi** | (built into ESP32 core) | Already included |
| **HTTPClient** | (built into ESP32 core) | Already included |

> You do NOT need a separate SDS011 library. We read it directly via hardware serial (simpler and more reliable).

---

## Part 4: The Firmware Code

Create a new sketch in Arduino IDE (**File → New Sketch**). **Delete everything** in the editor. Paste this entire code:

```cpp
// ============================================
// VayuBudhi Sensor Node — ESP32 Firmware v1.0
// ============================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <Adafruit_SSD1306.h>

// ---- CONFIGURATION (CHANGE THESE) ----

// WiFi: Your phone hotspot credentials
const char* WIFI_SSID = "VayuBudhi-Net";       // Your phone hotspot name
const char* WIFI_PASS = "vayubudhi2025";        // Your phone hotspot password

// Backend: Your teammate's FastAPI server IP
// When your Mac is on the same hotspot, find its IP with: ifconfig | grep inet
const char* API_URL = "http://192.168.43.100:8000/api/sensor";

// Sensor location (set to your demo location)
const float SENSOR_LAT = 28.6328;   // Delhi default
const float SENSOR_LON = 77.2197;
const char* SENSOR_ID = "vayubudhi-node-01";

// ---- PIN DEFINITIONS ----
#define SDS_RX 16          // ESP32 GPIO16 receives data FROM SDS011
#define SDS_TX 17          // ESP32 GPIO17 sends data TO SDS011
#define OLED_RESET 4       // ESP32 GPIO4 for OLED reset
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDRESS 0x3C  // Common I2C address (try 0x3D if display doesn't work)

// ---- GLOBAL OBJECTS ----
HardwareSerial sdsSerial(2);                     // UART2 for SDS011
Adafruit_BME280 bme;                              // BME280 on I2C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---- SDS011 DATA ----
float pm25 = 0.0;
float pm10 = 0.0;
bool sdsDataReady = false;

// ---- SDS011 READER ----
// The SDS011 sends 10-byte packets over UART at 9600 baud.
// Packet format: [0xAA, 0xC0, PM25_LOW, PM25_HIGH, PM10_LOW, PM10_HIGH, ID1, ID2, CHECKSUM, 0xAB]
bool readSDS011() {
    while (sdsSerial.available() >= 10) {
        if (sdsSerial.read() == 0xAA) {            // Start byte
            uint8_t buf[9];
            sdsSerial.readBytes(buf, 9);
            
            if (buf[0] == 0xC0 && buf[8] == 0xAB) {  // Valid packet
                // Verify checksum
                uint8_t checksum = 0;
                for (int i = 1; i <= 6; i++) {
                    checksum += buf[i];
                }
                
                if (checksum == buf[7]) {
                    pm25 = ((buf[2] << 8) | buf[1]) / 10.0;
                    pm10 = ((buf[4] << 8) | buf[3]) / 10.0;
                    return true;
                }
            }
        }
    }
    return false;
}

void setup() {
    // Debug serial (shows in Arduino Serial Monitor)
    Serial.begin(115200);
    Serial.println("\n=== VayuBudhi Sensor Node Starting ===");
    
    // SDS011 serial
    sdsSerial.begin(9600, SERIAL_8N1, SDS_RX, SDS_TX);
    Serial.println("[OK] SDS011 serial initialized on GPIO16/17");
    
    // I2C + BME280
    Wire.begin(21, 22);  // SDA=21, SCL=22
    if (!bme.begin(0x76)) {  // Try 0x76 first, then 0x77
        if (!bme.begin(0x77)) {
            Serial.println("[WARN] BME280 not found! Check wiring.");
        }
    } else {
        Serial.println("[OK] BME280 initialized");
    }
    
    // OLED
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
        Serial.println("[WARN] OLED not found! Try address 0x3D.");
    } else {
        Serial.println("[OK] OLED initialized");
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(0, 0);
        display.println("VayuBudhi");
        display.println("Starting...");
        display.display();
    }
    
    // WiFi
    Serial.printf("[...] Connecting to WiFi: %s\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[OK] WiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WARN] WiFi NOT connected. Running in offline mode.");
        Serial.println("       Data will show on OLED but won't reach backend.");
    }
    
    Serial.println("=== Setup Complete. Reading sensors... ===\n");
    delay(2000);  // Give SDS011 time to warm up fan
}

void loop() {
    // ---- READ SDS011 ----
    bool gotPM = readSDS011();
    
    // ---- READ BME280 ----
    float temp = bme.readTemperature();
    float humidity = bme.readHumidity();
    float pressure = bme.readPressure() / 100.0;  // hPa
    
    // ---- COMPUTE PM RATIO ----
    float ratio = (pm10 > 0) ? (pm25 / pm10) : 0.0;
    
    // ---- DETERMINE SOURCE TYPE FROM RATIO ----
    const char* sourceType = "Unknown";
    if (ratio > 0.75) {
        sourceType = "COMBUSTION";     // Biomass / burning
    } else if (ratio > 0.5) {
        sourceType = "VEHICULAR";      // Traffic exhaust
    } else if (ratio > 0.35) {
        sourceType = "MIXED";          // Multiple sources
    } else {
        sourceType = "DUST";           // Coarse particles
    }
    
    // ---- DETERMINE DANGER LEVEL ----
    const char* level;
    if (pm25 > 250) level = "HAZARDOUS";
    else if (pm25 > 150) level = "VERY POOR";
    else if (pm25 > 90) level = "POOR";
    else if (pm25 > 60) level = "MODERATE";
    else level = "GOOD";
    
    // ---- UPDATE OLED DISPLAY ----
    display.clearDisplay();
    
    // Title
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("-- VayuBudhi Node --");
    
    // PM values (large)
    display.setTextSize(2);
    display.setCursor(0, 12);
    display.printf("%.0f", pm25);
    display.setTextSize(1);
    display.print(" ug/m3");
    
    // Details
    display.setCursor(0, 32);
    display.printf("PM10: %.0f  R:%.2f", pm10, ratio);
    
    display.setCursor(0, 42);
    display.printf("T:%.1fC  H:%.0f%%", temp, humidity);
    
    display.setCursor(0, 52);
    display.printf("[%s] %s", level, sourceType);
    
    display.display();
    
    // ---- PRINT TO SERIAL MONITOR ----
    Serial.printf("PM2.5: %.1f | PM10: %.1f | Ratio: %.2f | %s | %s | T:%.1f H:%.0f\n",
                  pm25, pm10, ratio, level, sourceType, temp, humidity);
    
    // ---- SEND TO BACKEND (if WiFi connected) ----
    if (WiFi.status() == WL_CONNECTED && gotPM) {
        HTTPClient http;
        http.begin(API_URL);
        http.addHeader("Content-Type", "application/json");
        http.setTimeout(5000);  // 5 second timeout
        
        // JSON payload matching the backend API schema
        String payload = "{";
        payload += "\"sensor_id\":\"" + String(SENSOR_ID) + "\",";
        payload += "\"pm25\":" + String(pm25, 1) + ",";
        payload += "\"pm10\":" + String(pm10, 1) + ",";
        payload += "\"ratio\":" + String(ratio, 2) + ",";
        payload += "\"temperature\":" + String(temp, 1) + ",";
        payload += "\"humidity\":" + String(humidity, 1) + ",";
        payload += "\"pressure\":" + String(pressure, 1) + ",";
        payload += "\"source_type\":\"" + String(sourceType) + "\",";
        payload += "\"level\":\"" + String(level) + "\",";
        payload += "\"lat\":" + String(SENSOR_LAT, 4) + ",";
        payload += "\"lon\":" + String(SENSOR_LON, 4);
        payload += "}";
        
        int httpCode = http.POST(payload);
        
        if (httpCode == 200 || httpCode == 201) {
            Serial.println("  → Backend: OK");
        } else {
            Serial.printf("  → Backend: FAILED (HTTP %d)\n", httpCode);
        }
        
        http.end();
    }
    
    // ---- WAIT 3 SECONDS ----
    delay(3000);
}
```

### Save and Upload

1. **Save** the sketch: File → Save As → name it `VayuBudhi_Sensor`
2. Click the **Upload button** (→ arrow icon in top left)
3. Wait for compilation (~30 seconds) and upload (~15 seconds)
4. If you see `"Connecting........_____"` not progressing, **hold the BOOT button** on the ESP32 while it uploads, then release after upload starts

---

## Part 5: Testing (Before the Demo)

### Test 1: Serial Monitor (No WiFi Needed)

1. After uploading, go to **Tools → Serial Monitor**
2. Set baud rate to **115200** (dropdown in bottom right)
3. You should see:
   ```
   === VayuBudhi Sensor Node Starting ===
   [OK] SDS011 serial initialized on GPIO16/17
   [OK] BME280 initialized
   [OK] OLED initialized
   [...] Connecting to WiFi: VayuBudhi-Net
   [WARN] WiFi NOT connected. Running in offline mode.
   === Setup Complete. Reading sensors... ===
   
   PM2.5: 12.3 | PM10: 18.7 | Ratio: 0.66 | GOOD | VEHICULAR | T:28.5 H:65
   ```
4. **The OLED should light up** and show the readings

> [!WARNING]
> **If SDS011 shows 0.0 for both PM values:** The fan needs 10-15 seconds to spin up. Wait. If still 0 after 30 seconds, check the RX/TX wires — you may have them swapped. **Swap GPIO16 and GPIO17 wires** and try again.

> **If BME280 shows NaN or 0:** Check I2C wiring (SDA→D21, SCL→D22). Try changing `bme.begin(0x76)` to `bme.begin(0x77)` in the code.

> **If OLED is blank:** Try changing `OLED_ADDRESS` from `0x3C` to `0x3D` in the code.

### Test 2: The Incense Stick Test (Critical Demo Rehearsal)

1. Wait for readings to stabilize (~30 seconds of clean air)
2. Note the baseline: should be PM2.5 = 10-30 (normal indoor air)
3. **Light an incense stick (agarbatti)**
4. Hold it 10-15 cm from the SDS011's air intake hole
5. Watch the OLED:
   - PM2.5 should spike: 30 → 100 → 200 → 300+
   - PM2.5/PM10 ratio should go above 0.75
   - Source type should change to **"COMBUSTION"**
   - Level should change to **"VERY POOR"** or **"HAZARDOUS"**
6. **Time it.** From lighting the incense to seeing COMBUSTION on screen should be 15-30 seconds.
7. Remove the incense. Values should drop back to baseline within 30-60 seconds.

**If this test works, your hardware is ready for demo day.**

### Test 3: WiFi + Backend Connection

1. **Set up your phone hotspot:**
   - Phone Settings → Hotspot → Name: `VayuBudhi-Net`, Password: `vayubudhi2025`
   - (Or change the code to match your existing hotspot name/password)

2. **Connect your Mac to the same hotspot**

3. **Find your Mac's IP on the hotspot network:**
   - Open Terminal on Mac
   - Run: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - Look for something like `192.168.43.XXX` — that's your Mac's IP

4. **Update the firmware** with the correct IP:
   - Change `API_URL` in the code to: `"http://192.168.43.XXX:8000/api/sensor"`
   - Re-upload to ESP32

5. **Start your teammate's FastAPI backend** on the Mac (see Part 6 below)

6. **Reset the ESP32** (press the EN/RST button on the board)

7. Serial Monitor should now show:
   ```
   [OK] WiFi connected! IP: 192.168.43.YYY
   PM2.5: 15.2 | PM10: 22.1 | ...
     → Backend: OK
   ```

---

## Part 6: Backend API Endpoint (Send This to Your Teammates)

Your teammates need this FastAPI endpoint running to receive sensor data:

```python
# Add this to the FastAPI backend (e.g., in routes/sensor.py)

from fastapi import FastAPI, APIRouter
from pydantic import BaseModel
from datetime import datetime
import json

router = APIRouter()

# In-memory storage for demo (replace with DB in production)
latest_sensor_data = {}
sensor_history = []

class SensorReading(BaseModel):
    sensor_id: str
    pm25: float
    pm10: float
    ratio: float
    temperature: float
    humidity: float
    pressure: float
    source_type: str
    level: str
    lat: float
    lon: float

@router.post("/api/sensor")
async def receive_sensor_data(reading: SensorReading):
    """Receives live data from the ESP32 VayuBudhi sensor node."""
    data = reading.dict()
    data["timestamp"] = datetime.utcnow().isoformat()
    
    # Store latest reading
    latest_sensor_data[reading.sensor_id] = data
    
    # Append to history (keep last 500 readings)
    sensor_history.append(data)
    if len(sensor_history) > 500:
        sensor_history.pop(0)
    
    print(f"[SENSOR] {reading.sensor_id}: PM2.5={reading.pm25} PM10={reading.pm10} "
          f"Ratio={reading.ratio:.2f} → {reading.source_type} ({reading.level})")
    
    return {"status": "ok", "received": data}

@router.get("/api/sensor/latest")
async def get_latest_sensor():
    """Frontend polls this to update the live sensor dot on the map."""
    return latest_sensor_data

@router.get("/api/sensor/history")
async def get_sensor_history():
    """Frontend uses this for the live PM2.5 chart."""
    return sensor_history

# In main.py, include the router:
# app.include_router(router)
```

**Frontend team needs to:**
1. Poll `GET /api/sensor/latest` every 3 seconds to update the sensor dot on the map
2. Use `GET /api/sensor/history` for the live PM2.5 line chart
3. When `level` changes to `"VERY POOR"` or `"HAZARDOUS"`, trigger the alert banner and start the ⏱️ timer

---

## Part 7: Demo Day Checklist

### 1 Hour Before Demo
- [ ] Charge phone (hotspot drains battery fast)
- [ ] Charge power bank (if using wireless demo)
- [ ] Test sensor reads clean air (PM2.5 < 30)
- [ ] Verify WiFi connection on Serial Monitor
- [ ] Verify backend receives data (`→ Backend: OK`)
- [ ] Have 2 packs of incense sticks ready
- [ ] Have a lighter ready
- [ ] Have backup USB cable

### The 43-Second Demo Sequence
1. Point to sensor: "₹3,000. Live on our map. Reading [glance at OLED] 22 — clean air."
2. Light incense stick. Hold near sensor intake.
3. Watch OLED spike. Watch map dot turn red.
4. Say: "PM2.5/PM10 ratio is 0.84 — the system classifies this as COMBUSTION. Biomass burning."
5. Enforcement card appears on dashboard.
6. Timer stops. "45 seconds. Physical particle to enforcement order."

---

## Troubleshooting Quick Reference

| Problem | Fix |
|:---|:---|
| **No port in Arduino IDE** | Install CP2102 or CH340 driver for your ESP32. Restart Mac. |
| **Upload fails / stuck on "Connecting..."** | Hold the **BOOT** button on ESP32 during upload. |
| **SDS011 reads 0.0** | Wait 15s for fan spin-up. If still 0, swap D16 and D17 wires. |
| **BME280 not found** | Try `bme.begin(0x77)` instead of `0x76`. Check VCC is on 3V3. |
| **OLED blank** | Try `0x3D` instead of `0x3C`. Check DC and CS are wired to GND. |
| **WiFi won't connect** | Double-check SSID/password in code. Phone hotspot must be ON. |
| **Backend: FAILED** | Check Mac IP address. Make sure backend is running. Same hotspot. |
| **Readings are wildly wrong** | SDS011 is calibrated at factory. If PM2.5 > PM10 consistently, RX/TX may be swapped. |
| **OLED shows garbage** | RES (reset) pin may not be connected to D4. Check wiring. |
