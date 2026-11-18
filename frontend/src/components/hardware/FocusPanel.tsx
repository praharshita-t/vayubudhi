'use client';

import React from 'react';
import type { HardwareComponent } from '@/data/hardwareComponents';

interface FocusPanelProps {
  component: HardwareComponent | null;
  onClose: () => void;
}

export default function FocusPanel({ component, onClose }: FocusPanelProps) {
  if (!component) return null;

  const panelStyle: React.CSSProperties = {
    width: 360,
    background: '#0d0d14',
    borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '72px 24px 32px 24px',
    overflowY: 'auto',
    height: '100%',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
    boxSizing: 'border-box',
  };

  const specEntries = Object.entries(component.specs);

  return (
    <div style={panelStyle}>
      {/* Close button */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 72,
          right: 24,
          cursor: 'pointer',
          color: '#666',
          fontSize: 18,
          lineHeight: 1,
          fontWeight: 300,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#aaa';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#666';
        }}
      >
        X
      </div>

      {/* Category badge */}
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          color: '#269973',
          marginBottom: 8,
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        {component.category}
      </div>

      {/* Component name */}
      <h2
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: '#fff',
          marginBottom: 12,
          lineHeight: 1.3,
          marginTop: 0,
        }}
      >
        {component.name}
      </h2>

      {/* Description */}
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: '#aaa',
          marginBottom: 24,
          marginTop: 0,
        }}
      >
        {component.detailedDescription}
      </p>

      {/* Specifications */}
      <h4
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: '#666',
          marginBottom: 12,
          marginTop: 0,
          fontWeight: 500,
        }}
      >
        Specifications
      </h4>
      <div>
        {specEntries.map(([key, value]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, color: '#888', flexShrink: 0 }}>
              {key}
            </span>
            <span
              style={{
                fontSize: 13,
                color: '#e0e0e0',
                fontWeight: 500,
                textAlign: 'right',
                maxWidth: '60%',
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        style={{
          fontSize: 11,
          color: '#444',
          marginTop: 32,
          paddingTop: 16,
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >
        Part of the VayuBudhi Enterprise Air Quality Node
      </div>
    </div>
  );
}
