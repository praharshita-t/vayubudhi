'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import { HardwareComponent } from '@/data/hardwareComponents';
import { ViewMode } from './HardwareScene';

interface ShellMeshProps {
  component: HardwareComponent;
  viewMode: ViewMode;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

function ShellMesh({
  component,
  viewMode,
  selectedId,
  hoveredId,
  onHover,
  onClick,
}: ShellMeshProps) {
  const rawGeometry = useLoader(STLLoader, component.meshFile!);
  const geometry = useMemo(() => {
    const geo = rawGeometry.clone();
    // Convert OpenSCAD Z-up (X:0..136, Y:0..86, Z:height) to Three.js Y-up
    // so X:0..136, Y:height, Z:0..86
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, 86);
    geo.computeVertexNormals();
    return geo;
  }, [rawGeometry]);

  const meshRef = useRef<THREE.Mesh>(null);
  const initializedRef = useRef(false);
  const targetPos = useRef(new THREE.Vector3(...component.position));

  const isHovered = hoveredId === component.id;
  const isSelected = selectedId === component.id;
  const isFocused = viewMode === 'focused';
  const isExploded = viewMode === 'exploded';
  const isFadedOut = isFocused && !isSelected;

  // Set initial position once on mount so React re-renders never reset lerp progress
  useEffect(() => {
    if (meshRef.current && !initializedRef.current) {
      meshRef.current.position.set(...component.position);
      initializedRef.current = true;
    }
  }, [component.position]);

  // Update target position when view mode changes
  useEffect(() => {
    const base = component.position;
    const offset = component.explosionOffset;
    if (isExploded || isFocused) {
      targetPos.current.set(
        base[0] + offset[0],
        base[1] + offset[1],
        base[2] + offset[2]
      );
    } else {
      targetPos.current.set(base[0], base[1], base[2]);
    }
  }, [
    viewMode,
    selectedId,
    component.position,
    component.explosionOffset,
    isExploded,
    isFocused,
  ]);

  // Smoothly lerp position each frame
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPos.current, 0.08);
    }
  });

  // Determine material properties
  const color = useMemo(() => new THREE.Color(component.color), [component.color]);
  const opacity = isFadedOut ? 0.15 : 1.0;
  const emissiveIntensity = isSelected ? 0.22 : isHovered ? 0.16 : 0;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
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
      <meshStandardMaterial
        color={color}
        roughness={0.42}
        metalness={0.12}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        transparent={isFadedOut}
        opacity={opacity}
        depthWrite={!isFadedOut}
      />
    </mesh>
  );
}

interface EnclosureModelProps {
  topShell: HardwareComponent;
  bottomShell: HardwareComponent;
  viewMode: ViewMode;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export default function EnclosureModel({
  topShell,
  bottomShell,
  viewMode,
  selectedId,
  hoveredId,
  onHover,
  onClick,
}: EnclosureModelProps) {
  return (
    <group>
      <ShellMesh
        component={topShell}
        viewMode={viewMode}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onHover={onHover}
        onClick={onClick}
      />
      <ShellMesh
        component={bottomShell}
        viewMode={viewMode}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onHover={onHover}
        onClick={onClick}
      />
    </group>
  );
}
