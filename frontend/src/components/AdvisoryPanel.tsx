'use client';
import React, { useState } from 'react';
import { advisoryData, languageLabels } from '@/data/mockAdvisory';
import { getAqiCategory } from '@/data/mockStations';

export default function AdvisoryPanel() {
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'kn'>('en');

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Citizen Advisory</div>
          <div className="panel-badge badge-purple">Gemini 2.0</div>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          Exposure-dose advisories powered by Google Gemini in 3 languages
        </div>

        {/* Language Tabs */}
        <div className="lang-tabs">
          {(Object.keys(languageLabels) as Array<'en' | 'hi' | 'kn'>).map((lang) => (
            <button
              key={lang}
              className={`lang-tab ${selectedLang === lang ? 'active' : ''}`}
              onClick={() => setSelectedLang(lang)}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Advisory Cards */}
      {advisoryData.map((adv, i) => {
        const cat = getAqiCategory(adv.aqi);
        return (
          <div key={i} className="advisory-card">
            <div className="advisory-ward">
              <span style={{ color: cat.color }}>●</span>{' '}
              {adv.ward_name}
              <span className={`panel-badge ${adv.aqi > 300 ? 'badge-red' : 'badge-amber'}`} style={{ marginLeft: 8 }}>
                AQI {adv.aqi}
              </span>
            </div>

            {/* Dose Display */}
            <div className="advisory-dose">
              <div className="dose-item">
                <span className="dose-value" style={{ color: 'var(--accent-red)' }}>{adv.exposure_dose_outdoor}</span>
                <span className="dose-label">µg/h outdoor</span>
              </div>
              <div className="dose-item">
                <span className="dose-value" style={{ color: 'var(--accent-green)' }}>{adv.exposure_dose_indoor}</span>
                <span className="dose-label">µg/h indoor</span>
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className="tag badge-blue">📚 {adv.schools_nearby} schools</span>
              <span className="tag badge-green">🏥 {adv.hospitals_nearby} hospitals</span>
              <span className="tag badge-amber">{adv.dominant_source}</span>
              <span className="tag badge-purple">
                {adv.forecast_trend === 'rising' ? '📈 Rising' : adv.forecast_trend === 'falling' ? '📉 Falling' : '➡️ Stable'}
              </span>
            </div>

            {/* Advisory Text */}
            <div className="advisory-text">
              {adv.advisories[selectedLang]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
