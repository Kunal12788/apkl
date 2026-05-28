import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';
import { fitText } from '../utils';

interface RefiningTransfer {
  id: string;
  branchId: string;
  branchName: string;
  impureGoldSent: number;
  calculatedPureGold: number;
  dateSent: string;
  status: 'Pending' | 'Processed';
  refinedPureAchieved?: number;
}

// DB Mapper helper functions
const mapDbToTransfer = (db: any): RefiningTransfer => ({
  id: db.id,
  branchId: db.branch_id,
  branchName: db.branch_name,
  impureGoldSent: Number(db.impure_gold_sent || 0),
  calculatedPureGold: Number(db.calculated_pure_gold || (db.impure_gold_sent * 0.92)), // Fallback to 92% expected yield for legacy entries
  dateSent: db.date_sent,
  status: db.status,
  refinedPureAchieved: db.refined_pure_achieved ? Number(db.refined_pure_achieved) : undefined
});

export interface SuperAdminLedgerEntry {
  id: string;
  date: string;
  isoDate: string;
  type: string;
  branchName?: string;
  pureGoldChange: number;
  impureGoldChange: number;
  calculatedPureGold: number;
  cashChange: number;
  details: string;
}

const mapDbToSaEntry = (db: any): SuperAdminLedgerEntry => ({
  id: db.id,
  date: db.date,
  isoDate: db.iso_date,
  type: db.type,
  branchName: db.branch_name,
  pureGoldChange: Number(db.pure_gold_change || 0),
  impureGoldChange: Number(db.impure_gold_change || 0),
  calculatedPureGold: Number(db.calculated_pure_gold || 0),
  cashChange: Number(db.cash_change || 0),
  details: db.details
});

