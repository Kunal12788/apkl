// Build Trigger: Reverted OneSignal integration completely
import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { clearAllDataCaches } from './cache';
import { supabase } from './supabaseClient';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotKeyScreen } from './components/ForgotKeyScreen';
import { StaffDashboardScreen } from './components/StaffDashboardScreen';
import { StaffBillingScreen } from './components/StaffBillingScreen';
import { StaffTasksScreen } from './components/StaffTasksScreen';
import { StaffProfileScreen } from './components/StaffProfileScreen';
import { StaffLedgerScreen } from './components/StaffLedgerScreen';
import { SuperAdminLedgerScreen } from './components/SuperAdminLedgerScreen';
import { SuperAdminDashboardScreen } from './components/SuperAdminDashboardScreen';
import { CollectionStaffDashboardScreen } from './components/CollectionStaffDashboardScreen';
import { CollectionHistoryScreen } from './components/CollectionHistoryScreen';
import { CollectionStaffProfileScreen } from './components/CollectionStaffProfileScreen';
import { CollectionStaffBillingScreen } from './components/CollectionStaffBillingScreen';
import { CollectionStaffTasksScreen } from './components/CollectionStaffTasksScreen';
import { GlobalFAB } from './components/GlobalFAB';
import { GlobalChat } from './components/GlobalChat';
import { playNotificationSound } from './utils/audio';
import { SessionProvider, useSession } from './context/SessionContext';
import { SessionInitializationScreen } from './components/SessionInitializationScreen';
import { SuperAdminRefineryScreen } from './components/SuperAdminRefineryScreen';
import { SuperAdminStaffScreen } from './components/SuperAdminStaffScreen';
import { SuperAdminWorkScreen } from './components/SuperAdminWorkScreen';
import { SuperAdminStockScreen } from './components/SuperAdminStockScreen';
import { SuperAdminAlertsScreen } from './components/SuperAdminAlertsScreen';
import { SuperAdminCalculatorScreen } from './components/SuperAdminCalculatorScreen';
import { SuperAdminChatMonitorScreen } from './components/SuperAdminChatMonitorScreen';
import { ConfirmAccountScreen } from './components/ConfirmAccountScreen';

const LoginWrapper = () => {
  const navigate = useNavigate();
  return <LoginScreen onForgotKey={() => navigate('/forgot')} onLogin={() => navigate('/dashboard')} />;
};

const DashboardWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;
  
  if (user.role === 'Super Admin') {
    return <SuperAdminDashboardScreen />;
  }
  if (user.role === 'Collection Staff') {
    return <CollectionStaffDashboardScreen />;
  }
  return <StaffDashboardScreen />;
};

const BillingWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Collection Staff') {
    return <CollectionStaffBillingScreen />;
  }
  return <StaffBillingScreen />;
};

const TasksWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Collection Staff') {
    return <CollectionStaffTasksScreen />;
  }
  return <StaffTasksScreen />;
};

const ProfileWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Collection Staff') {
    return <CollectionStaffProfileScreen />;
  }
  return <StaffProfileScreen />;
};

const LedgerWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminLedgerScreen />;
  }
  return <StaffLedgerScreen />;
};

const RefineryWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminRefineryScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const StaffWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminStaffScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const WorkWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminWorkScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const StockWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminStockScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const AlertsWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin' || user.role === 'Admin') {
    return <SuperAdminAlertsScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const CalculatorWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminCalculatorScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const ChatMonitorWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminChatMonitorScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const CollectionHistoryWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;
  return <CollectionHistoryScreen />;
};

const ForgotKeyWrapper = () => {
  const navigate = useNavigate();
  return <ForgotKeyScreen onBack={() => navigate(-1)} />;
};

