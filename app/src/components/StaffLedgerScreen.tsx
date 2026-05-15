import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LedgerEntry {
  id: string;
  date: string;
  isoDate: string;
  customerName: string;
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  goldIn: number;       
  goldOut: number;      
  retained: number;     
  amount: number;       
  paymentStatus: 'Paid' | 'Unpaid';
  paymentMethod: 'Cash' | 'UPI';
  purity?: string;
}

const mockEntries: LedgerEntry[] = [
  { id: 'TXN-9824', date: 'Today', isoDate: '2026-05-15', customerName: 'Rajesh Jewelers', workType: 'Tunch', goldIn: 12.45, goldOut: 11.20, retained: 1.25, amount: 45000, paymentStatus: 'Paid', paymentMethod: 'UPI', purity: '91.6%' },
  { id: 'TXN-9823', date: 'Today', isoDate: '2026-05-15', customerName: 'Mehta Gold Traders', workType: 'Marking', goldIn: 80.00, goldOut: 80.00, retained: 0, amount: 112000, paymentStatus: 'Paid', paymentMethod: 'Cash' },
  { id: 'TXN-9826', date: 'Yesterday', isoDate: '2026-05-14', customerName: 'Rajesh Jewelers', workType: 'Marking', goldIn: 60.00, goldOut: 60.00, retained: 0, amount: 84000, paymentStatus: 'Unpaid', paymentMethod: 'Cash' },
  { id: 'TXN-9820', date: 'Yesterday', isoDate: '2026-05-14', customerName: 'Sunrise Ornaments', workType: 'Shouldering', goldIn: 22.30, goldOut: 20.10, retained: 2.20, amount: 85500, paymentStatus: 'Unpaid', paymentMethod: 'UPI' },
  { id: 'TXN-9819', date: 'Yesterday', isoDate: '2026-05-14', customerName: 'Rajesh Jewelers', workType: 'Marking', goldIn: 15.00, goldOut: 15.00, retained: 0, amount: 12000, paymentStatus: 'Paid', paymentMethod: 'UPI' },
  { id: 'TXN-9825', date: 'Oct 10', isoDate: '2025-10-10', customerName: 'Rajesh Jewelers', workType: 'Tunch', goldIn: 25.00, goldOut: 22.50, retained: 2.50, amount: 40500, paymentStatus: 'Unpaid', paymentMethod: 'UPI', purity: '90.0%' },
  { id: 'TXN-9818', date: 'Oct 8', isoDate: '2025-10-08', customerName: 'Kalyan Traders', workType: 'Tunch', goldIn: 500.00, goldOut: 462.50, retained: 37.50, amount: 185000, paymentStatus: 'Paid', paymentMethod: 'Cash', purity: '92.5%' },
];

