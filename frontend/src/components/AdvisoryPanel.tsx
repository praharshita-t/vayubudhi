'use client';
import React, { useState, useEffect } from 'react';
import { getAqiCategory } from '@/utils/aqi';

export const languageLabels: Record<string, string> = {
  en: 'English',
  hi: 'हिंदी',
  kn: 'ಕನ್ನಡ',
};

export default function AdvisoryPanel({ city = 'Delhi', userCoords, liveData, cityData }: { city?: string, userCoords?: { lat: number, lon: number } | null, liveData?: any, cityData?: any }) {
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
      const stations = cityData ? cityData.stations : [];
      if (stations.length === 0) return;
      const maxStation = stations.reduce((max: any, st: any) => st.aqi > max.aqi ? st : max, stations[0]);
      
      payload = {
        city: city,
        language: langMap[selectedLang],
        reading: {
          station_id: maxStation.id,
          timestamp: new Date().toISOString(),
          pm25: maxStation.pm25,
          pm10: maxStation.pm10,
          temp: maxStation.temp || 30.0,
          humidity: maxStation.humidity || 60.0,
          pressure: maxStation.pressure || 1010.0,
          wind_speed: maxStation.wind_speed || 2.0,
          pblh: maxStation.pblh || 800.0,
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
  }, [city, selectedLang, liveData, cityData]);

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
    </div>
  );
}
