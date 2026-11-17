'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, LogOut } from 'lucide-react';

export default function AuthBadge() {
  const { user, role, login, logout, isLoading, error, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="auth-badge-container">
      <button className="auth-role-pill" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
        <Shield size={14} /> {isAuthenticated ? role.replace(/_/g, ' ') : 'Staff sign in'}
      </button>
      {isOpen && <>
        <div className="auth-modal-backdrop" onClick={() => setIsOpen(false)} />
        <div className="auth-dropdown-menu" style={{ padding: 20 }}>
          {isAuthenticated ? <>
            <p>{user?.full_name}</p>
            <button onClick={() => { logout(); setIsOpen(false); }}><LogOut size={14} /> Sign out</button>
          </> : <form onSubmit={async (event) => {
            event.preventDefault();
            if (await login(email, password)) { setPassword(''); setIsOpen(false); }
          }} style={{ display: 'grid', gap: 12 }}>
            <strong>Staff sign in</strong>
            <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 8, color: '#111', background: '#fff' }} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 8, color: '#111', background: '#fff' }} /></label>
            {error && <p role="alert">{error}</p>}
            <button type="submit" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
          </form>}
        </div>
      </>}
    </div>
  );
}