export const SuperAdminRefineryScreen: React.FC = () => {
  const navigate = useNavigate();

  const cachedTransfers = getCachedData('refining_transfers_all');
  const cachedSaLedger = getCachedData('super_admin_ledger_all');
  
  const initialTransfers = cachedTransfers ? cachedTransfers.map(mapDbToTransfer) : [];
  const initialSaLedger = cachedSaLedger ? cachedSaLedger.map(mapDbToSaEntry) : [];

  const [transfers, setTransfers] = useState<RefiningTransfer[]>(initialTransfers);
  const [saLedger, setSaLedger] = useState<SuperAdminLedgerEntry[]>(initialSaLedger);
  const [loading, setLoading] = useState<boolean>(cachedTransfers === null || cachedSaLedger === null);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Processed'>('All');
  
  // Choose between Current Session (current) and Refining History (past)
  const [currentView, setCurrentView] = useState<'current' | 'past'>('current');
  
  // Db-synchronized Refinery States
  const [refineryStatus, setRefineryStatus] = useState<'idle' | 'refining'>('idle');
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(null);

  // Melt Processing State
  const [netPureAchieved, setNetPureAchieved] = useState('');

  // Timer countdown state in seconds (2 minutes = 120 seconds)
  const [timerRemaining, setTimerRemaining] = useState<number>(0);

  const updateRefineryStatusInDb = async (status: 'idle' | 'refining', startVal?: number | null) => {
    try {
      setLoading(true);
      const timerStart = status === 'refining' ? (startVal || Date.now()) : null;
      
      const { error } = await supabase
        .from('refinery_state')
        .update({
          status: status,
          timer_start: timerStart,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'current_session');

      if (error) throw error;

      setRefineryStatus(status);
      setTimerStartTimestamp(timerStart);
    } catch (err) {
      console.error('Error updating refinery status:', err);
      alert('Failed to update refinery status on database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refineryStatus !== 'refining' || !timerStartTimestamp) {
      setTimerRemaining(0);
      return;
    }

    const getRemaining = () => {
      const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
      return Math.max(0, 120 - elapsed);
    };

    const initialRemaining = getRemaining();
    setTimerRemaining(initialRemaining);

    if (initialRemaining <= 0) return;

    const interval = setInterval(() => {
      const rem = getRemaining();
      setTimerRemaining(rem);
      if (rem <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [refineryStatus, timerStartTimestamp]);

  const fetchTransfers = async () => {
    try {
      const [transfersRes, ledgerRes, stateRes] = await Promise.all([
        supabase
          .from('refining_transfers')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('super_admin_ledger')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('refinery_state')
          .select('*')
          .eq('id', 'current_session')
          .single()
      ]);

      if (transfersRes.error) throw transfersRes.error;
      if (ledgerRes.error) throw ledgerRes.error;
      if (stateRes.error) throw stateRes.error;

      if (transfersRes.data) {
        setCachedData('refining_transfers_all', transfersRes.data);
        const pendingData = transfersRes.data.filter(t => t.status === 'Pending');
        setCachedData('refining_transfers_pending', pendingData);
        setTransfers(transfersRes.data.map(mapDbToTransfer));
      }

      if (ledgerRes.data) {
        setCachedData('super_admin_ledger_all', ledgerRes.data);
        setSaLedger(ledgerRes.data.map(mapDbToSaEntry));
      }

      if (stateRes.data) {
        setRefineryStatus(stateRes.data.status);
        setTimerStartTimestamp(stateRes.data.timer_start ? Number(stateRes.data.timer_start) : null);
      }
    } catch (err) {
      console.error('Error fetching refining data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();

    // Polling interval of 3 seconds to keep multiple devices in sync
    const interval = setInterval(() => {
      fetchTransfers();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const pendingTransfersInQueue = transfers.filter(t => t.status === 'Pending');
  const pendingImpureGold = Math.max(0, saLedger.reduce((s, e) => s + e.impureGoldChange, 0));
  const pendingExpectedPure = Math.max(0, saLedger.reduce((s, e) => s + e.calculatedPureGold, 0));

  const handleProcessBatchRefining = async (e: React.FormEvent) => {
    e.preventDefault();
    const achieved = parseFloat(netPureAchieved);
    if (isNaN(achieved) || achieved <= 0) return;
    if (pendingImpureGold <= 0) return;

    try {
      setLoading(true);
      const totalExpected = pendingExpectedPure;
      const totalImpure = pendingImpureGold;

      // Update each pending transfer with proportional pure achieved
      const updates = pendingTransfersInQueue.map(transfer => {
        let proportionalPure = 0;
        if (totalExpected > 0) {
          proportionalPure = (transfer.calculatedPureGold / totalExpected) * achieved;
        } else if (totalImpure > 0) {
          proportionalPure = (transfer.impureGoldSent / totalImpure) * achieved;
        } else {
          proportionalPure = achieved / pendingTransfersInQueue.length;
        }

        return supabase
          .from('refining_transfers')
          .update({ status: 'Processed', refined_pure_achieved: proportionalPure })
          .eq('id', transfer.id);
      });

      await Promise.all(updates);

      // Insert Refining transaction into Super Admin Ledger
      const branchNames = pendingTransfersInQueue.length > 0
        ? Array.from(new Set(pendingTransfersInQueue.map(t => t.branchName))).join(', ')
        : 'Stock Adjustment';
      const newEntry = {
        id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        date: 'Today',
        iso_date: new Date().toISOString().split('T')[0],
        type: 'Refining Yield',
        branch_name: 'Corporate Vault',
        pure_gold_change: achieved,
        impure_gold_change: -totalImpure,
        calculated_pure_gold: -totalExpected,
        cash_change: 0,
        details: `Batch refined ${totalImpure.toFixed(3)}g Impure Gold from branches (${branchNames}). Yielded ${achieved.toFixed(3)}g Pure Gold.`
      };

      const { error: ledgerError } = await supabase
        .from('super_admin_ledger')
        .insert([newEntry]);

      if (ledgerError) throw ledgerError;

      setNetPureAchieved('');
      await updateRefineryStatusInDb('idle', null);
      await fetchTransfers();
    } catch (err) {
      console.error('Error processing batch refining:', err);
      alert('Error processing batch refining. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics Calculations (Past History)
  const processedTransfers = transfers.filter(t => t.status === 'Processed');
  const totalImpureSent = transfers.reduce((s, t) => s + t.impureGoldSent, 0);
  const totalExpectedPure = transfers.reduce((s, t) => s + t.calculatedPureGold, 0);
  
  const totalActualPure = processedTransfers.reduce((s, t) => s + (t.refinedPureAchieved || 0), 0);
  const processedExpectedPure = processedTransfers.reduce((s, t) => s + t.calculatedPureGold, 0);
  const variance = totalActualPure - processedExpectedPure;
  
  const recoveryRate = processedExpectedPure > 0 ? (totalActualPure / processedExpectedPure) * 100 : 0;

  const filteredTransfers = transfers.filter(t => {
    if (activeTab === 'Pending') return t.status === 'Pending';
    if (activeTab === 'Processed') return t.status === 'Processed';
    return true;
  });

  const fmtG = (n: number) => `${n.toFixed(3)}g`;

  if (loading) {
    return (
      <div className="bg-background text-on-background font-body min-h-[100svh] flex flex-col items-center justify-center ambient-bg relative z-10 w-full overflow-hidden">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
        <p className="font-label-caps text-[10px] tracking-widest text-outline">Syncing Refinery Logs...</p>
      </div>
    );
  }

  return (
    <div className="bg-background ambient-bg text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 max-w-5xl mx-auto pt-8 pb-32 relative space-y-6">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-2 animate-fade-in">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Refinery Hub</h1>
            <p className="text-xs text-outline font-medium">Super Admin Master Refining Log & Processing Terminal</p>
          </div>
        </header>

        {/* View Toggle Segmented Control */}
        <div className="flex bg-[#003366]/5 p-1 rounded-2xl border border-outline-variant/10 relative z-10 w-full sm:max-w-xs animate-fade-in">
          <button
            onClick={() => setCurrentView('current')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${
              currentView === 'current'
                ? 'bg-primary text-white shadow-md'
                : 'text-outline hover:text-primary'
            }`}
          >
            Current Session
          </button>
          <button
            onClick={() => setCurrentView('past')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${
              currentView === 'past'
                ? 'bg-primary text-white shadow-md'
                : 'text-outline hover:text-primary'
            }`}
          >
            Refining History
          </button>
        </div>

        {currentView === 'current' ? (
          <div className="space-y-6 relative z-10 animate-fade-in">
            {/* Active Melt Queue Summary */}
            <div className="luxury-card overflow-hidden bg-white border border-outline-variant/10 shadow-lg p-6 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-tertiary/10 to-transparent rounded-full blur-2xl"></div>
              <h3 className="font-label text-[11px] uppercase tracking-[0.25em] text-outline font-black mb-4">Active Melt Queue</h3>
              
              {pendingImpureGold <= 0 ? (
                <div className="py-8 text-center">
                  <span className="material-symbols-outlined text-outline/40 text-5xl mb-3">science</span>
                  <p className="text-sm text-outline font-bold">Queue is Empty</p>
                  <p className="text-xs text-outline/60 mt-1">Awaiting dispatches from branches.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 rounded-2xl p-4 border border-outline-variant/10">
                      <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-1">Total Impure in Queue</p>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline text-2xl font-extrabold text-primary">{pendingImpureGold.toFixed(3)}</span>
                        <span className="text-xs font-bold text-outline">g</span>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 rounded-2xl p-4 border border-outline-variant/10">
                      <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-1">Expected Pure Gold</p>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline text-2xl font-extrabold text-secondary">{pendingExpectedPure.toFixed(3)}</span>
                        <span className="text-xs font-bold text-outline">g</span>
                      </div>
                    </div>
                  </div>

                  {/* Queue Items Mini List */}
                  {pendingTransfersInQueue.length > 0 && (
                    <div className="space-y-2 border-t border-outline-variant/10 pt-4">
                      <p className="text-[8px] font-bold text-outline uppercase tracking-widest mb-2">Pending transfers list</p>
                      <div className="max-h-40 overflow-y-auto hide-scrollbar space-y-2">
                        {pendingTransfersInQueue.map(item => (
                          <div key={item.id} className="flex justify-between items-center bg-slate-50/30 p-3 rounded-xl border border-outline-variant/5">
                            <div>
                              <p className="text-xs font-bold text-primary">{item.branchName}</p>
                              <p className="text-[8px] text-outline font-medium">ID: {item.id} • Sent: {item.dateSent}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-[#755b00]">{item.impureGoldSent.toFixed(3)}g</p>
                              <p className="text-[8px] text-outline uppercase tracking-wider font-bold">Impure</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Refinery Control Dashboard */}
            {pendingImpureGold > 0 && (
              <div className="luxury-card bg-white p-6 border border-outline-variant/10 shadow-lg space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="font-label text-[11px] uppercase tracking-[0.25em] text-outline font-black">Refinery Process Panel</h3>
                  {refineryStatus === 'refining' && (
                    <span className="flex items-center gap-1 text-[8.5px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200/50 animate-pulse">
                      <span className="material-symbols-outlined text-[11px]">local_fire_department</span>
                      Melting Active
                    </span>
                  )}
                </div>

                {refineryStatus === 'idle' ? (
                  <div className="text-center py-4 space-y-5">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-outline-variant/20">
                      <span className="material-symbols-outlined text-4xl text-outline/60">local_fire_department</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">Ready to Start Refining</p>
                      <p className="text-xs text-outline/80 mt-1 max-w-sm mx-auto">
                        This will start the melt process for {pendingTransfersInQueue.length > 0 ? `all ${pendingTransfersInQueue.length} pending transfers` : 'the queue'} totaling {pendingImpureGold.toFixed(3)}g impure gold.
                      </p>
                    </div>
                    <button
                      onClick={() => updateRefineryStatusInDb('refining')}
                      className="w-full py-4 bg-[#755b00] hover:bg-[#5a4600] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">local_fire_department</span>
                      Start Refining
                    </button>
                  </div>
                ) : timerRemaining > 0 ? (
                  <div className="text-center py-6 space-y-6 animate-fade-in">
                    {/* SVG circular progress timer */}
                    <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#755b00]/10 to-transparent blur-md"></div>
                      
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="72"
                          cy="72"
                          r="60"
                          className="stroke-slate-100"
                          strokeWidth="6"
                          fill="transparent"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="60"
                          className="stroke-[#755b00] animate-gold-glow"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={376.99}
                          strokeDashoffset={376.99 * (1 - timerRemaining / 120)}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>

                      {/* Countdown Text */}
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="font-mono text-2xl font-black text-[#755b00] tracking-wider animate-pulse-soft">
                          {(() => {
                            const mins = Math.floor(timerRemaining / 60);
                            const secs = timerRemaining % 60;
                            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <span className="material-symbols-outlined text-[10px] text-[#755b00] animate-flame">local_fire_department</span>
                          <span className="text-[7.5px] uppercase font-black tracking-widest text-outline">melting</span>
                        </div>
                      </div>
                    </div>

                    {/* Step descriptions */}
                    <div className="space-y-1.5 px-4">
                      <p className="text-sm font-bold text-primary animate-pulse-soft">
                        {(() => {
                          if (timerRemaining > 90) return "Crucible Pre-heating Active";
                          if (timerRemaining > 60) return "Melting Impure Gold Stock";
                          if (timerRemaining > 30) return "Separating Slag & Impurities";
                          return "Pouring Refined Pure Gold";
                        })()}
                      </p>
                      
                      {/* Sub-step indicator dots */}
                      <div className="flex justify-center gap-1.5 py-1">
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${timerRemaining > 90 ? 'bg-[#755b00]' : 'bg-slate-200'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${timerRemaining <= 90 && timerRemaining > 60 ? 'bg-[#755b00]' : 'bg-slate-200'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${timerRemaining <= 60 && timerRemaining > 30 ? 'bg-[#755b00]' : 'bg-slate-200'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${timerRemaining <= 30 ? 'bg-[#755b00]' : 'bg-slate-200'}`}></span>
                      </div>
                      
                      <p className="text-xs text-outline/80 leading-relaxed max-w-xs mx-auto">
                        Processing {pendingImpureGold.toFixed(3)}g of impure gold. The input field will become available once the melt is finished.
                      </p>
                    </div>

                    {/* Heat waves */}
                    <div className="flex justify-center gap-2 text-[#755b00]/20 h-6 overflow-hidden">
                      <span className="material-symbols-outlined text-sm animate-heat-wave" style={{ animationDelay: '0s' }}>air</span>
                      <span className="material-symbols-outlined text-sm animate-heat-wave" style={{ animationDelay: '0.3s' }}>air</span>
                      <span className="material-symbols-outlined text-sm animate-heat-wave" style={{ animationDelay: '0.6s' }}>air</span>
                    </div>

                    {/* Cancel Melt button during timer */}
                    <div className="border-t border-outline-variant/10 pt-4 px-2">
                      <button 
                        type="button"
                        onClick={() => updateRefineryStatusInDb('idle')}
                        className="w-full py-3 bg-surface-container hover:bg-surface-container/80 text-primary font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
                      >
                        Cancel Melt
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleProcessBatchRefining} className="space-y-6">
                    
                    {/* Summary row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 rounded-2xl p-4 border border-outline-variant/10">
                        <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-1">Impure Weight Melted</p>
                        <div className="flex items-baseline gap-1">
                          <span className="font-headline text-lg font-extrabold text-primary">{pendingImpureGold.toFixed(3)}</span>
                          <span className="text-[10px] font-bold text-outline">g</span>
                        </div>
                      </div>
                      <div className="bg-slate-50/50 rounded-2xl p-4 border border-outline-variant/10">
                        <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-1">Expected Pure Gold</p>
                        <div className="flex items-baseline gap-1">
                          <span className="font-headline text-lg font-extrabold text-secondary">{pendingExpectedPure.toFixed(3)}</span>
                          <span className="text-[10px] font-bold text-outline">g</span>
                        </div>
                      </div>
                    </div>

                    {/* Actual Pure Input Field */}
                    <div className="relative group">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Actual Pure Gold Obtained (g)</span>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        placeholder="e.g. 110.150"
                        value={netPureAchieved}
                        onChange={e => setNetPureAchieved(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-secondary transition-all"
                      />
                    </div>

                    {/* Live computation metrics cards */}
                    {(() => {
                      const enteredVal = parseFloat(netPureAchieved);
                      const hasValue = !isNaN(enteredVal) && enteredVal > 0;
                      const liveRecoveryRate = hasValue && pendingExpectedPure > 0 ? (enteredVal / pendingExpectedPure) * 100 : 0;
                      const liveVariance = hasValue ? enteredVal - pendingExpectedPure : 0;

                      return (
                        <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/10 pt-5 animate-fade-in">
                          {/* Live Recovery Rate Card */}
                          <div className="bg-slate-50/50 rounded-2xl p-4 border border-outline-variant/10 relative overflow-hidden flex flex-col justify-between h-24">
                            <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em]">Melt Yield Recovery</p>
                            <div className="flex items-baseline gap-1 mt-2">
                              <span className="font-headline text-2xl font-extrabold text-primary">
                                {hasValue ? `${liveRecoveryRate.toFixed(2)}%` : '—'}
                              </span>
                              {hasValue && <span className="text-[9px] font-black text-secondary">yield</span>}
                            </div>
                          </div>

                          {/* Live Variance Card */}
                          <div className="bg-slate-50/50 rounded-2xl p-4 border border-outline-variant/10 relative overflow-hidden flex flex-col justify-between h-24">
                            <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em]">Variance / Loss</p>
                            <div className="flex items-baseline gap-1 mt-2">
                              <span className={`font-headline text-2xl font-extrabold ${!hasValue ? 'text-primary' : liveVariance >= 0 ? 'text-emerald-600' : 'text-error'}`}>
                                {hasValue ? `${liveVariance >= 0 ? '+' : ''}${liveVariance.toFixed(3)}g` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Action buttons */}
                    <div className="flex gap-3 border-t border-outline-variant/10 pt-5">
                      <button 
                        type="button"
                        onClick={() => {
                          updateRefineryStatusInDb('idle');
                          setNetPureAchieved('');
                        }}
                        className="flex-1 py-3.5 bg-surface-container text-primary font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
                      >
                        Cancel Melt
                      </button>
                      <button 
                        type="submit" 
                        disabled={!netPureAchieved || parseFloat(netPureAchieved) <= 0 || isNaN(parseFloat(netPureAchieved))}
                        className="flex-1 py-3.5 bg-[#755b00] disabled:bg-[#755b00]/40 disabled:text-white/60 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">done_all</span>
                        Confirm Yield
                      </button>
                    </div>

                  </form>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Global Refinery Metrics */}
            <section className="space-y-3 relative z-10">
              <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Refinery Analytics</h3>
              <div className="grid grid-cols-2 gap-4">
                
                {/* Total Impure Processed */}
                <div className="luxury-card p-4 sm:p-5 bg-white border-l-4 border-l-[#755b00] flex flex-col justify-between h-28 relative overflow-hidden shadow-md">
                  <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-[#755b00]">local_fire_department</span>
                  <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Total Impure Sent</p>
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-2">
                    <span className="font-headline font-extrabold text-primary" style={fitText(totalImpureSent.toFixed(2), 7, 1.75, 1.15)}>{totalImpureSent.toFixed(2)}</span>
                    <span className="text-[10px] font-black text-[#755b00]">gram</span>
                  </div>
                </div>

                {/* Expected vs Actual Pure */}
                <div className="luxury-card p-4 sm:p-5 bg-white border-l-4 border-l-secondary flex flex-col justify-between h-28 relative overflow-hidden shadow-md">
                  <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-secondary">star</span>
                  <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Melt Yield Recovery</p>
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-2">
                    <span className="font-headline font-extrabold text-primary" style={fitText(recoveryRate > 0 ? `${recoveryRate.toFixed(1)}%` : '0%', 6, 1.75, 1.15)}>{recoveryRate > 0 ? `${recoveryRate.toFixed(1)}%` : '100%'}</span>
                    <span className="text-[10px] font-black text-secondary">yield</span>
                  </div>
                </div>
              </div>

              {/* Expanded Summary Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card flex flex-col justify-between">
                  <p className="text-[8px] font-bold text-outline uppercase tracking-[0.1em]">Expected Pure</p>
                  <p className="font-headline text-sm font-bold text-primary mt-1" style={fitText(totalExpectedPure.toFixed(2), 8, 1.05, 0.85)}>{totalExpectedPure.toFixed(2)}g</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card flex flex-col justify-between">
                  <p className="text-[8px] font-bold text-outline uppercase tracking-[0.1em]">Actual Obtained</p>
                  <p className="font-headline text-sm font-bold text-emerald-600 mt-1" style={fitText(totalActualPure.toFixed(2), 8, 1.05, 0.85)}>{totalActualPure.toFixed(2)}g</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card flex flex-col justify-between">
                  <p className="text-[8px] font-bold text-outline uppercase tracking-[0.1em]">Variance / Loss</p>
                  <p className={`font-headline text-sm font-bold mt-1 ${variance < 0 ? 'text-error' : 'text-emerald-600'}`} style={fitText((variance >= 0 ? '+' : '') + variance.toFixed(2), 8, 1.05, 0.85)}>
                    {variance >= 0 ? '+' : ''}{variance.toFixed(2)}g
                  </p>
                </div>
              </div>
            </section>

            {/* Tab Filters */}
            <div className="flex gap-2 border-b border-outline-variant/20 pb-2">
              {(['All', 'Pending', 'Processed'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                    activeTab === tab 
                      ? 'bg-[#755b00]/10 text-[#755b00]' 
                      : 'text-outline hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#755b00] rounded-full"></span>
                  )}
                </button>
              ))}
            </div>

            {/* Transfers Log History */}
            <section className="space-y-4 relative z-10">
              <p className="label-institutional text-outline uppercase px-1">Refinery Log Entries</p>
              {filteredTransfers.length === 0 ? (
                <div className="luxury-card p-12 bg-slate-50 border border-outline-variant/10 text-center rounded-[2rem]">
                  <span className="material-symbols-outlined text-slate-400 text-5xl mb-3">science</span>
                  <p className="text-sm text-outline font-bold">No transfers in this category found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransfers.map(item => {
                    const itemVariance = item.refinedPureAchieved ? (item.refinedPureAchieved - item.calculatedPureGold) : null;
                    return (
                      <div key={item.id} className="luxury-card p-5 bg-white border border-outline-variant/10 relative overflow-hidden shadow-sm flex flex-col gap-4">
                        
                        {/* Top Row: Title, Date, Status */}
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-[#755b00]">local_fire_department</span>
                              <p className="font-bold text-sm text-primary">{item.branchName}</p>
                            </div>
                            <p className="text-[8px] uppercase tracking-widest font-black text-outline mt-1">Sent: {item.dateSent} • ID: {item.id}</p>
                          </div>
                          <div>
                            <span className={`text-[8.5px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border ${
                              item.status === 'Pending' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200/50' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Metrics display */}
                        <div className="grid grid-cols-3 gap-3 px-4 py-3.5 bg-slate-50/50 rounded-2xl border border-outline-variant/10">
                          <div className="flex flex-col items-center text-center">
                            <p className="text-[11px] font-black text-primary" style={fitText(fmtG(item.impureGoldSent), 8, 0.75, 0.65)}>{fmtG(item.impureGoldSent)}</p>
                            <p className="text-[7.5px] uppercase font-black text-outline tracking-wider mt-0.5">Impure Sent</p>
                          </div>
                          <div className="w-px h-6 bg-outline-variant/20 self-center"></div>
                          <div className="flex flex-col items-center text-center">
                            <p className="text-[11px] font-black text-secondary" style={fitText(fmtG(item.calculatedPureGold), 8, 0.75, 0.65)}>{fmtG(item.calculatedPureGold)}</p>
                            <p className="text-[7.5px] uppercase font-black text-outline tracking-wider mt-0.5">Calculated Pure</p>
                          </div>
                          <div className="w-px h-6 bg-outline-variant/20 self-center"></div>
                          <div className="flex flex-col items-center text-center">
                            <p className={`text-[11px] font-black ${item.refinedPureAchieved ? 'text-emerald-600' : 'text-amber-600'}`} style={fitText(item.refinedPureAchieved ? fmtG(item.refinedPureAchieved) : 'Pending', 8, 0.75, 0.65)}>
                              {item.refinedPureAchieved ? fmtG(item.refinedPureAchieved) : 'Pending'}
                            </p>
                            <p className="text-[7.5px] uppercase font-black text-outline tracking-wider mt-0.5">Actual Obtained</p>
                          </div>
                        </div>

                        {/* Bottom Row: Variance */}
                        <div className="flex justify-between items-center border-t border-outline-variant/10 pt-3">
                          <div>
                            {itemVariance !== null ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-outline">Variance:</span>
                                <span className={`text-[9.5px] font-black ${itemVariance < 0 ? 'text-error' : 'text-emerald-600'}`}>
                                  {itemVariance >= 0 ? '+' : ''}{itemVariance.toFixed(3)}g
                                </span>
                              </div>
                            ) : (
                              <p className="text-[9px] text-outline font-medium">Awaiting melt results...</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
        </a>
        <a onClick={() => navigate('/billing')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
        </a>
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
        </a>
        <a onClick={() => navigate('/ledger')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Ledger</span>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
