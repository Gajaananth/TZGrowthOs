import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getToken,
  setToken,
  removeToken,
  loginUser,
  registerUser,
  fetchMe,
} from '../services/api';

export interface User {
  id: string;
  email: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  business_type: string;
  city: string;
  default_language: string;
  brand_tone: string;
  goals?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  business: Business | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (details: {
    email: string;
    password: string;
    businessName?: string;
    businessType?: string;
    city?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('growthos_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [business, setBusiness] = useState<Business | null>(() => {
    try {
      const saved = localStorage.getItem('growthos_business');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  // If we already have a cached token + user, start with isLoading = false immediately!
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const t = getToken();
    const u = localStorage.getItem('growthos_user');
    return Boolean(t && !u);
  });

  const refreshProfile = async () => {
    const currentToken = getToken();
    if (!currentToken) {
      setUser(null);
      setBusiness(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchMe();
      if (res.success && res.user) {
        setUser(res.user);
        setBusiness(res.business || null);
        localStorage.setItem('growthos_user', JSON.stringify(res.user));
        if (res.business) {
          localStorage.setItem('growthos_business', JSON.stringify(res.business));
        }
      } else if (res.error?.includes('401') || res.error?.includes('Unauthorized')) {
        // Only wipe on true 401
        removeToken();
        setUser(null);
        setBusiness(null);
        setTokenState(null);
      }
    } catch (err) {
      console.error('Session refresh warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginUser({ email, password });
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
        setBusiness(res.business || null);
        localStorage.setItem('growthos_user', JSON.stringify(res.user));
        if (res.business) {
          localStorage.setItem('growthos_business', JSON.stringify(res.business));
        }
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (details: {
    email: string;
    password: string;
    businessName?: string;
    businessType?: string;
    city?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await registerUser(details);
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
        setBusiness(res.business || null);
        localStorage.setItem('growthos_user', JSON.stringify(res.user));
        if (res.business) {
          localStorage.setItem('growthos_business', JSON.stringify(res.business));
        }
        return { success: true };
      }
      return { success: false, error: res.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeToken();
    setTokenState(null);
    setUser(null);
    setBusiness(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
