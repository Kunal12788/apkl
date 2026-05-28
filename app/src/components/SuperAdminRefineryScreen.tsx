import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';

interface RefiningTransfer {
  metal: 'Gold' | 'Silver';
  impureSilverSent: number;
  calculatedPureSilver: number;
  refinedPureSilverAchieved?: number;
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
  metal: db.metal || 'Gold',
  impureGoldSent: Number(db.impure_gold_sent || 0),
  calculatedPureGold: Number(db.calculated_pure_gold || (db.impure_gold_sent * 0.92)), // Fallback to 92% expected yield for legacy entries
  impureSilverSent: Number(db.impure_silver_sent || 0),
  calculatedPureSilver: Number(db.calculated_pure_silver || 0),
  dateSent: db.date_sent,
  status: db.status,
  refinedPureAchieved: db.refined_pure_achieved ? Number(db.refined_pure_achieved) : undefined,
  refinedPureSilverAchieved: db.refined_pure_silver_achieved ? Number(db.refined_pure_silver_achieved) : undefined
});

export interface SuperAdminLedgerEntry {
  pureSilverChange: number;
  impureSilverChange: number;
  calculatedPureSilver: number;
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
  pureSilverChange: Number(db.pure_silver_change || 0),
  impureSilverChange: Number(db.impure_silver_change || 0),
  calculatedPureSilver: Number(db.calculated_pure_silver || 0),
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
  
  // Choose between Current Session (current) and Refining History (past)
  const [currentView, setCurrentView] = useState<'current' | 'past'>('current');
  const [activeMetal, setActiveMetal] = useState<'Gold' | 'Silver'>('Gold');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SuperAdminLedgerEntry | null>(null);
  
  // Db-synchronized Refinery States
  const [refineryStatus, setRefineryStatus] = useState<'idle' | 'refining'>('idle');
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(null);

  // Melt Processing State
  const [netPureAchieved, setNetPureAchieved] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  const pendingTransfersInQueue = transfers.filter(t => t.status === 'Pending' && t.metal === activeMetal);
  const pendingImpureMetal = Math.max(0, saLedger.reduce((s, e) => s + (activeMetal === 'Gold' ? e.impureGoldChange : e.impureSilverChange), 0));
  const pendingExpectedPure = Math.max(0, saLedger.reduce((s, e) => s + (activeMetal === 'Gold' ? e.calculatedPureGold : (e.calculatedPureSilver || 0)), 0));

  const handleProcessBatchRefining = (e: React.FormEvent) => {
    e.preventDefault();
    const achieved = parseFloat(netPureAchieved);
    if (isNaN(achieved) || achieved <= 0) return;
    if (pendingImpureMetal <= 0) return;
    setShowConfirmModal(true);
  };

