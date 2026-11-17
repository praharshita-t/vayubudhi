'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'super_admin' | 'city_officer' | 'field_inspector' | 'public_viewer';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const GUEST_USER: UserProfile = {
  id: 0,
  email: 'public@vayubudhi.in',
  full_name: 'Public Viewer',
  role: 'public_viewer',
  department: 'Public Citizen',
  is_active: true,
};

const AuthContext = createContext<AuthContextType>({
  user: GUEST_USER,
  token: null,
  role: 'public_viewer',
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: async () => false,
  logout: () => {},
  hasRole: () => false,
});

const API_BASE = '';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(GUEST_USER);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore only sessions verified by the API; stored profile data is not trusted.
  useEffect(() => {
    const controller = new AbortController();
    const restore = async () => {
      try {
        const storedToken = localStorage.getItem('vayubudhi_auth_token');
        if (!storedToken) return;
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Session expired');
        const profile = await response.json();
        setToken(storedToken);
        setUser(profile);
      } catch {
        if (!controller.signal.aborted) {
          localStorage.removeItem('vayubudhi_auth_token');
          localStorage.removeItem('vayubudhi_auth_user');
          setToken(null);
          setUser(GUEST_USER);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void restore();
    return () => controller.abort();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data.detail || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
        return false;
      }

      const data = await resp.json();
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('vayubudhi_auth_token', data.access_token);
      localStorage.setItem('vayubudhi_auth_user', JSON.stringify(data.user));
      setIsLoading(false);
      return true;
    } catch (e: any) {
      setError(e.message || 'Network error connecting to auth server.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(GUEST_USER);
    setError(null);
    try {
      localStorage.removeItem('vayubudhi_auth_token');
      localStorage.removeItem('vayubudhi_auth_user');
    } catch {}
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return allowedRoles.includes(user.role);
  };

  const role: UserRole = user?.role || 'public_viewer';
  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
