import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

const initialEntries: LedgerEntry[] = [
  { id: 'TXN-9824', date: 'Today', isoDate: '2026-05-15', customerName: 'QWE Customer', transactionType: 'Tunch Only', pureGoldOut: 0, pureGoldDue: 0, impureGoldIn: 0, purity: '91.6%', cashReceived: 0, cashPaid: 0, status: 'No Settlement' },
  { id: 'TXN-9825', date: 'Today', isoDate: '2026-05-15', customerName: 'ASD Customer', transactionType: 'Exchange', pureGoldOut: 50, pureGoldDue: 0, impureGoldIn: 60, purity: '83.33%', cashReceived: 0, cashPaid: 0, status: 'Completed' },
  { id: 'TXN-9826', date: 'Today', isoDate: '2026-05-15', customerName: 'ZXC Customer', transactionType: 'Pending Settlement', pureGoldOut: 0, pureGoldDue: 30, impureGoldIn: 60, purity: '50.0%', cashReceived: 0, cashPaid: 0, status: 'Pending Pure' },
  { id: 'TXN-9827', date: 'Yesterday', isoDate: '2026-05-14', customerName: 'QSX Customer', transactionType: 'Pure Gold Sale', pureGoldOut: 20, pureGoldDue: 0, impureGoldIn: 0, purity: '', cashReceived: 140000, cashPaid: 0, status: 'Completed' },
];

const openingPureStock = 100.000;
const openingImpureStock = 0.000;

