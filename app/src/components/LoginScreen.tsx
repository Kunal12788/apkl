import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import { setCachedData } from '../cache';
import { sendActivityNotification } from '../services/notificationService';
import { triggerAppleToast } from './AppleToast';
import { requestOSNotificationPermission, sendOSNotification } from '../utils/osNotifications';

const guessRoleFromEmail = (email: string) => {
  const emailLower = email.toLowerCase().trim();
  if (emailLower === 'ssrcreations41@gmail.com' || emailLower.includes('super') || emailLower.includes('director')) {
    return { id: 'SUPER-temp', name: 'Chief Super Admin', role: 'Super Admin' };
  }
  if (emailLower === 'vikram@auroradivine.com' || emailLower.includes('coll') || emailLower.includes('courier')) {
    return { id: 'COLL-temp', name: 'Collection Staff', role: 'Collection Staff' };
  }
  if (emailLower === 'k9836282432@gmail.com' || emailLower.includes('admin')) {
    return { id: 'ADMIN-temp', name: 'Branch Admin', role: 'Admin' };
  }
  return { id: 'STAFF-temp', name: 'Staff Member', role: 'Staff' };
};

export const LoginScreen: React.FC<{ onForgotKey: () => void; onLogin: () => void }> = ({ onForgotKey, onLogin }) => {
  const { login, logout, authError } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [passkey, setPasskey] = useState("");
  const [email, setEmail] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (authError) {
      setHasError(true);
      setErrorMessage(authError);
      setIsAuthenticating(false);
    }
  }, [authError]);

  // Request OS Notification permission on mount if not already granted
  useEffect(() => {
    requestOSNotificationPermission();
  }, []);

  const handleInitialize = () => {
    if (isAuthenticating) return;
    
    const emailLower = email.toLowerCase().trim();
    if (!emailLower || !passkey) {
      setHasError(true);
      setErrorMessage("Please enter both email and encryption passkey.");
      return;
    }

    setIsAuthenticating(true);
    setHasError(false);
    
    // 1. Instantly guess the role and log in optimistically (isFullyAuthenticated = false)
    const guessed = guessRoleFromEmail(emailLower);
    login({
      id: guessed.id,
      name: guessed.name,
      role: guessed.role,
      email: emailLower,
      phone: '',
      branch_id: null
    }, false);

    // 2. Instantly transition to the Dashboard (0ms delay)
    onLogin();

    // 3. Authenticate and query fresh data in the background
    (async () => {
      try {
        const { data: authData, error: authErrorRes } = await supabase.auth.signInWithPassword({
          email: emailLower,
          password: passkey,
        });

        if (authErrorRes || !authData.user) {
          logout("Invalid email address or encryption passkey.");
          return;
        }

        // Fetch actual profile, ledger, transactions, tasks, super admin ledger, refining transfers, and login settings in parallel
        const [profileRes, ledgerRes, txRes, tasksRes, saLedgerRes, transfersRes, settingsRes] = await Promise.all([
          supabase
            .from('users')
            .select('*')
            .eq('email', emailLower)
            .maybeSingle(),
          supabase.from('ledger_entries').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('super_admin_ledger').select('*').order('created_at', { ascending: false }),
          supabase.from('refining_transfers').select('*').eq('status', 'Pending').order('created_at', { ascending: false }),
          supabase.from('login_settings').select('*').eq('id', 'login_allowed').maybeSingle()
        ]);

        const userData = profileRes.data;
        const userError = profileRes.error;

        if (userError || !userData) {
          logout("Vault connection error: user profile not found.");
          return;
        }

        // Check login switch restriction (non-Super Admin roles)
        const isLoginAllowed = settingsRes.data ? settingsRes.data.value : true;
        if (userData.role !== 'Super Admin' && !isLoginAllowed) {
          await supabase.auth.signOut();
          logout("Account didn't exist.");
          return;
        }

        // Insert login activity log
        await supabase.from('staff_logs').insert({
          user_id: userData.id,
          email: userData.email || emailLower,
          name: userData.name,
          role: userData.role,
          action: 'login'
        });

        // Warm up in-memory cache so all dashboard and ledger views render instantly
        if (ledgerRes.data) {
          setCachedData('ledger_data', ledgerRes.data);
          setCachedData('ledger_entries_all', ledgerRes.data);
        }
        if (txRes.data) setCachedData('tx_data', txRes.data);
        if (tasksRes.data) setCachedData('tasks_data', tasksRes.data);
        if (saLedgerRes.data) setCachedData('super_admin_ledger_all', saLedgerRes.data);
        if (transfersRes.data) setCachedData('refining_transfers_pending', transfersRes.data);

        // Precompute Billing transactions to guarantee exactly zero delay on Dashboard elements
        if (txRes.data && tasksRes.data) {
          try {
            const { computeCollectionStaffBillingTransactions, computeStaffBillingTransactions } = await import('../utils/billingUtils');
            let filteredTx = txRes.data;
            let filteredTasks = tasksRes.data;
            
            const colStaffAllTx = computeCollectionStaffBillingTransactions(txRes.data, tasksRes.data);
            setCachedData('colstaff_billing_tx', colStaffAllTx);

            const staffAllTx = computeStaffBillingTransactions(filteredTx, filteredTasks);
            setCachedData('staff_billing_tx', staffAllTx);
          } catch (err) {
            console.error(err);
          }
        }



        // Trigger In-App Apple Toast
        triggerAppleToast('Security Alert', 'Secure Connection Established', 'login');

        // Trigger OS System Notification
        sendOSNotification(
          'AURORA Security Alert', 
          `Welcome back ${userData.name}. Connection secured.`
        );

        // Fire login notification quietly in the background
        sendActivityNotification('login', userData.email || emailLower, userData.name, userData.role);

        // Promote in-memory session to fully authenticated
        login({
          id: userData.id,
          name: userData.name,
          role: userData.role,
          email: userData.email || emailLower,
          phone: userData.phone || '',
          branch_id: userData.branch_id || null
        }, true);

      } catch (err) {
        console.error("Background authentication failed:", err);
        logout("An unexpected validation error occurred.");
      } finally {
        setIsAuthenticating(false);
      }
    })();
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-[100svh] flex flex-col ambient-bg relative z-10 w-full overflow-hidden">
      <header className="absolute top-0 w-full z-50 flex justify-between items-center px-margin-mobile h-16">
        <div className="flex items-center gap-2">
          <span className="font-display-lg text-[22px] tracking-tight text-primary font-bold"><br /></span>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center px-margin-mobile w-full relative z-10 mt-12 mb-4">
        <div className="w-full max-w-[400px] flex flex-col items-center">
          {/* Security Core Icon Section */}
          <div className="-mt-2 mb-8 relative">
            <div className={`relative w-20 h-20 rounded-full glass-card premium-shadow flex items-center justify-center border transition-colors duration-300 ${hasError ? 'border-error/80' : 'border-white/90'}`} style={{ willChange: 'transform' }}>
              <span className={`material-symbols-outlined text-[40px] transition-colors duration-300 ${hasError ? 'text-error' : 'text-secondary'}`} style={{ fontVariationSettings: '"FILL" 1' }}>{hasError ? 'gpp_bad' : 'lock'}</span>
            </div>
          </div>
          
          {/* Login Card */}
          <section className={`glass-card w-full rounded-lg p-6 premium-shadow flex flex-col gap-6 border transition-all duration-500 relative overflow-hidden ${hasError ? 'border-error/60 bg-error-container/10 animate-shake' : 'border-white/70'}`}>
            <span className={`material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[240px] opacity-[0.03] pointer-events-none select-none z-0 transition-colors duration-500 ${hasError ? 'text-error' : 'text-primary'}`}>security</span>
            <div className="text-center relative z-10">
              <h1 className={`font-headline-md text-[24px] mb-1 font-bold leading-tight transition-colors duration-500 ${hasError ? 'text-error' : 'text-primary'}`}>
                {hasError ? 'Security Alert' : 'Institutional Login'}
              </h1>
              <p className={`font-body-md text-[13px] transition-colors duration-500 ${hasError ? 'text-error/80' : 'text-on-surface-variant/80'}`}>
                {hasError ? errorMessage || 'Invalid email address or encryption passkey.' : 'Please provide your credentials to access the vault.'}
              </p>
            </div>
            
            <div className="flex flex-col gap-4 relative z-10">
              {/* Institutional ID Field */}
              <div className="flex flex-col gap-1.5">
                <label className={`font-label-caps text-[10px] tracking-widest font-semibold px-1 uppercase transition-colors duration-500 ${hasError ? 'text-error/80' : 'text-outline'}`}>Email Address</label>
                <div className="relative group">
                  <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[20px] ${hasError ? 'text-error' : 'text-outline/60 group-focus-within:text-secondary'}`}>mail</span>
                  <input 
                    className={`w-full h-12 pl-12 pr-4 bg-white/50 border rounded-DEFAULT outline-none transition-all font-body-md text-[14px] text-primary placeholder:text-outline/40 duration-500 ${hasError ? 'border-error/50 focus:ring-2 focus:ring-error/10 focus:border-error text-error bg-error-container/5' : 'border-outline-variant/50 focus:ring-2 focus:ring-secondary/10 focus:border-secondary input-sapphire-focus'}`} 
                    placeholder="name@domain.com" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Encryption Passkey Field */}
              <div className="flex flex-col gap-1.5">
                <label className={`font-label-caps text-[10px] tracking-widest font-semibold px-1 uppercase transition-colors duration-500 ${hasError ? 'text-error/80' : 'text-outline'}`}>Encryption Passkey</label>
                <div className="relative group">
                  <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[20px] ${hasError ? 'text-error' : 'text-outline/60 group-focus-within:text-secondary'}`}>key</span>
                  <input 
                    onChange={(e) => setPasskey(e.target.value)} 
                    className={`w-full h-12 pl-12 pr-12 bg-white/50 border rounded-DEFAULT outline-none transition-all font-body-md text-[14px] placeholder:text-outline/40 duration-500 ${hasError ? 'border-error/50 focus:ring-2 focus:ring-error/10 focus:border-error text-error bg-error-container/5' : 'border-outline-variant/50 focus:ring-2 focus:ring-secondary/10 focus:border-secondary input-sapphire-focus text-primary'}`} 
                    placeholder="••••••••••••" 
                    type={showPassword ? 'text' : 'password'} 
                    value={passkey} 
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ease-in-out ${hasError ? 'text-error/60 hover:text-error' : 'text-outline/60 hover:text-primary'}`}>
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 relative z-10">
              <button disabled={isAuthenticating} onClick={handleInitialize} className={`w-full h-12 ${hasError ? 'bg-error text-on-error shadow-[0_8px_20px_rgba(186,26,26,0.15)] hover:shadow-[0_10px_24px_rgba(186,26,26,0.25)] hover:bg-[#a01616]' : 'button-gradient text-on-primary'} rounded-full font-label-caps text-[12px] font-bold tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200 btn-shimmer-effect ease-in-out disabled:opacity-50`}>
                {hasError ? 'ACCESS DENIED' : 'INITIALIZE SESSION'}
                <span className="material-symbols-outlined text-[16px]">{hasError ? 'warning' : 'arrow_forward'}</span>
              </button>
              <div className="flex justify-between items-center px-2">
                <a onClick={(e) => { e.preventDefault(); onForgotKey(); }} className="font-label-caps text-[10px] font-semibold text-secondary hover:text-primary transition-all uppercase tracking-wider ease-in-out cursor-pointer">Forgot Key</a>
                <a className="font-label-caps text-[10px] font-semibold text-outline hover:text-primary transition-all uppercase tracking-wider ease-in-out" href="#">Request Access</a>
              </div>
            </div>
          </section>
          
          {/* Institutional Trust Indicator */}
          <div className="flex flex-col items-center mt-6">
            <div className="flex items-center py-2.5 px-5 rounded-full bg-white/40 backdrop-blur-md border border-white/50 premium-shadow justify-center">
              <p className="font-label-caps text-[10px] tracking-[0.15em] text-primary font-extrabold uppercase">STRATEGICALLY DIRECTED BY KUNAL</p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="w-full py-4 border-t border-outline-variant/20 flex flex-col items-center gap-2 text-center px-margin-mobile relative z-10 mt-auto bg-background/50 backdrop-blur-sm">
        <p className="font-label-caps text-[9px] tracking-[0.2em] text-tertiary font-bold">© 2024 AURORA DIVINE. SECURED BY JEWELRY-GRADE ENCRYPTION.</p>
      </footer>
    </div>
  );
};
