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

  const lbl = "text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block";
  const val = "text-xs font-bold text-primary truncate";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up flex flex-col justify-between overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-headline text-base font-extrabold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">receipt_long</span>
              {txn.id} Receipt
            </h3>
            <p className="text-[9px] text-outline font-bold uppercase tracking-widest mt-0.5">{txn.date} • {txn.timestamp}</p>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
            txn.status === 'Paid' ? 'bg-tertiary/10 text-tertiary border-tertiary/20' : 'bg-error/10 text-error border-error/20'
          }`}>
            {txn.status}
          </span>
        </div>

        {/* Unified Clean Details Container */}
        <div className="space-y-3">
          
          {/* Section 1: Customer Profile */}
          <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#C9A646] mb-1">Customer Profile</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className={lbl}>Name</span>
                <p className={val}>{txn.customerName}</p>
              </div>
              <div>
                <span className={lbl}>Phone</span>
                <p className={val}>{txn.customerPhone || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className={lbl}>Address</span>
                <p className={val}>{txn.customerAddress || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Work Specifications */}
          <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary mb-1">Work Details</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              <div>
                <span className={lbl}>Work Type</span>
                <p className={`${val} uppercase text-secondary`}>{txn.workType}</p>
              </div>
              {txn.productType && (
                <div>
                  <span className={lbl}>Category</span>
                  <p className={val}>{txn.productType}</p>
                </div>
              )}
              {txn.impureWeight && (
                <div>
                  <span className={lbl}>Weight</span>
                  <p className={val}>{txn.impureWeight}g</p>
                </div>
              )}
              {txn.pieces && (
                <div>
                  <span className={lbl}>Pieces</span>
                  <p className={val}>{txn.pieces}</p>
                </div>
              )}
              {txn.settlementCondition && (
                <div>
                  <span className={lbl}>Settlement Mode</span>
                  <p className={val}>{txn.settlementCondition}</p>
                </div>
              )}
              {txn.logoName && (
                <div>
                  <span className={lbl}>Logo Design</span>
                  <p className={val}>{txn.logoName}</p>
                </div>
              )}
              {txn.carat && (
                <div>
                  <span className={lbl}>Carat</span>
                  <p className={val}>{txn.carat}</p>
                </div>
              )}
              {txn.pointSuggestion && (
                <div className="col-span-2">
                  <span className={lbl}>Solder Points</span>
                  <p className={val}>{txn.pointSuggestion} Gold/Silver suggested</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Settlement Summary Card */}
          <div className="rounded-2xl p-4 relative overflow-hidden shadow-md" style={{ background: 'linear-gradient(135deg, #001e40 0%, #003366 100%)', color: '#ffffff' }}>
            <div className="absolute right-0 bottom-0 w-16 h-16 rounded-full blur-lg -mr-4 -mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total Amount</p>
                <p className="font-headline text-lg font-black mt-0.5" style={{ color: '#ffffff' }}>₹ {txn.amount}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#C9A646' }}>{txn.type} Settlement</p>
                <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {txn.status === 'Paid' ? 'Paid & Cleared' : 'Payment Due'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="w-full mt-4 py-2.5 bg-surface-container hover:bg-surface-variant text-primary font-bold text-xs uppercase tracking-widest rounded-xl transition-colors active:scale-[0.98]"
        >
          Dismiss Receipt
        </button>

      </div>
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

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  React.useEffect(() => {
    const loadTransactions = () => {
      const raw = localStorage.getItem('AURORA_SHARED_TRANSACTIONS');
      let txns: any[] = [];
      if (raw) {
        try {
          txns = JSON.parse(raw);
        } catch (e) {}
      } else {
        const defaultMockTxns = [
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
            pieces: '12',
            createdBy: 'COLL-001'
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
            settlementCondition: 'Only Cash (At Front)',
            createdBy: 'COLL-001'
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
            pointSuggestion: 'Gold',
            createdBy: 'COLL-001'
          }
        ];
        localStorage.setItem('AURORA_SHARED_TRANSACTIONS', JSON.stringify(defaultMockTxns));
        txns = defaultMockTxns;
      }

      // Filter only transactions created by this logged-in Collection user
      const currentUser = localStorage.getItem('user_id') || 'COLL-001';
      const filtered = txns.filter(t => t.createdBy === currentUser).map((t: any) => ({
        id: t.id,
        customerId: t.customerId || 'CUST-COL',
        customerName: t.customerName,
        customerPhone: t.customerPhone || '',
        customerAddress: t.customerAddress || '',
        type: t.type || 'Cash',
        workType: t.workType || 'Tunch',
        amount: t.amount || '0',
        date: t.date || 'Just Now',
        isoDate: t.isoDate || new Date().toISOString().split('T')[0],
        timestamp: t.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: t.status || 'Unpaid',
        details: t.details || '',
        productType: t.productType,
        impureWeight: t.impureWeight,
        settlementCondition: t.settlementCondition,
        logoName: t.logoName,
        carat: t.carat,
        pieces: t.pieces,
        pointSuggestion: t.pointSuggestion,
        createdBy: t.createdBy
      }));
      setTransactions(filtered);
    };

    loadTransactions();
    const interval = setInterval(loadTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Dynamically group transactions by customer
  const dynamicCustomers: Customer[] = [];
  transactions.forEach(t => {
    let cust = dynamicCustomers.find(c => c.name === t.customerName);
    if (!cust) {
      const initials = t.customerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      cust = {
        id: t.customerId || 'CUST-COL',
        name: t.customerName,
        initials: initials || 'C',
        activeJobs: 0,
        outstanding: '₹ 0',
        paid: '₹ 0',
        piecesBreakdown: { tunch: 0, marking: 0, shouldering: 0 },
        ledger: []
      };
      dynamicCustomers.push(cust);
    }
    
    cust.ledger.push(t);
    const amtNum = parseFloat(t.amount.replace(/[^\d.]/g, '')) || 0;
    if (t.status === 'Unpaid') {
      cust.activeJobs += 1;
      const outstandingNum = parseFloat(cust.outstanding.replace(/[^\d.]/g, '')) || 0;
      cust.outstanding = `₹ ${(outstandingNum + amtNum).toLocaleString()}`;
    } else {
      const paidNum = parseFloat(cust.paid.replace(/[^\d.]/g, '')) || 0;
      cust.paid = `₹ ${(paidNum + amtNum).toLocaleString()}`;
    }
    
    const pcs = parseInt(t.pieces || '1') || 1;
    if (t.workType === 'Tunch') {
      cust.piecesBreakdown.tunch += pcs;
    } else if (t.workType === 'Marking') {
      cust.piecesBreakdown.marking += pcs;
    } else if (t.workType === 'Shouldering') {
      cust.piecesBreakdown.shouldering += pcs;
    }
  });

  const selectedCustomer = dynamicCustomers.find(c => c.id === customerId) || null;
  const filteredCustomers = dynamicCustomers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTransactions = transactions.filter(t => t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto overflow-x-hidden hide-scrollbar">
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
                  <div className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-bold text-xl shadow-md border border-white/10" style={{ background: 'linear-gradient(135deg, #001e40 0%, #003366 100%)' }}>{selectedCustomer.initials}</div>
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
