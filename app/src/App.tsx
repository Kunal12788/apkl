import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotKeyScreen } from './components/ForgotKeyScreen';
// Force Vercel rebuild 2
import { StaffDashboardScreen } from './components/StaffDashboardScreen';
import { StaffBillingScreen } from './components/StaffBillingScreen';
import { StaffTasksScreen } from './components/StaffTasksScreen';

const LoginWrapper = () => {
  const navigate = useNavigate();
  return <LoginScreen onForgotKey={() => navigate('/forgot')} onLogin={() => navigate('/dashboard')} />;
};

const ForgotKeyWrapper = () => {
  const navigate = useNavigate();
  return <ForgotKeyScreen onBack={() => navigate(-1)} />;
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  const handleComplete = () => {
    setFadeOut(true);
    // Wait for the fade transition to finish before unmounting
    setTimeout(() => {
      setShowSplash(false);
    }, 1200); 
  };

  return (
    <div className="w-full min-h-screen relative bg-background overflow-hidden">
      {/* Splash Screen Overlay */}
      {showSplash && (
        <div className={`absolute inset-0 z-50 transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
          <SplashScreen onComplete={handleComplete} />
        </div>
      )}

      {/* Underlying Application Screens */}
      <div className="absolute inset-0 z-0 overflow-y-auto hide-scrollbar">
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginWrapper />} />
            <Route path="/forgot" element={<ForgotKeyWrapper />} />
            <Route path="/dashboard" element={<StaffDashboardScreen />} />
            <Route path="/billing" element={<StaffBillingScreen />} />
            <Route path="/tasks" element={<StaffTasksScreen />} />
          </Routes>
        </HashRouter>
      </div>
    </div>
  );
}

export default App;
