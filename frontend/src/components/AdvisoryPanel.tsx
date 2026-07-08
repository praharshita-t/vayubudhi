import React from 'react'

export default function AdvisoryPanel() {
  return (
    <div className="panel-card advisory-panel">
      <h2>Citizen Advisory Insights</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Generates multilingual warnings (Hindi, English, Kannada) driven by Gemini LLM outputs.
      </p>
    </div>
  )
}
