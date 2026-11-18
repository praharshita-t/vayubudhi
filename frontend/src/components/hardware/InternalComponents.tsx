'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HardwareComponent } from '@/data/hardwareComponents';
import { ViewMode } from './HardwareScene';

// ---------------------------------------------------------------------------
// Reusable animated part sub-component
// ---------------------------------------------------------------------------

interface AnimatedPartProps {
  component: HardwareComponent;
  viewMode: ViewMode;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  /** Override base position for multi-instance parts (screws, inserts, buttons) */
  positionOverride?: [number, number, number];
  /** Override explosion offset for multi-instance parts */
  offsetOverride?: [number, number, number];
  /** Extra rotation (radians) applied to the mesh */
  rotation?: [number, number, number];
}

function createRoundedRectGasketGeometry(
  width: number,
  depth: number,
  tubeRadius: number,
  cornerRadius = 4.5
): THREE.TubeGeometry {
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(cornerRadius, hw - 1, hd - 1);
  const pts: THREE.Vector3[] = [];
  const arcSegs = 6;
  const corners: Array<[number, number, number, number]> = [
    [hw - r, hd - r, 0, Math.PI / 2],
    [-hw + r, hd - r, Math.PI / 2, Math.PI],
    [-hw + r, -hd + r, Math.PI, (3 * Math.PI) / 2],
    [hw - r, -hd + r, (3 * Math.PI) / 2, 2 * Math.PI],
  ];
  for (const [cx, cz, startA, endA] of corners) {
    for (let i = 0; i <= arcSegs; i++) {
      const a = startA + ((endA - startA) * i) / arcSegs;
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r));
    }
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.1);
  return new THREE.TubeGeometry(curve, 96, tubeRadius, 12, true);
}

function AnimatedPart({
  component,
  viewMode,
  selectedId,
  hoveredId,
  onHover,
  onClick,
  positionOverride,
  offsetOverride,
  rotation,
}: AnimatedPartProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const initializedRef = useRef(false);
  const basePos = positionOverride ?? component.position;
  const offset = offsetOverride ?? component.explosionOffset;
  const targetPos = useRef(new THREE.Vector3(...basePos));

  const isHovered = hoveredId === component.id;
  const isSelected = selectedId === component.id;
  const isFocused = viewMode === 'focused';
  const isExploded = viewMode === 'exploded';
  const isFadedOut = isFocused && !isSelected;

  // Set initial position once on mount so re-renders never snap back to assembled
  useEffect(() => {
    if (meshRef.current && !initializedRef.current) {
      meshRef.current.position.set(basePos[0], basePos[1], basePos[2]);
      initializedRef.current = true;
    }
  }, [basePos]);

  useEffect(() => {
    if (isExploded || isFocused) {
      targetPos.current.set(
        basePos[0] + offset[0],
        basePos[1] + offset[1],
        basePos[2] + offset[2]
      );
    } else {
      targetPos.current.set(basePos[0], basePos[1], basePos[2]);
    }
  }, [
    viewMode,
    selectedId,
    basePos[0],
    basePos[1],
    basePos[2],
    offset[0],
    offset[1],
    offset[2],
    isExploded,
    isFocused,
  ]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPos.current, 0.08);
    }
  });

  const color = useMemo(() => new THREE.Color(component.color), [component.color]);
  const opacity = isFadedOut ? 0.15 : 1.0;
  const emissiveIntensity = isSelected ? 0.25 : isHovered ? 0.18 : 0;

  const gasketGeometry = useMemo(() => {
    if (component.geometryType !== 'torus') return null;
    const d = component.dimensions;
    return createRoundedRectGasketGeometry(d[0], d[1], d[2] / 2);
  }, [component.geometryType, component.dimensions]);

  // Build geometry based on type
  const geometryElement = useMemo(() => {
    const d = component.dimensions;
    switch (component.geometryType) {
      case 'box':
        return <boxGeometry args={[d[0], d[1], d[2]]} />;
      case 'cylinder':
        return <cylinderGeometry args={[d[0], d[0], d[1], 32]} />;
      case 'torus':
        return null;
      default:
        return <boxGeometry args={[d[0], d[1], d[2]]} />;
    }
  }, [component.geometryType, component.dimensions]);

  const meshRotation: [number, number, number] = rotation ?? [0, 0, 0];

  return (
    <mesh
      ref={meshRef}
      geometry={gasketGeometry ?? undefined}
      rotation={meshRotation}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(component.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(component.id);
      }}
    >
      {geometryElement}
      <meshStandardMaterial
        color={color}
        roughness={0.5}
        metalness={0.15}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        transparent={isFadedOut}
        opacity={opacity}
        depthWrite={!isFadedOut}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Multi-instance helpers
