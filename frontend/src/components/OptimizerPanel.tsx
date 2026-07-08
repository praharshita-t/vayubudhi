import React from 'react'

export default function OptimizerPanel() {
  return (
    <div className="panel-card optimizer-panel">
      <h2>Enforcement & Routing Optimizer</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Visualizes optimal dispatch logs and routing instructions calculated by Google OR-Tools.
      </p>
    </div>
  )
}
