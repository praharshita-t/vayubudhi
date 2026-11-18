// Hardware component data for the VayuBudhi 3D digital twin

export type HardwareComponent = {
  id: string;
  name: string;
  category: string;
  description: string;
  detailedDescription: string;
  specs: Record<string, string>;
  position: [number, number, number];
  /** Visual center used for tooltips and camera focus (defaults to position) */
  focusCenter?: [number, number, number];
  explosionOffset: [number, number, number];
  dimensions: [number, number, number];
  geometryType: 'mesh' | 'box' | 'cylinder' | 'torus';
  color: string;
  meshFile?: string;
};

export const hardwareComponents: HardwareComponent[] = [
  {
    id: 'top-shell',
    name: 'Top Shell',
    category: 'Enclosure',
    geometryType: 'mesh',
    meshFile: '/models/vayubudhi_top_shell.stl',
    color: '#269973',
    position: [0, 24, 0],
    focusCenter: [68, 31, 43],
    explosionOffset: [0, 52, 0],
    dimensions: [136, 14, 86],
    description:
      'IP65 enclosure lid with tongue-and-groove seal, display bezel, and dual button ports.',
    detailedDescription:
      'The top shell forms the upper half of the VayuBudhi enterprise enclosure. Features a recessed display bezel for the 2.8-inch TFT with optical acrylic window, two 8mm tactile button ports with silicone weather boots, and a downward-protruding tongue ridge that compresses the O-ring gasket for IP65 sealing. Four counterbored M3 screw holes sit flush with the surface.',
    specs: {
      Material: 'SLS Nylon PA12 / PETG',
      Dimensions: '136 x 86 x 14mm',
      Protection: 'IP65 Dust and Water Jet',
      Finish: 'Matte Enterprise Green',
    },
  },
  {
    id: 'bottom-shell',
    name: 'Bottom Shell',
    category: 'Enclosure',
    geometryType: 'mesh',
    meshFile: '/models/vayubudhi_bottom_shell.stl',
    color: '#333840',
    position: [0, 0, 0],
    focusCenter: [68, 12, 43],
    explosionOffset: [0, -10, 0],
    dimensions: [136, 24, 86],
    description:
      'Structural base housing both chambers, intake louvers, pole-mount brackets, and tripod boss.',
    detailedDescription:
      'The bottom shell is the structural foundation of the device. It contains the internal dual-chamber architecture separated by a 2.8mm hermetic bulkhead, SPS30 retention rails in Chamber 1, an 18650 battery cradle and ESP32-S3 PCB standoffs in Chamber 2. External features include 45-degree intake louvers, USB-C port cutout, power switch collar, pole-mount strap loops, and a central 1/4-inch-20 UNC tripod boss.',
    specs: {
      Material: 'SLS Nylon PA12 / PETG',
      Dimensions: '136 x 86 x 24mm',
      Features: 'Dual-chamber, louvers, strap loops',
      Floor: '3.2mm impact-resistant base',
    },
  },
  {
    id: 'o-ring',
    name: 'Silicone O-Ring Gasket',
    category: 'Sealing',
    geometryType: 'torus',
    color: '#1a1a1a',
    position: [68, 23.2, 43],
    explosionOffset: [0, 26, 0],
    dimensions: [129, 79, 2],
    description:
      '2.0mm continuous silicone cord creating the IP65 hermetic weather seal between shells.',
    detailedDescription:
      'A continuous loop of 2.0mm silicone elastomer cord seated in the perimeter gasket channel of the bottom shell. When the top shell tongue compresses it, the gasket creates a hermetic IP65 seal protecting all internal electronics from dust ingress and water jets. Corner joints are secured with cyanoacrylate.',
    specs: {
      Material: 'Silicone Elastomer',
      Cord: '2.0mm diameter',
      Durometer: 'Shore 50A',
      Temperature: '-50C to +200C',
      Length: '~430mm perimeter',
    },
  },
  {
    id: 'screws',
    name: 'M3 Screws (x4)',
    category: 'Fasteners',
    geometryType: 'cylinder',
    color: '#c0c0c0',
    position: [9, 31, 9],
    focusCenter: [68, 31, 43],
    explosionOffset: [0, 74, 0],
    dimensions: [1.5, 12, 1.5],
    description:
      'M3x12mm stainless steel socket head cap screws for structural closure.',
    detailedDescription:
      'Four M3 x 12mm DIN 912 socket head cap screws in 304 stainless steel. They sit in counterbored holes in the top shell and thread into the brass heat-set inserts in the bottom shell corner bosses. Torqued to 0.4 Nm for consistent IP65 gasket compression.',
    specs: {
      Size: 'M3 x 12mm DIN 912',
      Material: '304 Stainless Steel',
      Head: 'Hex Socket Cap',
      Torque: '0.4 Nm',
      Quantity: '4',
    },
  },
  {
    id: 'brass-inserts',
    name: 'Brass Heat-Set Inserts (x4)',
    category: 'Fasteners',
    geometryType: 'cylinder',
    color: '#b5a642',
    position: [9, 21, 9],
    focusCenter: [68, 21, 43],
    explosionOffset: [0, -28, 0],
    dimensions: [2.1, 5, 2.1],
    description:
      'Ruthex M3 brass inserts thermally staked into the bottom shell for reusable screw threads.',
    detailedDescription:
      'Four Ruthex M3 x 4.5mm brass threaded inserts with knurled outer surfaces. Installed by pressing a 280C soldering iron tip into each corner boss hole, the brass melts surrounding plastic and sinks flush. Provides durable, reusable M3 internal threads that never strip, unlike raw plastic.',
    specs: {
      Type: 'Ruthex M3 Heat-Set',
      OD: '4.6mm',
      Length: '5.0mm',
      Hole: '4.2mm blind bore',
      Method: 'Thermal staking at 280C',
    },
  },
  {
    id: 'sps30',
    name: 'Sensirion SPS30',
    category: 'Sensors',
    geometryType: 'box',
    color: '#e8e8e8',
    position: [26.75, 11.95, 43],
    explosionOffset: [-45, 10, 0],
    dimensions: [41.5, 12.5, 41.5],
    description:
      'Laser-scattering PM sensor measuring PM1.0, PM2.5, PM4.0, PM10.0. MCERTS Class 1, 10-year lifespan.',
    detailedDescription:
      'The Sensirion SPS30 is a high-precision optical particulate matter sensor using laser scattering to measure mass concentrations of PM1.0, PM2.5, PM4.0, and PM10.0 simultaneously. It features an integrated fan for consistent airflow and an auto-cleaning mechanism for long-term stability. Mounted on 2mm riser rails in Chamber 1 to eliminate thermal contact with the enclosure floor.',
    specs: {
      Measures: 'PM1.0, PM2.5, PM4.0, PM10.0',
      Interface: 'I2C (0x69) / UART',
      Supply: '4.5V - 5.5V',
      Accuracy: 'MCERTS Class 1 Certified',
      Lifespan: '10 years continuous',
      InrushCurrent: '~200mA peak (fan + laser)',
    },
  },
  {
    id: 'bulkhead',
    name: 'Bulkhead Wall',
    category: 'Structure',
    geometryType: 'box',
    color: '#474f5c',
    position: [53.4, 12.7, 43],
    explosionOffset: [0, 8, 0],
    dimensions: [2.8, 19.0, 80],
    description:
      '2.8mm solid hermetic partition isolating optical sensing from electronics, preventing heat errors.',
    detailedDescription:
      'A solid 2.8mm molded wall spanning the full internal height of the enclosure. It completely isolates Chamber 1 (the optical particulate sensing path) from Chamber 2 (electronics and battery). This prevents waste heat from the ESP32 and PMIC from warming sample air, which would artificially reduce relative humidity and corrupt PM2.5 readings through hygroscopic aerosol shrinkage.',
    specs: {
      Thickness: '2.8mm solid wall',
      Function: 'Thermal and aerodynamic isolation',
      Position: '52mm along X axis',
      Spans: 'Full internal height and width',
    },
  },
  {
    id: 'esp32',
    name: 'ESP32-S3-WROOM-1',
    category: 'Compute',
    geometryType: 'box',
    color: '#1a5c2a',
    position: [95, 10.7, 25],
    explosionOffset: [32, 16, -24],
    dimensions: [60, 2, 28],
    description:
      'Dual-core Xtensa LX7 at 240MHz, 16MB Flash, 8MB PSRAM. Wi-Fi 4 + BLE 5.0 with hardware AES-256.',
    detailedDescription:
      'The ESP32-S3-WROOM-1-N16R8 is the central microcontroller running FreeRTOS dual-core firmware. Core 1 handles sensor polling at precise intervals and drives the TFT display at 60 FPS. Core 0 manages MQTT-over-TLS telemetry to the cloud, flash-backed offline storage, and BLE mesh networking. Features hardware-accelerated AES-256 encryption for secure data transmission.',
    specs: {
      MCU: 'ESP32-S3-WROOM-1-N16R8',
      Cores: 'Dual Xtensa LX7 @ 240MHz',
      Memory: '16MB Flash + 8MB PSRAM',
      Wireless: 'Wi-Fi 802.11 b/g/n + BLE 5.0',
      Crypto: 'AES-256, RSA-3072, SHA-2',
      Power: '450-500mA peak during RF TX',
    },
  },
  {
    id: 'display',
    name: '2.8-inch TFT Display',
    category: 'Interface',
    geometryType: 'box',
    color: '#102044',
    position: [68, 34.5, 43],
    explosionOffset: [0, 38, 0],
    dimensions: [62, 2, 46],
    description:
      '240x320 color LCD at 60 FPS over 40MHz SPI. Shows 6 dashboard screens with live sensor data.',
    detailedDescription:
      'A 2.8-inch ILI9341-driven TFT LCD providing 240x320 RGB resolution at 65K colors. Connected via the ESP32-S3 FSPI bus at 40MHz for sustained 60 FPS rendering. Displays six user-navigable screens: main dashboard, real-time rolling graph, PM breakdown, gas analysis (VOC/NOx), meteorology, and system diagnostics. Seated in a recessed bezel behind an optical-grade acrylic window.',
    specs: {
      Controller: 'ILI9341',
      Resolution: '240 x 320 RGB 65K colors',
      Bus: 'SPI @ 40MHz FSPI',
      FPS: '60 FPS sustained',
      Screens: '6 dashboard views',
      Backlight: '5V LED via VCC splitter',
    },
  },
  {
    id: 'bme280',
    name: 'Bosch BME280',
    category: 'Sensors',
    geometryType: 'box',
    color: '#6a2d8e',
    position: [75, 14, 22],
    explosionOffset: [10, 28, -32],
    dimensions: [13, 2.5, 10],
    description:
      'Temperature (+/-0.5C), humidity (+/-3%), and barometric pressure (+/-1 hPa) over I2C.',
    detailedDescription:
      'The Bosch BME280 is a combined digital temperature, humidity, and barometric pressure sensor on a compact breakout board. It provides the meteorological context needed for kappa-Kohler hygroscopic aerosol corrections, ensuring PM readings account for humidity-induced particle swelling. Shares the I2C bus with the SGP41 via a soldered SDA/SCL splitter.',
    specs: {
      Temperature: '+/-0.5C accuracy',
      Humidity: '+/-3% RH',
      Pressure: '+/-1 hPa',
      Interface: 'I2C (0x76)',
      Supply: '3.3V',
      Function: 'Meteorological context for PM correction',
    },
  },
  {
    id: 'sgp41',
    name: 'Sensirion SGP41',
    category: 'Sensors',
    geometryType: 'box',
    color: '#a37b36',
    position: [112, 14, 22],
    explosionOffset: [38, 28, -32],
    dimensions: [13, 2.5, 10],
    description:
      'Dual MOX gas sensor: VOC Index (0-500) and NOx Index (0-500) over I2C.',
    detailedDescription:
      'The Sensirion SGP41 is a dual metal-oxide (MOX) gas sensor measuring Volatile Organic Compounds (VOC Index 0-500) and Nitrogen Oxides (NOx Index 0-500). The dual-hotplate design provides independent VOC and NOx readings. Essential for indoor air quality assessment and industrial emission detection. Mounted in Chamber 2 with gas access through an ePTFE hydrophobic membrane vent.',
    specs: {
      VOC: 'Index 0-500',
      NOx: 'Index 0-500',
      Interface: 'I2C (0x59)',
      Type: 'Dual MOX hotplate',
      Supply: '3.3V',
      GasAccess: 'ePTFE membrane vent',
    },
  },
  {
    id: 'ip5306',
    name: 'IP5306 PMIC',
    category: 'Power',
    geometryType: 'box',
    color: '#2d4a8e',
    position: [110, 14, 42],
    explosionOffset: [46, 18, 8],
    dimensions: [20, 3, 15],
    description:
      'Single-chip power management: 2.1A synchronous 5V boost, 2.4A Li-ion charger, 93% efficiency.',
    detailedDescription:
      'The Injoinic IP5306 consolidates battery charging, 5V boost conversion, and fuel-gauge monitoring into a single ESOP8 package. Its synchronous rectification (internal low-RDS(on) MOSFET replacing a lossy Schottky diode) achieves 93% efficiency at 1A load. Easily sustains the combined 850mA peak load from ESP32 Wi-Fi TX, SPS30 fan, and display backlight without voltage droop.',
    specs: {
      Boost: '2.1A synchronous 5V output',
      Charger: '2.4A Li-ion charging',
      Efficiency: '93% at 5V/1A',
      Package: 'ESOP8',
      Inductor: '2.2uH shielded power',
      Decoupling: '2x 22uF + 100nF ceramics',
    },
  },
  {
    id: 'battery',
    name: '18650 Battery Cell',
    category: 'Power',
    geometryType: 'cylinder',
    color: '#2a7d3f',
    position: [94, 13.2, 62.4],
    explosionOffset: [34, 6, 36],
    dimensions: [9.25, 65.5, 9.25],
    description:
      'Samsung 35E / LG MJ1 grade-A lithium-ion cell: 3500mAh (12.6Wh), 8+ hours runtime.',
    detailedDescription:
      'A single 18650-format lithium-ion cell (Samsung 35E or LG MJ1) seated in a custom cradle with end-retention stops in Chamber 2. Provides 3500mAh (12.6Wh) for 8+ hours of continuous operation. The IP5306 PMIC handles charging, boost conversion, and low-voltage cutoff protection. Gold-plated Keystone clips eliminate contact resistance.',
    specs: {
      Chemistry: 'Li-ion NCR',
      Capacity: '3500mAh (12.6Wh)',
      Voltage: '3.7V nominal',
      Discharge: '8A continuous / 10A peak',
      Models: 'Samsung 35E / LG MJ1',
      Runtime: '8+ hours continuous',
    },
  },
  {
    id: 'level-shifter',
    name: 'BSS138 Level Shifter',
    category: 'Logic',
    geometryType: 'box',
    color: '#4a2d8e',
    position: [68, 14, 38],
    explosionOffset: [6, 26, 18],
    dimensions: [15, 2.5, 10],
    description:
      'Bidirectional 3.3V to 5V I2C level translator for ESP32-to-SPS30 communication.',
    detailedDescription:
      'A 4-channel bidirectional MOSFET level shifter using BSS138 N-channel transistors. Bridges the 3.3V I2C bus of the ESP32-S3 to the 5V I2C bus required by the SPS30 particulate sensor. Each channel has 4.7k-ohm pullup resistors on both the low-voltage and high-voltage sides, ensuring clean signal transitions and reliable communication at 100kHz I2C standard mode.',
    specs: {
      Channels: '4-channel bidirectional',
      MOSFET: 'BSS138 N-channel',
      LV: '3.3V with 4.7k pullups',
      HV: '5.0V with 4.7k pullups',
      Speed: '100kHz I2C standard mode',
    },
  },
  {
    id: 'buttons',
    name: 'Dual Tactile Buttons',
    category: 'Interface',
    geometryType: 'cylinder',
    color: '#6b7280',
    position: [18, 37, 43],
    focusCenter: [68, 37, 43],
    explosionOffset: [0, 66, 0],
    dimensions: [3.2, 4.5, 3.2],
    description:
      '6mm navigation pushbuttons for cycling 6 dashboard screens. Sub-1.5us ISR response.',
    detailedDescription:
      'Two 6mm tactile momentary pushbuttons (PREV and NEXT) for navigating the six on-device display screens. Mounted through 8mm ports in the top shell with silicone weather boots. The buttons share a daisy-chained ground line and trigger hardware interrupts on GPIO 6 and GPIO 7 with sub-1.5-microsecond ISR response time. Internal pullup resistors eliminate the need for external pullup networks.',
    specs: {
      Type: '6mm Tactile Momentary',
      Count: '2 (PREV on GPIO 7, NEXT on GPIO 6)',
      Response: '<1.5us hardware ISR',
      Pull: 'Internal pullup + GND daisy-chain',
      Ports: '8mm diameter with weather boots',
    },
  },
  {
    id: 'usb-c',
    name: 'USB-C Port',
    category: 'Interface',
    geometryType: 'box',
    color: '#9ca3af',
    position: [134, 8.45, 24],
    explosionOffset: [42, 0, -10],
    dimensions: [5, 6.5, 12],
    description:
      'Charging port with ESD protection. USB-PD 5V/3A. Sealed with silicone plug outdoors.',
    detailedDescription:
      'A 16-pin USB Type-C receptacle recessed into the right flank of the bottom shell. Features 5.1k-ohm pulldown resistors on CC1 and CC2 for universal USB-PD charger detection (5V/3A default). Protected by a USBLC6-2SC6 TVS diode array providing +/-15kV ESD protection across VBUS, D+, D-, and GND. A captive silicone rubber dust/rain plug seals the port during outdoor deployment.',
    specs: {
      Type: '16-pin USB Type-C',
      Protection: 'USBLC6-2SC6 ESD (+/-15kV)',
      Power: 'USB-PD 5V / 3A default',
      Sealing: 'Captive silicone dust plug',
      CC: '5.1k pulldown on CC1 and CC2',
    },
  },
  {
    id: 'louvers',
    name: 'Air Intake Louvers',
    category: 'Structure',
    geometryType: 'box',
    color: '#64748b',
    position: [1.5, 11, 43.5],
    explosionOffset: [-34, -4, 0],
    dimensions: [3.2, 10, 30],
    description:
      '45-degree downward-angled air inlets with 316SS 300um insect mesh. Blocks rain and debris.',
    detailedDescription:
      'Four 45-degree downward-slanted intake slots cut into the left flank of the bottom shell. The angled geometry deflects monsoon rain droplets, which slide down without entering the sensing chamber. Behind the louvers, a laser-cut 42x16mm strip of marine-grade 316 stainless steel wire mesh (300um aperture) excludes insects, cotton seeds, and airborne foliage debris while allowing free airflow to the SPS30.',
    specs: {
      Angle: '45 degrees downward',
      Mesh: '316 Stainless Steel 300um',
      Count: '4 angled slots',
      MeshSize: '42 x 16mm strip',
      Function: 'Rain deflection + debris exclusion',
    },
  },
];
