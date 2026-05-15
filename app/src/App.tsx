import { useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotKeyScreen } from './components/ForgotKeyScreen';
import { StaffDashboardScreen } from './components/StaffDashboardScreen';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'forgot' | 'staff_dashboard'>('login');

  const handleComplete = () => {
    setFadeOut(true);
    // Wait for the fade transition to finish before unmounting
    setTimeout(() => {
      setShowSplash(false);
    }, 1200); 
  };

  return (
    <div className="w-full min-h-screen relative bg-background overflow-hidden">
      {/* Underlying Application Screens */}
      <div className="absolute inset-0 z-0 overflow-y-auto hide-scrollbar">
        {currentView === 'login' ? (
          <LoginScreen onForgotKey={() => setCurrentView('forgot')} onLogin={() => setCurrentView('staff_dashboard')} />
        ) : currentView === 'forgot' ? (
          <ForgotKeyScreen onBack={() => setCurrentView('login')} />
        ) : (
          <StaffDashboardScreen />
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
