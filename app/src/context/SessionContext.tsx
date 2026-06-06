import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { sendActivityNotification } from '../services/notificationService';
import { triggerAppleToast } from '../components/AppleToast';
import { sendOSNotification } from '../utils/osNotifications';

export interface UserSession {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  branch_id: string | null;
}

interface SessionContextType {
  user: UserSession | null;
  login: (userData: UserSession, isFullyAuthenticated?: boolean) => void;
  logout: (errorMsg?: string, isSilent?: boolean) => void;
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
              // Restrict active session restore if login toggle is disabled
              if (userData.role !== 'Super Admin') {
                const { data: settingsData } = await supabase
                  .from('login_settings')
                  .select('value')
                  .eq('id', 'login_allowed')
                  .maybeSingle();
                
                const isLoginAllowed = settingsData ? settingsData.value : true;
                if (!isLoginAllowed) {
                  await supabase.auth.signOut();
                  setAuthError("Account didn't exist.");
                  setLoading(false);
                  return;
                }
              }

              setUser({
                id: userData.id,
                name: userData.name,
                role: userData.role,
                email: userData.email,
                phone: userData.phone || '',
                branch_id: userData.branch_id || null
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

  const logout = async (errorMsg?: string, isSilent = false) => {
    if (user) {
      if (!isSilent) {
        // Trigger In-App Apple Toast
        triggerAppleToast('Security Alert', 'Session Terminated Securely', 'logout');

        // Trigger OS System Notification
        sendOSNotification(
          'AURORA Security Alert', 
          `Logged out successfully. Goodbye ${user.name}.`
        );

        // Fire and forget logout notification quietly in the background
        sendActivityNotification('logout', user.email, user.name, user.role);
      }

      // Log logout event in database (always log for audit logs)
      await supabase.from('staff_logs').insert({
        user_id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        action: 'logout'
      });
    }
    setUser(null);
    setFullyAuthenticated(false);
    setAuthError(isSilent ? null : (errorMsg || null));
    await supabase.auth.signOut();
  };

  // Background polling to instantly sync profile changes (role, branch) and enforce access rules
  useEffect(() => {
    if (!user || !isFullyAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        // 1. Fetch current user from database
        const { data: dbUser, error: dbErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!dbErr && !dbUser) {
          // User has been deleted from public.users
          await logout(undefined, true);
          return;
        }

        if (dbUser) {
          // 2. Enforce login toggle restrictions for non-Super Admins
          if (dbUser.role !== 'Super Admin') {
            const { data: settingsData } = await supabase
              .from('login_settings')
              .select('value')
              .eq('id', 'login_allowed')
              .maybeSingle();
            
            const isLoginAllowed = settingsData ? settingsData.value : true;
            if (!isLoginAllowed) {
              await logout(undefined, true);
              return;
            }
          }

          // 3. Dynamically sync role/branch/profile updates
          if (
            dbUser.role !== user.role ||
            dbUser.name !== user.name ||
            (dbUser.phone || '') !== user.phone ||
            dbUser.branch_id !== user.branch_id
          ) {
            setUser({
              id: dbUser.id,
              name: dbUser.name,
              role: dbUser.role,
              email: dbUser.email,
              phone: dbUser.phone || '',
              branch_id: dbUser.branch_id || null
            });
          }
        }
      } catch (err) {
        console.error('Background user session polling error:', err);
      }
    }, 1200); // Check every 1.2 seconds for sub-2-second responsive updates

    return () => clearInterval(interval);
  }, [user, isFullyAuthenticated]);

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
