'use client';
import React, { useState, useEffect } from 'react';
import { advisoryData, languageLabels } from '@/data/mockAdvisory';
import { getAqiCategory, cityStations } from '@/data/mockStations';

export default function AdvisoryPanel({ city = 'Delhi', userCoords, liveData }: { city?: string, userCoords?: { lat: number, lon: number } | null, liveData?: any }) {
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'kn'>('en');
  const [liveAdvisory, setLiveAdvisory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const langMap = { en: 'English', hi: 'Hindi', kn: 'Kannada' };
    
    let payload: any = null;
    
    if (city === 'My Location') {
      if (!liveData) {
        setLiveAdvisory('Waiting for location data...');
        return;
      }
      payload = {
        city: 'My Location',
        language: langMap[selectedLang],
        reading: liveData.reading
      };
    } else {
      const stations = cityStations[city] || cityStations['Delhi'];
      const maxStation = stations.reduce((max, st) => st.aqi > max.aqi ? st : max, stations[0]);
      
      payload = {
        city: city,
        language: langMap[selectedLang],
        reading: {
          station_id: maxStation.id,
          timestamp: new Date().toISOString(),
          pm25: maxStation.pm25,
          pm10: maxStation.pm10,
          temp: 30.0,
          humidity: 60.0,
          pressure: 1010.0,
          wind_speed: 2.0,
          pblh: 800.0,
          traffic_density: 0.8,
          distance_to_industry: 1.5
        }
      };
    }
    
    setLoading(true);
    fetch('http://127.0.0.1:8000/api/advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.advisory) {
          setLiveAdvisory(data.advisory);
        }
      })
      .catch(err => {
        console.error('Failed to fetch advisory:', err);
        setLiveAdvisory('Failed to load LLM advisory. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [city, selectedLang, liveData]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Citizen Advisory</div>
          <div className="panel-badge badge-purple">Gemini AI</div>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          Live localized LLM-generated health advisories for {city}
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
        
        {/* Live LLM Advisory */}
        <div className="advisory-card" style={{ marginTop: '12px', border: '1px solid var(--accent-purple)' }}>
          <div className="advisory-ward">
            <span style={{ color: 'var(--accent-purple)' }}>✦</span> AI Generated ({languageLabels[selectedLang]})
          </div>
          <div className="advisory-text" style={{ minHeight: '60px' }}>
            {loading ? <span style={{ opacity: 0.7 }}>Generating advisory with Gemini...</span> : liveAdvisory}
          </div>
        </div>
      </div>

      {/* Advisory Cards (Mock/Static for other wards) */}
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
              <span className="tag badge-blue">{adv.schools_nearby} schools</span>
              <span className="tag badge-green">{adv.hospitals_nearby} hospitals</span>
              <span className="tag badge-amber">{adv.dominant_source}</span>
              <span className="tag badge-purple">
                {adv.forecast_trend === 'rising' ? 'Rising' : adv.forecast_trend === 'falling' ? 'Falling' : 'Stable'}
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
