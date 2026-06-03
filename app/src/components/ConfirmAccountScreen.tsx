import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const ConfirmAccountScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  
  const [status, setStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  // Extract token and type from URL parameters
  useEffect(() => {
    // If using hash router, location.search might be empty if the URL is /#/confirm?token=...
    // Let's parse the full URL or location.search
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    const actionType = queryParams.get('type') || 'signup';
    
    // Also check hash fragment just in case standard supabase magic links are used temporarily
    const hashParams = new URLSearchParams(location.hash.replace('#', '?'));
    const hashToken = hashParams.get('token_hash');
    const hashType = hashParams.get('type');

    setTokenHash(token || hashToken || null);
    setType(actionType || hashType || 'signup');
  }, [location]);

  const handleConfirm = async () => {
    if (!tokenHash) {
      setStatus('error');
      setErrorMessage('Invalid confirmation link. No token found in URL.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // @ts-ignore - The 'signup' type is valid in verifyOtp depending on Supabase version
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: (type as any) || 'signup'
      });

      if (error) {
        throw new Error(error.message);
      }

      setStatus('success');
      
    } catch (err: any) {
      console.error('Confirmation error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to confirm account.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-body">
      {/* Premium Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-md w-full bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] relative z-10 overflow-hidden transform transition-all duration-500">
        
        {/* Header Ribbon */}
        <div className="h-2 w-full bg-gradient-to-r from-primary via-amber-500 to-primary"></div>

        <div className="p-8 sm:p-12 flex flex-col items-center text-center">
          
          {/* Status Icon */}
          <div className="mb-8 relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-inner relative z-10 border-4 border-white transition-all duration-500
              ${status === 'success' ? 'bg-emerald-50 text-emerald-500' : 
                status === 'error' ? 'bg-error/10 text-error' : 
                'bg-primary/5 text-primary'}`}>
              <span className="material-symbols-outlined text-4xl">
                {status === 'success' ? 'verified' : 
                 status === 'error' ? 'error' : 
                 status === 'loading' ? 'hourglass_empty' : 'mark_email_read'}
              </span>
            </div>
            {/* Glow effect */}
            <div className={`absolute inset-0 rounded-full blur-xl opacity-50 z-0 transition-all duration-500
              ${status === 'success' ? 'bg-emerald-400' : 
                status === 'error' ? 'bg-error' : 
                'bg-primary'}`}></div>
          </div>

          {/* Pending State */}
          {status === 'pending' && (
            <div className="animate-fade-in w-full">
              <h1 className="font-headline font-black text-3xl text-primary tracking-tight mb-3">
                Secure Verification
              </h1>
              <p className="text-sm text-outline font-medium mb-10 leading-relaxed px-4">
                You have been invited to join the Aurora Divine Gold network. Please confirm your identity to securely activate your account.
              </p>
              
              <button 
                onClick={handleConfirm}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm uppercase tracking-[0.2em] py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all active:scale-[0.98] flex justify-center items-center gap-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span>Confirm Account</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {status === 'loading' && (
            <div className="animate-fade-in w-full py-6">
              <h1 className="font-headline font-black text-2xl text-primary tracking-tight mb-2">
                Verifying...
              </h1>
              <p className="text-sm text-outline font-medium">Securing cryptographic connection.</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="animate-fade-in w-full">
              <h1 className="font-headline font-black text-3xl text-primary tracking-tight mb-3">
                Access Granted
              </h1>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-10">
                <p className="text-emerald-700 font-bold text-sm">Thanks for confirming!</p>
                <p className="text-xs text-emerald-600/80 mt-1">Your account has been successfully verified and activated.</p>
              </div>
              
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-3"
              >
                <span>Proceed to Login</span>
                <span className="material-symbols-outlined text-lg">login</span>
              </button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="animate-fade-in w-full">
              <h1 className="font-headline font-black text-3xl text-error tracking-tight mb-3">
                Verification Failed
              </h1>
              <div className="bg-error/5 border border-error/20 rounded-2xl p-4 mb-10 text-left">
                <p className="text-error font-bold text-sm mb-1">Error Details:</p>
                <p className="text-xs text-error/80 break-words">{errorMessage}</p>
              </div>
              
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-surface-container hover:bg-outline-variant/30 text-primary font-bold text-sm uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-[0.98]"
              >
                Return to Login
              </button>
            </div>
          )}

        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-8 flex flex-col items-center opacity-40 relative z-0">
        <span className="material-symbols-outlined text-3xl text-primary mb-1">diamond</span>
        <p className="font-headline font-black text-primary tracking-[0.3em] text-[10px] uppercase">
          Aurora Divine Gold
        </p>
      </div>
    </div>
  );
};
