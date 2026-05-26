import React from 'react';

export const SessionInitializationScreen: React.FC = () => {
  return (
    <div className="bg-background text-on-background font-body-md min-h-[100svh] flex flex-col ambient-bg relative z-10 w-full overflow-hidden items-center justify-center">
      <div className="w-full max-w-[400px] flex flex-col items-center px-margin-mobile">
        {/* Security Core Animating Icon */}
        <div className="mb-8 relative">
          <div className="relative w-20 h-20 rounded-full glass-card premium-shadow flex items-center justify-center border border-white/90 animate-pulse-soft">
            <span className="material-symbols-outlined text-[40px] text-secondary animate-spin-slow" style={{ fontVariationSettings: '"FILL" 1' }}>
              security
            </span>
          </div>
        </div>

        {/* Status Card */}
        <div className="glass-card w-full rounded-lg p-8 premium-shadow border border-white/70 flex flex-col items-center gap-6 text-center">
          <div>
            <h1 className="font-headline-md text-[20px] mb-2 font-bold leading-tight text-primary uppercase tracking-wider">
              Initializing Session
            </h1>
            <p className="font-body-md text-[13px] text-on-surface-variant/80">
              Decrypting secure keys and establishing connection to the vault. Please wait...
            </p>
          </div>

          {/* Premium Custom Progress Loader */}
          <div className="w-full h-1.5 bg-outline-variant/20 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-secondary to-primary w-2/3 rounded-full animate-shimmer-sweep" style={{ animationDuration: '1.5s', width: '40%' }}></div>
          </div>

          <p className="font-label-caps text-[9px] tracking-[0.2em] text-outline font-extrabold uppercase">
            SECURED BY JEWELRY-GRADE ENCRYPTION
          </p>
        </div>
      </div>
    </div>
  );
};
