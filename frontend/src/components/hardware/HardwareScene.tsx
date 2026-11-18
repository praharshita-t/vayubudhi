'use client';

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  HardwareComponent,
  hardwareComponents,
} from '@/data/hardwareComponents';
import EnclosureModel from './EnclosureModel';
import InternalComponents from './InternalComponents';
import ComponentTooltip from './ComponentTooltip';
import ControlPanel from './ControlPanel';
import FocusPanel from './FocusPanel';

export type ViewMode = 'assembled' | 'exploded' | 'focused';

const GROUP_OFFSET: [number, number, number] = [-68, 0, -43];

function CameraController({
  viewMode,
  selectedComponent,
}: {
  viewMode: ViewMode;
  selectedComponent: HardwareComponent | null;
}) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const desiredTarget = useRef(new THREE.Vector3(0, 16, 0));

  useEffect(() => {
    if (viewMode === 'focused' && selectedComponent) {
      const anchor = selectedComponent.focusCenter ?? selectedComponent.position;
      const off = selectedComponent.explosionOffset;
      desiredTarget.current.set(
        anchor[0] + off[0] + GROUP_OFFSET[0],
        anchor[1] + off[1] + GROUP_OFFSET[1],
        anchor[2] + off[2] + GROUP_OFFSET[2]
      );
    } else if (viewMode === 'exploded') {
      desiredTarget.current.set(0, 26, 0);
    } else {
      desiredTarget.current.set(0, 16, 0);
    }
  }, [viewMode, selectedComponent]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTarget.current, 0.08);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={55}
      maxDistance={480}
      autoRotate={viewMode === 'assembled'}
      autoRotateSpeed={0.5}
    />
  );
}

export default function HardwareScene() {
  const [viewMode, setViewMode] = useState<ViewMode>('assembled');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const topShell = hardwareComponents.find((c) => c.id === 'top-shell')!;
  const bottomShell = hardwareComponents.find((c) => c.id === 'bottom-shell')!;
  const internalComponents = hardwareComponents.filter(
    (c) => c.geometryType !== 'mesh'
  );

  // Pointer cursor feedback when hovering 3D parts
  useEffect(() => {
    document.body.style.cursor = hoveredId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredId]);

  // Escape key exits focused view
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewMode === 'focused') {
        setSelectedId(null);
        setViewMode('exploded');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode]);

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const handleClick = useCallback(
    (id: string) => {
      if (selectedId === id) {
        setSelectedId(null);
        setViewMode('assembled');
      } else {
        setSelectedId(id);
        setViewMode('focused');
      }
    },
    [selectedId]
  );

  const selectedComponent = selectedId
    ? hardwareComponents.find((c) => c.id === selectedId) ?? null
    : null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          camera={{ position: [175, 130, 175], fov: 42 }}
          dpr={[1, 2]}
          shadows
          style={{ background: '#0a0a0f' }}
        >
          <ambientLight intensity={0.45} />
          <directionalLight
            position={[120, 220, 120]}
            intensity={1.1}
            castShadow
          />
          <directionalLight
            position={[-80, 100, -80]}
            intensity={0.35}
          />
          <Environment preset="city" background={false} />
          <ContactShadows
            position={[0, -5, 0]}
            opacity={0.4}
            blur={2}
            far={120}
          />
          <CameraController
            viewMode={viewMode}
            selectedComponent={selectedComponent}
          />

          {/* Centered group: enclosure is 136x86, so offset by half */}
          <group position={GROUP_OFFSET}>
            <Suspense fallback={null}>
              <EnclosureModel
                topShell={topShell}
                bottomShell={bottomShell}
                viewMode={viewMode}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHover={handleHover}
                onClick={handleClick}
              />
            </Suspense>
            <InternalComponents
              components={internalComponents}
              viewMode={viewMode}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHover={handleHover}
              onClick={handleClick}
            />
            <ComponentTooltip
              hoveredId={hoveredId}
              components={hardwareComponents}
              viewMode={viewMode}
            />
          </group>
        </Canvas>

        {/* Bottom-left interaction hint */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 50,
            background: 'rgba(10, 10, 15, 0.78)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#9ca3af',
            fontSize: 12,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            pointerEvents: 'none',
          }}
        >
          Drag to orbit | Scroll to zoom | Click any component to inspect | Esc to exit focus
        </div>

        {/* Control Panel overlay */}
        <ControlPanel
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          components={hardwareComponents}
          hoveredId={hoveredId}
        />
      </div>

      {/* Focus panel slides in on the right */}
      {viewMode === 'focused' && selectedComponent && (
        <FocusPanel
          component={selectedComponent}
          onClose={() => {
            setSelectedId(null);
            setViewMode('assembled');
          }}
        />
      )}
    </div>
  );
}