// ---------------------------------------------------------------------------

/** Corner positions for screws and brass inserts */
const CORNER_INSTANCES: Array<{
  pos: [number, number, number];
  radial: [number, number];
}> = [
  { pos: [9, 0, 9], radial: [-12, -10] },
  { pos: [127, 0, 9], radial: [12, -10] },
  { pos: [9, 0, 77], radial: [-12, 10] },
  { pos: [127, 0, 77], radial: [12, 10] },
];

/** Button positions (left and right) */
const BUTTON_INSTANCES: Array<{
  pos: [number, number, number];
  radial: [number, number];
}> = [
  { pos: [18, 0, 43], radial: [-18, 0] },
  { pos: [118, 0, 43], radial: [18, 0] },
];

function MultiInstanceParts({
  component,
  instances,
  viewMode,
  selectedId,
  hoveredId,
  onHover,
  onClick,
  rotation,
}: {
  component: HardwareComponent;
  instances: Array<{ pos: [number, number, number]; radial: [number, number] }>;
  viewMode: ViewMode;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  rotation?: [number, number, number];
}) {
  return (
    <group>
      {instances.map((inst, idx) => {
        const baseY = component.position[1];
        const instancePos: [number, number, number] = [
          inst.pos[0],
          baseY,
          inst.pos[2],
        ];
        const instanceOffset: [number, number, number] = [
          component.explosionOffset[0] + inst.radial[0],
          component.explosionOffset[1],
          component.explosionOffset[2] + inst.radial[1],
        ];
        return (
          <AnimatedPart
            key={`${component.id}-${idx}`}
            component={component}
            viewMode={viewMode}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onHover={onHover}
            onClick={onClick}
            positionOverride={instancePos}
            offsetOverride={instanceOffset}
            rotation={rotation}
          />
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main InternalComponents
// ---------------------------------------------------------------------------

interface InternalComponentsProps {
  components: HardwareComponent[];
  viewMode: ViewMode;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export default function InternalComponents({
  components,
  viewMode,
  selectedId,
  hoveredId,
  onHover,
  onClick,
}: InternalComponentsProps) {
  return (
    <group>
      {components.map((comp) => {
        // Multi-instance: screws at 4 corners
        if (comp.id === 'screws') {
          return (
            <MultiInstanceParts
              key={comp.id}
              component={comp}
              instances={CORNER_INSTANCES}
              viewMode={viewMode}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHover={onHover}
              onClick={onClick}
            />
          );
        }

        // Multi-instance: brass inserts at 4 corners
        if (comp.id === 'brass-inserts') {
          return (
            <MultiInstanceParts
              key={comp.id}
              component={comp}
              instances={CORNER_INSTANCES}
              viewMode={viewMode}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHover={onHover}
              onClick={onClick}
            />
          );
        }

        // Multi-instance: buttons at 2 positions
        if (comp.id === 'buttons') {
          return (
            <MultiInstanceParts
              key={comp.id}
              component={comp}
              instances={BUTTON_INSTANCES}
              viewMode={viewMode}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHover={onHover}
              onClick={onClick}
            />
          );
        }

        // Battery: cylinder rotated 90 degrees on Z so it lies horizontal
        if (comp.id === 'battery') {
          return (
            <AnimatedPart
              key={comp.id}
              component={comp}
              viewMode={viewMode}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHover={onHover}
              onClick={onClick}
              rotation={[0, 0, Math.PI / 2]}
            />
          );
        }

        // O-ring gasket: rounded rectangle already lies flat in XZ plane
        if (comp.geometryType === 'torus') {
          return (
            <AnimatedPart
              key={comp.id}
              component={comp}
              viewMode={viewMode}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHover={onHover}
              onClick={onClick}
            />
          );
        }

        // Default: single instance with standard orientation
        return (
          <AnimatedPart
            key={comp.id}
            component={comp}
            viewMode={viewMode}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onHover={onHover}
            onClick={onClick}
          />
        );
      })}
    </group>
  );
}
