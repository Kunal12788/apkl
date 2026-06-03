import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { sendActivityNotification } from '../services/notificationService';

export interface UserSession {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

interface SessionContextType {
  user: UserSession | null;
  login: (userData: UserSession, isFullyAuthenticated?: boolean) => void;
  logout: (errorMsg?: string) => void;
  loading: boolean;
  isFullyAuthenticated: boolean;
  authError: string | null;
  setAuthError: (error: string | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isFullyAuthenticated, setFullyAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const userEmail = session.user.email?.toLowerCase().trim();
          if (userEmail) {
            const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('email', userEmail)
              .maybeSingle();

            if (!error && userData) {
              setUser({
                id: userData.id,
                name: userData.name,
                role: userData.role,
                email: userData.email,
                phone: userData.phone || ''
              });
              setFullyAuthenticated(true);
            }
          }
        }
      } catch (err) {
        console.error('Error checking active session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkActiveSession();
  }, []);

  const login = (userData: UserSession, isAuth = true) => {
    setUser(userData);
    setFullyAuthenticated(isAuth);
    setAuthError(null);
  };

  const logout = async (errorMsg?: string) => {
    if (user) {
      // Fire and forget logout notification quietly in the background
      sendActivityNotification('logout', user.email, user.name, user.role);
    }
    setUser(null);
    setFullyAuthenticated(false);
    setAuthError(errorMsg || null);
    await supabase.auth.signOut();
  };

  return (
    <SessionContext.Provider value={{ user, login, logout, loading, isFullyAuthenticated, authError, setAuthError }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
