import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';
import { useSession } from '../context/SessionContext';

type TabView = 'all' | 'customer';

interface Transaction {
  metal: 'Gold' | 'Silver';
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
  
  impureWeight?: string;
  pureWeight?: string;
  purityPercentage?: string;
  pieceType?: string;
  
  pointsCount?: number;
  pointsType?: 'Gold' | 'Silver';
  
  caratMarking?: string;
  
  details: string;
}

interface Customer {
  id: string;
  name: string;
  initials: string;
  activeJobs: number;
  outstanding: string;
  paid: string;
  workBreakdown: {
    tunch: number;
    marking: number;
    shouldering: number;
  };
  ledger: Transaction[];
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

const FilterChip = ({ label, icon, value, searchQuery, setSearchQuery }: { label: string, icon: string, value: string, searchQuery: string, setSearchQuery: (val: string) => void }) => {
  const isActive = searchQuery.toLowerCase() === value.toLowerCase();
  return (
    <div onClick={() => setSearchQuery(isActive ? '' : value)} className={`flex items-center gap-1.5 border rounded-full px-4 py-2 flex-shrink-0 premium-shadow cursor-pointer transition-colors ${isActive ? 'bg-primary border-primary text-white' : 'bg-white border-outline-variant/30 text-primary hover:bg-surface-bright'}`}>
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
};

const SearchAndFilterSection = ({ 
  placeholder = "Search...", 
  searchQuery, setSearchQuery,
  startDate, setStartDate,
  endDate, setEndDate
}: { 
  placeholder?: string,
  searchQuery: string, setSearchQuery: (v: string) => void,
  startDate: string, setStartDate: (v: string) => void,
  endDate: string, setEndDate: (v: string) => void
}) => (
  <div className="space-y-4 mb-4">
    <div className="relative">
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
      <input 
        type="text" 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
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
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white border border-outline-variant/50 rounded-xl py-3 pl-9 pr-3 text-xs font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 premium-shadow transition-all" 
          />
        </div>
      </div>
      <div className="flex-1 relative mt-1 group">
        <span className="text-[8px] absolute -top-2 left-3 bg-background px-1.5 text-outline font-bold uppercase tracking-widest z-10 rounded-sm">To Date</span>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/50 text-[16px] pointer-events-none group-focus-within:text-primary transition-colors">calendar_month</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white border border-outline-variant/50 rounded-xl py-3 pl-9 pr-3 text-xs font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 premium-shadow transition-all" 
          />
        </div>
      </div>
      {(startDate || endDate) && (
        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="w-10 h-10 mt-1 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0 border border-error/20 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
    
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-2 px-2">
      <FilterChip label="Unpaid" icon="warning" value="Unpaid" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="Paid" icon="check_circle" value="Paid" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="Cash" icon="payments" value="Cash" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="UPI" icon="qr_code_2" value="UPI" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="Tunch" icon="science" value="Tunch" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="Marking" icon="verified" value="Marking" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
    </div>
  </div>
);

// Sleek centered modal receipt overlay (consistent with COLL-001)
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
                <span className={lbl}>ID</span>
                <p className={val}>{txn.customerId || 'N/A'}</p>
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
              
              {txn.pieceType && (
                <div>
                  <span className={lbl}>Piece Type</span>
                  <p className={val}>{txn.pieceType}</p>
                </div>
              )}
              {txn.purityPercentage && (
                <div>
                  <span className={lbl}>Purity</span>
                  <p className={val}>{txn.purityPercentage}</p>
                </div>
              )}
              {txn.impureWeight && (
                <div>
                  <span className={lbl}>Impure Weight</span>
                  <p className={val}>{txn.impureWeight}</p>
                </div>
              )}
              {txn.pureWeight && (
                <div>
                  <span className={lbl}>Pure Weight</span>
                  <p className={val}>{txn.pureWeight}</p>
                </div>
              )}
              {txn.pointsCount !== undefined && txn.pointsCount !== null && (
                <div>
                  <span className={lbl}>Solder Points</span>
                  <p className={val}>{txn.pointsCount} ({txn.pointsType || 'Gold'})</p>
                </div>
              )}
              {txn.caratMarking && (
                <div>
                  <span className={lbl}>Carat Marking</span>
                  <p className={val}>{txn.caratMarking}</p>
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
                <p className="font-headline text-lg font-black mt-0.5" style={{ color: '#ffffff' }}>{txn.amount}</p>
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

export const StaffBillingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isFullyAuthenticated } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const activeTab = (searchParams.get('tab') as TabView) || 'all';
  const customerId = searchParams.get('customerId');
  const transactionId = searchParams.get('transactionId');

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  React.useEffect(() => {
    const loadTransactions = async () => {
      // 1. Instantly load from cache
      const cachedTx = getCachedData('tx_data');
      if (cachedTx) {
        setTransactions(cachedTx.map((t: any) => ({
          metal: t.metal || 'Gold', id: t.id, customerId: t.customer_id, customerName: t.customer_name, type: t.type, workType: t.work_type, amount: `₹${Number(t.amount).toLocaleString('en-IN')}`,
          date: t.date, isoDate: t.iso_date, timestamp: t.timestamp, status: t.status,
          impureWeight: t.impure_weight, pureWeight: t.pure_weight, purityPercentage: t.purity_percentage, pieceType: t.piece_type,
          pointsCount: t.points_count, pointsType: t.points_type, caratMarking: t.carat_marking, details: t.details
        })));
      }

      // Guard database fetches until fully authenticated to prevent RLS/anonymous query errors
      if (!isFullyAuthenticated) return;

      // 2. Fetch fresh in background
      try {
        const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          setCachedData('tx_data', data); // Update cache
          setTransactions(data.map(t => ({
            metal: t.metal || 'Gold', id: t.id, customerId: t.customer_id, customerName: t.customer_name, type: t.type, workType: t.work_type, amount: `₹${Number(t.amount).toLocaleString('en-IN')}`,
            date: t.date, isoDate: t.iso_date, timestamp: t.timestamp, status: t.status,
            impureWeight: t.impure_weight, pureWeight: t.pure_weight, purityPercentage: t.purity_percentage, pieceType: t.piece_type,
            pointsCount: t.points_count, pointsType: t.points_type, caratMarking: t.carat_marking, details: t.details
          })));
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
      }
    };

    loadTransactions();
  }, [isFullyAuthenticated]);

  // Group by customer dynamically
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
        outstanding: '₹0',
        paid: '₹0',
        workBreakdown: { tunch: 0, marking: 0, shouldering: 0 },
        ledger: []
      };
      dynamicCustomers.push(cust);
    }
    
    cust.ledger.push(t);
    const amtNum = parseFloat(t.amount.replace(/[^\d.]/g, '')) || 0;
    if (t.status === 'Unpaid') {
      cust.activeJobs += 1;
      const outstandingNum = parseFloat(cust.outstanding.replace(/[^\d.]/g, '')) || 0;
      cust.outstanding = `₹${(outstandingNum + amtNum).toLocaleString()}`;
    } else {
      const paidNum = parseFloat(cust.paid.replace(/[^\d.]/g, '')) || 0;
      cust.paid = `₹${(paidNum + amtNum).toLocaleString()}`;
    }
    
    if (t.workType === 'Tunch') {
      cust.workBreakdown.tunch += 1;
    } else if (t.workType === 'Marking') {
      cust.workBreakdown.marking += 1;
    } else if (t.workType === 'Shouldering') {
      cust.workBreakdown.shouldering += 1;
    }
  });

