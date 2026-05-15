import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LedgerEntry {
  id: string;
  date: string;
  isoDate: string;
  customerName: string;
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  goldIn: number;       // impure gold received (grams)
  goldOut: number;      // pure gold returned (grams)
  retained: number;     // gold retained as charges (grams)
  amount: number;       // amount in rupees
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

const openingGoldStock = 125.50; // grams — opening balance for the period

export const StaffLedgerScreen: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const filtered = mockEntries.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchText = !q || e.customerName.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.workType.toLowerCase().includes(q) || e.paymentStatus.toLowerCase().includes(q);
    const matchFrom = !startDate || e.isoDate >= startDate;
    const matchTo = !endDate || e.isoDate <= endDate;
    return matchText && matchFrom && matchTo;
  });

  // Computed totals from filtered entries
  const totalGoldIn    = filtered.reduce((s, e) => s + e.goldIn, 0);
  const totalGoldOut   = filtered.reduce((s, e) => s + e.goldOut, 0);
  const totalRetained  = filtered.reduce((s, e) => s + e.retained, 0);
  const closingStock   = openingGoldStock + totalGoldIn - totalGoldOut;
  const totalRevenue   = filtered.filter(e => e.paymentStatus === 'Paid').reduce((s, e) => s + e.amount, 0);
  const totalDues      = filtered.filter(e => e.paymentStatus === 'Unpaid').reduce((s, e) => s + e.amount, 0);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtG = (n: number) => `${n.toFixed(2)}g`;

  const getWorkIcon = (w: string) => w === 'Tunch' ? 'science' : w === 'Marking' ? 'verified' : 'precision_manufacturing';

  return (
    <div className="bg-background text-on-background font-body w-full h-[100dvh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 max-w-5xl mx-auto pt-8 pb-32 relative space-y-6">

        {/* Header */}
        {!selectedEntry && (
          <header className="flex justify-between items-end">
            <div>
              <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Gold Ledger</h1>
              <p className="text-xs text-outline font-medium">Complete stock & financial record</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse border border-white"></span>
            </button>
          </header>
        )}

        {/* Detail View */}
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
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mb-1">Ledger Entry</p>
                    <h2 className="font-headline text-3xl font-extrabold text-[#F6C358]">{fmt(selectedEntry.amount)}</h2>
                    <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mt-1">{selectedEntry.id}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-2xl">{getWorkIcon(selectedEntry.workType)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-b border-outline-variant/20 pb-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Customer</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Date</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.date}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Work Type</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedEntry.workType}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Payment</p>
                    <p className={`font-headline text-sm font-bold ${selectedEntry.paymentStatus === 'Unpaid' ? 'text-error' : 'text-secondary'}`}>{selectedEntry.paymentStatus} • {selectedEntry.paymentMethod}</p>
                  </div>
                </div>

                {/* Gold Flow Section */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-3">Gold Movement</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#FFF8E7] border border-[#C9A646]/20 rounded-xl p-3 text-center">
                      <span className="material-symbols-outlined text-[#C9A646] text-lg mb-1">input</span>
                      <p className="font-headline text-base font-bold text-[#755b00]">{fmtG(selectedEntry.goldIn)}</p>
                      <p className="text-[8px] uppercase tracking-widest text-outline font-bold mt-0.5">Gold In</p>
                    </div>
                    <div className="bg-surface-container/30 border border-outline-variant/20 rounded-xl p-3 text-center">
                      <span className="material-symbols-outlined text-primary text-lg mb-1">output</span>
                      <p className="font-headline text-base font-bold text-primary">{fmtG(selectedEntry.goldOut)}</p>
                      <p className="text-[8px] uppercase tracking-widest text-outline font-bold mt-0.5">Gold Out</p>
                    </div>
                    <div className="bg-error/5 border border-error/20 rounded-xl p-3 text-center">
                      <span className="material-symbols-outlined text-error text-lg mb-1">remove_circle</span>
                      <p className="font-headline text-base font-bold text-error">{fmtG(selectedEntry.retained)}</p>
                      <p className="text-[8px] uppercase tracking-widest text-outline font-bold mt-0.5">Retained</p>
                    </div>
                  </div>
                  {selectedEntry.purity && (
                    <div className="mt-3 bg-[#FFF8E7] border border-[#C9A646]/20 rounded-xl p-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#C9A646]">verified</span>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Tested Purity</p>
                        <p className="font-headline text-lg font-bold text-[#755b00]">{selectedEntry.purity}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Ledger View */}
        {!selectedEntry && (
          <div className="space-y-5 animate-fade-in">

            {/* Opening / Closing Stock Banner */}
            <div className="luxury-card overflow-hidden">
              <div className="bg-gradient-to-r from-[#003366] to-[#004a8f] p-5 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#C9A646]/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mb-3">Period Gold Stock</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-1">Opening Stock</p>
                    <p className="font-headline text-2xl font-extrabold text-[#F6C358]">{fmtG(openingGoldStock)}</p>
                  </div>
                  <div className="text-center">
                    <span className="material-symbols-outlined text-white/40 text-xl">arrow_forward</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-1">Closing Stock</p>
                    <p className="font-headline text-2xl font-extrabold text-white">{fmtG(closingStock)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-outline-variant/20 bg-white">
                <div className="p-4 text-center">
                  <span className="material-symbols-outlined text-[#C9A646] text-lg glow-icon">input</span>
                  <p className="font-headline text-base font-bold text-[#755b00] mt-1">{fmtG(totalGoldIn)}</p>
                  <p className="text-[8px] uppercase tracking-widest text-outline font-bold mt-0.5">Total In</p>
                </div>
                <div className="p-4 text-center">
                  <span className="material-symbols-outlined text-primary text-lg glow-icon">output</span>
                  <p className="font-headline text-base font-bold text-primary mt-1">{fmtG(totalGoldOut)}</p>
                  <p className="text-[8px] uppercase tracking-widest text-outline font-bold mt-0.5">Total Out</p>
                </div>
                <div className="p-4 text-center">
                  <span className="material-symbols-outlined text-error text-lg glow-icon">remove_circle</span>
                  <p className="font-headline text-base font-bold text-error mt-1">{fmtG(totalRetained)}</p>
                  <p className="text-[8px] uppercase tracking-widest text-outline font-bold mt-0.5">Retained</p>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="luxury-card p-5 relative overflow-hidden hover:-translate-y-0.5 transition-transform">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">Revenue</p>
                  <div className="w-8 h-8 rounded-full bg-secondary-fixed/30 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[16px] glow-icon">payments</span>
                  </div>
                </div>
                <p className="font-headline text-xl font-bold text-primary tracking-tight">{fmt(totalRevenue)}</p>
                <p className="text-[9px] text-outline font-bold uppercase tracking-wider mt-1">Total Collected</p>
              </div>

              <div className="luxury-card p-5 relative overflow-hidden hover:-translate-y-0.5 transition-transform">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${totalDues > 0 ? 'bg-error' : 'bg-outline-variant'}`}></div>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">Dues</p>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${totalDues > 0 ? 'bg-error-container/30 text-error' : 'bg-surface-container text-outline'}`}>
                    <span className="material-symbols-outlined text-[16px] glow-icon">{totalDues > 0 ? 'warning' : 'check_circle'}</span>
                  </div>
                </div>
                <p className={`font-headline text-xl font-bold tracking-tight ${totalDues > 0 ? 'text-error' : 'text-primary'}`}>{fmt(totalDues)}</p>
                <p className="text-[9px] text-outline font-bold uppercase tracking-wider mt-1">Outstanding</p>
              </div>
            </div>

            {/* Search & Date Filters */}
            <div className="space-y-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search customer, work type, ID..."
                  className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-10 text-sm font-medium text-primary placeholder-outline focus:outline-none input-sapphire-focus luxury-card transition-all"
                />
                {searchQuery && (
                  <span onClick={() => setSearchQuery('')} className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline text-lg cursor-pointer hover:text-primary">close</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 relative mt-1 group">
                  <span className="text-[8px] absolute -top-2 left-3 bg-background px-1.5 text-outline font-bold uppercase tracking-widest z-10 rounded-sm">From Date</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/50 text-[16px] pointer-events-none group-focus-within:text-primary transition-colors">calendar_month</span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border border-outline-variant/50 rounded-xl py-3 pl-9 pr-3 text-xs font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 premium-shadow transition-all" />
                  </div>
                </div>
                <div className="flex-1 relative mt-1 group">
                  <span className="text-[8px] absolute -top-2 left-3 bg-background px-1.5 text-outline font-bold uppercase tracking-widest z-10 rounded-sm">To Date</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/50 text-[16px] pointer-events-none group-focus-within:text-primary transition-colors">calendar_month</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white border border-outline-variant/50 rounded-xl py-3 pl-9 pr-3 text-xs font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 premium-shadow transition-all" />
                  </div>
                </div>
                {(startDate || endDate) && (
                  <button onClick={() => { setStartDate(''); setEndDate(''); }} className="w-10 h-10 mt-1 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0 border border-error/20 active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ledger Entry List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold">Ledger Entries</h3>
                <span className="text-[10px] text-outline font-medium">{filtered.length} records</span>
              </div>

              <div className="luxury-card overflow-hidden divide-y divide-outline-variant/15 border border-outline-variant/20">
                {filtered.map(entry => {
                  const isPaid = entry.paymentStatus === 'Paid';
                  return (
                    <div key={entry.id} onClick={() => setSelectedEntry(entry)} className={`p-4 cursor-pointer group transition-colors ${!isPaid ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surface-bright'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!isPaid ? 'bg-error-container/30 text-error' : 'bg-[#FFF8E7] text-[#755b00]'}`}>
                            <span className="material-symbols-outlined text-sm">{getWorkIcon(entry.workType)}</span>
                          </div>
                          <div>
                            <p className={`font-headline font-bold text-xs ${!isPaid ? 'text-error' : 'text-primary'}`}>{entry.customerName}</p>
                            <p className="text-[9px] text-outline font-bold tracking-widest uppercase">{entry.id} • {entry.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-headline text-sm font-bold ${!isPaid ? 'text-error' : 'text-primary'}`}>{fmt(entry.amount)}</p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            {!isPaid && <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>}
                            <p className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${!isPaid ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>{entry.paymentStatus}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pl-12 text-[9px] text-outline font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px] text-[#C9A646]">input</span>
                          {fmtG(entry.goldIn)}
                        </span>
                        <span className="text-outline/40">→</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px] text-primary">output</span>
                          {fmtG(entry.goldOut)}
                        </span>
                        {entry.retained > 0 && (
                          <>
                            <span className="text-outline/40">•</span>
                            <span className="flex items-center gap-1 text-error">
                              <span className="material-symbols-outlined text-[10px]">remove_circle</span>
                              {fmtG(entry.retained)}
                            </span>
                          </>
                        )}
                        {entry.purity && (
                          <>
                            <span className="text-outline/40">•</span>
                            <span className="text-[#755b00]">{entry.purity}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="p-10 text-center text-outline text-sm font-medium">No ledger entries found.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
        </a>
        <a onClick={() => navigate('/billing')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
        </a>
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
        </a>
        <a onClick={() => navigate('/ledger')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Ledger</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
