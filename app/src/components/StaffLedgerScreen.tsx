import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LedgerEntry {
  id: string;
  date: string;
  isoDate: string;
  customerName: string;
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  transactionType: 'settled' | 'test-only' | 'cash-out'; 
  settlementLocation: 'Front' | 'Back';
  goldIn: number;       
  goldOut: number;      
  retained: number;     
  amount: number;       
  paymentStatus: 'Paid' | 'Unpaid';
  paymentMethod: 'Cash' | 'UPI';
  purity?: string;
}

const mockEntries: LedgerEntry[] = [
  { id: 'TXN-9824', date: 'Today', isoDate: '2026-05-15', customerName: 'Rajesh Jewelers', workType: 'Tunch', transactionType: 'settled', settlementLocation: 'Front', goldIn: 12.450, goldOut: 11.200, retained: 1.250, amount: 45000, paymentStatus: 'Paid', paymentMethod: 'UPI', purity: '91.6%' },
  { id: 'TXN-9823', date: 'Today', isoDate: '2026-05-15', customerName: 'Mehta Gold Traders', workType: 'Marking', transactionType: 'settled', settlementLocation: 'Front', goldIn: 80.000, goldOut: 80.000, retained: 0, amount: 112000, paymentStatus: 'Paid', paymentMethod: 'Cash' },
  { id: 'TXN-9826', date: 'Yesterday', isoDate: '2026-05-14', customerName: 'Gopal & Sons', workType: 'Tunch', transactionType: 'test-only', settlementLocation: 'Front', goldIn: 25.000, goldOut: 0, retained: 0, amount: 500, paymentStatus: 'Paid', paymentMethod: 'Cash' },
  { id: 'TXN-9830', date: 'Yesterday', isoDate: '2026-05-14', customerName: 'Kalyan Jewelers', workType: 'Tunch', transactionType: 'cash-out', settlementLocation: 'Front', goldIn: 45.000, goldOut: 0, retained: 0, amount: 285000, paymentStatus: 'Paid', paymentMethod: 'Cash', purity: '90.0%' }, 
  { id: 'TXN-9831', date: 'Yesterday', isoDate: '2026-05-14', customerName: 'Apex Bullion', workType: 'Tunch', transactionType: 'cash-out', settlementLocation: 'Back', goldIn: 120.000, goldOut: 0, retained: 0, amount: 742000, paymentStatus: 'Paid', paymentMethod: 'Cash', purity: '92.0%' }, 
  { id: 'TXN-9820', date: 'Yesterday', isoDate: '2026-05-14', customerName: 'Sunrise Ornaments', workType: 'Shouldering', transactionType: 'settled', settlementLocation: 'Front', goldIn: 22.300, goldOut: 20.100, retained: 2.200, amount: 85500, paymentStatus: 'Unpaid', paymentMethod: 'UPI' },
];

