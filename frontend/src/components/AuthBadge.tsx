'use client';
import React, { useState, FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Shield, ShieldCheck, UserCheck, Key, LogOut, ChevronDown, Lock, UserPlus, LogIn } from 'lucide-react';

const ROLE_METADATA: Record<UserRole, { label: string; badgeClass: string; icon: any }> = {
  super_admin: {
    label: 'Super Admin',
    badgeClass: 'role-badge-admin',
    icon: Key,
  },
  city_officer: {
    label: 'City Officer',
    badgeClass: 'role-badge-officer',
    icon: ShieldCheck,
  },
  field_inspector: {
    label: 'Field Inspector',
    badgeClass: 'role-badge-inspector',
    icon: UserCheck,
  },
  public_viewer: {
    label: 'Public Citizen',
    badgeClass: 'role-badge-public',
    icon: Shield,
  },
};

type AuthTab = 'login' | 'register';

export default function AuthBadge() {
  const pathname = usePathname();
  const { user, role, isAuthenticated, login, register, logout, isLoading, error, clearError } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<AuthTab>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const currentMeta = ROLE_METADATA[role] || ROLE_METADATA.public_viewer;
  const CurrentIcon = currentMeta.icon;

  const close = () => {
    setIsOpen(false);
    clearError();
  };

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await login(loginEmail.trim(), loginPassword);
    if (ok) {
      setLoginPassword('');
      close();
    }
  };

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await register({
      full_name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      phone: regPhone.trim() || undefined,
    });
    if (ok) {
      setRegPassword('');
      close();
    }
  };

  if (pathname !== '/') return null;

  return (
    <div className="auth-badge-container">
      <button
        className={`auth-role-pill ${currentMeta.badgeClass}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) clearError();
        }}
        title={isAuthenticated ? 'Account menu' : 'Sign in or register'}
      >
        <CurrentIcon size={14} className="auth-pill-icon" />
        <span className="auth-pill-label">
          {isAuthenticated ? (user?.full_name?.split(' ')[0] || currentMeta.label) : 'Sign in'}
        </span>
        <ChevronDown size={12} className={`auth-pill-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="auth-modal-backdrop" onClick={close} />
          <div className="auth-dropdown-menu auth-dropdown-menu-wide">
            <div className="auth-dropdown-header">
              <div className="auth-user-info">
                <div className="auth-user-name">
                  {isAuthenticated ? user?.full_name : 'Welcome'}
                </div>
                <div className="auth-user-email">
                  {isAuthenticated
                    ? user?.email
                    : 'Sign in with staff credentials or create a public account'}
                </div>
              </div>
              {isAuthenticated && (
                <span className={`auth-dropdown-tag ${currentMeta.badgeClass}`}>
                  {currentMeta.label}
                </span>
              )}
            </div>

            <div className="auth-dropdown-divider" />

            {isAuthenticated ? (
              <div className="auth-signed-in-panel">
                {user?.assigned_city && (
                  <div className="auth-meta-row">
                    <span className="auth-meta-label">City</span>
                    <span className="auth-meta-value">{user.assigned_city}</span>
                  </div>
                )}
                {user?.department && (
                  <div className="auth-meta-row">
                    <span className="auth-meta-label">Department</span>
                    <span className="auth-meta-value">{user.department}</span>
                  </div>
                )}
                <p className="auth-hint">
                  Role is assigned by administrators. It cannot be changed from this menu.
                </p>
                <button
                  className="auth-logout-btn auth-logout-btn-full"
                  onClick={() => {
                    logout();
                    close();
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <>
                <div className="auth-tab-row">
                  <button
                    type="button"
                    className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                    onClick={() => {
                      setTab('login');
                      clearError();
                    }}
                  >
                    <LogIn size={14} />
                    Login
                  </button>
                  <button
                    type="button"
                    className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
                    onClick={() => {
                      setTab('register');
                      clearError();
                    }}
                  >
                    <UserPlus size={14} />
                    Register
                  </button>
                </div>

                {error && <div className="auth-form-error">{error}</div>}

                {tab === 'login' ? (
                  <form className="auth-form" onSubmit={onLogin}>
                    <label className="auth-label">
                      Email
                      <input
                        className="auth-input"
                        type="email"
                        autoComplete="username"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="auth-label">
                      Password
                      <input
                        className="auth-input"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </label>
                    <button className="auth-submit-btn" type="submit" disabled={isLoading}>
                      <Lock size={14} />
                      {isLoading ? 'Signing in…' : 'Sign in'}
                    </button>
                    <p className="auth-hint">
                      Officers and admins use pre-provisioned accounts. Citizens can register
                      on the Register tab.
                    </p>
                  </form>
                ) : (
                  <form className="auth-form" onSubmit={onRegister}>
                    <label className="auth-label">
                      Full name
                      <input
                        className="auth-input"
                        type="text"
                        autoComplete="name"
                        required
                        minLength={2}
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Your name"
                      />
                    </label>
                    <label className="auth-label">
                      Email
                      <input
                        className="auth-input"
                        type="email"
                        autoComplete="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="auth-label">
                      Phone <span className="auth-optional">(optional)</span>
                      <input
                        className="auth-input"
                        type="tel"
                        autoComplete="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 …"
                      />
                    </label>
                    <label className="auth-label">
                      Password
                      <input
                        className="auth-input"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 8 characters"
                      />
                    </label>
                    <button className="auth-submit-btn" type="submit" disabled={isLoading}>
                      <UserPlus size={14} />
                      {isLoading ? 'Creating account…' : 'Create public account'}
                    </button>
                    <p className="auth-hint">
                      New accounts are public citizens only. Officer and admin roles are
                      assigned by administrators — there is no role selector here.
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
