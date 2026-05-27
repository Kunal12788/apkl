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
  dateSent: string;
  status: 'Pending' | 'Processed';
  refinedPureAchieved?: number;
}

interface SuperAdminLedgerEntry {
  id: string;
  date: string;
  isoDate: string;
  type: 'Allocation' | 'Refining Yield' | 'Stock Correction';
  branchName?: string;
  pureGoldChange: number;
  impureGoldChange: number;
  cashChange: number;
  details: string;
}

// DB Mapper helper functions
const mapDbToTransfer = (db: any): RefiningTransfer => ({
  id: db.id,
  branchId: db.branch_id,
  branchName: db.branch_name,
  impureGoldSent: Number(db.impure_gold_sent || 0),
  dateSent: db.date_sent,
  status: db.status,
  refinedPureAchieved: db.refined_pure_achieved ? Number(db.refined_pure_achieved) : undefined
});

const mapDbToSaEntry = (db: any): SuperAdminLedgerEntry => ({
  id: db.id,
  date: db.date,
  isoDate: db.iso_date,
  type: db.type,
  branchName: db.branch_name,
  pureGoldChange: Number(db.pure_gold_change || 0),
  impureGoldChange: Number(db.impure_gold_change || 0),
  cashChange: Number(db.cash_change || 0),
  details: db.details
});

