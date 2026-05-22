import { useState } from 'react';

export const ForgotKeyScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [code, setCode] = useState(['', '', '', '']);

  const goToStep = (nextStep: 'email' | 'code' | 'success') => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
    }, 400); // 400ms fade transition
  };

  const handleSendEmail = () => {
    goToStep('code');
  };

  const handleVerify = () => {
    const enteredCode = code.join('');
    // For demo: require 1234. If wrong, show error.
    if (enteredCode !== '1234') {
      setHasError(false);
      setTimeout(() => setHasError(true), 50);
    } else {
      setHasError(false);
      goToStep('success');
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    if (value && index < 3) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md h-[100svh] flex flex-col ambient-bg relative w-full overflow-hidden animate-fade-in">
      
      {/* Massive Background Security Watermark */}
      <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[500px] opacity-[0.015] pointer-events-none select-none z-0 text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>
        admin_panel_settings
      </span>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-margin-mobile w-full relative z-10 py-6">
        <div className="w-full max-w-[420px] flex flex-col items-center mt-[70px]">
          
          {/* Premium Vault / Scanner Graphic */}
          <div className="-mt-4 mb-12 relative flex items-center justify-center">
            {/* Outer decorative ring with nodes */}
            <div className={`absolute w-[150px] h-[150px] rounded-full border border-dashed transition-colors duration-1000 flex items-center justify-center ${hasError ? 'border-error/40 animate-[spin_8s_linear_infinite]' : 'border-secondary/30 animate-[spin_12s_linear_infinite]'}`}>
               <div className={`absolute top-[-3px] w-1.5 h-1.5 rounded-full ${hasError ? 'bg-error shadow-[0_0_8px_#ba1a1a]' : 'bg-secondary shadow-[0_0_8px_#005bb5]'}`}></div>
               <div className={`absolute bottom-[-3px] w-1.5 h-1.5 rounded-full ${hasError ? 'bg-error shadow-[0_0_8px_#ba1a1a]' : 'bg-secondary shadow-[0_0_8px_#005bb5]'}`}></div>
            </div>
            {/* Inner continuous ring */}
            <div className={`absolute w-[110px] h-[110px] rounded-full border transition-colors duration-700 ${hasError ? 'border-error/30 animate-[spin_4s_linear_infinite_reverse]' : 'border-secondary/20 animate-[spin_8s_linear_infinite_reverse]'}`}></div>
            
            {/* Inner glow */}
            <div className={`absolute inset-0 blur-2xl rounded-full scale-125 animate-pulse transition-colors duration-500 ${hasError ? 'bg-error/20' : (step === 'success' ? 'bg-tertiary-container/30' : 'bg-secondary/15')}`}></div>
            
            {/* Core Shield */}
            <div className={`relative w-[76px] h-[76px] rounded-full glass-card premium-shadow flex items-center justify-center border transition-all duration-500 z-10 ${hasError ? 'border-error/80 animate-[pulse-glow-error_3s_ease-in-out_infinite]' : 'border-white/90 animate-pulse-glow'}`}>
              <span className={`material-symbols-outlined text-[38px] icon-glow transition-colors duration-500 ${hasError ? 'text-error' : (step === 'success' ? 'text-tertiary-container' : 'text-secondary')}`} style={{ fontVariationSettings: '"FILL" 1' }}>
                {step === 'email' ? 'fingerprint' : step === 'code' ? (hasError ? 'gpp_bad' : 'dialpad') : 'verified'}
              </span>
            </div>
          </div>
          
          {/* Dynamic Card */}
          <section className={`glass-card w-full rounded-[24px] p-7 sm:p-8 premium-shadow flex flex-col border transition-all duration-500 relative overflow-hidden ${hasError ? 'border-error/60 bg-error-container/10 animate-shake' : 'border-white/70'}`}>
            <span className={`material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[240px] opacity-[0.02] pointer-events-none select-none z-0 transition-colors duration-500 ${hasError ? 'text-error' : 'text-primary'}`}>
              {step === 'email' ? 'vpn_key' : step === 'code' ? 'security' : 'shield_person'}
            </span>
            
            <div className={`transition-opacity duration-300 ease-in-out relative z-10 w-full ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              
              {/* Step 1: Email */}
              {step === 'email' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center">
                    <h1 className="font-headline-md text-[26px] text-primary mb-2 font-bold leading-tight">Identity Recovery</h1>
                    <p className="font-body-md text-[14px] text-on-surface-variant/80">Authorize secure reset protocol for your vault.</p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="font-label-caps text-[11px] tracking-widest text-outline font-semibold px-1 uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">lock</span> Institutional Email
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/60 group-focus-within:text-secondary transition-colors text-[20px]">mail</span>
                      <input className="w-full h-14 pl-12 pr-4 bg-white/50 border border-outline-variant/50 rounded-[14px] focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all font-body-md text-[14px] text-primary placeholder:text-outline/40 duration-500" placeholder="name@domain.com" type="email" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-2">
                    <button onClick={handleSendEmail} className="w-full h-14 button-gradient text-on-primary rounded-[14px] font-label-caps text-[13px] font-bold tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] shadow-[0_4px_12px_rgba(0,51,102,0.15)] hover:shadow-[0_6px_16px_rgba(0,51,102,0.2)] transition-all duration-200 btn-shimmer-effect">
                      DISPATCH CODE
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                    
                    {/* Integrated Return Button */}
                    <button onClick={onBack} className="w-full h-12 flex items-center justify-center gap-1.5 text-outline/80 hover:text-primary transition-colors active:scale-[0.98]">
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span className="font-label-caps text-[11px] font-bold tracking-widest uppercase mt-[1px]">Return To Login</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Verification Code */}
              {step === 'code' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center">
                    <h1 className={`font-headline-md text-[26px] mb-2 font-bold leading-tight transition-colors duration-500 ${hasError ? 'text-error' : 'text-primary'}`}>
                      {hasError ? 'Clearance Denied' : 'Security Clearance'}
                    </h1>
                    <p className={`font-body-md text-[14px] transition-colors duration-500 ${hasError ? 'text-error/80' : 'text-on-surface-variant/80'}`}>
                      {hasError ? 'Invalid sequence detected. Please retry.' : 'Enter the 4-digit protocol code sent to your email.'}
                    </p>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        id={`code-input-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        className={`w-14 h-16 text-center text-[24px] font-security-numeric font-bold bg-white/50 border rounded-[14px] outline-none transition-all duration-500 ${hasError ? 'border-error/50 focus:ring-2 focus:ring-error/10 focus:border-error text-error bg-error-container/5' : 'border-outline-variant/50 focus:ring-2 focus:ring-secondary/10 focus:border-secondary text-primary'}`}
                      />
                    ))}
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-2">
                    <button onClick={handleVerify} className={`w-full h-14 ${hasError ? 'bg-error text-on-error shadow-[0_8px_20px_rgba(186,26,26,0.15)] hover:bg-[#a01616]' : 'button-gradient text-on-primary shadow-[0_4px_12px_rgba(0,51,102,0.15)] hover:shadow-[0_6px_16px_rgba(0,51,102,0.2)]'} rounded-[14px] font-label-caps text-[13px] font-bold tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200 btn-shimmer-effect`}>
                      {hasError ? 'RETRY PROTOCOL' : 'VERIFY IDENTITY'}
                      <span className="material-symbols-outlined text-[18px]">{hasError ? 'refresh' : 'verified_user'}</span>
                    </button>
                    
                    {/* Integrated Return Button */}
                    <button onClick={() => goToStep('email')} className="w-full h-12 flex items-center justify-center gap-1.5 text-outline/80 hover:text-primary transition-colors active:scale-[0.98]">
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span className="font-label-caps text-[11px] font-bold tracking-widest uppercase mt-[1px]">Back To Email</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {step === 'success' && (
                <div className="text-center flex flex-col gap-6">
                  <div className="mx-auto w-16 h-16 bg-tertiary-container/10 rounded-full flex items-center justify-center animate-pulse-glow border border-tertiary-container/20">
                    <span className="material-symbols-outlined text-[32px] text-tertiary-container" style={{ fontVariationSettings: '"FILL" 1' }}>shield_person</span>
                  </div>
                  <div>
                    <h1 className="font-headline-md text-[26px] text-primary mb-2 font-bold leading-tight">Identity Verified</h1>
                    <p className="font-body-md text-[14px] text-on-surface-variant/80 px-2">Clearance approved. A secure reset link is in your inbox.</p>
                  </div>
                  <button onClick={onBack} className="w-full h-14 bg-gradient-to-br from-tertiary-container to-tertiary text-on-primary rounded-[14px] font-label-caps text-[13px] font-bold tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200 shadow-[0_8px_20px_rgba(202,167,71,0.2)] hover:shadow-[0_10px_24px_rgba(202,167,71,0.3)] mt-4">
                    RETURN TO SECURE LOGIN
                  </button>
                </div>
              )}
              
              {/* Trust Indicators inside card */}
              <div className="flex items-center justify-center gap-5 mt-6 opacity-40">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  <span className="text-[8px] font-label-caps tracking-widest text-primary font-bold">RSA-4096</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">enhanced_encryption</span>
                  <span className="text-[8px] font-label-caps tracking-widest text-primary font-bold">E2E ENCRYPTED</span>
                </div>
              </div>
            </div>
          </section>
          
          <div className="mt-8">
             <div className="flex items-center gap-2 justify-center opacity-60">
                <span className="material-symbols-outlined text-[14px] text-primary">policy</span>
                <p className="font-label-caps text-[10px] tracking-[0.2em] text-primary font-bold">STRICTLY FOR AUTHORIZED PERSONNEL</p>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};
