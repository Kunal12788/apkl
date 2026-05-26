import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const SuperAdminDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id') || 'SUPER-001';
  
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || '');
  
  // States for Top Metrics
  const [pureGoldWeight, setPureGoldWeight] = useState(0);
  const [impureGoldWeight, setImpureGoldWeight] = useState(0);
  const [cashRemaining, setCashRemaining] = useState(0);
  const [totalDues, setTotalDues] = useState(0);
  const [upiCollection, setUpiCollection] = useState(0);

  const getGreetingName = () => {
    if (userName) return userName;
    return 'Director';
  };

  const getInitials = (name: string) => {
    if (!name) return 'SA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', userId)
          .maybeSingle();
          
        if (userData && userData.name) {
          setUserName(userData.name);
          localStorage.setItem('user_name', userData.name);
        }

        const { data: ledgerData } = await supabase.from('ledger_entries').select('*');
        if (ledgerData) {
          const totalPureGiven = ledgerData.reduce((s, e) => s + (Number(e.pure_gold_out) || 0), 0);
          const totalImpureReceived = ledgerData.reduce((s, e) => s + (Number(e.impure_gold_in) || 0), 0);
          const totalImpureRefined = ledgerData.reduce((s, e) => s + (Number(e.impure_gold_out) || 0), 0);
          
          setPureGoldWeight(100 - totalPureGiven); 
          setImpureGoldWeight(totalImpureReceived - totalImpureRefined);
          
          const pureDue = ledgerData.reduce((s, e) => s + (Number(e.pure_gold_due) || 0), 0);
          setTotalDues(pureDue);
        }

        const { data: txData } = await supabase.from('transactions').select('*');
        if (txData) {
          let cash = 0, upi = 0;
          
          txData.forEach(tx => {
            if (tx.status === 'Paid') {
              const amt = Number(tx.amount) || 0;
              if (tx.type === 'Cash') cash += amt;
              if (tx.type === 'UPI') upi += amt;
            }
          });
          
          setCashRemaining(cash); 
          setUpiCollection(upi);
        }

      } catch (err) {
        console.error('Error fetching super admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) {
    return <div className="bg-background text-on-background font-body w-full h-[100svh] flex items-center justify-center">Loading...</div>;
  }

  // Quick Action config
  const quickActions = [
    { id: 'refinery', name: 'Refinery', desc: 'Refining & Melt Hub', icon: 'local_fire_department', color: 'text-tertiary', bgHover: 'group-hover:bg-tertiary-fixed/20', action: () => alert('Refinery Module opening...') },
    { id: 'customer', name: 'Customer', desc: 'Client Directory', icon: 'groups', color: 'text-secondary', bgHover: 'group-hover:bg-secondary-fixed/20', action: () => alert('Client Directory opening...') },
    { id: 'staff', name: 'Staff Allocation', desc: 'Personnel Management', icon: 'badge', color: 'text-primary', bgHover: 'group-hover:bg-primary-fixed/20', action: () => alert('Personnel Management opening...') },
    { id: 'work', name: 'Work Profile', desc: 'Operational Metrics', icon: 'monitoring', color: 'text-tertiary', bgHover: 'group-hover:bg-tertiary-fixed/20', action: () => alert('Work Profile & Metrics opening...') },
    { id: 'ledger', name: 'Complete Ledger', desc: 'Master Ledger', icon: 'account_balance', color: 'text-secondary', bgHover: 'group-hover:bg-secondary-fixed/20', action: () => navigate('/ledger') },
    { id: 'stock', name: 'Stock Profile', desc: 'Vault Inventory', icon: 'inventory_2', color: 'text-primary', bgHover: 'group-hover:bg-primary-fixed/20', action: () => alert('Vault Inventory opening...') },
    { id: 'complain', name: 'Complain or Errors', desc: 'System Alerts & Support', icon: 'warning', color: 'text-error', bgHover: 'group-hover:bg-error-container/20', action: () => alert('System Alerts opening...') },
    { id: 'expansion', name: 'Expansion Module', desc: 'Future Feature', icon: 'extension', color: 'text-outline', bgHover: 'group-hover:bg-surface-container/80', action: () => alert('Future feature unlocking...') },
  ];

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-4 pb-40 relative">
        <div className="absolute bottom-[10%] left-[15%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>ENCRYPTED PRIVACY</div>
        <div className="absolute top-[50%] right-[5%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>TRUSTED INSTITUTION</div>
        <div className="absolute top-[150px] left-[10%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>SECURITY PROTOCOL ACTIVE</div>
        
        <header className="flex items-center justify-between py-4 mb-2 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#003366] to-[#001e40] border border-white/20 shadow-lg flex-shrink-0 flex items-center justify-center text-white font-headline text-sm font-bold">
              {getInitials(getGreetingName())}
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline text-lg font-bold text-primary leading-tight">Director Dashboard</h1>
              <p className="text-xs text-outline font-medium">Your summary for Zurich Main today.</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full glass-effect flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container transition-colors border border-outline-variant/30">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>notifications</span>
          </button>
        </header>

        {/* Gold Weight Summary (Exact match to pattern) */}
        <section className="space-y-3 relative z-10">
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Global Assets</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="luxury-card p-6 bg-white border-l-4 border-l-secondary flex flex-col justify-between h-32 relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-secondary">pentagon</span>
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Total Pure Gold</p>
                <span className="material-symbols-outlined text-secondary glow-icon text-lg">star</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline text-3xl font-extrabold text-primary">{pureGoldWeight.toFixed(2)}</span>
                <span className="text-xs font-black text-secondary">gram</span>
              </div>
            </div>
            <div className="luxury-card p-6 bg-white border-l-4 border-l-tertiary-container flex flex-col justify-between h-32 relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-tertiary-container">heap_snapshot_thumbnail</span>
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Total Impure</p>
                <span className="material-symbols-outlined text-tertiary-container glow-icon text-lg">rebase</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline text-3xl font-extrabold text-primary">{impureGoldWeight.toFixed(2)}</span>
                <span className="text-xs font-black text-tertiary-container">gram</span>
              </div>
            </div>
          </div>
        </section>

        {/* Top Section: Total Cash Remaining hero card (Exact match to pattern) */}
        <section className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-[#003366] via-[#002244] to-[#001e40] shadow-2xl border border-white/5 glow-primary z-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 right-10 w-48 h-48 bg-white/[0.02] -mb-24 -mr-12 rounded-full border border-white/10 pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-[#F6C358] font-extrabold mb-4">Total Cash Remaining</h3>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-3xl font-bold text-[#F6C358] drop-shadow-[0_0_8px_rgba(246,195,88,0.4)]">₹</span>
                <span className="font-headline text-5xl font-extrabold text-white tracking-tight">{cashRemaining.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center text-[#F6C358] border border-white/20 shadow-xl backdrop-blur-xl relative overflow-hidden">
              <span className="material-symbols-outlined text-3xl drop-shadow-[0_0_10px_rgba(246,195,88,0.5)] z-10">account_balance_wallet</span>
              <span className="material-symbols-outlined absolute text-5xl opacity-10 -bottom-2 -right-2">account_balance</span>
            </div>
          </div>
        </section>

        {/* Second Section: Side-by-side breakdown (Exact match to pattern) */}
        <section className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-white rounded-2xl p-5 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-error"></div>
            <div className="flex justify-between items-start mb-1.5">
              <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">Total Dues</p>
              <span className="material-symbols-outlined text-sm text-error opacity-60">pending_actions</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-xl font-bold text-primary">{totalDues.toFixed(2)}</span>
              <span className="text-xs font-bold text-error">g</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
            <div className="flex justify-between items-start mb-1.5">
              <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">UPI Collection</p>
              <span className="material-symbols-outlined text-sm text-secondary opacity-60">qr_code_2</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-secondary">₹</span>
              <span className="font-headline text-xl font-bold text-primary">{upiCollection.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </section>

        {/* Quick Actions / Operational Volume (Exact match to pattern) */}
        <section className="space-y-3 relative z-10">
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button 
                key={action.id}
                onClick={action.action}
                className="luxury-card p-4 flex items-center justify-between group w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-surface-container ${action.bgHover} transition-colors`}>
                    <span className={`material-symbols-outlined text-lg ${action.color}`}>{action.icon}</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-primary text-sm uppercase">{action.name}</p>
                    <p className="text-[9px] text-on-surface-variant">{action.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        </section>

      </main>

      {/* Bottom Nav Bar (Exact match to pattern) */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
        </a>
        <a onClick={() => navigate('/billing')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
        </a>
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
        </a>
        <a onClick={() => navigate('/ledger')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Ledger</span>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
