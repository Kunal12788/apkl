import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type TabView = 'all' | 'customer';

interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'UPI' | 'Cash';
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  amount: string;
  date: string;
  isoDate: string;
  timestamp: string;
  status: 'Paid' | 'Unpaid';
  details: string;
}

const getWorkIcon = (workType: string) => {
  switch(workType) {
    case 'Tunch': return 'science';
    case 'Marking': return 'verified';
    case 'Shouldering': return 'precision_manufacturing';
    default: return 'work';
  }
};

const getWorkColor = (workType: string) => {
  switch(workType) {
    case 'Tunch': return 'text-tertiary bg-tertiary-fixed/30';
    case 'Marking': return 'text-secondary bg-secondary-fixed/30';
    case 'Shouldering': return 'text-primary bg-primary-fixed/30';
    default: return 'text-outline bg-surface-container';
  }
};


export const CollectionStaffBillingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  const activeTab = (searchParams.get('tab') as TabView) || 'all';

  const mockTransactions: Transaction[] = [
    { id: 'TXN-9826', customerId: 'CUST-001', customerName: 'Rajesh Jewelers', type: 'Cash', workType: 'Marking', amount: '₹84,000', date: 'Yesterday', isoDate: '2026-05-14', timestamp: '04:30 PM', status: 'Unpaid', details: 'Collection fee for 12 necklaces.' },
    { id: 'TXN-9824', customerId: 'CUST-001', customerName: 'Rajesh Jewelers', type: 'UPI', workType: 'Tunch', amount: '₹4,500', date: 'Today', isoDate: '2026-05-15', timestamp: '10:45 AM', status: 'Paid', details: 'Collection intake for 5 gold biscuits.' },
    { id: 'TXN-9823', customerId: 'CUST-002', customerName: 'Mehta Gold Traders', type: 'Cash', workType: 'Marking', amount: '₹12,000', date: 'Today', isoDate: '2026-05-15', timestamp: '09:12 AM', status: 'Paid', details: 'Field intake fee.' }
  ];

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-40 relative">
        <header className="flex justify-between items-start mb-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Field Billings</h1>
            <p className="text-xs text-outline font-medium">Manage collection receipts</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
        </header>

        <div className="flex bg-surface-container rounded-full p-1.5 shadow-inner">
          <button onClick={() => setSearchParams({ tab: 'all' })} className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-white premium-shadow text-primary' : 'text-outline'}`}>All</button>
          <button onClick={() => setSearchParams({ tab: 'customer' })} className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'customer' ? 'bg-white premium-shadow text-primary' : 'text-outline'}`}>By Customer</button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search transactions..." className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary luxury-card focus:outline-none" />
          </div>

          <div className="space-y-3">
            {mockTransactions.map(txn => (
              <div key={txn.id} className="luxury-card p-4 border border-outline-variant/10 relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${txn.status === 'Unpaid' ? 'bg-error' : 'bg-secondary'}`}></div>
                <div className="flex justify-between items-start pl-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getWorkColor(txn.workType)}`}>
                      <span className="material-symbols-outlined text-xl">{getWorkIcon(txn.workType)}</span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-sm text-primary">{txn.customerName}</p>
                      <p className="text-[9px] text-outline font-medium tracking-wide uppercase">{txn.id} • {txn.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-headline text-base font-bold text-primary">{txn.amount}</p>
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${txn.status === 'Unpaid' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>{txn.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Home</span>
        </a>
        <a onClick={() => navigate('/billing')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
        </a>
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
