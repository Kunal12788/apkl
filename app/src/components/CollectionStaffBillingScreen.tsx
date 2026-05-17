import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type TabView = 'all' | 'customer';

interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  type: 'UPI' | 'Cash' | 'Tunch';
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  amount: string;
  date: string;
  isoDate: string;
  timestamp: string;
  status: 'Paid' | 'Unpaid';
  details: string;
  productType?: string;
  impureWeight?: string;
  settlementCondition?: string;
  logoName?: string;
  carat?: string;
  pieces?: string;
  pointSuggestion?: 'Gold' | 'Silver';
}

interface Customer {
  id: string;
  name: string;
  initials: string;
  activeJobs: number;
  outstanding: string;
  paid: string;
  ledger: Transaction[];
  piecesBreakdown: {
    tunch: number;
    marking: number;
    shouldering: number;
  };
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

// Sleek bottom sheet details modal
interface BillingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  txn: Transaction | null;
}

export const BillingDetailsModal: React.FC<BillingDetailsModalProps> = ({ isOpen, onClose, txn }) => {
  if (!isOpen || !txn) return null;

  const lbl = "text-[10px] font-bold uppercase tracking-[0.14em] text-outline mb-1 block";
  const val = "text-sm font-bold text-primary";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#001e40]/30 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-6 shadow-[0_-12px_40px_rgba(0,30,64,0.15)] relative z-10 max-h-[90vh] overflow-y-auto hide-scrollbar border-t border-outline-variant/10 animate-modal-up">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-surface-container rounded-full mx-auto mb-6" onClick={onClose} />

        <div className="flex justify-between items-start mb-6">
          <div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
              txn.status === 'Paid' ? 'bg-tertiary/5 text-tertiary border-tertiary/20' : 'bg-error/5 text-error border-error/20'
            }`}>
              {txn.status} Status
            </span>
            <h3 className="font-headline text-xl font-bold text-primary mt-3">{txn.id} Receipt</h3>
            <p className="text-xs text-outline font-medium mt-0.5">{txn.date} • {txn.timestamp}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Client profile info */}
          <div className="luxury-card p-5 bg-surface-container-lowest border border-outline-variant/10 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A646]">Entity Profile</p>
            <div>
              <label className={lbl}>Customer</label>
              <p className={val}>{txn.customerName}</p>
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <p className={val}>{txn.customerPhone}</p>
            </div>
            <div>
              <label className={lbl}>Address</label>
              <p className={val}>{txn.customerAddress}</p>
            </div>
          </div>

          {/* Operation specifications */}
          <div className="luxury-card p-5 bg-surface-container-lowest border border-outline-variant/10 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#003366]">Work Specifications</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Operation</label>
                <p className={`${val} uppercase text-secondary`}>{txn.workType}</p>
              </div>
              {txn.productType && (
                <div>
                  <label className={lbl}>Product Category</label>
                  <p className={val}>{txn.productType}</p>
                </div>
              )}
              {txn.impureWeight && (
                <div>
                  <label className={lbl}>Impure Weight</label>
                  <p className={val}>{txn.impureWeight}g</p>
                </div>
              )}
              {txn.settlementCondition && (
                <div>
                  <label className={lbl}>Settlement Mode</label>
                  <p className={val}>{txn.settlementCondition}</p>
                </div>
              )}
              {txn.logoName && (
                <div>
                  <label className={lbl}>Logo Design</label>
                  <p className={val}>{txn.logoName}</p>
                </div>
              )}
              {txn.carat && (
                <div>
                  <label className={lbl}>Carat</label>
                  <p className={val}>{txn.carat.toUpperCase()}</p>
                </div>
              )}
              {txn.pieces && (
                <div>
                  <label className={lbl}>No. of Pieces</label>
                  <p className={val}>{txn.pieces}</p>
                </div>
              )}
              {txn.pointSuggestion && (
                <div>
                  <label className={lbl}>Solder Points</label>
                  <p className={val}>{txn.pointSuggestion} Points Suggested</p>
                </div>
              )}
            </div>
          </div>

          {/* Outstanding/Dues metric */}
          <div className="luxury-card p-5 bg-gradient-to-br from-[#001e40] to-[#003366] text-white relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/5 rounded-full blur-xl -mr-6 -mb-6"></div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Operation Fee / Dues</p>
                <p className="font-headline text-2xl font-bold mt-1">₹ {txn.amount}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#C9A646]">{txn.type} Settlement</p>
                <p className="text-[11px] text-white/50 mt-1 font-medium">{txn.status === 'Paid' ? 'Paid and Cleared' : 'Outstanding Balance'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes modalUp { from { transform: translateY(100%); } to { transform: translateY(0); } } .animate-modal-up { animation: modalUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }`}</style>
    </div>
  );
};

