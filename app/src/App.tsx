import { useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotKeyScreen } from './components/ForgotKeyScreen';
import { StaffDashboardScreen } from './components/StaffDashboardScreen';
import { StaffBillingScreen } from './components/StaffBillingScreen';
import { StaffTasksScreen } from './components/StaffTasksScreen';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'forgot' | 'staff_dashboard' | 'staff_billing' | 'staff_tasks'>('login');

  const handleComplete = () => {
    setFadeOut(true);
    // Wait for the fade transition to finish before unmounting
    setTimeout(() => {
      setShowSplash(false);
    }, 1200); 
  };

  const handleNavigate = (view: 'dashboard' | 'billing' | 'tasks') => {
    if (view === 'dashboard') setCurrentView('staff_dashboard');
    if (view === 'billing') setCurrentView('staff_billing');
    if (view === 'tasks') setCurrentView('staff_tasks');
  };

  return (
    <div className="w-full min-h-screen relative bg-background overflow-hidden">
      {/* Underlying Application Screens */}
      <div className="absolute inset-0 z-0 overflow-y-auto hide-scrollbar">
        {currentView === 'login' ? (
          <LoginScreen onForgotKey={() => setCurrentView('forgot')} onLogin={() => setCurrentView('staff_dashboard')} />
        ) : currentView === 'forgot' ? (
          <ForgotKeyScreen onBack={() => setCurrentView('login')} />
        ) : currentView === 'staff_billing' ? (
          <StaffBillingScreen onNavigate={handleNavigate} />
        ) : currentView === 'staff_tasks' ? (
          <StaffTasksScreen onNavigate={handleNavigate} />
        ) : (
          <StaffDashboardScreen onNavigate={handleNavigate} />
        )}
      </div>

      {/* Splash Screen layered on top, fading out */}
      {showSplash && (
        <div 
          className={`absolute inset-0 z-50 transition-opacity duration-[1200ms] ease-in-out ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
          style={{ pointerEvents: fadeOut ? 'none' : 'auto' }}
        >
          <SplashScreen onComplete={handleComplete} />
        </div>
      )}
    </div>
  );
}

export default App;
// Force Vercel rebuild

