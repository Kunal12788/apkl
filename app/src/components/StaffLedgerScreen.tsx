import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';
import { fitText } from '../utils';
import { useSession } from '../context/SessionContext';

interface LedgerEntry {
  id: string;
  date: string;
  isoDate: string;
  customerName: string;
  transactionType: 'Tunch Only' | 'Exchange' | 'Pending Settlement' | 'Pure Gold Sale' | 'Refining Dispatch';
  pureGoldOut: number;
  pureGoldDue: number;
  impureGoldIn: number;
  impureGoldOut?: number;
  purity?: string;
  cashReceived: number;
  cashPaid: number;
  status: 'Completed' | 'Pending Pure' | 'Pending Cash' | 'No Settlement';
}


const openingPureStock = 100.000;
const openingImpureStock = 0.000;

// DB Mapper helper functions
const mapDbToEntry = (db: any): LedgerEntry => ({
  id: db.id,
  date: db.date,
  isoDate: db.iso_date,
  customerName: db.customer_name,
  transactionType: db.transaction_type,
  pureGoldOut: Number(db.pure_gold_out || 0),
  pureGoldDue: Number(db.pure_gold_due || 0),
  impureGoldIn: Number(db.impure_gold_in || 0),
  impureGoldOut: Number(db.impure_gold_out || 0),
  purity: db.purity,
  cashReceived: Number(db.cash_received || 0),
  cashPaid: Number(db.cash_paid || 0),
  status: db.status
});

const mapEntryToDb = (entry: LedgerEntry, staffId: string) => ({
  id: entry.id,
  date: entry.date,
  iso_date: entry.isoDate,
  customer_name: entry.customerName,
  transaction_type: entry.transactionType,
  pure_gold_out: entry.pureGoldOut,
  pure_gold_due: entry.pureGoldDue,
  impure_gold_in: entry.impureGoldIn,
  impure_gold_out: entry.impureGoldOut || 0,
  purity: entry.purity || '',
  cash_received: entry.cashReceived,
  cash_paid: entry.cashPaid,
  status: entry.status,
  staff_id: staffId
});

