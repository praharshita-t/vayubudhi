'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'super_admin' | 'city_officer' | 'field_inspector' | 'public_viewer';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string | null;
  phone?: string | null;
  assigned_city?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  clearError: () => void;
}

const GUEST_USER: UserProfile = {
  id: 0,
  email: '',
  full_name: 'Guest',
  role: 'public_viewer',
  department: null,
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
  register: async () => false,
  logout: () => {},
  hasRole: () => false,
  clearError: () => {},
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function extractError(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(GUEST_USER);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const persistSession = (accessToken: string, profile: UserProfile) => {
    setToken(accessToken);
    setUser(profile);
    localStorage.setItem('vayubudhi_auth_token', accessToken);
    localStorage.setItem('vayubudhi_auth_user', JSON.stringify(profile));
  };

  // Restore stored session on mount; re-validate with /auth/me when possible
  useEffect(() => {
    const restore = async () => {
      try {
        const storedToken = localStorage.getItem('vayubudhi_auth_token');
        const storedUser = localStorage.getItem('vayubudhi_auth_user');
        if (!storedToken || !storedUser) {
          setUser(GUEST_USER);
          setToken(null);
          return;
        }

        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        const meResp = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (meResp.ok) {
          const profile = await meResp.json();
          persistSession(storedToken, profile);
        } else {
          localStorage.removeItem('vayubudhi_auth_token');
          localStorage.removeItem('vayubudhi_auth_user');
          setToken(null);
          setUser(GUEST_USER);
        }
      } catch {
        setUser(GUEST_USER);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
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
        setError(extractError(data.detail, 'Authentication failed. Please verify credentials.'));
        setIsLoading(false);
        return false;
      }

      const data = await resp.json();
      persistSession(data.access_token, data.user);
      setIsLoading(false);
      return true;
    } catch (e: any) {
      setError(e.message || 'Network error connecting to auth server.');
      setIsLoading(false);
      return false;
    }
  };

  const register = async (payload: RegisterPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          full_name: payload.full_name,
          phone: payload.phone || undefined,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(extractError(data.detail, 'Registration failed.'));
        setIsLoading(false);
        return false;
      }

      const data = await resp.json();
      persistSession(data.access_token, data.user);
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
    if (!user || !token) return false;
    if (user.role === 'super_admin') return true;
    return allowedRoles.includes(user.role);
  };

  const role: UserRole = user?.role || 'public_viewer';
  // Any successful login/register with a real user id counts as authenticated
  const isAuthenticated = !!token && !!user && user.id > 0;

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
        register,
        logout,
        hasRole,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
