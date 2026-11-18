'use client';

import React, { useMemo } from 'react';
import type { HardwareComponent } from '@/data/hardwareComponents';

type ViewMode = 'assembled' | 'exploded' | 'focused';

interface ControlPanelProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  components: HardwareComponent[];
  hoveredId: string | null;
}

export default function ControlPanel({
  viewMode,
  setViewMode,
  selectedId,
  setSelectedId,
  components,
  hoveredId,
}: ControlPanelProps) {
  // Group components by category
  const grouped = useMemo(() => {
    const map = new Map<string, HardwareComponent[]>();
    for (const c of components) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return map;
  }, [components]);

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 68,
    right: 20,
    zIndex: 100,
    width: 260,
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 20,
    color: 'white',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxHeight: 'calc(100vh - 88px)',
    overflowY: 'auto',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: 500,
  };

  const buttonBase: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'all 0.2s',
    flex: 1,
  };

  const activeButton: React.CSSProperties = {
    ...buttonBase,
    background: '#269973',
    color: 'white',
  };

  const inactiveButton: React.CSSProperties = {
    ...buttonBase,
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#888',
  };

  return (
    <div style={panelStyle}>
      {/* Title */}
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 0.5,
          marginBottom: 16,
          color: '#e0e0e0',
          margin: 0,
          marginBlockEnd: 16,
        }}
      >
        VayuBudhi Hardware
      </h3>

      {/* View toggle */}
      <div style={sectionLabelStyle}>VIEW MODE</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          style={viewMode === 'assembled' ? activeButton : inactiveButton}
          onClick={() => {
            setViewMode('assembled');
            setSelectedId(null);
          }}
        >
          Assembled
        </button>
        <button
          style={viewMode === 'exploded' ? activeButton : inactiveButton}
          onClick={() => {
            setViewMode('exploded');
            setSelectedId(null);
          }}
        >
          Deconstructed
        </button>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'rgba(255, 255, 255, 0.06)',
          margin: '16px 0',
        }}
      />

      {/* Component list */}
      <div style={sectionLabelStyle}>COMPONENTS</div>
      <div>
        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category}>
            <div
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                color: '#555',
                marginTop: 12,
                marginBottom: 4,
                letterSpacing: 1,
                fontWeight: 500,
              }}
            >
              {category}
            </div>
            {items.map((comp) => {
              const isSelected = comp.id === selectedId;
              const isHovered = comp.id === hoveredId;

              let rowBg = 'transparent';
              if (isSelected) rowBg = 'rgba(38, 153, 115, 0.2)';
              else if (isHovered) rowBg = 'rgba(255, 255, 255, 0.03)';

              return (
                <div
                  key={comp.id}
                  onClick={() => {
                    setSelectedId(comp.id);
                    setViewMode('focused');
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.15s',
                    background: rowBg,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background =
                        'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isSelected) {
                      e.currentTarget.style.background =
                        'rgba(38, 153, 115, 0.2)';
                    } else if (isHovered) {
                      e.currentTarget.style.background =
                        'rgba(255, 255, 255, 0.03)';
                    } else {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {/* Color dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: comp.color,
                      flexShrink: 0,
                      boxShadow: isSelected
                        ? `0 0 6px ${comp.color}`
                        : 'none',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: isSelected ? 'white' : '#ccc',
                    }}
                  >
                    {comp.name}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Back to full view button */}
      {viewMode === 'focused' && (
        <button
          onClick={() => {
            setSelectedId(null);
            setViewMode('assembled');
          }}
          style={{
            width: '100%',
            padding: 8,
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#aaa',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            fontSize: 12,
            marginTop: 12,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          Back to full view
        </button>
      )}
    </div>
  );
}
