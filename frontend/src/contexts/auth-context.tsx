'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  branchId: string | null;
  permissions?: string[] | null;
  // Tenant info (populated on login for non-super-admin)
  businessName?: string;
  businessType?: string;
  plan?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<string>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function redirectByRole(role: string): string {
  switch (role) {
    case 'super_admin': return '/admin';
    case 'owner':
    case 'admin':
    case 'accountant': return '/dashboard';
    case 'cashier': return '/pos';
    case 'employee': return '/employee';
    default: return '/dashboard';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<string> => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: userData } = res.data.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    return redirectByRole(userData.role);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data.data ?? res.data;
      const current = JSON.parse(localStorage.getItem('user') ?? '{}');
      const merged = { ...current, ...userData };
      localStorage.setItem('user', JSON.stringify(merged));
      setUser(merged);
    } catch {
      // silently fail
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
