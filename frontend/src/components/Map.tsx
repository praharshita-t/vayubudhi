import React from 'react'

export default function Map() {
  return (
    <div className="map-placeholder" style={{ padding: '2rem', textAlign: 'center' }}>
      <h3>Map Canvas (Mapbox GL JS + deck.gl)</h3>
      <p style={{ color: 'var(--text-secondary)' }}>
        Render 3D grid layers, back-trajectories, and monitoring locations here.
      </p>
    </div>
  )
}