const openingPureStock = 2500.000;

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const filtered = mockEntries.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchText = !q || e.customerName.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
    const matchFrom = !startDate || e.isoDate >= startDate;
    const matchTo = !endDate || e.isoDate <= endDate;
    
    let matchFilter = true;
    if (activeFilter === 'Settled') matchFilter = e.transactionType === 'settled';
    if (activeFilter === 'Cash Out') matchFilter = e.transactionType === 'cash-out';
    if (activeFilter === 'Test Only') matchFilter = e.transactionType === 'test-only';

    return matchText && matchFrom && matchTo && matchFilter;
  });

  const totalImpure    = filtered.filter(e => e.transactionType !== 'test-only').reduce((s, e) => s + e.goldIn, 0);
  const totalPureGiven = filtered.reduce((s, e) => s + e.goldOut, 0);
  const closingPureStock = openingPureStock - totalPureGiven;
  
  const totalRevenue   = filtered.filter(e => e.paymentStatus === 'Paid' && e.transactionType !== 'cash-out').reduce((s, e) => s + e.amount, 0);
  const totalDues      = filtered.filter(e => e.paymentStatus === 'Unpaid').reduce((s, e) => s + e.amount, 0);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtHidden = () => `₹ ••••`;
  const fmtG = (n: number) => `${n.toFixed(3)}g`;

  return (
    <div className="bg-background ambient-bg text-on-background font-body w-full h-[100dvh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 max-w-5xl mx-auto pt-8 pb-32 relative space-y-6">

        {/* Header */}
        {!selectedEntry && (
          <header className="flex justify-between items-end mb-4 animate-fade-in">
            <div>
              <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Audit Ledger</h1>
              <p className="text-xs text-outline font-medium">Internal Inventory & Cash Settlement</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse border border-white"></span>
            </button>
          </header>
        )}

        {selectedEntry && (
          <div className="animate-fade-in space-y-6">
            <button onClick={() => setSelectedEntry(null)} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Ledger
            </button>

            <div className="luxury-card overflow-hidden">
              <div className={`p-6 text-white relative ${selectedEntry.transactionType === 'cash-out' ? 'bg-gradient-to-br from-emerald-700 to-emerald-900' : selectedEntry.transactionType === 'test-only' ? 'bg-gradient-to-br from-slate-600 to-slate-800' : 'bg-gradient-to-br from-[#003366] to-[#001e40]'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mb-1">
                      {selectedEntry.transactionType === 'cash-out' ? `Cash Settlement (${selectedEntry.settlementLocation})` : selectedEntry.transactionType === 'test-only' ? 'Audit Holding' : 'Gold Exchange'}
                    </p>
                    <h2 className="font-headline text-3xl font-extrabold text-white">
                      {selectedEntry.transactionType === 'cash-out' ? fmtHidden() : fmt(selectedEntry.amount)}
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mt-1">{selectedEntry.id}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-2xl">{selectedEntry.transactionType === 'cash-out' ? 'currency_rupee' : 'swap_horiz'}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6 bg-white">
                <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-b border-outline-variant/20 pb-5">
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Client</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.customerName}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Audit Loc.</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.settlementLocation} Side</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Weight In</p>
                    <p className="font-headline text-sm font-bold text-primary">{fmtG(selectedEntry.goldIn)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Weight Out</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.goldOut > 0 ? fmtG(selectedEntry.goldOut) : 'No Pure Taken'}</p>
                  </div>
                </div>
                
                {selectedEntry.transactionType === 'cash-out' && (
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-600">verified</span>
                    <p className="text-[11px] text-emerald-800 font-bold uppercase tracking-wide">
                      This transaction was settled via Cash from the Back Side. Financial details are restricted.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!selectedEntry && (
          <div className="space-y-6 animate-fade-in">
            {/* Pure Gold Vault Summary */}
            <div className="luxury-card overflow-hidden bg-white border-none shadow-xl glow-primary">
              <div className="bg-[#003366] p-6 text-white relative">
                <div className="absolute inset-0 sapphire-leak opacity-30"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Pure Gold Audit</p>
                    <span className="material-symbols-outlined text-[#F6C358] glow-icon">account_balance</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Vault Start</p>
                      <p className="font-headline text-2xl font-bold text-[#F6C358]">{fmtG(openingPureStock)}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Vault End</p>
                      <p className="font-headline text-2xl font-bold text-white">{fmtG(closingPureStock)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-outline-variant/15 bg-white">
                <div className="p-4 text-center">
                  <p className="text-[14px] font-bold text-primary">{fmtG(totalImpure)}</p>
                  <p className="text-[8px] uppercase font-bold text-outline tracking-widest mt-0.5">Total Impure</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[14px] font-bold text-secondary">{fmtG(totalPureGiven)}</p>
                  <p className="text-[8px] uppercase font-bold text-outline tracking-widest mt-0.5">Pure Disbursed</p>
                </div>
              </div>
            </div>

            {/* Financial Status Section (Restricted amounts handled here) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="luxury-card p-5 bg-white">
                <p className="text-[9px] font-bold text-outline uppercase tracking-widest mb-3">Revenue (Front)</p>
                <p className="text-xl font-bold text-primary tracking-tight">{fmt(totalRevenue)}</p>
                <p className="text-[8px] font-bold text-secondary uppercase tracking-widest mt-2">Exchanges Only</p>
              </div>
              <div className="luxury-card p-5 bg-white">
                <p className="text-[9px] font-bold text-outline uppercase tracking-widest mb-3">Dues</p>
                <p className={`text-xl font-bold tracking-tight ${totalDues > 0 ? 'text-error' : 'text-primary'}`}>{fmt(totalDues)}</p>
                <p className={`text-[8px] font-bold uppercase tracking-widest mt-2 ${totalDues > 0 ? 'text-error' : 'text-outline'}`}>{totalDues > 0 ? 'Pending' : 'Clear'}</p>
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
                  placeholder="Audit customer, staff or transaction ID..."
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
                <FilterChip label="Exchanged" icon="swap_horiz" value="Settled" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                <FilterChip label="Cash Out" icon="currency_rupee" value="Cash Out" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                <FilterChip label="Test Only" icon="science" value="Test Only" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
              </div>
            </div>

            {/* Audit Log Entries */}
            <div className="space-y-3">
              <p className="label-institutional text-outline uppercase px-1">Internal Audit Log</p>
              
              <div className="space-y-3">
                {filtered.map(entry => {
                  const isCashOut = entry.transactionType === 'cash-out';
                  const isTest = entry.transactionType === 'test-only';
                  return (
                    <div 
                      key={entry.id} 
                      onClick={() => setSelectedEntry(entry)} 
                      className="luxury-card p-5 bg-white active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden"
                    >
                      {isCashOut && <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-600 text-[7px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-emerald-100">Cashed Out ({entry.settlementLocation})</div>}
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isCashOut ? 'bg-emerald-50 text-emerald-600' : isTest ? 'bg-slate-100 text-slate-500' : 'bg-secondary/10 text-secondary'}`}>
                            <span className="material-symbols-outlined text-xl">{isCashOut ? 'currency_rupee' : isTest ? 'science' : 'swap_horiz'}</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm text-primary">{entry.customerName}</p>
                            <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">{entry.id} • {entry.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{isCashOut ? fmtHidden() : fmt(entry.amount)}</p>
                          <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${isCashOut ? 'text-emerald-600' : isTest ? 'text-slate-400' : 'text-secondary'}`}>
                            {isCashOut ? 'CLOSED' : isTest ? 'HOLDING' : 'SETTLED'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 px-3 py-3 bg-[#F8FAFC] rounded-2xl border border-outline-variant/10">
                        <div className="flex-1 flex flex-col items-center gap-0.5">
                          <p className="text-[11px] font-black text-primary">{fmtG(entry.goldIn)}</p>
                          <p className="text-[7px] uppercase font-black text-outline tracking-widest">Inflow</p>
                        </div>
                        <div className="w-px h-4 bg-outline-variant/20"></div>
                        <div className="flex-1 flex flex-col items-center gap-0.5">
                          <p className="text-[11px] font-black text-secondary">{entry.goldOut > 0 ? fmtG(entry.goldOut) : 'None'}</p>
                          <p className="text-[7px] uppercase font-black text-outline tracking-widest">Pure Out</p>
                        </div>
                        <div className="w-px h-4 bg-outline-variant/20"></div>
                        <div className="flex-1 flex flex-col items-center gap-0.5">
                          <p className={`text-[11px] font-black ${entry.purity ? 'text-[#755b00]' : 'text-slate-400'}`}>{entry.purity || 'N/A'}</p>
                          <p className="text-[7px] uppercase font-black text-outline tracking-widest">Purity</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FAB - Global Plus Icon */}
      <button className="fixed bottom-28 right-8 w-16 h-16 bg-primary text-on-primary rounded-full shadow-[0_8px_30px_rgb(0,30,64,0.4)] backdrop-blur-sm flex items-center justify-center active:scale-95 transition-all z-50 border-2 border-white/10">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

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