function AppContent() {
  const { user, loading } = useSession();
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!user) return;

    const realtimeChannel = supabase.channel('system_realtime_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload: any) => {
         const newRecord = payload.new;
         const oldRecord = payload.old;
         
         // Invalidate any local screen caches and trigger live re-fetch
         window.dispatchEvent(new CustomEvent('databaseSync'));

         if (newRecord && newRecord.status === 'Approved' && (!oldRecord || oldRecord.status !== 'Approved')) {
            if ((user.role === 'Collection Staff' || user.role === 'Staff') && (newRecord.created_by === user.id || user.role === 'Collection Staff')) {
               toast.custom((t) => (
                 <div 
                   className={`${
                     t.visible ? 'animate-fade-in' : 'opacity-0'
                   } w-11/12 max-w-sm pointer-events-auto transition-opacity duration-300`}
                   style={{ zIndex: 9999 }}
                 >
                   <div className="bg-[#003366] text-white py-3.5 px-5 rounded-2xl shadow-[0_10px_40px_rgba(0,51,102,0.3)] flex items-center gap-3 border border-white/10">
                     <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                       <span className="material-symbols-outlined text-white text-sm">notifications_active</span>
                     </div>
                     <span className="font-bold text-[13px] tracking-wide flex-1">
                       Customer {newRecord.name} approved! You can now create tasks for them.
                     </span>
                   </div>
                 </div>
               ), { duration: 5000, position: 'top-center' });
            }
         }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload: any) => {
         clearAllDataCaches();
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'transactions', payload } }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: any) => {
         clearAllDataCaches();
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'tasks', payload } }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_allocations' }, (payload: any) => {
         clearAllDataCaches();
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'stock_allocations', payload } }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, (payload: any) => {
         clearAllDataCaches();
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'ledger_entries', payload } }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deletion_requests' }, (payload: any) => {
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'deletion_requests', payload } }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
         const newMsg = payload.new;
         if (newMsg && newMsg.receiver_id === user.id && !newMsg.is_read) {
            playNotificationSound();
            if (newMsg.type === 'notification') {
               toast.success(`Notification: ${newMsg.content}`, { duration: 4000 });
            } else {
               toast(`New message!`, { 
                 icon: '💬',
                 duration: 3000 
               });
            }
         }
      })
      .subscribe();

    return () => {
       supabase.removeChannel(realtimeChannel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const checkUnreadOnLogin = async () => {
      try {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);
        
        if (count && count > 0) {
          setTimeout(() => {
            playNotificationSound();
          }, 1500);
        }
      } catch (err) {
        console.error('Error checking unread messages on login:', err);
      }
    };
    
    checkUnreadOnLogin();
  }, [user]);

  const handleComplete = () => {
    setFadeOut(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 500); 
  };

  return (
    <div className="w-full min-h-screen relative bg-background overflow-hidden">
      {showSplash && (
        <div className={`absolute inset-0 z-[100] transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
          <SplashScreen onComplete={handleComplete} />
        </div>
      )}

      {loading ? (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-background text-primary font-body-md">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
          <p className="font-label-caps text-[10px] tracking-widest text-outline">SECURING CONNECTION...</p>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 overflow-y-auto hide-scrollbar">
        <Toaster 
          position="top-center" 
          toastOptions={{
            duration: 1500, // Exactly 1.5 seconds
            style: {
              background: 'rgba(30, 30, 30, 0.65)', // More transparent for better glass effect
              backdropFilter: 'saturate(180%) blur(24px)', // Authentic Apple frosted glass
              WebkitBackdropFilter: 'saturate(180%) blur(24px)',
              color: '#ffffff',
              border: '0.5px solid rgba(255, 255, 255, 0.15)', // Extremely thin, subtle Apple border
              padding: '12px 24px', // Sleeker, more horizontal pill shape
              borderRadius: '9999px',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
              fontSize: '14.5px',
              fontWeight: 600, // Slightly bolder text
              letterSpacing: '-0.3px',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)', // Deep, soft Apple shadow
            },
            success: {
              iconTheme: {
                primary: '#32d74b', // Apple iOS 16 Success Green
                secondary: '#ffffff',
              },
            },
          }}
        />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginWrapper />} />
            <Route path="/forgot" element={<ForgotKeyWrapper />} />
            <Route path="/confirm" element={<ConfirmAccountScreen />} />
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/billing" element={<BillingWrapper />} />
            <Route path="/tasks" element={<TasksWrapper />} />
            <Route path="/collections" element={<CollectionHistoryWrapper />} />
            <Route path="/profile" element={<ProfileWrapper />} />
            <Route path="/ledger" element={<LedgerWrapper />} />
            <Route path="/refinery" element={<RefineryWrapper />} />
            <Route path="/staff" element={<StaffWrapper />} />
            <Route path="/work" element={<WorkWrapper />} />
            <Route path="/stock" element={<StockWrapper />} />
            <Route path="/alerts" element={<AlertsWrapper />} />
            <Route path="/calculator" element={<CalculatorWrapper />} />
            <Route path="/chat-monitor" element={<ChatMonitorWrapper />} />
          </Routes>
          {user && <GlobalFAB />}
          {user && <GlobalChat />}
        </HashRouter>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;
