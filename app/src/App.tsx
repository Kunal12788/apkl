import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { SessionProvider, useSession } from './context/SessionContext';

const LoginWrapper = () => {
  const navigate = useNavigate();
  return <LoginScreen onForgotKey={() => navigate('/forgot')} onLogin={() => navigate('/dashboard')} />;
};

const DashboardWrapper = () => {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.id.startsWith('SUPER-')) {
    return <SuperAdminDashboardScreen />;
  }
  if (user.id.startsWith('COLL-')) {
    return <CollectionStaffDashboardScreen />;
  }
  return <StaffDashboardScreen />;
};

const BillingWrapper = () => {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;

  if (user.id.startsWith('COLL-')) {
    return <CollectionStaffBillingScreen />;
  }
  return <StaffBillingScreen />;
};

const TasksWrapper = () => {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;

  if (user.id.startsWith('COLL-')) {
    return <CollectionStaffTasksScreen />;
  }
  return <StaffTasksScreen />;
};

const ProfileWrapper = () => {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;

  if (user.id.startsWith('COLL-')) {
    return <CollectionStaffProfileScreen />;
  }
  return <StaffProfileScreen />;
};

const LedgerWrapper = () => {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;

  if (user.id.startsWith('SUPER-')) {
    return <SuperAdminLedgerScreen />;
  }
  return <StaffLedgerScreen />;
};

const CollectionHistoryWrapper = () => {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;
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

  const handleComplete = () => {
    setFadeOut(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 1200); 
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background flex flex-col items-center justify-center text-primary font-body-md">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
        <p className="font-label-caps text-[10px] tracking-widest text-outline">SECURING CONNECTION...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen relative bg-background overflow-hidden">
      {showSplash && (
        <div className={`absolute inset-0 z-50 transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
          <SplashScreen onComplete={handleComplete} />
        </div>
      )}

      <div className="absolute inset-0 z-0 overflow-y-auto hide-scrollbar">
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginWrapper />} />
            <Route path="/forgot" element={<ForgotKeyWrapper />} />
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/billing" element={<BillingWrapper />} />
            <Route path="/tasks" element={<TasksWrapper />} />
            <Route path="/collections" element={<CollectionHistoryWrapper />} />
            <Route path="/profile" element={<ProfileWrapper />} />
            <Route path="/ledger" element={<LedgerWrapper />} />
          </Routes>
          {user && <GlobalFAB />}
        </HashRouter>
      </div>
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
