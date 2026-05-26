import React, { useState, useEffect } from 'react';

export const SessionInitializationScreen: React.FC = () => {
  const [progressWidth, setProgressWidth] = useState('0%');
  const [stepText, setStepText] = useState('Authenticating security credentials...');

  useEffect(() => {
    // Start progress bar animation
    const timer = setTimeout(() => {
      setProgressWidth('100%');
    }, 50);

    // Update status text dynamically during the 2 seconds
    const stepTimer1 = setTimeout(() => {
      setStepText('Decrypting secure database keys...');
    }, 700);

    const stepTimer2 = setTimeout(() => {
      setStepText('Establishing secure in-memory sandbox...');
    }, 1400);

    return () => {
      clearTimeout(timer);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
    };
  }, []);

  return (
    <div className="bg-[#0b0f19] text-[#e2e8f0] font-body-md min-h-[100svh] flex flex-col relative z-10 w-full overflow-hidden items-center justify-center">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-[#003366]/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[10%] w-72 h-72 bg-[#C9A646]/5 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] flex flex-col items-center px-6 relative z-10">
        {/* Institutional Shield Badge */}
        <div className="mb-6 relative">
          <div className="relative w-16 h-16 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center justify-center animate-pulse-soft">
            <span className="material-symbols-outlined text-[32px] text-[#F6C358]" style={{ fontVariationSettings: '"FILL" 1' }}>
              shield_lock
            </span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white/[0.02] backdrop-blur-xl w-full rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col items-center gap-6 text-center">
          <div className="space-y-2">
            <h1 className="font-headline text-[15px] font-black text-white uppercase tracking-[0.25em] leading-none">
              Security Gateway
            </h1>
            <p className="text-[12px] text-outline/80 leading-relaxed font-medium">
              Initializing secure connection and decrypting vault directories.
            </p>
          </div>

          {/* Premium Custom Progress Loader */}
          <div className="w-full space-y-2">
            <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#F6C358] to-[#0059bb] rounded-full transition-all ease-linear" 
                style={{ 
                  width: progressWidth,
                  transitionDuration: '2000ms'
                }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-outline font-semibold tracking-wide">
              <span className="animate-pulse">{stepText}</span>
              <span className="tabular-nums font-bold text-[#F6C358]">SECURE</span>
            </div>
          </div>

          <div className="w-full border-t border-white/5 pt-4 flex justify-between items-center">
            <span className="text-[9px] tracking-[0.15em] text-outline/60 font-bold uppercase">SANDBOX ENGINE v2.0</span>
            <span className="text-[9px] tracking-[0.15em] text-[#F6C358]/80 font-bold uppercase">ENCRYPTED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