const FilterChip = ({ label, icon, value, activeFilter, setActiveFilter }: { label: string, icon: string, value: string, activeFilter: string, setActiveFilter: (val: string) => void }) => {
  const isActive = activeFilter === value;
  return (
    <div 
      onClick={() => setActiveFilter(isActive ? '' : value)} 
      className={`flex items-center gap-1.5 border rounded-full px-4 py-2 flex-shrink-0 premium-shadow cursor-pointer transition-all duration-300 ${isActive ? 'bg-[#003366] border-[#003366] text-white' : 'bg-white border-outline-variant/30 text-primary hover:bg-surface-bright'}`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
};

export const StaffLedgerScreen: React.FC = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id') || 'STAFF-001';
  const isSuperAdmin = userId.startsWith('SUPER-');
  const isAdmin = userId.startsWith('ADMIN-');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const [entries, setEntries] = useState(initialEntries);
  const [showRefiningConfirm, setShowRefiningConfirm] = useState(false);

  const filtered = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchText = !q || e.customerName.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
    const matchFrom = !startDate || e.isoDate >= startDate;
    const matchTo = !endDate || e.isoDate <= endDate;
    
    let matchFilter = true;
    if (activeFilter === 'Tunch Only') matchFilter = e.transactionType === 'Tunch Only';
    if (activeFilter === 'Exchange') matchFilter = e.transactionType === 'Exchange';
    if (activeFilter === 'Pending') matchFilter = e.status.includes('Pending');

    return matchText && matchFrom && matchTo && matchFilter;
  });

  const totalPureGiven = entries.reduce((s, e) => s + e.pureGoldOut, 0);
  const totalImpureReceived = entries.reduce((s, e) => s + e.impureGoldIn, 0);
  const totalImpureRefined = entries.reduce((s, e) => s + (e.impureGoldOut || 0), 0);
  
  const currentPureStock = openingPureStock - totalPureGiven;
  const currentImpureStock = openingImpureStock + totalImpureReceived - totalImpureRefined;
  
  const pendingPureLiability = entries.reduce((s, e) => s + e.pureGoldDue, 0);

  const handleRefineConfirm = () => {
    const newEntry: LedgerEntry = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
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
    setEntries([newEntry, ...entries]);
    setShowRefiningConfirm(false);
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

                {(isSuperAdmin || isAdmin) && selectedEntry.status.includes('Pending') && (
                  <div className="pt-2 flex gap-3">
                    <button className="flex-1 py-3 bg-[#003366] hover:bg-[#001e40] text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-colors shadow-md flex justify-center items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Approve Settlement
                    </button>
                    {isSuperAdmin && (
                      <button className="px-4 py-3 bg-error/10 hover:bg-error/20 text-error font-bold text-[10px] uppercase tracking-widest rounded-xl transition-colors flex justify-center items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!selectedEntry && (
          <div className="space-y-6 animate-fade-in">
            {/* Live Stock Engine Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-secondary shadow-lg">
                <div className="p-5">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Live Pure Stock</p>
                    <span className="material-symbols-outlined text-secondary glow-icon text-lg">diamond</span>
                  </div>
                  <p className="font-headline text-2xl font-bold text-primary">{fmtG(currentPureStock)}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Start: {fmtG(openingPureStock)}</p>
                    {isSuperAdmin && (
                      <button className="text-[8px] uppercase font-bold text-secondary hover:text-primary transition-colors flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">edit</span>
                        Adjust
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-[#755b00] shadow-lg">
                <div className="p-5">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Live Impure Stock</p>
                    <span className="material-symbols-outlined text-[#755b00] glow-icon text-lg">blur_on</span>
                  </div>
                  <p className="font-headline text-2xl font-bold text-primary">{fmtG(currentImpureStock)}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Start: {fmtG(openingImpureStock)}</p>
                    {isSuperAdmin && (
                      <button className="text-[8px] uppercase font-bold text-[#755b00] hover:text-primary transition-colors flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">edit</span>
                        Adjust
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {currentImpureStock > 0 && (
              <div 
                onClick={() => setShowRefiningConfirm(true)}
                className="luxury-card p-4 bg-gradient-to-r from-[#755b00] to-[#5a4600] text-white cursor-pointer active:scale-[0.98] transition-all flex items-center justify-between premium-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <span className="material-symbols-outlined text-xl">local_fire_department</span>
                  </div>
                  <div>
                    <p className="font-headline text-sm font-bold">Given to Refining</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/70 font-medium mt-0.5">Push Stock to Head Office</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
                  <span className="text-[11px] font-bold tracking-wider">{fmtG(currentImpureStock)}</span>
                  <span className="material-symbols-outlined text-sm text-white/70">arrow_forward</span>
                </div>
              </div>
            )}

            {/* Pending Liability Engine */}
            <div className="grid grid-cols-2 gap-4">
              <div className="luxury-card p-5 bg-orange-50 border border-orange-100 relative overflow-hidden">
                <p className="text-[9px] font-bold text-orange-800 uppercase tracking-widest mb-2">Pending Pure Liability</p>
                <p className="text-xl font-bold text-orange-600 tracking-tight">{fmtG(pendingPureLiability)}</p>
                <span className="material-symbols-outlined absolute right-2 -bottom-2 text-5xl text-orange-200 opacity-50">warning</span>
              </div>
              <div className="luxury-card p-5 bg-white border border-outline-variant/20 relative overflow-hidden">
                <p className="text-[9px] font-bold text-outline uppercase tracking-widest mb-2">Total Pure Disbursed</p>
                <p className="text-xl font-bold text-primary tracking-tight">{fmtG(totalPureGiven)}</p>
                <span className="material-symbols-outlined absolute right-2 -bottom-2 text-5xl text-outline-variant opacity-20">arrow_outward</span>
              </div>
            </div>

            {/* Audit Filters */}
            <div className="space-y-4">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search customer or transaction ID..."
                  className="w-full bg-white border border-outline-variant/30 rounded-full py-4 pl-14 pr-12 text-sm font-medium text-primary placeholder-outline focus:outline-none input-sapphire-focus shadow-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-background px-1.5 text-outline font-bold uppercase tracking-widest z-10">Period Start</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-base pointer-events-none group-focus-within:text-primary">calendar_month</span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 pl-11 pr-4 text-[11px] font-bold text-primary focus:outline-none focus:border-primary transition-all" />
                  </div>
                </div>
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-background px-1.5 text-outline font-bold uppercase tracking-widest z-10">Period End</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-base pointer-events-none group-focus-within:text-primary">calendar_month</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 pl-11 pr-4 text-[11px] font-bold text-primary focus:outline-none focus:border-primary transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <FilterChip label="Tunch Only" icon="science" value="Tunch Only" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                <FilterChip label="Exchange" icon="swap_horiz" value="Exchange" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                <FilterChip label="Pending" icon="pending_actions" value="Pending" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
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
          </div>
        )}

        {/* Refining Confirmation Modal */}
        {showRefiningConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up">
              <div className="w-16 h-16 rounded-full bg-[#755b00]/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-[#755b00]">local_fire_department</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-center text-primary mb-2">Send to Refining?</h3>
              <p className="text-sm text-center text-outline mb-6">
                You are about to dispatch <strong className="text-primary">{fmtG(currentImpureStock)}</strong> of Impure Gold to the refinery. This will clear your current impure stock balance and record the dispatch in the ledger for Admin review.
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
                  Confirm Dispatch
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