const openingGoldStock = 125.50;

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
    if (activeFilter === 'Paid') matchFilter = e.paymentStatus === 'Paid';
    if (activeFilter === 'Unpaid') matchFilter = e.paymentStatus === 'Unpaid';
    if (activeFilter === 'Cash') matchFilter = e.paymentMethod === 'Cash';
    if (activeFilter === 'UPI') matchFilter = e.paymentMethod === 'UPI';
    if (activeFilter === 'Tunch') matchFilter = e.workType === 'Tunch';

    return matchText && matchFrom && matchTo && matchFilter;
  });

  const totalGoldIn    = filtered.reduce((s, e) => s + e.goldIn, 0);
  const totalGoldOut   = filtered.reduce((s, e) => s + e.goldOut, 0);
  const totalRetained  = filtered.reduce((s, e) => s + e.retained, 0);
  const closingStock   = openingGoldStock + totalGoldIn - totalGoldOut;
  const totalRevenue   = filtered.filter(e => e.paymentStatus === 'Paid').reduce((s, e) => s + e.amount, 0);
  const totalDues      = filtered.filter(e => e.paymentStatus === 'Unpaid').reduce((s, e) => s + e.amount, 0);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtG = (n: number) => `${n.toFixed(3)}g`;

  const getWorkIcon = (w: string) => w === 'Tunch' ? 'science' : w === 'Marking' ? 'verified' : 'precision_manufacturing';

  return (
    <div className="bg-background ambient-bg text-on-background font-body w-full h-[100dvh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 max-w-5xl mx-auto pt-8 pb-32 relative space-y-6">

        {/* Header */}
        {!selectedEntry && (
          <header className="flex justify-between items-end mb-4 animate-fade-in">
            <div>
              <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Operational Ledger</h1>
              <p className="text-xs text-outline font-medium">System-wide gold & cash reconciliation</p>
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
              <div className="bg-gradient-to-br from-[#003366] to-[#001e40] p-6 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mb-1">Transaction Detail</p>
                    <h2 className="font-headline text-3xl font-extrabold text-white">{fmt(selectedEntry.amount)}</h2>
                    <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mt-1">{selectedEntry.id}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-2xl drop-shadow-md">{getWorkIcon(selectedEntry.workType)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6 bg-white">
                <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-b border-outline-variant/20 pb-5">
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Customer</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.customerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Date</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Work Type</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.workType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Status</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedEntry.paymentStatus === 'Unpaid' ? 'bg-error' : 'bg-secondary'}`}></span>
                      <p className={`font-headline text-sm font-bold ${selectedEntry.paymentStatus === 'Unpaid' ? 'text-error' : 'text-secondary'}`}>{selectedEntry.paymentStatus}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-3">Gold Flow Reconciliation</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#F8FAFC] border border-outline-variant/20 rounded-xl p-3 text-center">
                      <p className="font-headline text-base font-bold text-primary">{fmtG(selectedEntry.goldIn)}</p>
                      <p className="text-[8px] uppercase tracking-widest text-outline font-bold mt-0.5">Gross In</p>
                    </div>
                    <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3 text-center">
                      <p className="font-headline text-base font-bold text-secondary">{fmtG(selectedEntry.goldOut)}</p>
                      <p className="text-[8px] uppercase tracking-widest text-outline font-bold mt-0.5">Net Out</p>
                    </div>
                    <div className="bg-error/5 border border-error/20 rounded-xl p-3 text-center">
                      <p className="font-headline text-base font-bold text-error">{fmtG(selectedEntry.retained)}</p>
                      <p className="text-[8px] uppercase tracking-widest text-outline font-bold mt-0.5">Retained</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedEntry && (
          <div className="space-y-6 animate-fade-in">
            {/* Master Audit Summary */}
            <div className="luxury-card overflow-hidden bg-white border-none shadow-xl glow-primary">
              <div className="bg-[#003366] p-6 text-white relative">
                <div className="absolute inset-0 sapphire-leak opacity-30"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Gold Inventory Audit</p>
                    <span className="material-symbols-outlined text-[#F6C358] glow-icon">security</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Opening Stock</p>
                      <p className="font-headline text-2xl font-bold text-[#F6C358]">{fmtG(openingGoldStock)}</p>
                    </div>
                    <span className="material-symbols-outlined text-white/20 pb-1">trending_flat</span>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Closing Stock</p>
                      <p className="font-headline text-2xl font-bold text-white">{fmtG(closingStock)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-outline-variant/15 bg-white">
                <div className="p-4 text-center">
                  <p className="text-[13px] font-bold text-primary">{fmtG(totalGoldIn)}</p>
                  <p className="text-[8px] uppercase font-bold text-outline tracking-widest mt-0.5">Total In</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[13px] font-bold text-secondary">{fmtG(totalGoldOut)}</p>
                  <p className="text-[8px] uppercase font-bold text-outline tracking-widest mt-0.5">Total Out</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[13px] font-bold text-error">{fmtG(totalRetained)}</p>
                  <p className="text-[8px] uppercase font-bold text-outline tracking-widest mt-0.5">Retained</p>
                </div>
              </div>
            </div>

            {/* Financial Reconciliation Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="luxury-card p-5 relative overflow-hidden bg-white hover:-translate-y-1 transition-transform">
                <div className="absolute top-0 right-0 w-12 h-12 bg-secondary/5 rounded-bl-full"></div>
                <p className="text-[9px] font-bold text-outline uppercase tracking-widest mb-3">Net Revenue</p>
                <p className="text-xl font-bold text-primary tracking-tight">{fmt(totalRevenue)}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
                  <p className="text-[8px] font-bold text-secondary uppercase tracking-widest">Settled</p>
                </div>
              </div>
              <div className="luxury-card p-5 relative overflow-hidden bg-white hover:-translate-y-1 transition-transform">
                <div className={`absolute top-0 right-0 w-12 h-12 ${totalDues > 0 ? 'bg-error/5' : 'bg-outline-variant/5'} rounded-bl-full`}></div>
                <p className="text-[9px] font-bold text-outline uppercase tracking-widest mb-3">Total Dues</p>
                <p className={`text-xl font-bold tracking-tight ${totalDues > 0 ? 'text-error' : 'text-primary'}`}>{fmt(totalDues)}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${totalDues > 0 ? 'bg-error animate-pulse' : 'bg-outline-variant'}`}></div>
                  <p className={`text-[8px] font-bold uppercase tracking-widest ${totalDues > 0 ? 'text-error' : 'text-outline'}`}>{totalDues > 0 ? 'Outstanding' : 'Cleared'}</p>
                </div>
              </div>
            </div>

            {/* Audit Filters */}
            <div className="space-y-4">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-outline text-lg transition-colors group-focus-within:text-primary">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Audit by client or transaction ID..."
                  className="w-full bg-white border border-outline-variant/30 rounded-full py-4 pl-14 pr-12 text-sm font-medium text-primary placeholder-outline focus:outline-none input-sapphire-focus shadow-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-background px-1.5 text-outline font-bold uppercase tracking-widest z-10">From Date</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-base pointer-events-none group-focus-within:text-primary">calendar_month</span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 pl-11 pr-4 text-[11px] font-bold text-primary focus:outline-none focus:border-primary transition-all" />
                  </div>
                </div>
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-background px-1.5 text-outline font-bold uppercase tracking-widest z-10">To Date</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-base pointer-events-none group-focus-within:text-primary">calendar_month</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 pl-11 pr-4 text-[11px] font-bold text-primary focus:outline-none focus:border-primary transition-all" />
                  </div>
                </div>
              </div>

              {/* Advanced Audit Chips */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <FilterChip label="Paid" icon="check_circle" value="Paid" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                <FilterChip label="Unpaid" icon="error" value="Unpaid" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                <FilterChip label="UPI" icon="account_balance_wallet" value="UPI" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                <FilterChip label="Cash" icon="payments" value="Cash" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                <FilterChip label="Tunch" icon="science" value="Tunch" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
              </div>
            </div>

            {/* Audit Log Entries */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <p className="label-institutional text-outline uppercase">Audit Log</p>
                <div className="bg-white/50 backdrop-blur px-3 py-1 rounded-full border border-outline-variant/20">
                  <p className="text-[9px] text-primary font-bold uppercase tracking-wider">{filtered.length} Records Found</p>
                </div>
              </div>

              <div className="space-y-3">
                {filtered.map(entry => {
                  const isPaid = entry.paymentStatus === 'Paid';
                  return (
                    <div 
                      key={entry.id} 
                      onClick={() => setSelectedEntry(entry)} 
                      className="luxury-card p-5 bg-white active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${!isPaid ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>
                            <span className="material-symbols-outlined text-lg">{getWorkIcon(entry.workType)}</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm text-primary group-hover:text-[#003366] transition-colors">{entry.customerName}</p>
                            <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">{entry.id} • {entry.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{fmt(entry.amount)}</p>
                          <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${isPaid ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error animate-pulse'}`}>
                             {entry.paymentStatus}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 px-3 py-3 bg-[#F8FAFC] rounded-2xl border border-outline-variant/10">
                        <div className="flex-1 flex flex-col items-center gap-0.5">
                          <p className="text-[10px] font-bold text-primary">{fmtG(entry.goldIn)}</p>
                          <p className="text-[7px] uppercase font-bold text-outline tracking-widest">In</p>
                        </div>
                        <div className="w-px h-4 bg-outline-variant/20"></div>
                        <div className="flex-1 flex flex-col items-center gap-0.5">
                          <p className="text-[10px] font-bold text-secondary">{fmtG(entry.goldOut)}</p>
                          <p className="text-[7px] uppercase font-bold text-outline tracking-widest">Out</p>
                        </div>
                        <div className="w-px h-4 bg-outline-variant/20"></div>
                        <div className="flex-1 flex flex-col items-center gap-0.5">
                          <p className="text-[10px] font-bold text-error">{fmtG(entry.retained)}</p>
                          <p className="text-[7px] uppercase font-bold text-outline tracking-widest">Fee</p>
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
