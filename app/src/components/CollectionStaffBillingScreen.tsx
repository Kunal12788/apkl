import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import { getCachedData, setCachedData } from '../cache';

type TabView = 'all' | 'customer';

interface Transaction {
  metal: 'Gold' | 'Silver';
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

interface DbCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  status: string;
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
  phone?: string;
  address?: string;
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
  const { user } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !txn) return null;

  const handleDelete = async () => {
    if (user?.role === 'Super Admin') {
      if (window.confirm("Are you sure you want to instantly delete this transaction?")) {
         setIsDeleting(true);
         try {
           await supabase.from('transactions').delete().eq('id', txn.id);
           alert('Deleted successfully. Refreshing...');
           window.location.reload();
         } catch(e) { alert('Failed to delete'); }
         setIsDeleting(false);
      }
    } else {
      const reason = window.prompt("Please provide a reason for deleting this transaction:");
      if (!reason) return;
      setIsDeleting(true);
      try {
        await supabase.from('deletion_requests').insert([{
           item_type: 'Transaction',
           item_id: txn.id,
           requested_by: user?.id,
           reason: reason
        }]);
        alert("Deletion request sent to Super Admin.");
        onClose();
      } catch(e) {
        alert("Failed to submit request.");
      }
      setIsDeleting(false);
    }
  };

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

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className={`w-full py-2.5 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors active:scale-[0.98] ${
              user?.role === 'Super Admin' 
                ? 'bg-error/10 text-error hover:bg-error/20 border border-error/20' 
                : 'bg-error/5 text-error hover:bg-error/10 border border-error/10'
            }`}
          >
            {isDeleting ? 'Processing...' : (user?.role === 'Super Admin' ? 'Delete Transaction' : 'Request Deletion')}
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-surface-container hover:bg-surface-variant text-primary font-bold text-xs uppercase tracking-widest rounded-xl transition-colors active:scale-[0.98]"
          >
            Dismiss Receipt
          </button>
        </div>

      </div>
    </div>
  );
};

