/**
 * Mock enforcement optimizer output.
 * Simulates OR-Tools CVRPTW routing results and ROI calculations.
 */

export type VehicleType = 'inspector' | 'drone' | 'van';
export type ActionType = 'FULL_INSPECTION' | 'VERIFY_FIRST' | 'SCHEDULED' | 'MONITOR';

export interface EnforcementStop {
  source_id: string;
  ward_name: string;
  lat: number;
  lon: number;
  eta: string;
  action: ActionType;
  source_type: string;
  confidence: number;
  set_size: number;
  severity: number;
  population_exposed: number;
  roi: number;
  estimated_aqi_reduction: number;
  compliance_cost: number;
  legal_basis: string;
}

export interface EnforcementRoute {
  route_id: string;
  vehicle_type: VehicleType;
  vehicle_label: string;
  total_time_min: number;
  stops: EnforcementStop[];
}

export const enforcementRoutes: EnforcementRoute[] = [
  {
    route_id: 'INS_01',
    vehicle_type: 'inspector',
    vehicle_label: 'Inspector Team Alpha',
    total_time_min: 385,
    stops: [
      {
        source_id: 'S01', ward_name: 'Anand Vihar', lat: 28.6469, lon: 77.3164,
        eta: '09:15', action: 'FULL_INSPECTION', source_type: 'vehicular',
        confidence: 0.92, set_size: 1, severity: 338, population_exposed: 185000,
        roi: 72.4, estimated_aqi_reduction: 18, compliance_cost: 15000,
        legal_basis: 'GRAP Stage III, §4.2',
      },
      {
        source_id: 'S07', ward_name: 'Vivek Vihar', lat: 28.6724, lon: 77.3151,
        eta: '11:30', action: 'FULL_INSPECTION', source_type: 'industrial',
        confidence: 0.88, set_size: 1, severity: 275, population_exposed: 120000,
        roi: 54.2, estimated_aqi_reduction: 15, compliance_cost: 12000,
        legal_basis: 'NCAP §6.1 + GRAP Stage II',
      },
      {
        source_id: 'S12', ward_name: 'Patparganj', lat: 28.6237, lon: 77.2874,
        eta: '14:00', action: 'SCHEDULED', source_type: 'vehicular',
        confidence: 0.85, set_size: 1, severity: 225, population_exposed: 95000,
        roi: 38.1, estimated_aqi_reduction: 12, compliance_cost: 10000,
        legal_basis: 'GRAP Stage II, §3.1',
      },
    ],
  },
  {
    route_id: 'DRN_01',
    vehicle_type: 'drone',
    vehicle_label: 'Drone Unit Bravo',
    total_time_min: 135,
    stops: [
      {
        source_id: 'S04', ward_name: 'Wazirpur Industrial',lat: 28.6996, lon: 77.1654,
        eta: '09:45', action: 'VERIFY_FIRST', source_type: 'industrial',
        confidence: 0.58, set_size: 3, severity: 260, population_exposed: 78000,
        roi: 28.5, estimated_aqi_reduction: 10, compliance_cost: 8000,
        legal_basis: 'GRAP Stage II, §5.3',
      },
      {
        source_id: 'S09', ward_name: 'Bawana Industrial', lat: 28.7762, lon: 77.0511,
        eta: '10:30', action: 'VERIFY_FIRST', source_type: 'biomass_burning',
        confidence: 0.62, set_size: 2, severity: 245, population_exposed: 65000,
        roi: 22.8, estimated_aqi_reduction: 8, compliance_cost: 7000,
        legal_basis: 'NCAP §7.2',
      },
    ],
  },
  {
    route_id: 'VAN_01',
    vehicle_type: 'van',
    vehicle_label: 'Enforcement Van Charlie',
    total_time_min: 290,
    stops: [
      {
        source_id: 'S03', ward_name: 'ITO Junction', lat: 28.6289, lon: 77.2406,
        eta: '09:30', action: 'FULL_INSPECTION', source_type: 'vehicular',
        confidence: 0.90, set_size: 1, severity: 248, population_exposed: 210000,
        roi: 62.1, estimated_aqi_reduction: 14, compliance_cost: 11000,
        legal_basis: 'GRAP Stage III, §4.1',
      },
      {
        source_id: 'S06', ward_name: 'Nehru Nagar', lat: 28.5680, lon: 77.2509,
        eta: '12:15', action: 'FULL_INSPECTION', source_type: 'dust',
        confidence: 0.94, set_size: 1, severity: 238, population_exposed: 143000,
        roi: 48.9, estimated_aqi_reduction: 11, compliance_cost: 9000,
        legal_basis: 'NCAP §5.4 + CPCB Notification',
      },
    ],
  },
];

export const optimizerSummary = {
  total_sources_analyzed: 47,
  sources_scheduled: 7,
  sources_monitoring: 40,
  total_population_covered: 896000,
  avg_roi: 46.7,
  solve_time_ms: 1240,
};
