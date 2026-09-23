'use client';
import React, { useState } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Shield, ShieldCheck, UserCheck, Key, LogOut, ChevronDown, Check, Lock, Building } from 'lucide-react';

const ROLE_METADATA: Record<UserRole, { label: string; badgeClass: string; icon: any; desc: string }> = {
  super_admin: {
    label: 'Super Admin',
    badgeClass: 'role-badge-admin',
    icon: Key,
    desc: 'Central technical control, fleet OTA updates, unrestricted access',
  },
  city_officer: {
    label: 'City Officer (GHMC)',
    badgeClass: 'role-badge-officer',
    icon: ShieldCheck,
    desc: 'Authorized to dispatch OR-Tools sprinkler fleet & enforcement routes',
  },
  field_inspector: {
    label: 'Field Inspector',
    badgeClass: 'role-badge-inspector',
    icon: UserCheck,
    desc: 'Ward patrol route viewing & photo evidence logging',
  },
  public_viewer: {
    label: 'Public Citizen',
    badgeClass: 'role-badge-public',
    icon: Shield,
    desc: 'Read-only ambient air quality exploration & health advisories',
  },
};

export default function AuthBadge() {
  const { user, role, switchDemoRole, logout, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const currentMeta = ROLE_METADATA[role] || ROLE_METADATA.public_viewer;
  const CurrentIcon = currentMeta.icon;

  return (
    <div className="auth-badge-container">
      <button
        className={`auth-role-pill ${currentMeta.badgeClass}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Click to switch user role or sign in"
      >
        <CurrentIcon size={14} className="auth-pill-icon" />
        <span className="auth-pill-label">{currentMeta.label}</span>
        <ChevronDown size={12} className={`auth-pill-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="auth-modal-backdrop" onClick={() => setIsOpen(false)} />
          <div className="auth-dropdown-menu">
            <div className="auth-dropdown-header">
              <div className="auth-user-info">
                <div className="auth-user-name">{user?.full_name || 'Guest User'}</div>
                <div className="auth-user-email">{user?.email || 'public@vayubudhi.in'}</div>
              </div>
              <span className={`auth-dropdown-tag ${currentMeta.badgeClass}`}>
                {currentMeta.label}
              </span>
            </div>

            <div className="auth-dropdown-divider" />

            <div className="auth-dropdown-section-title">
              1-Click Role Switcher (RBAC Demo)
            </div>

            <div className="auth-role-options">
              {(Object.keys(ROLE_METADATA) as UserRole[]).map((r) => {
                const meta = ROLE_METADATA[r];
                const Icon = meta.icon;
                const isSelected = r === role;

                return (
                  <button
                    key={r}
                    disabled={isLoading}
                    className={`auth-role-item ${isSelected ? 'selected' : ''}`}
                    onClick={async () => {
                      await switchDemoRole(r);
                      setIsOpen(false);
                    }}
                  >
                    <div className="auth-role-item-left">
                      <div className={`auth-role-icon-wrap ${meta.badgeClass}`}>
                        <Icon size={14} />
                      </div>
                      <div className="auth-role-item-text">
                        <div className="auth-role-item-name">{meta.label}</div>
                        <div className="auth-role-item-desc">{meta.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check size={16} className="auth-check-icon" />}
                  </button>
                );
              })}
            </div>

            <div className="auth-dropdown-divider" />

            <div className="auth-dropdown-footer">
              <button
                className="auth-logout-btn"
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
              >
                <LogOut size={14} />
                <span>Reset to Public Guest</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
