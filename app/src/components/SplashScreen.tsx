import { useEffect } from 'react';

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 7000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-on-surface overflow-hidden">
      {/* Environmental Cinematic Depth */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[15%] -right-[10%] w-[600px] h-[600px] rounded-full sapphire-leak blur-[80px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[60px]"></div>
      </div>

      {/* Main Cinematic Flow */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8 w-full">
        {/* State 1: Brand Sequence (Refined Reveal) */}
        <div className="absolute inset-0 flex items-center justify-center animate-brand pointer-events-none flex-col">
          {/* Institutional Background Ornaments */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {/* Grid Overlay */}
            <svg className="absolute w-full h-full opacity-[0.03] text-primary" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <pattern height="10" id="grid" patternUnits="userSpaceOnUse" width="10">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.1"></path>
                </pattern>
              </defs>
              <rect fill="url(#grid)" height="100%" width="100%"></rect>
            </svg>
            {/* Floating Institutional Symbols - GPU accelerated */}
            <div className="absolute top-[20%] left-[15%] animate-float-1" style={{ willChange: 'transform' }}>
              <span className="material-symbols-outlined text-primary text-5xl">shield</span>
            </div>
            <div className="absolute bottom-[20%] right-[15%] animate-float-2" style={{ willChange: 'transform' }}>
              <span className="material-symbols-outlined text-tertiary text-6xl">lock</span>
            </div>
          </div>
          {/* Central Brand Lockup */}
          <div className="flex flex-col items-center gap-6">
            {/* Refined Logo Icon */}
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-container to-primary"></div>
              <span className="material-symbols-outlined text-tertiary-fixed text-5xl relative z-10" style={{ fontVariationSettings: '"FILL" 1' }}>diamond</span>
              {/* Inner Glow */}
              <div className="absolute inset-0 border-[0.5px] border-white/20 rounded-full"></div>
            </div>
            {/* Wordmark */}
            <h1 className="font-headline font-bold text-primary uppercase relative text-4xl lg:text-6xl tracking-[0.6em]" style={{ textShadow: '0 0 30px rgba(213, 227, 255, 0.3)' }}>
              AURORA
            </h1>
          </div>
        </div>

        {/* State 2 & 3: Welcome Content */}
        <div className="flex flex-col items-center text-center gap-12 animate-content w-full max-w-lg">
          {/* Brand Identity Minimal */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-xl">
              <span className="material-symbols-outlined text-tertiary-fixed text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>diamond</span>
            </div>
          </div>
          {/* Welcome Text */}
          <div className="space-y-6">
            <h2 className="font-headline font-bold text-primary text-4xl lg:text-5xl leading-tight tracking-tight">
              Welcome to<br />Secure Operations
            </h2>
            <div className="flex flex-col items-center space-y-6">
              <div className="label-institutional text-on-surface-variant/70 uppercase">Institutional Custody</div>
              <div className="gold-divider"></div>
              <div className="space-y-2">
                <p className="text-on-surface-variant font-medium text-lg opacity-80">
                  Precision-driven gold operations
                </p>
                <p className="text-on-surface-variant font-medium text-lg opacity-80">
                  Enterprise-grade inventory control
                </p>
              </div>
            </div>
          </div>
          {/* Trust Icons Grid */}
          <div className="grid grid-cols-4 gap-8 pt-4">
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-2xl">shield_person</span>
              <span className="label-institutional text-[8px]">SECURITY</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-2xl">account_balance</span>
              <span className="label-institutional text-[8px]">ASSETS</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-2xl">public</span>
              <span className="label-institutional text-[8px]">GLOBAL</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-2xl">domain</span>
              <span className="label-institutional text-[8px]">INSTITUTIONAL</span>
            </div>
          </div>
          {/* Contextual Footer */}
          <div className="flex items-center justify-center gap-2 label-institutional text-on-surface-variant/40 pt-4">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>verified_user</span>
            SECURE OPERATIONAL ENVIRONMENT
          </div>
        </div>
      </main>
    </div>
  );
};