  const executeBatchRefining = async () => {
    const achieved = parseFloat(netPureAchieved);
    if (isNaN(achieved) || achieved <= 0) return;
    if (pendingImpureMetal <= 0) return;

    try {
      setShowConfirmModal(false);
      setLoading(true);
      const totalExpected = pendingExpectedPure;
      const totalImpure = pendingImpureMetal;

      // Update each pending transfer with proportional pure achieved
      const updates = pendingTransfersInQueue.map(transfer => {
        let proportionalPure = 0;
        if (totalExpected > 0) {
          proportionalPure = ((activeMetal === 'Gold' ? transfer.calculatedPureGold : (transfer.calculatedPureSilver || 0)) / totalExpected) * achieved;
        } else if (totalImpure > 0) {
          proportionalPure = ((activeMetal === 'Gold' ? transfer.impureGoldSent : (transfer.impureSilverSent || 0)) / totalImpure) * achieved;
        } else {
          proportionalPure = achieved / pendingTransfersInQueue.length;
        }

        const updateData: any = { status: 'Processed' };
        if (activeMetal === 'Gold') updateData.refined_pure_achieved = proportionalPure;
        else updateData.refined_pure_silver_achieved = proportionalPure;

        return supabase
          .from('refining_transfers')
          .update(updateData)
          .eq('id', transfer.id);
      });

      await Promise.all(updates);

      // Insert Refining transaction into Super Admin Ledger
      const branchNames = pendingTransfersInQueue.length > 0
        ? Array.from(new Set(pendingTransfersInQueue.map(t => t.branchName))).join(', ')
        : 'Stock Adjustment';
      const isSilver = activeMetal === 'Silver';
      const newEntry = {
        id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        date: 'Today',
        iso_date: new Date().toISOString().split('T')[0],
        type: 'Refining Yield',
        branch_name: 'Corporate Vault',
        pure_gold_change: isSilver ? 0 : achieved,
        impure_gold_change: isSilver ? 0 : -totalImpure,
        calculated_pure_gold: isSilver ? 0 : -totalExpected,
        pure_silver_change: isSilver ? achieved : 0,
        impure_silver_change: isSilver ? -totalImpure : 0,
        calculated_pure_silver: isSilver ? -totalExpected : 0,
        cash_change: 0,
        details: `Batch refined ${totalImpure.toFixed(3)}g Impure ${activeMetal} from branches (${branchNames}). Yielded ${achieved.toFixed(3)}g Pure ${activeMetal}.`
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

  const refiningHistory = saLedger
    .filter(e => e.type === 'Refining Yield')
    .filter(e => activeMetal === 'Gold' ? (Math.abs(e.impureGoldChange) > 0 || Math.abs(e.calculatedPureGold) > 0) : (Math.abs(e.impureSilverChange) > 0 || Math.abs(e.calculatedPureSilver) > 0))
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate) || b.id.localeCompare(a.id));

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
        <header className="flex flex-col gap-4 mb-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
            </div>
          </div>
        </header>

        {/* Premium Metal Selector Card */}
        <div className="bg-white rounded-3xl p-1.5 border border-outline-variant/20 shadow-md flex gap-2 w-full animate-fade-in relative z-10">
          {[
            {
              metal: 'Gold',
              icon: 'workspace_premium',
              symbol: 'Au',
              sub: '24K / 22K pure stock',
              activeClass: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
            },
            {
              metal: 'Silver',
              icon: 'workspace_premium',
              symbol: 'Ag',
              sub: '99.9% fine purity stock',
              activeClass: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/20'
            }
          ].map(({ metal, icon, symbol, sub, activeClass }) => {
            const isActive = activeMetal === metal;
            return (
              <button
                key={metal}
                onClick={() => setActiveMetal(metal as 'Gold' | 'Silver')}
                className={`flex-1 flex items-center justify-between p-3 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? `${activeClass} scale-[1.01] font-bold`
                    : 'bg-[#003366]/5 text-outline hover:bg-[#003366]/10 hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white border border-outline-variant/20 shadow-sm'}`}>
                    <span className={`material-symbols-outlined text-xl ${isActive ? 'text-white' : metal === 'Gold' ? 'text-amber-500' : 'text-slate-400'}`}>
                      {icon}
                    </span>
                  </div>
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-white/80' : 'text-outline'}`}>Active Metal</p>
                    <p className={`text-sm font-bold font-headline tracking-wide ${isActive ? 'text-white' : 'text-on-background'}`}>{metal}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 pr-2">
                  <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    isActive 
                      ? 'bg-white/20 border-white/30 text-white' 
                      : 'bg-white text-outline border-outline-variant/30'
                  }`}>
                    {symbol} 99.9%
                  </span>
                  <span className={`text-[8px] font-medium hidden sm:inline ${isActive ? 'text-white/70' : 'text-outline/70'}`}>
                    {sub}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

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
              
              {pendingImpureMetal <= 0 ? (
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
                        <span className="font-headline text-2xl font-extrabold text-primary">{pendingImpureMetal.toFixed(3)}</span>
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
            {pendingImpureMetal > 0 && (
              <div className="luxury-card bg-white p-6 border border-outline-variant/10 shadow-lg space-y-6 animate-fade-in relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                  <h3 className="font-label text-[11px] uppercase tracking-[0.25em] font-black text-outline">
                    Refinery Process Panel
                  </h3>
                  {refineryStatus === 'refining' && timerRemaining > 0 ? (
                    <span className="flex items-center gap-1 text-[8.5px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border bg-blue-50 text-[#0059bb] border-blue-200/50 animate-pulse">
                      <span className="material-symbols-outlined text-[11px] animate-pulse-soft">local_fire_department</span>
                      Melting Active
                    </span>
                  ) : refineryStatus === 'refining' && (
                    <span className="flex items-center gap-1 text-[8.5px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border bg-blue-50 text-[#0059bb] border-blue-200/50 animate-pulse">
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
                        This will start the melt process for {pendingTransfersInQueue.length > 0 ? `all ${pendingTransfersInQueue.length} pending transfers` : 'the queue'} totaling {pendingImpureMetal.toFixed(3)}g impure {activeMetal}.
                      </p>
                    </div>
                    <button
                      onClick={() => updateRefineryStatusInDb('refining')}
                      className="w-full py-4 bg-[#0059bb] hover:bg-[#003366] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">local_fire_department</span>
                      Start Refining
                    </button>
                  </div>
                ) : timerRemaining > 0 ? (
                  <div className="text-center py-6 space-y-6 animate-fade-in relative z-10">
                    {/* SVG circular progress timer */}
                    <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#0059bb]/10 to-transparent blur-md"></div>
                      
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
                          className="stroke-[#0059bb] animate-pulse-glow"
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
                        <span className="font-mono text-2xl font-black text-[#0059bb] tracking-wider animate-pulse-soft">
                          {(() => {
                            const mins = Math.floor(timerRemaining / 60);
                            const secs = timerRemaining % 60;
                            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <span className="material-symbols-outlined text-[10px] text-[#0059bb] animate-pulse-soft">local_fire_department</span>
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
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${timerRemaining > 90 ? 'bg-[#0059bb]' : 'bg-slate-200'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${timerRemaining <= 90 && timerRemaining > 60 ? 'bg-[#0059bb]' : 'bg-slate-200'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${timerRemaining <= 60 && timerRemaining > 30 ? 'bg-[#0059bb]' : 'bg-slate-200'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${timerRemaining <= 30 ? 'bg-[#0059bb]' : 'bg-slate-200'}`}></span>
                      </div>
                      
                      <p className="text-xs text-outline/80 leading-relaxed max-w-xs mx-auto">
                        Processing {pendingImpureMetal.toFixed(3)}g of impure {activeMetal}. The input field will become available once the melt is finished.
                      </p>
                    </div>

                    {/* Heat waves */}
                    <div className="flex justify-center gap-2 text-[#0059bb]/20 h-6 overflow-hidden">
                      <span className="material-symbols-outlined text-sm animate-heat-wave" style={{ animationDelay: '0s' }}>air</span>
                      <span className="material-symbols-outlined text-sm animate-heat-wave" style={{ animationDelay: '0.3s' }}>air</span>
                      <span className="material-symbols-outlined text-sm animate-heat-wave" style={{ animationDelay: '0.6s' }}>air</span>
                    </div>

                    {/* Cancel Melt button during timer */}
                    <div className="border-t border-outline-variant/10 pt-4 px-2 relative z-10 flex justify-center">
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
                          <span className="font-headline text-lg font-extrabold text-primary">{pendingImpureMetal.toFixed(3)}</span>
                          <span className="text-[10px] font-bold text-outline">g</span>
                        </div>
                      </div>
                      <div className="bg-slate-50/50 rounded-2xl p-4 border border-outline-variant/10">
                        <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-1">Expected Pure {activeMetal}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="font-headline text-lg font-extrabold text-secondary">{pendingExpectedPure.toFixed(3)}</span>
                          <span className="text-[10px] font-bold text-outline">g</span>
                        </div>
                      </div>
                    </div>

                    {/* Actual Pure Input Field */}
                    <div className="relative group">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Actual Pure {activeMetal} Obtained (g)</span>
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
                        className="flex-1 py-3.5 bg-[#0059bb] disabled:bg-[#0059bb]/40 disabled:text-white/60 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">done_all</span>
                        Confirm
                      </button>
                    </div>

                  </form>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Refining Sessions History */}
            {!selectedHistoryItem ? (
              <section className="space-y-4 relative z-10 mt-6">
                <p className="label-institutional text-outline uppercase px-1">Refinery Melt Sessions</p>
                {refiningHistory.length === 0 ? (
                  <div className="luxury-card p-12 bg-slate-50 border border-outline-variant/10 text-center rounded-[2rem]">
                    <span className="material-symbols-outlined text-slate-400 text-5xl mb-3">history</span>
                    <p className="text-sm text-outline font-bold">No refining sessions found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {refiningHistory.map(session => (
                      <div 
                        key={session.id} 
                        onClick={() => setSelectedHistoryItem(session)}
                        className="luxury-card p-5 bg-white border border-outline-variant/10 relative overflow-hidden shadow-sm flex flex-col gap-4 cursor-pointer hover:shadow-md hover:border-[#0059bb]/30 transition-all active:scale-[0.98]"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-[#0059bb]">local_fire_department</span>
                              <p className="font-bold text-sm text-primary">Melt Session</p>
                            </div>
                            <p className="text-[8px] uppercase tracking-widest font-black text-outline mt-1">{session.date} • ID: {session.id}</p>
                          </div>
                          <div>
                            <span className="text-[8.5px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200/50">
                              Completed
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 px-4 py-3.5 bg-slate-50/50 rounded-2xl border border-outline-variant/10">
                          <div className="flex flex-col items-center text-center">
                            <p className="text-[11px] font-black text-primary">{fmtG(Math.abs(activeMetal === 'Gold' ? session.impureGoldChange : session.impureSilverChange))}</p>
                            <p className="text-[7.5px] uppercase font-black text-outline tracking-wider mt-0.5">Impure Melted</p>
                          </div>
                          <div className="w-px h-6 bg-outline-variant/20 self-center"></div>
                          <div className="flex flex-col items-center text-center">
                            <p className="text-[11px] font-black text-emerald-600">{fmtG(activeMetal === 'Gold' ? session.pureGoldChange : session.pureSilverChange)}</p>
                            <p className="text-[7.5px] uppercase font-black text-outline tracking-wider mt-0.5">Actual Yield</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="space-y-4 relative z-10 animate-fade-in mt-6">
                <button 
                  onClick={() => setSelectedHistoryItem(null)}
                  className="flex items-center gap-2 text-xs font-bold text-outline hover:text-primary transition-colors mb-4"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Back to History
                </button>
                
                <div className="luxury-card p-6 bg-white border border-[#0059bb]/20 shadow-lg relative overflow-hidden space-y-6">
                  <div className="absolute -right-10 -top-10 text-[#0059bb]/5">
                    <span className="material-symbols-outlined text-[150px]">local_fire_department</span>
                  </div>
                  
                  <div className="relative z-10 border-b border-outline-variant/10 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-lg text-[#0059bb]">verified</span>
                      <h3 className="font-bold text-lg text-primary">Detailed Melt Report</h3>
                    </div>
                    <p className="text-[9px] uppercase tracking-widest font-black text-outline">
                      ID: {selectedHistoryItem.id} • Date: {selectedHistoryItem.isoDate}
                    </p>
                  </div>

                  {(() => {
                    const sessExpected = Math.abs(activeMetal === 'Gold' ? selectedHistoryItem.calculatedPureGold : (selectedHistoryItem.calculatedPureSilver || 0));
                    const sessActual = activeMetal === 'Gold' ? selectedHistoryItem.pureGoldChange : selectedHistoryItem.pureSilverChange;
                    const sessImpure = Math.abs(activeMetal === 'Gold' ? selectedHistoryItem.impureGoldChange : selectedHistoryItem.impureSilverChange);
                    const sessVariance = sessActual - sessExpected;
                    const sessRecovery = sessExpected > 0 ? (sessActual / sessExpected) * 100 : 0;

                    return (
                      <div className="relative z-10 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Total Impure Processed */}
                          <div className="luxury-card p-4 sm:p-5 bg-white border-l-4 border-l-[#755b00] flex flex-col justify-between h-28 relative overflow-hidden shadow-md">
                            <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-[#755b00]">local_fire_department</span>
                            <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Total Impure Melted</p>
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-2">
                              <span className="font-headline font-extrabold text-primary" style={{ fontSize: '24px' }}>{sessImpure.toFixed(3)}</span>
                              <span className="text-[10px] font-black text-[#755b00]">gram</span>
                            </div>
                          </div>

                          {/* Actual Pure Obtained */}
                          <div className="luxury-card p-4 sm:p-5 bg-emerald-50 border-l-4 border-l-emerald-600 flex flex-col justify-between h-28 relative overflow-hidden shadow-md">
                            <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-emerald-600">workspace_premium</span>
                            <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-[0.2em]">Total Pure Obtained</p>
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-2">
                              <span className="font-headline font-extrabold text-emerald-600" style={{ fontSize: '24px' }}>{sessActual.toFixed(3)}</span>
                              <span className="text-[10px] font-black text-emerald-600">gram</span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Summary Row */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white rounded-2xl p-4 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card flex flex-col justify-between">
                            <p className="text-[8px] font-bold text-outline uppercase tracking-[0.1em]">Expected Pure</p>
                            <p className="font-headline text-sm font-bold text-primary mt-1">{sessExpected.toFixed(3)}g</p>
                          </div>
                          <div className="bg-white rounded-2xl p-4 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card flex flex-col justify-between">
                            <p className="text-[8px] font-bold text-outline uppercase tracking-[0.1em]">Variance / Loss</p>
                            <p className={`font-headline text-sm font-bold mt-1 ${sessVariance < 0 ? 'text-error' : 'text-emerald-600'}`}>
                              {sessVariance >= 0 ? '+' : ''}{sessVariance.toFixed(3)}g
                            </p>
                          </div>
                          <div className="bg-white rounded-2xl p-4 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card flex flex-col justify-between">
                            <p className="text-[8px] font-bold text-outline uppercase tracking-[0.1em]">Melt Yield</p>
                            <p className="font-headline text-sm font-bold text-secondary mt-1">{sessRecovery > 0 ? `${sessRecovery.toFixed(1)}%` : '100%'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="relative z-10 bg-slate-50 rounded-2xl p-4 border border-outline-variant/10">
                    <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-2">Refining Details & Sources</p>
                    <p className="text-sm font-medium text-primary leading-relaxed">
                      {selectedHistoryItem.details}
                    </p>
                  </div>
                  
                  {/* Find related transfers for this date */}
                  {(() => {
                    const relatedTransfers = transfers.filter(t => t.dateSent === selectedHistoryItem.isoDate && t.status === 'Processed');
                    if (relatedTransfers.length === 0) return null;
                    return (
                      <div className="relative z-10 pt-4 border-t border-outline-variant/10">
                        <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-3">Involved Branch Transfers</p>
                        <div className="space-y-2">
                          {relatedTransfers.map(t => (
                            <div key={t.id} className="flex justify-between items-center text-xs p-3 bg-white border border-outline-variant/20 rounded-xl">
                              <span className="font-bold text-primary">{t.branchName}</span>
                              <span className="text-outline font-mono font-medium">{t.impureGoldSent.toFixed(3)}g Sent</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-sm relative z-10 shadow-2xl overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-br from-[#003366] to-[#001f3f] p-6 text-center relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-4 -top-4 text-8xl text-white/5 rotate-12 pointer-events-none">gpp_good</span>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
                <span className="material-symbols-outlined text-3xl text-white">done_all</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Confirm Refinery Yield</h3>
              <p className="text-white/80 text-sm">Please verify the final obtained pure gold weight before committing.</p>
            </div>
            
            <div className="p-6 space-y-6 bg-slate-50">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-outline-variant/10 shadow-sm">
                  <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-1">Impure Melted</p>
                  <p className="font-headline text-lg font-extrabold text-primary">{pendingImpureMetal.toFixed(3)}g</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-outline-variant/10 shadow-sm border-b-4 border-b-[#0059bb]">
                  <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-1 text-[#0059bb]">Actual Pure Obtained</p>
                  <p className="font-headline text-lg font-extrabold text-[#0059bb]">{parseFloat(netPureAchieved).toFixed(3)}g</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3.5 bg-white border-2 border-outline-variant/20 text-primary font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeBatchRefining}
                  className="flex-1 py-3.5 bg-[#0059bb] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95"
                >
                  Final Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