export const CollectionStaffBillingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, isFullyAuthenticated } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  
  const activeTab = (searchParams.get('tab') as TabView) || 'all';
  const customerId = searchParams.get('customerId');

  // Load transactions from cache synchronously on mount for 0ms delay
  const cachedTx = getCachedData('tx_data');
  const currentUser = user?.id || '';
  const branchUserIdsCache = getCachedData(`branch_users_${user?.branch_id || 'unknown'}`) || [currentUser];
  const initialTx = cachedTx
    ? cachedTx.filter((t: any) => branchUserIdsCache.includes(t.created_by) || branchUserIdsCache.includes(t.createdBy)).map((t: any) => ({
        metal: t.metal || 'Gold', id: t.id, customerId: t.customer_id, customerName: t.customer_name, customerPhone: t.customer_phone, customerAddress: t.customer_address,
        type: t.type, workType: t.work_type, amount: `₹${Number(t.amount).toLocaleString('en-IN')}`, date: t.date, isoDate: t.iso_date, timestamp: t.timestamp,
        status: t.status, details: t.details, productType: t.product_type, impureWeight: t.impure_weight, settlementCondition: t.settlement_condition,
        logoName: t.logo_name, carat: t.carat, pieces: t.pieces, pointSuggestion: t.point_suggestion, createdBy: t.created_by
      }))
    : [];

  const cachedDbCust = getCachedData('db_customers');
  const initialDbCust = cachedDbCust
    ? cachedDbCust.filter((c: any) => branchUserIdsCache.includes(c.created_by))
    : [];

  const [transactions, setTransactions] = useState<Transaction[]>(initialTx);
  const [dbCustomers, setDbCustomers] = useState<DbCustomer[]>(initialDbCust);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!isFullyAuthenticated) return;
      try {
        let branchUserIds: string[] = [];
        if (user?.branch_id) {
          const { data: bUsers, error: buError } = await supabase
            .from('users')
            .select('id')
            .eq('branch_id', user.branch_id);
          if (!buError && bUsers) {
            branchUserIds = bUsers.map((bu: any) => bu.id);
            setCachedData(`branch_users_${user.branch_id}`, branchUserIds);
          }
        }
        if (branchUserIds.length === 0) {
          branchUserIds = [currentUser];
        }

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .in('created_by', branchUserIds)
          .order('created_at', { ascending: false });
        if (error) throw error;
        
        if (data) {
          const newTxHash = JSON.stringify(data);
          const oldTxHash = getCachedData('col_tx_data_hash');
          if (newTxHash !== oldTxHash) {
            setCachedData('col_tx_data_hash', newTxHash);
            // Merge transactions back into in-memory cache
            const allTx = getCachedData('tx_data') || [];
            const otherTx = allTx.filter((t: any) => !branchUserIds.includes(t.created_by) && !branchUserIds.includes(t.createdBy));
            setCachedData('tx_data', [...otherTx, ...data]);

            setTransactions(data.map(t => ({
                metal: t.metal || 'Gold', id: t.id, customerId: t.customer_id, customerName: t.customer_name, customerPhone: t.customer_phone, customerAddress: t.customer_address,
                type: t.type, workType: t.work_type, amount: `₹${Number(t.amount).toLocaleString('en-IN')}`, date: t.date, isoDate: t.iso_date, timestamp: t.timestamp,
                status: t.status, details: t.details, productType: t.product_type, impureWeight: t.impure_weight, settlementCondition: t.settlement_condition,
                logoName: t.logo_name, carat: t.carat, pieces: t.pieces, pointSuggestion: t.point_suggestion, createdBy: t.created_by
            })));
          }
        } else {
          setTransactions([]);
        }

      } catch (err) {
        console.error('Error fetching collection transactions:', err);
      }
    };

    const loadDbCustomers = async () => {
      if (!isFullyAuthenticated) return;
      try {
        let branchUserIds: string[] = [];
        if (user?.branch_id) {
          const { data: bUsers, error: buError } = await supabase
            .from('users')
            .select('id')
            .eq('branch_id', user.branch_id);
          if (!buError && bUsers) {
            branchUserIds = bUsers.map((bu: any) => bu.id);
          }
        }
        if (branchUserIds.length === 0) {
          branchUserIds = [currentUser];
        }

        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          const newDbHash = JSON.stringify(data);
          const oldDbHash = getCachedData('col_db_customers_hash');
          if (newDbHash !== oldDbHash) {
            setCachedData('col_db_customers_hash', newDbHash);
            setCachedData('db_customers', data);
            setDbCustomers(data.filter(c => branchUserIds.includes(c.created_by)));
          }
        } else {
          setDbCustomers([]);
        }
      } catch (err) {
        console.error('Error fetching collection customers:', err);
      }
    };

    loadTransactions();
    loadDbCustomers();

    const handleSync = () => {
      loadTransactions();
      loadDbCustomers();
    };
    window.addEventListener('databaseSync', handleSync);
    return () => {
      window.removeEventListener('databaseSync', handleSync);
    };
  }, [isFullyAuthenticated, currentUser, user?.branch_id]);

  // Dynamically group transactions by customer
  const dynamicCustomers = useMemo(() => {
    const customers: Customer[] = [];

    // First, add all approved dbCustomers to customers
    dbCustomers.filter(c => c.status === 'Approved').forEach(c => {
        const initials = c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        customers.push({
          id: c.id,
          name: c.name,
          initials: initials || 'C',
          activeJobs: 0,
          outstanding: '₹ 0',
          paid: '₹ 0',
          piecesBreakdown: { tunch: 0, marking: 0, shouldering: 0 },
          ledger: [],
          phone: c.phone,
          address: c.address
        });
    });

    transactions.forEach(t => {
      let cust = customers.find(c => {
        if (c.id && t.customerId && c.id !== 'CUST-COL' && t.customerId !== 'CUST-COL') {
          return c.id === t.customerId;
        }
        if (c.name.toLowerCase() !== t.customerName.toLowerCase()) return false;
        
        const normPhone = (p?: string) => p ? p.replace(/[^\d]/g, '') : '';
        const cP = normPhone(c.phone);
        const tP = normPhone(t.customerPhone);
        if (cP && tP && cP !== tP) return false;
        
        const normAddr = (a?: string) => a ? a.toLowerCase().trim().replace(/[^a-z0-9]/g, '') : '';
        const cA = normAddr(c.address);
        const tA = normAddr(t.customerAddress);
        if (cA && tA && cA !== tA) return false;
        
        return true;
      });

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
          ledger: [],
          phone: t.customerPhone,
          address: t.customerAddress
        };
        customers.push(cust);
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

    return customers;
  }, [dbCustomers, transactions]);

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
              <div className="luxury-card p-6 bg-white border border-outline-variant/15 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl text-white flex items-center justify-center font-bold text-2xl shadow-lg border border-white/10 shrink-0" style={{ background: 'linear-gradient(135deg, #001e40 0%, #003366 100%)' }}>
                      {selectedCustomer.initials}
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-primary">{selectedCustomer.name}</h2>
                      <div className="flex flex-col gap-1 mt-1.5 text-xs text-outline font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          <span>{selectedCustomer.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          <span className="truncate max-w-[250px]">{selectedCustomer.address || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 w-full md:w-auto border-t border-outline-variant/10 md:border-t-0 pt-4 md:pt-0">
                    <div className="flex-1 md:flex-initial text-center md:text-right bg-surface-container/30 px-4 py-2.5 rounded-xl border border-outline-variant/5">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-outline">Active Jobs</p>
                      <p className="text-sm font-extrabold text-primary mt-0.5">{selectedCustomer.activeJobs}</p>
                    </div>
                    <div className="flex-1 md:flex-initial text-center md:text-right bg-surface-container/30 px-4 py-2.5 rounded-xl border border-outline-variant/5">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-outline">Dues Outstanding</p>
                      <p className={`text-sm font-black mt-0.5 ${selectedCustomer.outstanding !== '₹ 0' ? 'text-error' : 'text-tertiary'}`}>{selectedCustomer.outstanding}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Pieces breakdowns separately */}
              <div className="grid grid-cols-3 gap-3.5">
                {[
                  { 
                    label: 'Tunch Pcs', 
                    val: selectedCustomer.piecesBreakdown.tunch, 
                    icon: 'science', 
                    iconColor: 'bg-tertiary/10 text-tertiary'
                  },
                  { 
                    label: 'Marking Pcs', 
                    val: selectedCustomer.piecesBreakdown.marking, 
                    icon: 'verified', 
                    iconColor: 'bg-secondary/10 text-secondary'
                  },
                  { 
                    label: 'Shoulder Pcs', 
                    val: selectedCustomer.piecesBreakdown.shouldering, 
                    icon: 'precision_manufacturing', 
                    iconColor: 'bg-primary/10 text-primary'
                  }
                ].map((breakdown, idx) => (
                  <div 
                    key={idx} 
                    className="luxury-card p-4 space-y-3 bg-white border border-outline-variant/10 group active:scale-[0.98] transition-transform flex flex-col items-center text-center"
                  >
                    <div className={`w-8 h-8 rounded-lg ${breakdown.iconColor} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-lg">{breakdown.icon}</span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-headline text-lg font-bold text-primary">{breakdown.val}</p>
                      <p className="text-[9px] font-bold text-outline uppercase tracking-wider">{breakdown.label}</p>
                    </div>
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
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-outline font-extrabold">Intake History</h3>
                  
                  {/* Compact Date Filter Input */}
                  <div className="relative flex items-center gap-1.5 bg-white border border-outline-variant/30 rounded-xl px-2.5 py-1.5 shadow-sm focus-within:border-primary transition-all">
                    <span className="material-symbols-outlined text-outline text-[14px]">calendar_month</span>
                    <input 
                      type="date" 
                      value={historyDateFilter} 
                      onChange={e => setHistoryDateFilter(e.target.value)} 
                      className="text-[10px] font-bold text-primary focus:outline-none bg-transparent"
                    />
                    {historyDateFilter && (
                      <button 
                        onClick={() => setHistoryDateFilter('')} 
                        className="w-4 h-4 rounded-full bg-error/10 text-error flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[10px]">close</span>
                      </button>
                    )}
                  </div>
                </div>
                {(() => {
                  const filteredLedger = selectedCustomer.ledger.filter(txn => {
                    if (!historyDateFilter) return true;
                    return txn.isoDate === historyDateFilter;
                  });

                  if (filteredLedger.length === 0) {
                    return (
                      <div className="luxury-card p-6 text-center border border-outline-variant/10 bg-white rounded-2xl">
                        <span className="material-symbols-outlined text-outline text-3xl mb-1.5">calendar_today</span>
                        <p className="text-xs text-outline font-bold">No intake records on this date.</p>
                      </div>
                    );
                  }

                  return filteredLedger.map(txn => (
                    <div key={txn.id} onClick={() => setSelectedTxn(txn)} className="luxury-card p-4 border border-outline-variant/10 relative overflow-hidden group cursor-pointer active:scale-[0.99] transition-transform bg-white">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${txn.status === 'Unpaid' ? 'bg-error' : 'bg-tertiary'}`}></div>
                      <div className="flex justify-between items-start pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getWorkColor(txn.workType)}`}>
                            <span className="material-symbols-outlined text-xl">{getWorkIcon(txn.workType)}</span>
                          </div>
                          <div>
                            <p className="font-headline font-bold text-sm text-primary">{txn.workType} Assignment</p>
                            <p className="text-[9px] text-outline font-medium tracking-wide uppercase">{txn.id} • {txn.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-headline text-base font-bold text-primary">₹ {txn.amount}</p>
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${txn.status === 'Unpaid' ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'}`}>{txn.status}</span>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
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
