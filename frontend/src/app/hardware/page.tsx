'use client';

import dynamic from 'next/dynamic';

const HardwareScene = dynamic(
  () => import('@/components/hardware/HardwareScene'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0a0f',
          color: '#aaa',
          fontFamily: 'sans-serif',
        }}
      >
        Loading Hardware Digital Twin...
      </div>
    ),
  }
);

export default function HardwarePage() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0f' }}>
      <HardwareScene />
    </div>
  );
}
