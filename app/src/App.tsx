import { useState, useEffect } from 'react';
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

const LoginWrapper = () => {
  const navigate = useNavigate();
  return <LoginScreen onForgotKey={() => navigate('/forgot')} onLogin={() => navigate('/dashboard')} />;
};

const DashboardWrapper = () => {
  const userId = localStorage.getItem('user_id') || '';
  if (userId.startsWith('SUPER-')) {
    return <SuperAdminDashboardScreen />;
  }
  if (userId.startsWith('COLL-')) {
    return <CollectionStaffDashboardScreen />;
  }
  return <StaffDashboardScreen />;
};

const BillingWrapper = () => {
  const userId = localStorage.getItem('user_id') || '';
  if (userId.startsWith('COLL-')) {
    return <CollectionStaffBillingScreen />;
  }
  return <StaffBillingScreen />;
};

const TasksWrapper = () => {
  const userId = localStorage.getItem('user_id') || '';
  if (userId.startsWith('COLL-')) {
    return <CollectionStaffTasksScreen />;
  }
  return <StaffTasksScreen />;
};

const ProfileWrapper = () => {
  const userId = localStorage.getItem('user_id') || '';
  if (userId.startsWith('COLL-')) {
    return <CollectionStaffProfileScreen />;
  }
  return <StaffProfileScreen />;
};

const LedgerWrapper = () => {
  const userId = localStorage.getItem('user_id') || '';
  if (userId.startsWith('SUPER-')) {
    return <SuperAdminLedgerScreen />;
  }
  return <StaffLedgerScreen />;
};

const ForgotKeyWrapper = () => {
  const navigate = useNavigate();
  return <ForgotKeyScreen onBack={() => navigate(-1)} />;
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Optional: Add logic to check if user is already logged in
  }, []);

  const handleComplete = () => {
    setFadeOut(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 1200); 
  };

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
            <Route path="/login" element={<LoginWrapper />} />
            <Route path="/forgot" element={<ForgotKeyWrapper />} />
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/billing" element={<BillingWrapper />} />
            <Route path="/tasks" element={<TasksWrapper />} />
            <Route path="/collections" element={<CollectionHistoryScreen />} />
            <Route path="/profile" element={<ProfileWrapper />} />
            <Route path="/ledger" element={<LedgerWrapper />} />
          </Routes>
          <GlobalFAB />
        </HashRouter>
      </div>
    </div>
  );
}

export default App;
