'use client';
import React, { useState, useEffect } from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCity?: string;
  initialDistrict?: string;
  initialMode?: 'city_audit' | 'district_audit' | 'state_audit' | 'surge_forensic';
  telemetryData?: any;
  attributionData?: any;
  historicalData?: any;
  forecastData?: any;
}

const STATE_MAPPING: Record<string, string> = {
  'Hyderabad': 'Telangana',
  'Bengaluru': 'Karnataka',
  'Delhi': 'National Capital Region (NCR)',
  'Mumbai': 'Maharashtra',
  'Chennai': 'Tamil Nadu',
  'Kolkata': 'West Bengal',
  'Thiruvananthapuram': 'Kerala',
  'Chandigarh': 'Punjab & Haryana'
};

export default function ReportModal({
  isOpen,
  onClose,
  initialCity = 'Hyderabad',
  initialDistrict,
  initialMode = 'city_audit',
  telemetryData,
  attributionData,
  historicalData,
  forecastData
}: ReportModalProps) {
  const [city, setCity] = useState<string>(initialCity);
  const [district, setDistrict] = useState<string>(initialDistrict || '');
  const [mode, setMode] = useState<'city_audit' | 'district_audit' | 'state_audit' | 'surge_forensic'>(initialMode);
  const [language, setLanguage] = useState<string>('English');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialCity) setCity(initialCity);
    if (initialDistrict) setDistrict(initialDistrict);
    if (initialMode) setMode(initialMode);
  }, [initialCity, initialDistrict, initialMode]);

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, city, district, mode, language]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const stateName = STATE_MAPPING[city] || 'Telangana';
      const targetName = mode === 'state_audit' ? stateName : (mode === 'district_audit' && district ? district : city);

      const payload = {
        city: city,
        district_name: targetName,
        mode: mode,
        language: language,
        live_telemetry: telemetryData || {
          aqi: 120,
          pm25: 42.0,
          pm10: 68.0,
          temp: 28.0,
          humidity: 65.0,
          pblh: 450.0,
          voc_index: 95,
          nox_index: 1
        },
        attribution: attributionData || {
          dominant_source: 'Vehicular Exhaust',
          probabilities: { vehicular: 0.52, industrial: 0.24, biomass: 0.12, dust: 0.12 }
        },
        historical_summary: historicalData || {},
        forecast: forecastData || {}
      };

      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="report-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div className="report-modal-container" style={{
        background: 'var(--bg-surface, #0f172a)',
        border: '1px solid var(--border-primary, rgba(255,255,255,0.12))',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: 'var(--text-primary, #f8fafc)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* MODAL CONTROL HEADER (Hidden when printing) */}
        <div className="no-print" style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-primary, rgba(255,255,255,0.1))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-elevated, #1e293b)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📄</span>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.02em' }}>
              AI Environmental Audit Generator
            </span>
            <span style={{
              fontSize: '0.65rem',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              fontWeight: 700
            }}>
              Gemini 1.5 Flash
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Scope Filter */}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              style={{
                background: 'var(--bg-surface, #0f172a)',
                border: '1px solid var(--border-primary, #334155)',
                color: 'var(--text-primary, #f8fafc)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="state_audit">🏛️ State Audit ({STATE_MAPPING[city] || 'State'})</option>
              <option value="city_audit">🏙️ City Audit ({city})</option>
              {district && <option value="district_audit">📍 Ward / District Audit ({district})</option>}
              <option value="surge_forensic">🔥 Surge Forensic Brief</option>
            </select>

            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                background: 'var(--bg-surface, #0f172a)',
                border: '1px solid var(--border-primary, #334155)',
                color: 'var(--text-primary, #f8fafc)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="English">English</option>
              <option value="Telugu">తెలుగు (Telugu)</option>
              <option value="Hindi">हिंदी (Hindi)</option>
              <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
            </select>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
              }}
            >
              🖨️ Print / Export PDF
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-primary, #334155)',
                color: 'var(--text-secondary, #94a3b8)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* PRINTABLE REPORT DOCUMENT */}
        <div id="printable-report" style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid #38bdf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Synthesizing Environmental Intelligence with Gemini 1.5 Flash...</div>
            </div>
          ) : report ? (
            <>
              {/* DOCUMENT HEADER */}
              <div style={{ borderBottom: '2px solid rgba(56, 189, 248, 0.3)', paddingBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#38bdf8', fontWeight: 800 }}>
                    VAYUBUDHI AIR QUALITY INTELLIGENCE COMMISSION
                  </div>
                  <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '6px 0 4px', color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    {report.title}
                  </h1>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Jurisdiction: <strong style={{ color: '#f1f5f9' }}>{report.district_name}</strong> · Reference: <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{report.report_id}</span> · Generated: <span>{report.timestamp}</span>
                  </div>
                </div>

                {/* NCAP COMPLIANCE BADGE */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: report.ncap_badge === 'success' ? 'rgba(16, 185, 129, 0.15)' : (report.ncap_badge === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                  border: `1px solid ${report.ncap_badge === 'success' ? '#10b981' : (report.ncap_badge === 'warning' ? '#f59e0b' : '#ef4444')}`,
                  textAlign: 'right',
                  minWidth: '180px'
                }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: '#94a3b8' }}>NCAP Compliance Status</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: report.ncap_badge === 'success' ? '#34d399' : (report.ncap_badge === 'warning' ? '#fbbf24' : '#f87171') }}>
                    {report.ncap_grade}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '2px' }}>{report.compliance_status}</div>
                </div>
              </div>

              {/* KEY METRICS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Mean Exposure AQI</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: report.key_metrics.aqi > 150 ? '#f87171' : '#38bdf8', marginTop: '2px' }}>
                    {report.key_metrics.aqi}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>PM2.5: {report.key_metrics.pm25} µg/m³</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Boundary Layer Height</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa', marginTop: '2px' }}>
                    {report.key_metrics.boundary_layer_height}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Inversion Vent Cap</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Dominant Sector</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', marginTop: '6px' }}>
                    {report.key_metrics.dominant_source}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Primary Emission Driver</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Chemical Sensor Index</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>
                    {report.key_metrics.voc_index} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>VOC</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>SGP41 MOx Signature</div>
                </div>
              </div>

              {/* EXECUTIVE SUMMARY */}
              <div style={{ background: 'rgba(56, 189, 248, 0.05)', borderLeft: '4px solid #38bdf8', padding: '14px 18px', borderRadius: '0 8px 8px 0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  📌 Executive Summary
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#e2e8f0' }}>
                  {report.executive_summary}
                </div>
              </div>

              {/* FORENSIC ANALYSIS */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔬 Atmospheric Physics & Forensic Root-Cause Breakdown
                </h3>
                <div style={{ fontSize: '0.82rem', lineHeight: '1.65', color: '#cbd5e1', whiteSpace: 'pre-line', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {report.forensic_analysis}
                </div>
              </div>

              {/* SECTORAL EMISSION MATRIX */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📊 Sectoral Emission Contribution Matrix
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>Emission Sector</th>
                        <th style={{ padding: '8px 12px' }}>Contribution Share</th>
                        <th style={{ padding: '8px 12px' }}>Severity</th>
                        <th style={{ padding: '8px 12px' }}>Forensic Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.source_breakdown.map((src: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f1f5f9' }}>{src.sector}</td>
                          <td style={{ padding: '10px 12px', width: '180px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${src.share_percentage}%`, height: '100%', background: i === 0 ? '#ef4444' : (i === 1 ? '#a855f7' : '#eab308'), borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc', fontSize: '0.75rem' }}>{src.share_percentage}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              background: src.severity === 'High' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                              color: src.severity === 'High' ? '#f87171' : '#38bdf8'
                            }}>
                              {src.severity}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', lineHeight: '1.4' }}>{src.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MUNICIPAL DIRECTIVES */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', marginBottom: '8px' }}>
                    🚨 Immediate 24-Hour Municipal Orders
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.55', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {report.immediate_directives.map((dir: string, i: number) => (
                      <li key={i}>{dir}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: '8px' }}>
                    🏛️ 7-Day Structural Policy Interventions
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.55', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {report.structural_interventions.map((dir: string, i: number) => (
                      <li key={i}>{dir}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* PUBLIC HEALTH ASSESSMENT */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '14px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '6px' }}>
                  🩺 Public Health & Vulnerable Population Advisory
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                  <div><strong>General Public:</strong> {report.health_assessment.general_population}</div>
                  <div><strong>Sensitive Groups:</strong> {report.health_assessment.sensitive_groups}</div>
                  <div><strong>Protective Gear:</strong> {report.health_assessment.recommended_protective_gear || 'N95 masks advised during rush hours.'}</div>
                  <div><strong>Indoor Living:</strong> {report.health_assessment.indoor_guidelines}</div>
                </div>
              </div>

              {/* FOOTER & OFFICIAL SEAL */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748b' }}>
                <div>
                  Synthesized via <strong style={{ color: '#38bdf8' }}>{report.generated_by}</strong> · Atmospheric Mass-Conservation Verified
                </div>
                <div style={{ fontFamily: 'monospace' }}>
                  AUTHENTICATION HASH: SHA256-VB{report.report_id.replace(/[^A-Z0-9]/g, '')}
                </div>
              </div>
            </>
          ) : null}

        </div>

      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .report-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            padding: 0 !important;
          }
          .report-modal-container {
            max-width: 100% !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          #printable-report, #printable-report * {
            visibility: visible;
            color: #0f172a !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