export const SuperAdminLedgerScreen: React.FC = () => {
  const navigate = useNavigate();

  const cachedSaLedger = getCachedData('super_admin_ledger_all');
  const cachedTransfers = getCachedData('refining_transfers_pending');

  const initialLedger = cachedSaLedger ? cachedSaLedger.map(mapDbToSaEntry) : [];
  const initialTransfers = cachedTransfers ? cachedTransfers.map(mapDbToTransfer) : [];

  const [saLedger, setSaLedger] = useState<SuperAdminLedgerEntry[]>(initialLedger);
  const [pendingTransfers, setPendingTransfers] = useState<RefiningTransfer[]>(initialTransfers);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(cachedSaLedger !== null && initialLedger.length === 0);
  const [loading, setLoading] = useState<boolean>(cachedSaLedger === null);

  const [setupPureInput, setSetupPureInput] = useState('');
  const [setupImpureInput, setSetupImpureInput] = useState('');
  const [setupCashInput, setSetupCashInput] = useState('');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustPure, setAdjustPure] = useState('');
  const [adjustImpure, setAdjustImpure] = useState('');
  const [adjustCash, setAdjustCash] = useState('');

  // Selected Transfer for Refining Processing
  const [selectedTransfer, setSelectedTransfer] = useState<RefiningTransfer | null>(null);
  const [netPureAchieved, setNetPureAchieved] = useState('');

  // Fetch all corporate data from Supabase
  const fetchData = async () => {
    // Already initialized from cache synchronously on mount, background fetch handles update

    try {
      // Fetch Super Admin Ledger and pending refining transfers in parallel
      const [ledgerRes, transfersRes] = await Promise.all([
        supabase
          .from('super_admin_ledger')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('refining_transfers')
          .select('*')
          .eq('status', 'Pending')
          .order('created_at', { ascending: false })
      ]);

      if (ledgerRes.error) throw ledgerRes.error;
      if (transfersRes.error) throw transfersRes.error;

      const ledgerData = ledgerRes.data;
      if (ledgerData) {
        setCachedData('super_admin_ledger_all', ledgerData);
        const mappedLedger = ledgerData.map(mapDbToSaEntry);
        setSaLedger(mappedLedger);
        setIsFirstTimeSetup(mappedLedger.length === 0);
      }

      const transfersData = transfersRes.data;
      if (transfersData) {
        setCachedData('refining_transfers_pending', transfersData);
        setPendingTransfers(transfersData.map(mapDbToTransfer));
      }

    } catch (err) {
      console.error('Error fetching Super Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const pureVal = parseFloat(setupPureInput);
    const impureVal = parseFloat(setupImpureInput);
    const cashVal = parseFloat(setupCashInput);
    if (isNaN(pureVal) || isNaN(impureVal) || isNaN(cashVal)) return;

    try {
      const newEntry = {
        id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        date: 'Today',
        iso_date: new Date().toISOString().split('T')[0],
        type: 'Stock Correction',
        pure_gold_change: pureVal,
        impure_gold_change: impureVal,
        cash_change: cashVal,
        details: 'Initial corporate stock upload setup.'
      };

      const { error } = await supabase
        .from('super_admin_ledger')
        .insert([newEntry]);

      if (error) throw error;

      setIsFirstTimeSetup(false);
      fetchData();
    } catch (err) {
      console.error('Error uploading initial setup:', err);
    }
  };

  // Adjust stock via modal
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pureVal = parseFloat(adjustPure);
    const impureVal = parseFloat(adjustImpure);
    const cashVal = parseFloat(adjustCash);
    if (isNaN(pureVal) || isNaN(impureVal) || isNaN(cashVal)) return;

    try {
      // Stock Correction is an adjustment: we calculate difference and insert
      const currentPure = saLedger.reduce((s, e) => s + e.pureGoldChange, 0);
      const currentImpure = saLedger.reduce((s, e) => s + e.impureGoldChange, 0);
      const currentCash = saLedger.reduce((s, e) => s + e.cashChange, 0);

      const pureDiff = pureVal - currentPure;
      const impureDiff = impureVal - currentImpure;
      const cashDiff = cashVal - currentCash;

      const newEntry = {
        id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        date: 'Today',
        iso_date: new Date().toISOString().split('T')[0],
        type: 'Stock Correction',
        pure_gold_change: pureDiff,
        impure_gold_change: impureDiff,
        cash_change: cashDiff,
        details: `Manual Stock Correction adjustment.`
      };

      const { error } = await supabase
        .from('super_admin_ledger')
        .insert([newEntry]);

      if (error) throw error;

      setShowAdjustModal(false);
      fetchData();
    } catch (err) {
      console.error('Error adjusting stock balances:', err);
    }
  };

  // Process Refinery Melt
  const handleProcessRefining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    const achieved = parseFloat(netPureAchieved);
    if (isNaN(achieved) || achieved <= 0) return;

    try {
      // 1. Update refining transfer status to Processed
      const { error: transferError } = await supabase
        .from('refining_transfers')
        .update({ status: 'Processed', refined_pure_achieved: achieved })
        .eq('id', selectedTransfer.id);

      if (transferError) throw transferError;

      // 2. Insert Refining Yield into Super Admin Ledger
      const newEntry = {
        id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        date: 'Today',
        iso_date: new Date().toISOString().split('T')[0],
        type: 'Refining Yield',
        branch_name: selectedTransfer.branchName,
        pure_gold_change: achieved,
        impure_gold_change: -selectedTransfer.impureGoldSent,
        cash_change: 0,
        details: `Refined ${selectedTransfer.impureGoldSent.toFixed(3)}g Impure Gold from ${selectedTransfer.branchName}. Yielded ${achieved.toFixed(3)}g Pure Gold.`
      };

      const { error: ledgerError } = await supabase
        .from('super_admin_ledger')
        .insert([newEntry]);

      if (ledgerError) throw ledgerError;

      setSelectedTransfer(null);
      setNetPureAchieved('');
      fetchData();
    } catch (err) {
      console.error('Error processing refinery yield:', err);
    }
  };

  // Calculations based on running sum of DB ledger records
  const currentPureStock = saLedger.reduce((s, e) => s + e.pureGoldChange, 0);
  const currentImpureStock = saLedger.reduce((s, e) => s + e.impureGoldChange, 0);
  const currentCashStock = saLedger.reduce((s, e) => s + e.cashChange, 0);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtG = (n: number) => `${n.toFixed(3)}g`;

  if (loading) {
    return (
      <div className="bg-background text-on-background font-body-md min-h-[100svh] flex flex-col items-center justify-center ambient-bg relative z-10 w-full overflow-hidden">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
        <p className="font-label-caps text-[10px] tracking-widest text-outline">Retrieving Corporate Records...</p>
      </div>
    );
  }

  return (
    <div className="bg-background ambient-bg text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 max-w-5xl mx-auto pt-8 pb-32 relative space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-4 animate-fade-in">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Head Office Hub</h1>
            <p className="text-xs text-outline font-medium">Super Admin Global Allocation & Refining Terminal</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                // Clear DB super admin ledger for testing setup
                if (window.confirm("Are you sure you want to reset all corporate records for testing setup?")) {
                  try {
                    await supabase.from('super_admin_ledger').delete().neq('id', '');
                    await supabase.from('refining_transfers').delete().neq('id', '');
                    fetchData();
                  } catch (e) {
                    console.error(e);
                  }
                }
              }}
              className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative active:scale-95 transition-transform"
              title="Reset Initial Details"
            >
              <span className="material-symbols-outlined text-xl">restart_alt</span>
            </button>
          </div>
        </header>

        {isFirstTimeSetup ? (
          <div className="luxury-card bg-white p-6 border border-outline-variant/20 rounded-[2rem] shadow-xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#003366]/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-[#003366]">upload_file</span>
            </div>
            <h2 className="font-headline text-xl font-bold text-primary mb-2">First-Time Setup</h2>
            <p className="text-xs text-outline mb-6">
              Please enter the initial values for the total pure gold, total impure gold, and total cash available at the Head Office.
            </p>
            <form onSubmit={handleFirstTimeSetup} className="space-y-4">
              <div className="relative group">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Total Pure Gold Stock (grams)</span>
                <input 
                  type="number" 
                  step="0.001"
                  required
                  placeholder="e.g. 1000.000" 
                  value={setupPureInput} 
                  onChange={e => setSetupPureInput(e.target.value)}
                  className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                />
              </div>
              <div className="relative group">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Total Impure Gold Stock (grams)</span>
                <input 
                  type="number" 
                  step="0.001"
                  required
                  placeholder="e.g. 500.000" 
                  value={setupImpureInput} 
                  onChange={e => setSetupImpureInput(e.target.value)}
                  className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                />
              </div>
              <div className="relative group">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Total Cash Balance (INR)</span>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 5000000" 
                  value={setupCashInput} 
                  onChange={e => setSetupCashInput(e.target.value)}
                  className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-4 bg-[#003366] hover:bg-[#001e40] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-md"
              >
                Upload Initial Details
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Live Stock Summary */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-secondary shadow-lg">
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Super Pure Stock</p>
                      <span className="material-symbols-outlined text-secondary glow-icon text-lg">diamond</span>
                    </div>
                    <p className="font-headline font-bold text-primary" style={fitText(fmtG(currentPureStock), 8, 1.5, 1.05)}>{fmtG(currentPureStock)}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Active Stock</p>
                      <button 
                        onClick={() => {
                          setAdjustPure(currentPureStock.toString());
                          setAdjustImpure(currentImpureStock.toString());
                          setAdjustCash(currentCashStock.toString());
                          setShowAdjustModal(true);
                        }}
                        className="text-[8px] uppercase font-bold text-secondary hover:text-primary transition-colors flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[10px]">edit</span>
                        Adjust
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-[#755b00] shadow-lg">
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Super Impure Stock</p>
                      <span className="material-symbols-outlined text-[#755b00] glow-icon text-lg">local_fire_department</span>
                    </div>
                    <p className="font-headline font-bold text-primary" style={fitText(fmtG(currentImpureStock), 8, 1.5, 1.05)}>{fmtG(currentImpureStock)}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Active Stock</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-[#003366] shadow-lg w-full">
                <div className="p-5 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline mb-1">Super Cash Stock</p>
                    <p className="font-headline font-bold text-primary" style={fitText(fmt(currentCashStock), 10, 1.875, 1.25)}>{fmt(currentCashStock)}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="material-symbols-outlined text-[#003366] glow-icon text-2xl mb-1">payments</span>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Active Cash</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Transfers / Refining Melt Section */}
            <div className="space-y-4">
              <p className="label-institutional text-outline uppercase px-1">Refining Melt Queue (Admin Transfers)</p>
              {pendingTransfers.length === 0 ? (
                <div className="luxury-card p-6 bg-slate-50 border border-outline-variant/10 text-center">
                  <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">domain_verification</span>
                  <p className="text-xs text-outline font-semibold">Refinery queue is empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {pendingTransfers.map(transfer => (
                    <div 
                      key={transfer.id}
                      onClick={() => navigate('/refinery')}
                      className="luxury-card p-4 bg-white border border-[#755b00]/20 hover:border-[#755b00]/50 cursor-pointer transition-all duration-300 flex justify-between items-center group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#755b00]/10 text-[#755b00] flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">local_fire_department</span>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-primary">{transfer.branchName}</p>
                          <p className="text-[8px] uppercase tracking-widest font-bold text-outline mt-0.5">Sent: {transfer.dateSent} • ID: {transfer.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-[#755b00] bg-[#755b00]/5 border border-[#755b00]/10 px-2 py-1 rounded-lg">{fmtG(transfer.impureGoldSent)}</span>
                        <span className="material-symbols-outlined text-sm text-outline group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Super Admin Ledger History */}
            <div className="space-y-3">
              <p className="label-institutional text-outline uppercase px-1">Corporate Ledger History</p>
              <div className="space-y-3">
                {saLedger.map(entry => (
                  <div key={entry.id} className="luxury-card p-5 bg-white border border-outline-variant/20 relative overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.type === 'Refining Yield' ? 'bg-[#755b00]/10 text-[#755b00]' : 'bg-[#003366]/10 text-[#003366]'}`}>
                          <span className="material-symbols-outlined text-sm">
                            {entry.type === 'Refining Yield' ? 'local_fire_department' : 'account_balance'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-primary">{entry.type}</p>
                          <p className="text-[7px] text-outline uppercase font-bold tracking-widest">{entry.date} • {entry.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {entry.pureGoldChange !== 0 && (
                          <p className={`text-xs font-black ${entry.pureGoldChange > 0 ? 'text-[#755b00]' : 'text-error'}`}>
                            {entry.pureGoldChange > 0 ? '+' : ''}{fmtG(entry.pureGoldChange)}
                          </p>
                        )}
                        {entry.impureGoldChange !== 0 && (
                          <p className={`text-xs font-black ${entry.impureGoldChange > 0 ? 'text-amber-600' : 'text-error'}`}>
                            {entry.impureGoldChange > 0 ? '+' : ''}{fmtG(entry.impureGoldChange)} (Impure)
                          </p>
                        )}
                        {entry.cashChange !== 0 && (
                          <p className={`text-xs font-black ${entry.cashChange > 0 ? 'text-emerald-600' : 'text-error'}`}>
                            {entry.cashChange > 0 ? '+' : ''}{fmt(entry.cashChange)}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-outline font-medium border-t border-outline-variant/10 pt-2">{entry.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Adjust Stock Modal */}
        {showAdjustModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up">
              <h3 className="font-headline text-lg font-bold text-primary mb-4">Adjust Stock Starting Balances</h3>
              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Opening Pure Gold (g)</span>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={adjustPure}
                    onChange={e => setAdjustPure(e.target.value)}
                    className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                  />
                </div>
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Opening Impure Gold (g)</span>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={adjustImpure}
                    onChange={e => setAdjustImpure(e.target.value)}
                    className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                  />
                </div>
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Opening Cash (INR)</span>
                  <input 
                    type="number" 
                    required
                    value={adjustCash}
                    onChange={e => setAdjustCash(e.target.value)}
                    className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="flex-1 py-3 bg-surface-container text-primary font-bold text-xs uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-[#003366] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Process Refining Modal */}
        {selectedTransfer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up">
              <div className="w-16 h-16 rounded-full bg-[#755b00]/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-[#755b00]">local_fire_department</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-center text-primary mb-2">Process Refinery Melt</h3>
              <p className="text-xs text-center text-outline mb-6">
                Processing <strong className="text-primary">{fmtG(selectedTransfer.impureGoldSent)}</strong> of Impure Gold sent from <strong>{selectedTransfer.branchName}</strong>. Please input the final net pure gold yield achieved.
              </p>
              <form onSubmit={handleProcessRefining} className="space-y-4">
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Net Pure Gold Achieved (g)</span>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    placeholder="e.g. 138.500"
                    value={netPureAchieved}
                    onChange={e => setNetPureAchieved(e.target.value)}
                    className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setSelectedTransfer(null)}
                    className="flex-1 py-3 bg-surface-container text-primary font-bold text-xs uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-[#755b00] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg"
                  >
                    Melt & Add to Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
        </a>
        <a onClick={() => navigate('/billing')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
        </a>
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
        </a>
        <a onClick={() => navigate('/ledger')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Ledger</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
