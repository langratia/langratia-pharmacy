import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

function getWorkstation(): string {
  try {
    return window.navigator.userAgent || 'unknown';
  } catch {
    return 'unknown';
  }
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('langratia_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (!wailsApp || typeof wailsApp.Login !== 'function') {
        setError('Application backend is not available');
        setIsLoading(false);
        return false;
      }
      const workstation = getWorkstation();
      const loggedUser: User = await wailsApp.Login(username, password, workstation);
      setUser(loggedUser);
      localStorage.setItem('langratia_user', JSON.stringify(loggedUser));
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    const wailsApp = (window as any)?.go?.main?.App;
    if (wailsApp && user) {
      try {
        await wailsApp.Logout(user.id);
      } catch {
        // Silently continue even if logout tracking fails
      }
    }
    setUser(null);
    localStorage.removeItem('langratia_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
