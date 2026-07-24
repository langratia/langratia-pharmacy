import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
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
      // Check if Wails JS bindings are available
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp && typeof wailsApp.Login === 'function') {
        const loggedUser: User = await wailsApp.Login(username, password);
        setUser(loggedUser);
        localStorage.setItem('langratia_user', JSON.stringify(loggedUser));
        setIsLoading(false);
        return true;
      } else {
        // Dev fallback for browser testing when wails dev server is running without native IPC
        if (username === 'admin' && password === 'admin123') {
          const devAdmin: User = {
            id: 1,
            username: 'admin',
            role: 'admin',
            full_name: 'System Administrator',
            created_at: new Date().toISOString()
          };
          setUser(devAdmin);
          localStorage.setItem('langratia_user', JSON.stringify(devAdmin));
          setIsLoading(false);
          return true;
        } else if (username === 'cashier' && password === 'cashier123') {
          const devCashier: User = {
            id: 2,
            username: 'cashier',
            role: 'cashier',
            full_name: 'Pharmacy Cashier',
            created_at: new Date().toISOString()
          };
          setUser(devCashier);
          localStorage.setItem('langratia_user', JSON.stringify(devCashier));
          setIsLoading(false);
          return true;
        } else {
          setError('Invalid username or password');
          setIsLoading(false);
          return false;
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
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
