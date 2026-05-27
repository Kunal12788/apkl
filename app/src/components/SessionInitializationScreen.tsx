import React, { useState, useEffect } from 'react';

export const SessionInitializationScreen: React.FC = () => {
  const [progressWidth, setProgressWidth] = useState('0%');
  const [stepText, setStepText] = useState('Authenticating credentials...');

  useEffect(() => {
    // Start progress bar animation
    const timer = setTimeout(() => {
      setProgressWidth('100%');
    }, 50);

    // Update status text dynamically during the 2 seconds
    const stepTimer1 = setTimeout(() => {
      setStepText('Decrypting vault keymaps...');
    }, 700);

    const stepTimer2 = setTimeout(() => {
      setStepText('Warming session sandbox...');
    }, 1400);

    return () => {
      clearTimeout(timer);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
    };
  }, []);

  return (
    <div className="bg-background text-on-background font-body-md min-h-[100svh] flex flex-col ambient-bg relative z-10 w-full overflow-hidden">
      {/* Header Pattern */}
      <header className="absolute top-0 w-full z-50 flex justify-between items-center px-margin-mobile h-16">
        <div className="flex items-center gap-2">
          <span className="font-display-lg text-[22px] tracking-tight text-primary font-bold"><br /></span>
        </div>
      </header>

      {/* Main Content Pattern */}
      <main className="flex-grow flex items-center justify-center px-margin-mobile w-full relative z-10 mt-12 mb-4">
        <div className="w-full max-w-[400px] flex flex-col items-center">
          
          {/* Security Core Icon Section Pattern */}
          <div className="-mt-2 mb-8 relative">
            <div className="relative w-20 h-20 rounded-full glass-card premium-shadow flex items-center justify-center border border-white/90 animate-pulse-soft" style={{ willChange: 'transform' }}>
              <span className="material-symbols-outlined text-[40px] text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>
                security
              </span>
            </div>
          </div>

          {/* Secure Card Pattern */}
          <section className="glass-card w-full rounded-lg p-6 premium-shadow flex flex-col gap-6 border border-white/70 relative overflow-hidden">
            <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[240px] opacity-[0.03] pointer-events-none select-none z-0 text-primary">security</span>
            
            <div className="text-center relative z-10">
              <h1 className="font-headline-md text-[24px] mb-1 font-bold leading-tight text-primary">
                Initializing Session
              </h1>
              <p className="font-body-md text-[13px] text-on-surface-variant/80">
                Verifying security tokens and decrypting vault directories.
              </p>
            </div>

            {/* Custom Linear Progress Loader Pattern */}
            <div className="flex flex-col gap-2 relative z-10 w-full">
              <div className="w-full h-1.5 bg-outline-variant/20 rounded-full overflow-hidden relative">
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-secondary to-primary rounded-full transition-all ease-linear" 
                  style={{ 
                    width: progressWidth,
                    transitionDuration: '2000ms'
                  }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-outline font-semibold tracking-wide px-1">
                <span className="animate-pulse">{stepText}</span>
                <span className="tabular-nums font-bold text-secondary">SECURE</span>
              </div>
            </div>
          </section>

          {/* Institutional Trust Indicator Pattern */}
          <div className="flex flex-col items-center mt-6">
            <div className="flex items-center py-2.5 px-5 rounded-full bg-white/40 backdrop-blur-md border border-white/50 premium-shadow justify-center">
              <p className="font-label-caps text-[10px] tracking-[0.15em] text-primary font-extrabold uppercase">STRATEGICALLY DIRECTED BY KUNAL</p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Pattern */}
      <footer className="w-full py-4 border-t border-outline-variant/20 flex flex-col items-center gap-2 text-center px-margin-mobile relative z-10 mt-auto bg-background/50 backdrop-blur-sm">
        <p className="font-label-caps text-[9px] tracking-[0.2em] text-tertiary font-bold">© 2024 AURORA DIVINE. SECURED BY JEWELRY-GRADE ENCRYPTION.</p>
      </footer>
    </div>
  );
};
