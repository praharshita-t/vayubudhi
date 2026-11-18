'use client';

import React from 'react';
import { Html } from '@react-three/drei';
import { HardwareComponent } from '@/data/hardwareComponents';
import { ViewMode } from './HardwareScene';

interface ComponentTooltipProps {
  hoveredId: string | null;
  components: HardwareComponent[];
  viewMode: ViewMode;
}

export default function ComponentTooltip({
  hoveredId,
  components,
  viewMode,
}: ComponentTooltipProps) {
  if (!hoveredId) return null;

  const comp = components.find((c) => c.id === hoveredId);
  if (!comp) return null;

  // Compute display position (visual center + explosion offset when exploded/focused)
  const isExploded = viewMode === 'exploded' || viewMode === 'focused';
  const anchor = comp.focusCenter ?? comp.position;
  const posX = anchor[0] + (isExploded ? comp.explosionOffset[0] : 0);
  const posY = anchor[1] + (isExploded ? comp.explosionOffset[1] : 0);
  const posZ = anchor[2] + (isExploded ? comp.explosionOffset[2] : 0);

  return (
    <Html
      position={[posX, posY + 10, posZ]}
      distanceFactor={150}
      style={{
        pointerEvents: 'none' as const,
        transform: 'translateY(-20px)',
      }}
    >
      <div
        style={{
          background: 'rgba(26, 26, 46, 0.95)',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          whiteSpace: 'nowrap',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#ffffff',
          }}
        >
          {comp.name}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#aaaaaa',
            marginTop: '4px',
            maxWidth: '280px',
            whiteSpace: 'normal',
          }}
        >
          {comp.description}
        </div>
      </div>
    </Html>
  );
}