export const StaffLedgerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const userId = user?.id || 'STAFF-001';
  const isAdmin = userId.startsWith('ADMIN-');

  const cachedEntries = getCachedData('ledger_entries_all');
  const initialEntries = cachedEntries ? cachedEntries.map(mapDbToEntry) : [];

  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>(initialEntries);
  const [, setLoading] = useState(initialEntries.length === 0);
  const [showRefiningConfirm, setShowRefiningConfirm] = useState(false);

  // Fetch entries from Supabase
  const fetchEntries = async () => {
    // Already initialized from cache synchronously, background fetch handles updates

    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setCachedData('ledger_entries_all', data);
        setEntries(data.map(mapDbToEntry));
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error('Error fetching ledger entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const filtered = entries.filter(e => {
    const isTakenPureGold = e.transactionType === 'Pure Gold Sale' || e.pureGoldOut > 0;
    const isTakenCash = e.cashPaid > 0;
    const isRefining = e.transactionType === 'Refining Dispatch';
    
    return isTakenPureGold || isTakenCash || isRefining;
  });

  const totalPureGiven = entries.reduce((s, e) => s + e.pureGoldOut, 0);
  const totalImpureReceived = entries.reduce((s, e) => s + e.impureGoldIn, 0);
  const totalImpureRefined = entries.reduce((s, e) => s + (e.impureGoldOut || 0), 0);
  
  const currentPureStock = openingPureStock - totalPureGiven;
  const currentImpureStock = openingImpureStock + totalImpureReceived - totalImpureRefined;
  
  const pendingPureLiability = entries.reduce((s, e) => s + e.pureGoldDue, 0);

  const handleRefineConfirm = async () => {
    const txnId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
    const trfId = `TRF-${Math.floor(100 + Math.random() * 900)}`;

    const newEntry: LedgerEntry = {
      id: txnId,
      date: 'Just Now',
      isoDate: new Date().toISOString().split('T')[0],
      customerName: 'Refinery Dispatch',
      transactionType: 'Refining Dispatch',
      pureGoldOut: 0,
      pureGoldDue: 0,
      impureGoldIn: 0,
      impureGoldOut: currentImpureStock,
      cashReceived: 0,
      cashPaid: 0,
      status: 'Completed'
    };

    try {
      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert([mapEntryToDb(newEntry, userId)]);
      if (ledgerError) throw ledgerError;

      // Add to transfers queue for Super Admin approval
      const { error: transferError } = await supabase
        .from('refining_transfers')
        .insert([{
          id: trfId,
          branch_id: 'BR-DELHI',
          branch_name: 'Delhi Branch',
          impure_gold_sent: currentImpureStock,
          date_sent: new Date().toISOString().split('T')[0],
          status: 'Pending'
        }]);
      if (transferError) throw transferError;

      setShowRefiningConfirm(false);
      fetchEntries();
    } catch (err) {
      console.error('Error dispatching to refinery:', err);
    }
  };

  const handleApproveSettlement = async () => {
    if (!selectedEntry) return;
    try {
      const { error } = await supabase
        .from('ledger_entries')
        .update({ status: 'Completed' })
        .eq('id', selectedEntry.id);
      
      if (error) throw error;
      
      setSelectedEntry({ ...selectedEntry, status: 'Completed' });
      fetchEntries();
    } catch (err) {
      console.error('Error approving settlement:', err);
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtG = (n: number) => `${n.toFixed(3)}g`;

  return (
    <div className="bg-background ambient-bg text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 max-w-5xl mx-auto pt-8 pb-32 relative space-y-6">

        {/* Header */}
        {!selectedEntry && (
          <header className="flex justify-between items-end mb-4 animate-fade-in">
            <div>
              <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Gold Ledger Panel</h1>
              <p className="text-xs text-outline font-medium">Real-time Stock & Settlement Engine</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
          </header>
        )}

        {selectedEntry && (
          <div className="animate-fade-in space-y-6">
            <button onClick={() => setSelectedEntry(null)} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Ledger
            </button>

            <div className="luxury-card overflow-hidden">
              <div className={`p-6 text-white relative ${selectedEntry.status.includes('Pending') ? 'bg-gradient-to-br from-orange-600 to-orange-800' : 'bg-gradient-to-br from-[#003366] to-[#001e40]'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mb-1">
                      {selectedEntry.transactionType}
                    </p>
                    <h2 className="font-headline text-2xl font-extrabold text-white flex items-baseline gap-1">
                      <span className="material-symbols-outlined text-lg">account_circle</span> {selectedEntry.customerName}
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mt-1">{selectedEntry.id} • {selectedEntry.date}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-2xl">
                      {selectedEntry.transactionType === 'Tunch Only' ? 'science' : selectedEntry.transactionType === 'Exchange' ? 'swap_horiz' : 'pending_actions'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6 bg-white">
                <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-b border-outline-variant/20 pb-5">
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Impure Gold In</p>
                    <p className="font-headline text-sm font-bold text-primary">{fmtG(selectedEntry.impureGoldIn)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Pure Gold Out</p>
                    <p className="font-headline text-sm font-bold text-secondary">{fmtG(selectedEntry.pureGoldOut)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Pure Gold Due</p>
                    <p className={`font-headline text-sm font-bold ${selectedEntry.pureGoldDue > 0 ? 'text-error' : 'text-primary'}`}>{fmtG(selectedEntry.pureGoldDue)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Purity Evaluated</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.purity || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Cash Received</p>
                    <p className="font-headline text-sm font-bold text-emerald-600">{fmt(selectedEntry.cashReceived)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Status</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.status}</p>
                  </div>
                </div>

                {isAdmin && selectedEntry.status.includes('Pending') && (
                  <div className="pt-2 flex gap-3">
                    <button 
                      onClick={handleApproveSettlement}
                      className="flex-1 py-3 bg-[#003366] hover:bg-[#001e40] text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-colors shadow-md flex justify-center items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Approve Settlement
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!selectedEntry && (
          <div className="space-y-6 animate-fade-in">
              <>
                {/* Live Stock Engine Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-secondary shadow-lg">
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Live Pure Stock</p>
                        <span className="material-symbols-outlined text-secondary glow-icon text-lg">diamond</span>
                      </div>
                      <p className="font-headline font-bold text-primary" style={fitText(fmtG(currentPureStock), 8, 1.5, 1.0)}>{fmtG(currentPureStock)}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Start: {fmtG(openingPureStock)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-[#755b00] shadow-lg">
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Live Impure Stock</p>
                        <span className="material-symbols-outlined text-[#755b00] glow-icon text-lg">blur_on</span>
                      </div>
                      <p className="font-headline font-bold text-primary" style={fitText(fmtG(currentImpureStock), 8, 1.5, 1.0)}>{fmtG(currentImpureStock)}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Start: {fmtG(openingImpureStock)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {currentImpureStock > 0 && (
                  <button 
                    onClick={() => setShowRefiningConfirm(true)}
                    className="w-full py-4 bg-[#755b00] hover:bg-[#5a4600] text-white font-bold text-xs uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.99] flex justify-center items-center gap-2 animate-fade-in"
                  >
                    <span className="material-symbols-outlined text-sm">local_fire_department</span>
                    TRANSFER TO REFINERY
                  </button>
                )}

                {/* Pending Liability Engine */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Pending Pure Liability Card */}
                  <div className="luxury-card p-5 bg-gradient-to-br from-amber-50/60 to-orange-50/30 border border-amber-200/60 rounded-3xl relative overflow-hidden shadow-sm backdrop-blur-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[9px] font-bold text-amber-800 uppercase tracking-[0.15em] mb-1">Pending Pure Liability</p>
                        <p className="font-headline font-black text-amber-700 tracking-tight" style={fitText(fmtG(pendingPureLiability), 8, 1.5, 1.0)}>{fmtG(pendingPureLiability)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700">
                        <span className="material-symbols-outlined text-base">hourglass_empty</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <span className="text-[8px] text-amber-800/80 font-bold uppercase tracking-wider">Awaiting Settlement</span>
                    </div>
                  </div>

                  {/* Total Pure Disbursed Card */}
                  <div className="luxury-card p-5 bg-gradient-to-br from-slate-50/60 to-white/30 border border-outline-variant/30 rounded-3xl relative overflow-hidden shadow-sm backdrop-blur-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-1">Total Pure Disbursed</p>
                        <p className="font-headline font-black text-primary tracking-tight" style={fitText(fmtG(totalPureGiven), 8, 1.5, 1.0)}>{fmtG(totalPureGiven)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-base">outbound</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      <span className="text-[8px] text-outline font-bold uppercase tracking-wider">All-Time Disbursed</span>
                    </div>
                  </div>
                </div>

                {/* Audit Log Entries */}
                <div className="space-y-3">
                  <p className="label-institutional text-outline uppercase px-1">Ledger History</p>
                  
                  <div className="space-y-3">
                    {filtered.map(entry => {
                      return (
                        <div 
                          key={entry.id} 
                          onClick={() => setSelectedEntry(entry)} 
                          className="luxury-card p-5 bg-white active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${entry.status.includes('Pending') ? 'bg-orange-50 text-orange-500' : entry.transactionType === 'Tunch Only' ? 'bg-slate-100 text-slate-500' : 'bg-secondary/10 text-secondary'}`}>
                                <span className="material-symbols-outlined text-xl">{entry.transactionType === 'Tunch Only' ? 'science' : entry.transactionType === 'Exchange' ? 'swap_horiz' : 'pending_actions'}</span>
                              </div>
                              <div>
                                <p className="font-bold text-sm text-primary">{entry.customerName}</p>
                                <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">{entry.transactionType} • {entry.id}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${entry.status === 'Completed' ? 'text-secondary' : entry.status === 'No Settlement' ? 'text-outline' : 'text-orange-500'}`}>
                                {entry.status}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 px-3 py-3 bg-[#F8FAFC] rounded-2xl border border-outline-variant/10">
                            <div className="flex-1 flex flex-col items-center gap-0.5">
                              <p className="text-[11px] font-black text-primary">{fmtG(entry.impureGoldIn)}</p>
                              <p className="text-[7px] uppercase font-black text-outline tracking-widest">Impure In</p>
                            </div>
                            <div className="w-px h-4 bg-outline-variant/20"></div>
                            <div className="flex-1 flex flex-col items-center gap-0.5">
                              <p className="text-[11px] font-black text-secondary">{fmtG(entry.pureGoldOut)}</p>
                              <p className="text-[7px] uppercase font-black text-outline tracking-widest">Pure Out</p>
                            </div>
                            <div className="w-px h-4 bg-outline-variant/20"></div>
                            <div className="flex-1 flex flex-col items-center gap-0.5">
                              <p className={`text-[11px] font-black ${entry.pureGoldDue > 0 ? 'text-error' : 'text-primary'}`}>{fmtG(entry.pureGoldDue)}</p>
                              <p className="text-[7px] uppercase font-black text-outline tracking-widest">Due</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
          </div>
        )}

        {/* Refining Confirmation Modal */}
        {showRefiningConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up">
              <div className="w-16 h-16 rounded-full bg-[#755b00]/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-[#755b00]">local_fire_department</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-center text-primary mb-2">Transfer to Refinery</h3>
              <p className="text-sm text-center text-outline mb-6">
                You are about to transfer <strong className="text-[#755b00] text-base">{fmtG(currentImpureStock)}</strong> of impure gold to the refinery. This action will clear your local impure gold stock balance.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRefiningConfirm(false)}
                  className="flex-1 py-3 bg-surface-container hover:bg-surface-variant text-primary font-bold text-xs uppercase tracking-widest rounded-xl transition-colors active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRefineConfirm}
                  className="flex-1 py-3 bg-[#755b00] hover:bg-[#5a4600] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors active:scale-[0.98] shadow-lg shadow-[#755b00]/20"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white/90 backdrop-blur-xl border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-10px_40px_rgba(0,30,64,0.05)]">
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
        <a onClick={() => navigate('/ledger')} className="flex flex-col items-center gap-1 text-[#003366] font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Ledger</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-[#003366] rounded-full"></div>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
