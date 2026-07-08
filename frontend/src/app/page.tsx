import React from 'react'
import Map from '../components/Map'
import AdvisoryPanel from '../components/AdvisoryPanel'
import OptimizerPanel from '../components/OptimizerPanel'
import SimulatorPanel from '../components/SimulatorPanel'

export default function DashboardPage() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>VayuBudhi Commander Dashboard</h1>
      </header>
      
      <div className="dashboard-grid">
        <section className="map-section">
          <Map />
        </section>
        
        <aside className="control-sidebar">
          <SimulatorPanel />
          <OptimizerPanel />
          <AdvisoryPanel />
        </aside>
      </div>
    </div>
  )
}