  const selectedCustomer = dynamicCustomers.find(c => c.id === customerId) || null;
  const selectedTransaction = transactions.find(t => t.id === transactionId) || null;

  const handleCloseModal = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('transactionId');
    setSearchParams(newParams);
  };

  const matchesSearch = (txn: Transaction) => {
    let matchesText = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesText = Boolean(
        txn.customerName.toLowerCase().includes(q) ||
        txn.id.toLowerCase().includes(q) ||
        txn.amount.toLowerCase().includes(q) ||
        txn.status.toLowerCase().includes(q) ||
        txn.type.toLowerCase().includes(q) ||
        txn.workType.toLowerCase().includes(q) ||
        (txn.impureWeight?.toLowerCase().includes(q)) ||
        (txn.pureWeight?.toLowerCase().includes(q)) ||
        (txn.purityPercentage?.toLowerCase().includes(q)) ||
        (txn.pieceType?.toLowerCase().includes(q)) ||
        (txn.caratMarking?.toLowerCase().includes(q))
      );
    }

    let matchesDate = true;
    if (startDate && txn.isoDate < startDate) matchesDate = false;
    if (endDate && txn.isoDate > endDate) matchesDate = false;

    return matchesText && matchesDate;
  };

  const filteredTransactions = transactions.filter(matchesSearch);
  const filteredCustomers = dynamicCustomers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredLedger = selectedCustomer ? selectedCustomer.ledger.filter(matchesSearch) : [];

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-40 relative">
        
        {/* Main Header with Notification Bell */}
        {!selectedCustomer && (
          <header className="flex justify-between items-start mb-4">
            <div>
              <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Billing & Records</h1>
              <p className="text-xs text-outline font-medium">Manage ledgers and transactions</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse border border-white"></span>
            </button>
          </header>
        )}

        {/* Tab Navigation */}
        {!selectedCustomer && (
          <div className="flex bg-surface-container rounded-full p-1.5 shadow-inner">
            <button 
              onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setSearchParams({ tab: 'all' }); }}
              className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'all' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
            >
              All Transactions
            </button>
            <button 
              onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setSearchParams({ tab: 'customer' }); }}
              className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'customer' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
            >
              By Customer
            </button>
          </div>
        )}

        {/* View: All Transactions */}
        {activeTab === 'all' && !selectedCustomer && (
          <div className="space-y-4 animate-fade-in">
            <SearchAndFilterSection 
              placeholder="Search by weight, purity, ID..." 
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
            />

            <div className="flex justify-between items-center px-1 mt-2">
              <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold">Transaction Ledger</h3>
            </div>
            
            <div className="space-y-3">
              {filteredTransactions.map((txn) => {
                const isPending = txn.status === 'Unpaid';
                
                return (
                  <div key={txn.id} onClick={() => setSearchParams({ transactionId: txn.id, tab: activeTab, ...(customerId ? { customerId } : {}) })} className={`luxury-card p-4 relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-0.5 border ${isPending ? 'border-error/20 bg-error/5' : 'border-[#003366]/5 bg-white'}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5 ${isPending ? 'bg-error' : 'bg-secondary'}`}></div>
                    
                    <div className="flex justify-between items-start mb-3 pl-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPending ? 'bg-error-container/30 text-error' : getWorkColor(txn.workType)}`}>
                          <span className="material-symbols-outlined text-xl glow-icon">{getWorkIcon(txn.workType)}</span>
                        </div>
                        <div>
                          <p className={`font-headline font-bold text-sm ${isPending ? 'text-error' : 'text-primary'}`}>{txn.customerName}</p>
                          <p className="text-[9px] text-outline font-medium tracking-wide uppercase mt-0.5">{txn.id} • {txn.date}, {txn.timestamp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-headline text-base font-bold tracking-tight ${isPending ? 'text-error' : 'text-primary'}`}>{txn.amount}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {isPending && <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>}
                          <p className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block ${isPending ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>
                            {txn.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  
                    <div className="flex items-center gap-4 border-t border-outline-variant/20 pt-3">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] text-outline">build</span>
                        <span className="text-[9px] text-outline font-bold uppercase tracking-wider">{txn.workType}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] text-outline">payments</span>
                        <span className="text-[9px] text-outline font-bold uppercase tracking-wider">{txn.type}</span>
                      </div>
                      
                      {txn.workType === 'Tunch' && txn.impureWeight && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-outline">scale</span>
                          <span className="text-[9px] text-outline font-bold uppercase tracking-wider">{txn.impureWeight}</span>
                        </div>
                      )}
                      {txn.workType === 'Marking' && txn.caratMarking && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-outline">verified</span>
                          <span className="text-[9px] text-outline font-bold uppercase tracking-wider">{txn.caratMarking}</span>
                        </div>
                      )}
                      {txn.workType === 'Shouldering' && txn.pointsCount && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-outline">join_inner</span>
                          <span className="text-[9px] text-outline font-bold uppercase tracking-wider">{txn.pointsCount} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredTransactions.length === 0 && (
                <div className="p-8 text-center text-outline text-sm font-medium">No transactions found.</div>
              )}
            </div>
          </div>
        )}



        {/* View: By Customer (Customer List) */}
        {activeTab === 'customer' && !selectedCustomer && (
          <div className="space-y-5 animate-fade-in">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer name or ID..." 
                className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary placeholder-outline focus:outline-none input-sapphire-focus luxury-card transition-all" 
              />
              {searchQuery && (
                <span onClick={() => setSearchQuery('')} className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline text-lg cursor-pointer hover:text-primary">close</span>
              )}
            </div>

            <div className="space-y-3">
              {filteredCustomers.map(customer => (
                <div key={customer.id} onClick={() => { setSearchQuery(''); setSearchParams({ customerId: customer.id, tab: activeTab }); }} className="luxury-card p-4 flex items-center justify-between cursor-pointer group hover:bg-surface-bright">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-fixed/60 to-primary-fixed/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/10 shadow-inner">
                      {customer.initials}
                    </div>
                    <div>
                      <p className="font-headline font-bold text-primary text-[15px]">{customer.name}</p>
                      <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">{customer.id} • {customer.activeJobs} Jobs</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-white transition-colors premium-shadow">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </div>
                </div>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="p-8 text-center text-outline text-sm font-medium">No customers found.</div>
              )}
            </div>
          </div>
        )}

        {/* View: Particular Customer Detail */}
        {selectedCustomer && (
          <div className="animate-fade-in space-y-6">
            <header className="flex justify-between items-start">
              <button onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); navigate(-1); }} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-outline hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Directory
              </button>
              <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative">
                <span className="material-symbols-outlined text-xl">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse border border-white"></span>
              </button>
            </header>
            
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-white">
                {selectedCustomer.initials}
              </div>
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-primary leading-tight">{selectedCustomer.name}</h2>
                <p className="text-[10px] text-outline font-bold tracking-widest uppercase mt-1">ID: {selectedCustomer.id}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-5 border border-[#003366]/5 shadow-[0_4px_20px_rgba(0,30,64,0.03)] relative overflow-hidden luxury-card group hover:-translate-y-0.5 transition-transform">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">Total Paid</p>
                  <div className="w-8 h-8 rounded-full bg-secondary-fixed/30 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[16px] glow-icon">payments</span>
                  </div>
                </div>
                <div className="flex items-baseline">
                  <span className="font-headline text-2xl font-bold text-primary tracking-tight">{selectedCustomer.paid}</span>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-5 border border-[#003366]/5 shadow-[0_4px_20px_rgba(0,30,64,0.03)] relative overflow-hidden luxury-card group hover:-translate-y-0.5 transition-transform">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${selectedCustomer.outstanding === '₹0' ? 'bg-outline-variant' : 'bg-error'}`}></div>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">Total Dues</p>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedCustomer.outstanding === '₹0' ? 'bg-surface-container text-outline' : 'bg-error-container/30 text-error'}`}>
                    <span className="material-symbols-outlined text-[16px] glow-icon">
                      {selectedCustomer.outstanding === '₹0' ? 'check_circle' : 'warning'}
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline">
                  <span className={`font-headline text-2xl font-bold tracking-tight ${selectedCustomer.outstanding === '₹0' ? 'text-primary' : 'text-error'}`}>{selectedCustomer.outstanding}</span>
                </div>
              </div>
            </div>

            {selectedCustomer.ledger.filter(t => t.status === 'Unpaid').length > 0 && (
              <div className="space-y-3">
                <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                  Active Dues Details
                </h3>
                <div className="luxury-card divide-y divide-error/10 border border-error/20 bg-error-container/5 overflow-hidden">
                  {selectedCustomer.ledger.filter(t => t.status === 'Unpaid').map(due => (
                    <div key={due.id} onClick={() => setSearchParams({ transactionId: due.id, customerId: selectedCustomer.id, tab: activeTab })} className="p-4 flex items-center justify-between cursor-pointer group hover:bg-error/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-error-container/20 text-error group-hover:bg-error-container/40 transition-colors`}>
                          <span className="material-symbols-outlined text-sm">{getWorkIcon(due.workType)}</span>
                        </div>
                        <div>
                          <p className="font-headline font-bold text-primary text-xs">{due.workType} Work</p>
                          <p className="text-[9px] text-outline font-medium tracking-wide uppercase">{due.date} • {due.timestamp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-headline text-sm font-bold text-error">{due.amount}</p>
                        <p className="text-[8px] text-outline font-bold uppercase tracking-widest">{due.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Total Work Profile</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="luxury-card p-3 text-center border-t-2 border-t-tertiary">
                  <span className="material-symbols-outlined text-tertiary text-lg mb-1 glow-icon">science</span>
                  <p className="font-headline text-xl font-bold text-primary">{selectedCustomer.workBreakdown.tunch}</p>
                  <p className="text-[8px] uppercase tracking-widest text-outline font-bold">Tunch</p>
                </div>
                <div className="luxury-card p-3 text-center border-t-2 border-t-secondary">
                  <span className="material-symbols-outlined text-secondary text-lg mb-1 glow-icon">verified</span>
                  <p className="font-headline text-xl font-bold text-primary">{selectedCustomer.workBreakdown.marking}</p>
                  <p className="text-[8px] uppercase tracking-widest text-outline font-bold">Marking</p>
                </div>
                <div className="luxury-card p-3 text-center border-t-2 border-t-primary">
                  <span className="material-symbols-outlined text-primary text-lg mb-1 glow-icon">precision_manufacturing</span>
                  <p className="font-headline text-xl font-bold text-primary">{selectedCustomer.workBreakdown.shouldering}</p>
                  <p className="text-[8px] uppercase tracking-widest text-outline font-bold">Shouldering</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold">Full Ledger History</h3>
              </div>
              
              <SearchAndFilterSection 
                placeholder="Search ledger by purity, weight, ID..." 
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                startDate={startDate} setStartDate={setStartDate}
                endDate={endDate} setEndDate={setEndDate}
              />
              
              <div className="luxury-card overflow-hidden divide-y divide-surface-container border border-outline-variant/20">
                {filteredLedger.map(txn => {
                  const isPending = txn.status === 'Unpaid';
                  
                  return (
                    <div key={txn.id} onClick={() => setSearchParams({ transactionId: txn.id, customerId: selectedCustomer.id, tab: activeTab })} className={`p-4 transition-colors cursor-pointer group ${isPending ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surface-bright'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isPending ? 'bg-error-container/30 text-error group-hover:bg-error-container/50' : getWorkColor(txn.workType)}`}>
                            <span className="material-symbols-outlined text-sm">{getWorkIcon(txn.workType)}</span>
                          </div>
                          <div>
                            <p className={`font-headline font-bold text-xs ${isPending ? 'text-error' : 'text-primary'}`}>{txn.workType} Work</p>
                            <p className={`text-[9px] font-medium tracking-wide uppercase ${isPending ? 'text-error/70' : 'text-outline'}`}>{txn.date} • {txn.timestamp}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-headline text-sm font-bold ${isPending ? 'text-error' : 'text-primary'}`}>{txn.amount}</p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            {isPending && <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>}
                            <p className={`text-[8px] font-bold uppercase tracking-widest ${isPending ? 'text-error/70' : 'text-outline'}`}>{txn.id}</p>
                          </div>
                        </div>
                      </div>
                      <div className="pl-11 pr-2 flex justify-between items-center mt-1">
                        <p className={`text-[10px] leading-relaxed truncate ${isPending ? 'text-error/80 font-medium' : 'text-outline/80'}`}>{txn.details}</p>
                        {isPending && (
                          <span className="text-[8px] font-bold uppercase tracking-widest bg-error text-white px-2 py-0.5 rounded-full">Unpaid</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredLedger.length === 0 && (
                  <div className="p-8 text-center text-outline text-sm font-medium">No ledger entries found.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <BillingDetailsModal 
        isOpen={!!selectedTransaction}
        onClose={handleCloseModal}
        txn={selectedTransaction}
      />

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
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
        <a onClick={() => navigate('/ledger')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">LEDGER</span>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
