import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

async function getWorkstation(): Promise<string> {
  try {
    const wailsApp = (window as any)?.go?.main?.App;
    if (wailsApp?.GetWorkstationName) {
      const name = await wailsApp.GetWorkstationName();
      if (name) return name;
    }
  } catch {
    // fallback
  }
  return window.navigator.userAgent || 'unknown';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Save minimal session ID to localStorage. Role is NEVER trusted from localStorage.
interface SessionStore {
  id: number;
}

function saveSession(user: User): void {
  const session: SessionStore = {
    id: user.id,
  };
  sessionStorage.setItem('langratia_session', JSON.stringify(session));
}

function loadSavedUserId(): number | null {
  const saved = sessionStorage.getItem('langratia_session');
  if (!saved) return null;
  try {
    const session: SessionStore = JSON.parse(saved);
    return session.id || null;
  } catch {
    return null;
  }
}

function clearSession(): void {
  sessionStorage.removeItem('langratia_session');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-validate saved session with backend on startup
  useEffect(() => {
    const validateSavedSession = async () => {
      const savedUserId = loadSavedUserId();
      if (!savedUserId) {
        setIsLoading(false);
        return;
      }

      try {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.ValidateSession === 'function') {
          const validUser: User = await wailsApp.ValidateSession(savedUserId);
          setUser(validUser);
          saveSession(validUser);
        } else {
          clearSession();
        }
      } catch {
        setUser(null);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };
    validateSavedSession();
  }, []);

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
      const workstation = await getWorkstation();
      const loggedUser: User = await wailsApp.Login(username, password, workstation);
      setUser(loggedUser);
      saveSession(loggedUser);
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Login failed. Please check your credentials.';
      setError(msg);
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
    clearSession();
  };

  // Clear session on visibility change (e.g., Windows lock screen, fast user switching)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Don't logout, but could optionally clear sensitive in-memory state
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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
