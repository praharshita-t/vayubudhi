'use client';
import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Map, FlaskConical, TrendingUp, Shield,
  FileText, Building2, Menu, PanelLeftClose,
} from 'lucide-react';
import { useCityContext } from '@/context/CityContext';

const navItems = [
  { id: 'home', label: 'Home', href: '/', icon: Home },
  { id: 'live-map', label: 'Live Map', href: '/live-map', icon: Map },
  { id: 'simulate', label: 'Simulate', href: '/simulate', icon: FlaskConical },
  { id: 'forecast', label: 'Forecast', href: '/forecast', icon: TrendingUp },
  { id: 'enforce', label: 'Enforce', href: '/enforce', icon: Shield },
  { id: 'advisory', label: 'Advisory', href: '/advisory', icon: FileText },
  { id: 'compare', label: 'Compare Cities', href: '/compare', icon: Building2 },
];

export default function Sidebar() {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pathname = usePathname();
  const { activeCity } = useCityContext();

  const expanded = pinned || hovered;

  return (
    <>
      {/* Invisible spacer that pushes main content when pinned */}
      <div className={`sidebar-spacer${pinned ? ' pinned' : ''}`} />

      {/* Actual sidebar panel (fixed position) */}
      <nav
        className={`sidebar-panel${expanded ? ' expanded' : ''}${pinned ? ' pinned' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Header: toggle + brand */}
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={() => setPinned(!pinned)}
            aria-label={pinned ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {pinned ? <PanelLeftClose size={20} /> : <Menu size={20} />}
          </button>
          <div className={`sidebar-brand${expanded ? ' visible' : ''}`}>
            <img src="/logo-emblem.png" alt="VayuBudhi" className="sidebar-logo-img" />
            <div className="sidebar-brand-text-col">
              <div className="sidebar-brand-title-row">
                <span className="sidebar-brand-name">VayuBudhi</span>
                <span className="sidebar-since-badge">SINCE 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <div className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`sidebar-nav-item${isActive ? ' active' : ''}`}
                title={!expanded ? item.label : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`sidebar-nav-label${expanded ? ' visible' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Footer: current city indicator */}
        <div className={`sidebar-footer${expanded ? ' visible' : ''}`}>
          <div className="sidebar-city-indicator">
            <div className="sidebar-city-dot" />
            <span className="sidebar-city-name">{activeCity}</span>
          </div>
        </div>
      </nav>
    </>
  );
}