export const CollectionStaffBillingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  
  const activeTab = (searchParams.get('tab') as TabView) || 'all';
  const customerId = searchParams.get('customerId');

  const mockTransactions: Transaction[] = [
    { 
      id: 'TXN-9826', 
      customerId: 'CUST-001', 
      customerName: 'Rajesh Jewelers', 
      customerPhone: '+91 98765 43210',
      customerAddress: '12, Gold Souk, Delhi',
      type: 'Cash', 
      workType: 'Marking', 
      amount: '84,000', 
      date: 'Yesterday', 
      isoDate: '2026-05-14', 
      timestamp: '04:30 PM', 
      status: 'Unpaid', 
      details: 'Collection fee for 12 necklaces.',
      productType: 'Jewellery',
      logoName: 'RJ-Gold',
      carat: '22k',
      pieces: '12'
    },
    { 
      id: 'TXN-9824', 
      customerId: 'CUST-001', 
      customerName: 'Rajesh Jewelers', 
      customerPhone: '+91 98765 43210',
      customerAddress: '12, Gold Souk, Delhi',
      type: 'UPI', 
      workType: 'Tunch', 
      amount: '4,500', 
      date: 'Today', 
      isoDate: '2026-05-15', 
      timestamp: '10:45 AM', 
      status: 'Paid', 
      details: 'Collection intake for gold biscuits.',
      productType: 'Bar',
      impureWeight: '150.25',
      settlementCondition: 'Only Cash (At Front)'
    },
    { 
      id: 'TXN-9823', 
      customerId: 'CUST-002', 
      customerName: 'Mehta Gold Traders', 
      customerPhone: '+91 91234 56789',
      customerAddress: 'Block C, Sector 4, Noida',
      type: 'Cash', 
      workType: 'Shouldering', 
      amount: '12,000', 
      date: 'Today', 
      isoDate: '2026-05-15', 
      timestamp: '09:12 AM', 
      status: 'Paid', 
      details: 'Field intake fee.',
      pieces: '5',
      pointSuggestion: 'Gold'
    }
  ];

  const mockCustomers: Customer[] = [
    { 
      id: 'CUST-001', 
      name: 'Rajesh Jewelers', 
      initials: 'RJ', 
      activeJobs: 14, 
      outstanding: '₹ 84,000', 
      paid: '₹ 4,500', 
      piecesBreakdown: { tunch: 5, marking: 12, shouldering: 0 },
      ledger: mockTransactions.filter(t => t.customerId === 'CUST-001') 
    },
    { 
      id: 'CUST-002', 
      name: 'Mehta Gold Traders', 
      initials: 'MG', 
      activeJobs: 3, 
      outstanding: '₹ 0', 
      paid: '₹ 12,000', 
      piecesBreakdown: { tunch: 0, marking: 0, shouldering: 5 },
      ledger: mockTransactions.filter(t => t.customerId === 'CUST-002') 
    },
  ];

  const selectedCustomer = mockCustomers.find(c => c.id === customerId) || null;
  const filteredCustomers = mockCustomers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTransactions = mockTransactions.filter(t => t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-40 relative">
        <header className="flex justify-between items-start mb-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Field Billings</h1>
            <p className="text-xs text-outline font-medium">Collection Ledger & Receipts</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
        </header>

        {!selectedCustomer && (
          <div className="flex bg-surface-container rounded-full p-1.5 shadow-inner">
            <button onClick={() => setSearchParams({ tab: 'all' })} className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-white premium-shadow text-primary' : 'text-outline'}`}>All</button>
            <button onClick={() => setSearchParams({ tab: 'customer' })} className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'customer' ? 'bg-white premium-shadow text-primary' : 'text-outline'}`}>By Customer</button>
          </div>
        )}

        {selectedCustomer ? (
          <div className="space-y-6 animate-fade-in">
             <button onClick={() => setSearchParams({ tab: 'customer' })} className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest">
               <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Directory
             </button>
             
             {/* Customer Header card */}
             <div className="luxury-card p-5 bg-white border border-outline-variant/10 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#001e40] to-[#003366] text-white flex items-center justify-center font-bold text-xl shadow-md border border-white/10">{selectedCustomer.initials}</div>
                 <div>
                   <h2 className="text-lg font-extrabold text-primary">{selectedCustomer.name}</h2>
                   <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-0.5">Active Jobs: {selectedCustomer.activeJobs}</p>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Dues Outstanding</p>
                 <p className={`text-lg font-black mt-0.5 ${selectedCustomer.outstanding !== '₹ 0' ? 'text-error' : 'text-tertiary'}`}>{selectedCustomer.outstanding}</p>
               </div>
             </div>

             {/* Total Pieces breakdowns separately */}
             <div className="grid grid-cols-3 gap-3">
               {[
                 { label: 'Tunch Pcs', val: selectedCustomer.piecesBreakdown.tunch, icon: 'science', color: 'text-tertiary bg-tertiary/5 border-tertiary/20' },
                 { label: 'Marking Pcs', val: selectedCustomer.piecesBreakdown.marking, icon: 'verified', color: 'text-secondary bg-secondary/5 border-secondary/20' },
                 { label: 'Shoulder Pcs', val: selectedCustomer.piecesBreakdown.shouldering, icon: 'precision_manufacturing', color: 'text-primary bg-primary/5 border-primary/20' }
               ].map((breakdown, idx) => (
                 <div key={idx} className={`luxury-card p-4 border flex flex-col items-center gap-2 ${breakdown.color}`}>
                   <span className="material-symbols-outlined text-xl">{breakdown.icon}</span>
                   <p className="text-[9px] font-bold uppercase tracking-widest text-outline/80">{breakdown.label}</p>
                   <p className="text-base font-black text-primary">{breakdown.val}</p>
                 </div>
               ))}
             </div>

             {/* Dues Status Banner */}
             <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
               selectedCustomer.outstanding !== '₹ 0' 
                 ? 'bg-error/5 border-error/20 text-error' 
                 : 'bg-tertiary/5 border-tertiary/20 text-tertiary'
             }`}>
               <span className="material-symbols-outlined text-[20px]">{selectedCustomer.outstanding !== '₹ 0' ? 'warning' : 'verified'}</span>
               <div className="text-left">
                 <p className="text-xs font-bold">{selectedCustomer.outstanding !== '₹ 0' ? 'Dues Pending Collection' : 'Ledger Fully Settled'}</p>
                 <p className="text-[9px] opacity-75 mt-0.5">{selectedCustomer.outstanding !== '₹ 0' ? 'Please complete payment collection on site.' : 'No outstanding balances for this client.'}</p>
               </div>
             </div>

             {/* Ledger History List */}
             <div className="space-y-3">
               <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-outline font-extrabold px-1">Intake History</h3>
               {selectedCustomer.ledger.map(txn => (
                 <div key={txn.id} onClick={() => setSelectedTxn(txn)} className="luxury-card p-4 border border-outline-variant/10 relative overflow-hidden group cursor-pointer active:scale-[0.99] transition-transform bg-white">
                   <div className={`absolute left-0 top-0 bottom-0 w-1 ${txn.status === 'Unpaid' ? 'bg-error' : 'bg-tertiary'}`}></div>
                   <div className="flex justify-between items-center pl-2">
                     <div>
                       <p className="font-bold text-primary text-sm">{txn.workType} Assignment</p>
                       <p className="text-[9px] text-outline uppercase font-semibold mt-0.5">{txn.id} • {txn.date}</p>
                     </div>
                     <p className="font-bold text-primary">₹ {txn.amount}</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        ) : activeTab === 'all' ? (
          <div className="space-y-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search transactions..." className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary luxury-card focus:outline-none" />
            </div>

            <div className="space-y-3">
              {filteredTransactions.map(txn => (
                <div key={txn.id} onClick={() => setSelectedTxn(txn)} className="luxury-card p-4 border border-outline-variant/10 relative overflow-hidden group cursor-pointer active:scale-[0.99] transition-transform bg-white">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${txn.status === 'Unpaid' ? 'bg-error' : 'bg-tertiary'}`}></div>
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
                      <p className="font-headline text-base font-bold text-primary">₹ {txn.amount}</p>
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${txn.status === 'Unpaid' ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'}`}>{txn.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search customers..." className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary luxury-card focus:outline-none" />
            </div>
            <div className="space-y-3">
              {filteredCustomers.map(customer => (
                <div key={customer.id} onClick={() => setSearchParams({ tab: 'customer', customerId: customer.id })} className="luxury-card p-4 flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all bg-white border border-outline-variant/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center text-primary font-bold text-sm">{customer.initials}</div>
                    <div>
                      <p className="font-bold text-primary">{customer.name}</p>
                      <p className="text-[9px] text-outline uppercase font-bold mt-0.5">Outstanding Dues: {customer.outstanding}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary">chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Detail Overlay */}
      <BillingDetailsModal 
        isOpen={selectedTxn !== null} 
        onClose={() => setSelectedTxn(null)} 
        txn={selectedTxn} 
      />

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
