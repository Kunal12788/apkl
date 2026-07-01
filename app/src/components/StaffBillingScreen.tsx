import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';
import { useSession } from '../context/SessionContext';
import { computeStaffBillingTransactions, analyzeCustomerBehavior } from '../utils/billingUtils';
import { deleteStorageImagesForTasks, deleteStorageImagesByUrls } from '../utils/storageUtils';
import { generateCustomerPDFReport } from '../utils/pdfUtils';
import { NotificationBell } from './NotificationBell';
import toast from 'react-hot-toast';

type TabView = 'all' | 'customer';

interface Transaction {
  metal: 'Gold' | 'Silver';
  staffSubmittedAt?: string | null;
  adminSubmittedAt?: string | null;
  isCashExchange?: boolean;
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  type: 'UPI' | 'Cash' | 'Service Fee';
  workType: 'Tunch' | 'Marking' | 'Shouldering' | 'Buy' | 'Sell' | 'Dues Payment';
  amount: string;
  date: string;
  isoDate: string;
  timestamp: string;
  status: string;
  colStaffPaid?: boolean;
  staffPaid?: boolean;
  
  impureWeight?: string;
  pureWeight?: string;
  purityPercentage?: string;
  pieceType?: string;
  
  pointsCount?: number;
  pointsType?: 'Gold' | 'Silver';
  
  caratMarking?: string;
  
  details: string;
  createdBy?: string;
  created_by?: string;
  cashRatePerGram?: string;
  cashAmount?: string;
  paidAmount?: number;
  createdAt?: string;
}

interface DbCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  status: string;
  created_by?: string;
  advance_cash?: number;
  advance_pure_gold?: number;
  advance_pure_silver?: number;
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
    buy: number;
    sell: number;
  };
  ledger: Transaction[];
  phone?: string;
  address?: string;
  created_by?: string;
  advance_cash?: number;
  advance_pure_gold?: number;
  advance_pure_silver?: number;
}

const getWorkIcon = (workType: string) => {
  switch(workType) {
    case 'Tunch': return 'science';
    case 'Marking': return 'verified';
    case 'Shouldering': return 'precision_manufacturing';
    case 'Buy': return 'shopping_cart';
    case 'Sell': return 'sell';
    case 'Dues Payment': return 'payments';
    default: return 'work';
  }
};

const getWorkColor = (workType: string) => {
  switch(workType) {
    case 'Tunch': return 'text-tertiary bg-tertiary-fixed/30';
    case 'Marking': return 'text-secondary bg-secondary-fixed/30';
    case 'Shouldering': return 'text-primary bg-primary-fixed/30';
    case 'Buy': return 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20';
    case 'Sell': return 'text-amber-600 bg-amber-500/10 border border-amber-500/20';
    case 'Dues Payment': return 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20';
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
      <FilterChip label="Buy" icon="shopping_cart" value="Buy" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="Sell" icon="sell" value="Sell" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
    </div>
  </div>
);

// Sleek centered modal receipt overlay (consistent with COLL-001)
interface BillingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  txn: Transaction | null;
  onOptimisticUpdate?: (id: string, updates: Partial<Transaction>) => void;
  usersMap?: Record<string, { name: string; role: string }>;
}

export const BillingDetailsModal: React.FC<BillingDetailsModalProps> = ({ isOpen, onClose, txn, onOptimisticUpdate, usersMap = {} }) => {
  const { user } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  if (!isOpen || !txn) return null;

  const isDuesPayment = txn.workType === 'Dues Payment';

  const creator = txn.createdBy ? usersMap[txn.createdBy] : null;
  const broughtByText = (() => {
    if (!creator) return 'Customer';
    if (creator.role === 'Collection Staff') return creator.name;
    if (['Staff', 'Admin', 'Super Admin'].includes(creator.role)) return creator.role;
    return 'Customer';
  })();

  const handleMarkPaid = async () => {
    if (!window.confirm("Are you sure you want to mark this transaction as Paid?")) return;

    // Apply optimistic update instantly
    if (onOptimisticUpdate) {
      onOptimisticUpdate(txn.id, { staffPaid: true, status: txn.colStaffPaid ? 'Fully Paid' : 'Awaiting Collection Staff' });
    }

    setIsPaying(true);
    onClose(); // Close instantly for better UX

    try {
      const updates: any = { staff_paid: true };
      if (txn.colStaffPaid) {
        updates.status = 'Fully Paid';
      }
      if (!txn.id.startsWith('TASK-')) {
        supabase.from('transactions').update(updates).eq('id', txn.id).then(() => {
          window.dispatchEvent(new Event('databaseSync'));
        });
      } else {
        const taskId = txn.id.replace('TASK-', '');
        const taskUpdates: any = {
          staff_paid: true,
          col_staff_paid: !!txn.colStaffPaid
        };
        supabase.from('tasks').update(taskUpdates).eq('id', taskId).then(() => {
          window.dispatchEvent(new Event('databaseSync'));
        });
      }
    } catch(e) {
      alert("Failed to update status.");
    }
  };

  const handleDelete = async () => {
    if (user?.role === 'Super Admin') {
      if (window.confirm("Are you sure you want to instantly delete this transaction?")) {
         setIsDeleting(true);
         try {
           const isTask = txn.id.startsWith('TASK-');
           const targetTable = isTask ? 'tasks' : 'transactions';
           const targetId = isTask ? txn.id.replace('TASK-', '') : txn.id;
           if (isTask) {
             await deleteStorageImagesForTasks([targetId]);
           }
           await supabase.from(targetTable).delete().eq('id', targetId);
           window.dispatchEvent(new Event('databaseSync'));
           onClose();
         } catch(e) { alert('Failed to delete'); }
         setIsDeleting(false);
      }
    } else {
      const reason = window.prompt("Please provide a reason for deleting this transaction:");
      if (!reason) return;
      setIsDeleting(true);
      try {
        const isTask = txn.id.startsWith('TASK-');
        await supabase.from('deletion_requests').insert([{
           item_type: isTask ? 'Task' : 'Transaction',
           item_id: isTask ? txn.id.replace('TASK-', '') : txn.id,
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
            <p className="text-[9px] text-secondary font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-secondary/70">person</span>
              Brought By: <span className="text-primary font-black">{broughtByText}</span>
            </p>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
            txn.status === 'Fully Paid' || txn.status === 'Paid' ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'
          }`}>
            {(txn.status === 'Fully Paid' || txn.status === 'Paid') ? (txn.workType === 'Buy' ? 'Settled' : 'Paid') : txn.status}
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

          {/* Section 2: Work Specifications or Payment Details */}
          <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2 text-left">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary mb-1">
              {isDuesPayment ? 'Payment Details' : 'Work Details'}
            </p>
            {isDuesPayment ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-outline font-semibold">Payment Category:</span>
                  <span className="font-bold text-secondary">Dues Settlement</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-outline font-semibold">Payment Method:</span>
                  <span className="font-bold text-secondary">{txn.type}</span>
                </div>
                <div className="border-t border-outline-variant/10 pt-2 mt-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-outline mb-1 block">Allocation Breakdown</span>
                  <p className="text-xs font-semibold text-primary leading-relaxed whitespace-pre-line">{txn.details}</p>
                </div>
              </div>
            ) : (
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
                {txn.impureWeight && txn.workType !== 'Shouldering' && (
                  <div>
                    <span className={lbl}>
                      {txn.workType === 'Marking' ? 'Weight' : 'Impure Weight'}
                    </span>
                    <p className={val}>{txn.impureWeight}</p>
                  </div>
                )}
                {txn.pureWeight && (
                  <div>
                    <span className={lbl}>Pure Weight</span>
                    <p className={val}>{txn.pureWeight}</p>
                  </div>
                )}
                {txn.pointsCount !== undefined && txn.pointsCount !== null && txn.workType !== 'Tunch' && txn.workType !== 'Marking' && (
                  <div>
                    <span className={lbl}>Solder Points</span>
                    <p className={val}>{txn.pointsCount} ({txn.pointsType || 'Gold'})</p>
                  </div>
                )}
                {txn.caratMarking && txn.workType !== 'Tunch' && txn.workType !== 'Shouldering' && (
                  <div>
                    <span className={lbl}>Carat Marking</span>
                    <p className={val}>{txn.caratMarking}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Settlement Summary Card */}
          <div className="rounded-2xl p-4 relative overflow-hidden shadow-md" style={{ background: 'linear-gradient(135deg, #001e40 0%, #003366 100%)', color: '#ffffff' }}>
            <div className="absolute right-0 bottom-0 w-16 h-16 rounded-full blur-lg -mr-4 -mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></div>
            
            {isDuesPayment ? (
              <div className="flex justify-between items-center relative z-10 text-left">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total Amount Received</p>
                  <p className="font-headline text-lg font-black mt-0.5" style={{ color: '#ffffff' }}>
                    ₹ {Number(txn.amount.replace(/[^\d.]/g, '')).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#C9A646' }}>Dues Payment</p>
                  <p className="text-[10px] mt-0.5 font-medium text-emerald-400">
                    Settled & Cleared
                  </p>
                </div>
              </div>
            ) : txn.paidAmount && txn.paidAmount > 0 && (parseFloat(txn.amount.replace(/[^\d.]/g, '')) || 0) > txn.paidAmount ? (
              <div className="relative z-10 space-y-2 text-left">
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Settlement Type</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#C9A646' }}>{txn.type} Settlement</p>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total Charge:</span>
                  <span className="font-bold">{txn.amount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Paid Amount:</span>
                  <span className="font-bold text-emerald-400">₹{txn.paidAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-white/10 pt-1.5">
                  <span style={{ color: '#ffffff', fontWeight: 'bold' }}>Remaining Due:</span>
                  <span className="font-headline font-black text-sm text-error">
                    ₹{((parseFloat(txn.amount.replace(/[^\d.]/g, '')) || 0) - txn.paidAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center relative z-10 text-left">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total Amount</p>
                  <p className="font-headline text-lg font-black mt-0.5" style={{ color: '#ffffff' }}>
                    {txn.amount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#C9A646' }}>{txn.type} Settlement</p>
                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {txn.status === 'Paid' || txn.status === 'Fully Paid' ? (txn.workType === 'Buy' ? 'Settled & Cleared' : 'Paid & Cleared') : 'Payment Due'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {txn.isCashExchange && (
            <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2 text-left animate-fade-in">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#C9A646] mb-1">Cash Details</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className={lbl}>Cash Rate / Gram</span>
                  <p className={val}>₹{txn.cashRatePerGram || 'N/A'}</p>
                </div>
                <div>
                  <span className={lbl}>Total Cash Amount</span>
                  <p className={val}>₹{txn.cashAmount || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          {txn.status !== 'Fully Paid' && txn.status !== 'Paid' && !txn.staffPaid && (
            <button 
              onClick={handleMarkPaid}
              disabled={isPaying}
              className="w-full py-2.5 bg-tertiary hover:bg-tertiary/90 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-lg shadow-tertiary/20"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {isPaying ? 'Processing...' : 'Mark as Paid'}
            </button>
          )}
          
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

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, phone: string, address: string) => Promise<void>;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return alert('Name and Phone are required.');
    setLoading(true);
    try {
      await onAdd(name, phone, address);
      setName(''); setPhone(''); setAddress('');
      onClose();
    } catch(err) {
      console.error(err);
      alert('Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium text-primary placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all";
  const lbl = "text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up">
        <h3 className="font-headline text-xl font-bold text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">person_add</span>
          Add Customer
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={lbl}>Name *</label>
            <input className={inp} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Phone *</label>
            <input className={inp} placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Address</label>
            <textarea className={inp} placeholder="Address" rows={2} value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-surface-container text-primary font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-surface-variant transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-secondary text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20">{loading ? 'Adding...' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  userId: string;
  onSuccess: () => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, customer, userId, onSuccess }) => {
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter ledger for items with outstanding dues
  const unpaidItems = useMemo(() => {
    return customer.ledger.filter(txn => txn.status === 'Unpaid' || txn.status === 'Partially Paid' || txn.status === 'Awaiting Staff' || txn.status === 'Awaiting Collection Staff');
  }, [customer.ledger]);

  // Track allocation inputs
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  // Reset or pre-fill allocations on open
  useEffect(() => {
    if (isOpen) {
      setAmountReceived('');
      setAllocations({});
    }
  }, [isOpen]);

  // FIFO Auto-Allocation logic
  const handleAmountReceivedChange = (val: string) => {
    setAmountReceived(val);
    const amount = parseFloat(val) || 0;
    if (amount <= 0) {
      setAllocations({});
      return;
    }

    let remaining = amount;
    const newAllocations: Record<string, string> = {};

    // Sort unpaid items by date (oldest first)
    const sorted = [...unpaidItems].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB; // Oldest first
    });

    sorted.forEach(item => {
      const totalAmt = parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0;
      const paidAmt = item.paidAmount || 0;
      const due = Math.max(0, totalAmt - paidAmt);

      if (remaining > 0 && due > 0) {
        const alloc = Math.min(remaining, due);
        newAllocations[item.id] = alloc.toString();
        remaining -= alloc;
      } else {
        newAllocations[item.id] = '0';
      }
    });

    setAllocations(newAllocations);
  };

  if (!isOpen) return null;

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const totalAmtRecv = parseFloat(amountReceived) || 0;
  const isOutOfSync = Math.abs(totalAllocated - totalAmtRecv) > 0.01;

  const handleManualAllocChange = (itemId: string, val: string) => {
    setAllocations(prev => ({
      ...prev,
      [itemId]: val
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmtRecv <= 0) return alert('Please enter a valid amount received.');
    if (isOutOfSync) {
      if (!window.confirm(`Warning: The sum of allocations (₹${totalAllocated}) does not match the Total Amount Received (₹${totalAmtRecv}). Do you want to adjust the Total Amount Received to ₹${totalAllocated} and proceed?`)) {
        return;
      }
    }

    const finalAmount = isOutOfSync ? totalAllocated : totalAmtRecv;
    setIsSubmitting(true);

    try {
      const paymentId = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
      const allocationArray = Object.entries(allocations)
        .map(([id, amt]) => ({ id, amount: parseFloat(amt) || 0 }))
        .filter(alloc => alloc.amount > 0);

      // 1. Insert Payment record
      const newPayment = {
        id: paymentId,
        customer_id: customer.id,
        customer_name: customer.name,
        amount: finalAmount,
        payment_method: paymentMethod,
        recorded_by: userId,
        allocations: allocationArray
      };

      const { error: payErr } = await supabase.from('payments').insert([newPayment]);
      if (payErr) throw payErr;

      // 1.5 Insert into ledger_entries (Admin Cash Stock)
      const ledgerEntry = {
        id: `LGR-PAY-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        iso_date: new Date().toISOString().split('T')[0],
        customer_name: customer.name,
        transaction_type: 'Pending Settlement',
        cash_received: paymentMethod === 'Cash' ? finalAmount : 0,
        cash_paid: 0,
        status: 'Completed',
        staff_id: userId
      };
      const { error: ledgerErr } = await supabase.from('ledger_entries').insert([ledgerEntry]);
      if (ledgerErr) console.error("Ledger entry error:", ledgerErr);

      // 1.6 Insert into transactions so it shows up in "All Transactions"
      const paymentTxnId = `TXN-PAY-${Math.floor(1000 + Math.random() * 9000)}`;
      const allocationDetails = allocationArray.map(alloc => {
        const item = unpaidItems.find(x => x.id === alloc.id);
        const cat = item ? item.workType : 'Unknown';
        return `${cat} (₹${alloc.amount.toLocaleString('en-IN')})`;
      }).join(', ');

      const paymentTxn = {
        id: paymentTxnId,
        customer_id: customer.id,
        customer_name: customer.name,
        metal: 'Gold',
        type: paymentMethod,
        work_type: 'Dues Payment',
        amount: finalAmount.toString(),
        cash_amount: finalAmount.toString(),
        paid_amount: finalAmount,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        iso_date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Fully Paid',
        staff_paid: true,
        col_staff_paid: true,
        details: `Payment Receipt: Received lump sum payment of ₹${finalAmount.toLocaleString('en-IN')} towards outstanding dues. Cleared: ${allocationDetails}.`,
        created_by: userId
      };
      await supabase.from('transactions').insert([paymentTxn]);

      // 2. Process allocations
      for (const alloc of allocationArray) {
        const isTask = alloc.id.startsWith('TASK-');
        const taskId = isTask ? alloc.id.replace('TASK-', '') : null;

        if (!isTask) {
          // Update existing transaction
          const { data: txn } = await supabase
            .from('transactions')
            .select('amount, paid_amount')
            .eq('id', alloc.id)
            .single();

          if (txn) {
            const currentPaid = parseFloat(txn.paid_amount || '0') || 0;
            const newPaid = currentPaid + alloc.amount;
            const totalAmt = parseFloat(txn.amount) || 0;

            const updates: any = {
              paid_amount: newPaid
            };
            if (newPaid >= totalAmt) {
              updates.status = 'Fully Paid';
              updates.staff_paid = true;
              updates.col_staff_paid = true;
            } else {
              updates.status = 'Partially Paid';
            }

            await supabase.from('transactions').update(updates).eq('id', alloc.id);
          }
        } else if (taskId) {
          // Convert completed task to transaction
          const { data: task } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

          if (task) {
            const settlementVal = task.settlement_condition || '';
            const isCash = settlementVal.toLowerCase().includes('cash');
            let taskAmt = 0;
            if (isCash && task.cash_amount !== null) {
              taskAmt = Number(task.cash_amount);
            } else {
              const amountMatch = settlementVal.match(/[₹?](\d[\d,]*)/);
              taskAmt = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
            }

            const newTxnId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
            const isFullyPaid = alloc.amount >= taskAmt;

            const newTxn = {
              id: newTxnId,
              customer_id: task.customer_id || 'CUST-COL',
              customer_name: task.customer_name,
              task_id: task.id,
              customer_phone: task.customer_phone || '',
              customer_address: task.customer_address || '',
              metal: task.metal || 'Gold',
              type: paymentMethod,
              work_type: task.work_type || 'Tunch',
              amount: taskAmt.toString(),
              paid_amount: alloc.amount,
              date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              iso_date: new Date().toISOString().split('T')[0],
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: isFullyPaid ? 'Fully Paid' : 'Partially Paid',
              staff_paid: isFullyPaid,
              col_staff_paid: isFullyPaid,
              details: `Partially paid via lump sum. ${task.work_type} task completed. Settlement: ${settlementVal}`.trim(),
              piece_type: task.product_type || '',
              impure_weight: task.impure_weight || task.total_weight || task.weight || '',
              pure_weight: task.pure_weight || '',
              purity_percentage: task.purity || '',
              points_count: task.point_suggestion ? parseInt(task.point_suggestion) : null,
              points_type: task.point_suggestion ? (task.point_suggestion.toLowerCase().includes('silver') ? 'Silver' : 'Gold') : (task.metal === 'Silver' ? 'Silver' : 'Gold'),
              carat_marking: task.carat || '',
              created_by: userId
            };

            await supabase.from('transactions').insert([newTxn]);
            
            // Mark task as completed
            await supabase.from('tasks').update({
              status: 'Completed',
              progress_percentage: 100,
              staff_paid: isFullyPaid,
              col_staff_paid: isFullyPaid
            }).eq('id', taskId);
          }
        }
      }

      window.dispatchEvent(new Event('databaseSync'));
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Failed to record payment: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inp = "w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium text-primary placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all";
  const lbl = "text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up flex flex-col justify-between overflow-hidden" style={{ maxHeight: '90vh' }}>
        <h3 className="font-headline text-xl font-bold text-primary mb-4 flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-secondary">payments</span>
          Record Dues Payment
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto hide-scrollbar pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Total Received (₹) *</label>
              <input 
                type="number" 
                className={inp} 
                placeholder="e.g. 5000" 
                value={amountReceived} 
                onChange={e => handleAmountReceivedChange(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className={lbl}>Payment Method</label>
              <select 
                className={inp} 
                value={paymentMethod} 
                onChange={e => setPaymentMethod(e.target.value as any)}
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          <div className="border-t border-outline-variant/20 pt-3 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-outline mb-2">Dues Allocation (FIFO Auto-Filled)</p>
            <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
              {unpaidItems.map(item => {
                const totalAmt = parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0;
                const paidAmt = item.paidAmount || 0;
                const due = Math.max(0, totalAmt - paidAmt);
                return (
                  <div key={item.id} className="flex justify-between items-center gap-4 bg-surface-container/30 border border-outline-variant/10 p-3 rounded-xl text-left">
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-bold text-primary truncate">{item.workType} ({item.id})</p>
                      <p className="text-[9px] text-outline font-semibold uppercase mt-0.5">{item.date} • Due: ₹{due.toLocaleString()}</p>
                    </div>
                    <div className="w-28 shrink-0 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-outline">₹</span>
                      <input 
                        type="number" 
                        value={allocations[item.id] || ''} 
                        onChange={e => handleManualAllocChange(item.id, e.target.value)}
                        placeholder="0" 
                        className="w-full bg-white border border-outline-variant/30 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-primary focus:outline-none focus:border-primary text-right"
                      />
                    </div>
                  </div>
                );
              })}
              {unpaidItems.length === 0 && (
                <p className="text-xs text-outline text-center py-4">No unpaid items found.</p>
              )}
            </div>
          </div>

          <div className="border-t border-outline-variant/20 pt-3 space-y-1.5 shrink-0 text-left">
            <div className="flex justify-between text-xs font-bold text-outline">
              <span>Total Dues Outstanding:</span>
              <span className="text-primary">{customer.outstanding}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-outline">
              <span>Total Allocated:</span>
              <span className={isOutOfSync ? "text-error" : "text-emerald-600"}>₹{totalAllocated.toLocaleString()}</span>
            </div>
            {isOutOfSync && (
              <p className="text-[9px] text-error font-semibold uppercase tracking-wider text-center bg-error/5 py-1.5 rounded-lg border border-error/15">
                Warning: Allocations do not match Received Amount!
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-surface-container text-primary font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-surface-variant transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-grow flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:from-emerald-700 hover:to-teal-800 transition-colors shadow-lg shadow-emerald-500/20">{isSubmitting ? 'Recording...' : 'Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const StaffBillingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, isFullyAuthenticated } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  
  const role = user?.role;
  const filterBySubmission = (item: any) => {
    if (role === 'Staff' || role === 'Collection Staff') {
      return !item.staffSubmittedAt && !item.staff_submitted_at && !item.adminSubmittedAt && !item.admin_submitted_at;
    }
    if (role === 'Admin') {
      const isCreatedByAdmin = item.created_by === user?.id || item.createdBy === user?.id;
      const isCashTask = item.settlement_condition?.toLowerCase().includes('cash') || 
                         item.settlementCondition?.toLowerCase().includes('cash') ||
                         item.details?.toLowerCase().includes('cash') ||
                         item.isCashExchange ||
                         item.type === 'Cash';
      return (isCreatedByAdmin || item.staffSubmittedAt || item.staff_submitted_at || isCashTask) && !item.adminSubmittedAt && !item.admin_submitted_at;
    }
    return !item.adminSubmittedAt && !item.admin_submitted_at;
  };
  
  const activeTab = (searchParams.get('tab') as TabView) || 'all';
  const customerId = searchParams.get('customerId');
  const transactionId = searchParams.get('transactionId');

  const currentUserId = user?.id || '';
  const isSuperSa = user?.role === 'Super Admin';
  const branchUserIdsCache = getCachedData(`branch_users_${user?.branch_id || 'unknown'}`, Infinity) || [currentUserId];

  const cachedDbCust = getCachedData('db_customers', Infinity);
  const initialDbCust = cachedDbCust
    ? (isSuperSa ? cachedDbCust : cachedDbCust.filter((c: any) => branchUserIdsCache.includes(c.created_by)))
    : [];

  const cachedStaffTx = getCachedData('staff_billing_tx', Infinity) || [];

  const initialTransactions = cachedStaffTx;
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [dbCustomers, setDbCustomers] = useState<DbCustomer[]>(initialDbCust);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, { name: string; role: string; branch_id?: string | null }>>(
    getCachedData('users_map', Infinity) || {}
  );
  const [branches, setBranches] = useState<any[]>(
    getCachedData('branches_list', Infinity) || []
  );
  const [payments, setPayments] = useState<any[]>(getCachedData('payments_data', Infinity) || []);
  const [policy, setPolicy] = useState<{ excellent: number; good: number; fine: number; poor: number }>(() => {
    const cachedSettings = getCachedData('app_settings_all', Infinity);
    const row = cachedSettings?.find((s: any) => s.key === 'customer_behavior_policy');
    return row?.value || { excellent: 7, good: 14, fine: 30, poor: 60 };
  });
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [formPolicy, setFormPolicy] = useState<{ excellent: number; good: number; fine: number; poor: number } | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [showPdfOptions, setShowPdfOptions] = useState<{ customer: any; behavior: any } | null>(null);

  // Customer Wallet State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletCustomer, setWalletCustomer] = useState<Customer | null>(null);
  const [walletLogs, setWalletLogs] = useState<any[]>([]);
  const [loadingWalletLogs, setLoadingWalletLogs] = useState(false);

  const [walletTab, setWalletTab] = useState<'history' | 'action' | 'adjust'>('history');
  const [walletType, setWalletType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
  const [walletAsset, setWalletAsset] = useState<'Cash' | 'Pure Gold' | 'Pure Silver'>('Cash');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletDetails, setWalletDetails] = useState('');
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);

  // Adjustment state variables
  const [selectedAdjTxId, setSelectedAdjTxId] = useState<string>('');
  const [adjMetalRate, setAdjMetalRate] = useState<string>(''); // For adjusting metal converting to cash
  const [adjWeightAmount, setAdjWeightAmount] = useState<string>(''); // grams of gold/silver

  const loadWalletLogs = async (customerId: string) => {
    try {
      setLoadingWalletLogs(true);
      const { data, error } = await supabase
        .from('customer_advances')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWalletLogs(data || []);
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingWalletLogs(false);
    }
  };

  const handleWalletTxnSubmit = async () => {
    if (!walletCustomer) return;
    const amt = parseFloat(walletAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    
    if (walletType === 'Withdrawal') {
      const balance = walletAsset === 'Cash' 
        ? walletCustomer.advance_cash 
        : walletAsset === 'Pure Gold' 
          ? walletCustomer.advance_pure_gold 
          : walletCustomer.advance_pure_silver;
      if (amt > (balance || 0)) {
        alert(`Insufficient funds. Available balance is only ${walletAsset === 'Cash' ? '₹' + (balance || 0).toLocaleString('en-IN') : (balance || 0) + 'g'}.`);
        return;
      }
    }

    const confirmMsg = `Confirm ${walletType} of ${walletAsset === 'Cash' ? '₹' + amt.toLocaleString('en-IN') : amt + 'g ' + walletAsset}?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSubmittingWallet(true);
    try {
      const factor = walletType === 'Deposit' ? 1 : -1;
      const currentCash = walletCustomer.advance_cash || 0;
      const currentGold = walletCustomer.advance_pure_gold || 0;
      const currentSilver = walletCustomer.advance_pure_silver || 0;

      let newCash = currentCash;
      let newGold = currentGold;
      let newSilver = currentSilver;

      if (walletAsset === 'Cash') newCash += factor * amt;
      else if (walletAsset === 'Pure Gold') newGold += factor * amt;
      else if (walletAsset === 'Pure Silver') newSilver += factor * amt;

      const { error: custErr } = await supabase
        .from('customers')
        .update({
          advance_cash: newCash,
          advance_pure_gold: newGold,
          advance_pure_silver: newSilver
        })
        .eq('id', walletCustomer.id);
      if (custErr) throw custErr;

      const advId = `ADV-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error: advErr } = await supabase
        .from('customer_advances')
        .insert([{
          id: advId,
          customer_id: walletCustomer.id,
          customer_name: walletCustomer.name,
          type: walletType,
          asset_type: walletAsset,
          amount: amt,
          details: walletDetails || `${walletType} of ${walletAsset === 'Cash' ? '₹' + amt : amt + 'g'}`,
          created_by: user?.id
        }]);
      if (advErr) throw advErr;

      const ledgerEntryId = `LGR-ADV-${Math.floor(1000 + Math.random() * 9000)}`;
      const ledgerEntry: any = {
        id: ledgerEntryId,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        iso_date: new Date().toISOString().split('T')[0],
        customer_name: walletCustomer.name,
        transaction_type: walletType === 'Deposit' ? 'Customer Advance Deposit' : 'Customer Advance Withdrawal',
        status: 'Completed',
        staff_id: user?.id,
        details: walletDetails || `${walletType} of ${walletAsset === 'Cash' ? '₹' + amt : amt + 'g'}`
      };

      if (walletAsset === 'Cash') {
        if (walletType === 'Deposit') {
          ledgerEntry.cash_received = amt;
          ledgerEntry.cash_paid = 0;
        } else {
          ledgerEntry.cash_received = 0;
          ledgerEntry.cash_paid = amt;
        }
      } else if (walletAsset === 'Pure Gold') {
        if (walletType === 'Deposit') {
          ledgerEntry.pure_gold_in = amt;
          ledgerEntry.pure_gold_out = 0;
        } else {
          ledgerEntry.pure_gold_in = 0;
          ledgerEntry.pure_gold_out = amt;
        }
      } else if (walletAsset === 'Pure Silver') {
        if (walletType === 'Deposit') {
          ledgerEntry.pure_silver_in = amt;
          ledgerEntry.pure_silver_out = 0;
        } else {
          ledgerEntry.pure_silver_in = 0;
          ledgerEntry.pure_silver_out = amt;
        }
      }

      const { error: ledgerErr } = await supabase.from('ledger_entries').insert([ledgerEntry]);
      if (ledgerErr) throw ledgerErr;

      setDbCustomers(prev => prev.map(c => c.id === walletCustomer.id ? {
        ...c,
        advance_cash: newCash,
        advance_pure_gold: newGold,
        advance_pure_silver: newSilver
      } : c));

      setWalletCustomer(prev => prev ? {
        ...prev,
        advance_cash: newCash,
        advance_pure_gold: newGold,
        advance_pure_silver: newSilver
      } : null);

      alert(`${walletType} processed successfully.`);
      setWalletAmount('');
      setWalletDetails('');
      loadWalletLogs(walletCustomer.id);
      window.dispatchEvent(new Event('databaseSync'));
    } catch(err: any) {
      console.error(err);
      alert("Failed to process transaction: " + err.message);
    } finally {
      setIsSubmittingWallet(false);
    }
  };

  const handleWalletAdjustSubmit = async () => {
    if (!walletCustomer || !selectedAdjTxId) return;
    
    const targetTx = walletCustomer.ledger.find(t => t.id === selectedAdjTxId);
    if (!targetTx) {
      alert("Selected transaction not found.");
      return;
    }

    const txAmt = parseFloat(targetTx.amount.replace(/[^\d.]/g, '')) || 0;
    const txPaid = targetTx.paidAmount || 0;
    const remainingDue = txAmt - txPaid;

    if (remainingDue <= 0) {
      alert("This transaction is already fully paid.");
      return;
    }

    setIsSubmittingWallet(true);
    try {
      const currentCash = walletCustomer.advance_cash || 0;
      const currentGold = walletCustomer.advance_pure_gold || 0;
      const currentSilver = walletCustomer.advance_pure_silver || 0;

      let adjustValueInCash = 0;
      let newCash = currentCash;
      let newGold = currentGold;
      let newSilver = currentSilver;
      let details = "";

      if (walletAsset === 'Cash') {
        const amt = parseFloat(walletAmount);
        if (!amt || isNaN(amt) || amt <= 0) {
          alert("Please enter a valid cash amount to adjust.");
          setIsSubmittingWallet(false);
          return;
        }
        if (amt > currentCash) {
          alert(`Insufficient cash balance. Available: ₹${currentCash}`);
          setIsSubmittingWallet(false);
          return;
        }
        if (amt > remainingDue) {
          alert(`Adjustment amount (₹${amt}) cannot exceed remaining due (₹${remainingDue}).`);
          setIsSubmittingWallet(false);
          return;
        }

        adjustValueInCash = amt;
        newCash -= amt;
        details = `Adjusted ₹${amt} Cash against due ${targetTx.id}`;

      } else {
        const weight = parseFloat(adjWeightAmount);
        const rate = parseFloat(adjMetalRate);

        if (!weight || isNaN(weight) || weight <= 0) {
          alert("Please enter a valid weight in grams.");
          setIsSubmittingWallet(false);
          return;
        }
        if (!rate || isNaN(rate) || rate <= 0) {
          alert("Please enter a valid market rate per gram.");
          setIsSubmittingWallet(false);
          return;
        }

        const maxAvailableWeight = walletAsset === 'Pure Gold' ? currentGold : currentSilver;
        if (weight > maxAvailableWeight) {
          alert(`Insufficient metal balance. Available: ${maxAvailableWeight}g`);
          setIsSubmittingWallet(false);
          return;
        }

        const calculatedCashValue = weight * rate;
        if (calculatedCashValue > remainingDue) {
          alert(`Calculated adjustment value (₹${calculatedCashValue.toLocaleString('en-IN')}) cannot exceed remaining due (₹${remainingDue}). Adjust a smaller weight.`);
          setIsSubmittingWallet(false);
          return;
        }

        adjustValueInCash = calculatedCashValue;
        if (walletAsset === 'Pure Gold') newGold -= weight;
        else newSilver -= weight;
        details = `Adjusted ${weight}g Pure ${walletAsset === 'Pure Gold' ? 'Gold' : 'Silver'} at ₹${rate}/g against due ${targetTx.id}`;
      }

      const confirmAdjust = window.confirm(`Confirm adjusting ₹${adjustValueInCash.toLocaleString('en-IN')} towards transaction ${targetTx.id}? This will deduct from the customer's wallet.`);
      if (!confirmAdjust) {
        setIsSubmittingWallet(false);
        return;
      }

      const { error: custErr } = await supabase
        .from('customers')
        .update({
          advance_cash: newCash,
          advance_pure_gold: newGold,
          advance_pure_silver: newSilver
        })
        .eq('id', walletCustomer.id);
      if (custErr) throw custErr;

      const advId = `ADV-ADJ-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error: advErr } = await supabase
        .from('customer_advances')
        .insert([{
          id: advId,
          customer_id: walletCustomer.id,
          customer_name: walletCustomer.name,
          type: 'Adjustment',
          asset_type: walletAsset,
          amount: walletAsset === 'Cash' ? parseFloat(walletAmount) : parseFloat(adjWeightAmount),
          details,
          created_by: user?.id
        }]);
      if (advErr) throw advErr;

      const newPaidAmount = txPaid + adjustValueInCash;
      const isFullyPaid = Math.abs(newPaidAmount - txAmt) < 0.01 || newPaidAmount >= txAmt;
      const computedStatus = isFullyPaid ? 'Fully Paid' : 'Partially Paid';

      if (targetTx.id.startsWith('TASK-')) {
        const rawTaskId = targetTx.id.replace('TASK-', '');
        await supabase.from('tasks').update({
          status: 'Completed',
          progress_percentage: 100,
          col_staff_paid: isFullyPaid,
          staff_paid: isFullyPaid
        }).eq('id', rawTaskId);
      } else {
        await supabase.from('transactions').update({
          paid_amount: newPaidAmount,
          status: computedStatus,
          staff_paid: isFullyPaid,
          col_staff_paid: isFullyPaid
        }).eq('id', targetTx.id);
      }

      const paymentId = `PAY-ADJ-${Math.floor(1000 + Math.random() * 9000)}`;
      const allocationArray = [{ id: targetTx.id, amount: adjustValueInCash }];
      const newPayment = {
        id: paymentId,
        customer_id: walletCustomer.id,
        customer_name: walletCustomer.name,
        amount: adjustValueInCash,
        payment_method: `Wallet ${walletAsset}`,
        recorded_by: user?.id,
        allocations: allocationArray
      };
      await supabase.from('payments').insert([newPayment]);

      alert("Adjustment processed successfully.");
      
      setWalletAmount('');
      setAdjWeightAmount('');
      setAdjMetalRate('');
      setSelectedAdjTxId('');
      loadWalletLogs(walletCustomer.id);
      window.dispatchEvent(new Event('databaseSync'));
    } catch(err: any) {
      console.error(err);
      alert("Failed to adjust: " + err.message);
    } finally {
      setIsSubmittingWallet(false);
    }
  };

  React.useEffect(() => {
    const loadBillingData = async () => {
      // Guard database fetches until fully authenticated to prevent RLS/anonymous query errors
      if (!isFullyAuthenticated) return;

      try {
        const [usersRes, _branchUsersRes, txRes, tasksRes, branchesRes, paymentsRes, settingsRes] = await Promise.all([
          supabase.from('users').select('id, name, role, branch_id'),
          (!isSuperSa && user?.branch_id)
            ? supabase.from('users').select('id').eq('branch_id', user.branch_id)
            : Promise.resolve({ data: null, error: null }),
          supabase.from('transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('tasks').select('*').eq('status', 'Completed').order('created_at', { ascending: false }),
          supabase.from('branches').select('*'),
          supabase.from('payments').select('*').order('created_at', { ascending: false }),
          supabase.from('app_settings').select('*')
        ]);

        const allUsers = usersRes.data;
        if (allUsers) {
          const uMap: Record<string, { name: string; role: string; branch_id?: string | null }> = {};
          allUsers.forEach((u: any) => {
            uMap[u.id] = { name: u.name, role: u.role, branch_id: u.branch_id };
          });
          setUsersMap(uMap);
          setCachedData('users_map', uMap);
        }

        const allBranches = branchesRes.data;
        if (allBranches) {
          setBranches(allBranches);
          setCachedData('branches_list', allBranches);
        }

        if (paymentsRes.data) {
          setPayments(paymentsRes.data);
          setCachedData('payments_data', paymentsRes.data);
        }

        if (settingsRes.data) {
          setCachedData('app_settings_all', settingsRes.data);
          const row = settingsRes.data.find((s: any) => s.key === 'customer_behavior_policy');
          if (row?.value) {
            setPolicy(row.value);
          }
        }

        let branchUserIds: string[] = [];
        if (!isSuperSa && allUsers) {
          branchUserIds = allUsers
            .filter((u: any) => u.branch_id === user?.branch_id || u.role === 'Super Admin')
            .map((u: any) => u.id);
          if (user?.branch_id) {
            setCachedData(`branch_users_${user.branch_id}`, branchUserIds);
          }
        }
        if (branchUserIds.length === 0) {
          branchUserIds = [currentUserId];
        }

        let filteredTx = txRes.data || [];
        let filteredTasks = tasksRes.data || [];

        // Save tx_data and tasks_data to cache
        if (txRes.data) setCachedData('tx_data', txRes.data);
        if (tasksRes.data) setCachedData('tasks_data', tasksRes.data);

        if (!isSuperSa && user?.branch_id) {
          filteredTx = filteredTx.filter((t: any) => !t.created_by || branchUserIds.includes(t.created_by) || branchUserIds.includes(t.createdBy));
          filteredTasks = filteredTasks.filter((task: any) => !task.created_by || branchUserIds.includes(task.created_by));
        }

        const allTx = computeStaffBillingTransactions(filteredTx, filteredTasks);
        setCachedData('staff_billing_tx', allTx);
        const finalTx = allTx;
        setTransactions(finalTx);
      } catch (err) {
        console.error('Error fetching billing data:', err);
      }
    };

    const loadDbCustomers = async () => {
      if (!isFullyAuthenticated) return;
      
      let branchUserIds: string[] = [];
      if (!isSuperSa) {
        const { data: uList } = await supabase
          .from('users')
          .select('id, role, branch_id');
        if (uList) {
          branchUserIds = uList
            .filter((u: any) => u.branch_id === user?.branch_id || u.role === 'Super Admin')
            .map((u: any) => u.id);
          if (user?.branch_id) {
            setCachedData(`branch_users_${user.branch_id}`, branchUserIds);
          }
        }
      }

      const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (data) {
        const newDbHash = JSON.stringify(data);
        const oldDbHash = getCachedData('db_customers_hash');
        if (newDbHash !== oldDbHash) {
          setCachedData('db_customers_hash', newDbHash);
          setCachedData('db_customers', data);
        }
        if (!isSuperSa && user?.branch_id && branchUserIds.length > 0) {
          setDbCustomers(data.filter(c => branchUserIds.includes(c.created_by)));
        } else {
          setDbCustomers(data);
        }
      }
    };

    loadBillingData();
    loadDbCustomers();

    const handleSync = () => {
      loadBillingData();
      loadDbCustomers();
    };
    window.addEventListener('databaseSync', handleSync);

    const pollInterval = setInterval(() => {
      loadBillingData();
      loadDbCustomers();
    }, 2000);

    return () => {
      window.removeEventListener('databaseSync', handleSync);
      clearInterval(pollInterval);
    };
  }, [isFullyAuthenticated, user?.id, user?.branch_id]);

  const handleApproveCustomer = async (id: string) => {
    try {
       await supabase.from('customers').update({ status: 'Approved' }).eq('id', id);
       setDbCustomers(prev => prev.map(c => c.id === id ? { ...c, status: 'Approved' } : c));
    } catch(e) { console.error(e); }
  }

  const handleAddDirectCustomer = async (name: string, phone: string, address: string) => {
    const newId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCust = {
       id: newId,
       name, phone, address, status: 'Approved',
       created_by: user?.id
    };
    await supabase.from('customers').insert([newCust]);
    setDbCustomers(prev => [newCust, ...prev]);
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete customer ${customerName}? This will erase ALL their tasks and transactions.`)) return;
    
    try {
      const { data: customerTasks } = await supabase
        .from('tasks')
        .select('images, audit_images')
        .or(`customer_id.eq.${customerId},customer_name.eq.${customerName}`);

      if (customerTasks && customerTasks.length > 0) {
        const urls: string[] = [];
        customerTasks.forEach(t => {
          if (Array.isArray(t.images)) urls.push(...t.images);
          if (Array.isArray(t.audit_images)) urls.push(...t.audit_images);
        });
        await deleteStorageImagesByUrls(urls);
      }

      const { error: txErr } = await supabase.from('transactions').delete().or(`customer_id.eq.${customerId},customer_name.eq.${customerName}`);
      if (txErr) throw txErr;

      const { error: taskErr } = await supabase.from('tasks').delete().or(`customer_id.eq.${customerId},customer_name.eq.${customerName}`);
      if (taskErr) throw taskErr;

      const { error: custErr } = await supabase.from('customers').delete().eq('id', customerId);
      if (custErr) throw custErr;

      setDbCustomers(prev => prev.filter(c => c.id !== customerId));
      setTransactions(prev => prev.filter(t => t.customerId !== customerId));
      alert(`Customer ${customerName} and all related data deleted successfully.`);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('customerId');
      setSearchParams(newParams);
    } catch(err: any) {
      console.error(err);
      alert(`Failed to delete customer: ${err.message || err}`);
    }
  };

  // Group by customer dynamically
  const dynamicCustomers = React.useMemo(() => {
    const customers: Customer[] = [];

    // First, add all dbCustomers to customers
    dbCustomers.filter(c => c.status === 'Approved').forEach(c => {
        const initials = c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        customers.push({
          id: c.id,
          name: c.name,
          initials: initials || 'C',
          activeJobs: 0,
          outstanding: '₹0',
          paid: '₹0',
          workBreakdown: { tunch: 0, marking: 0, shouldering: 0, buy: 0, sell: 0 },
          ledger: [],
          phone: c.phone,
          address: c.address,
          created_by: c.created_by,
          advance_cash: Number(c.advance_cash || 0),
          advance_pure_gold: Number(c.advance_pure_gold || 0),
          advance_pure_silver: Number(c.advance_pure_silver || 0)
        });
    });

    const hasDateSearch = startDate || endDate;
    transactions.forEach(t => {
      if (hasDateSearch) {
        if (startDate && t.isoDate < startDate) return;
        if (endDate && t.isoDate > endDate) return;
      }
      let cust = customers.find(c => {
        if (c.id && t.customerId && c.id !== 'CUST-COL' && t.customerId !== 'CUST-COL') {
          return c.id === t.customerId;
        }
        if (c.name.trim().toLowerCase() !== t.customerName.trim().toLowerCase()) return false;
        
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
        const newCust: Customer = {
          id: t.customerId || 'CUST-COL',
          name: t.customerName,
          initials: initials || 'C',
          activeJobs: 0,
          outstanding: '₹0',
          paid: '₹0',
          workBreakdown: { tunch: 0, marking: 0, shouldering: 0, buy: 0, sell: 0 },
          ledger: [],
          phone: t.customerPhone,
          address: t.customerAddress,
          created_by: t.createdBy || t.created_by,
          advance_cash: 0,
          advance_pure_gold: 0,
          advance_pure_silver: 0
        };
        customers.push(newCust);
        cust = newCust;
      }
      
      cust.ledger.push(t);
      if (t.workType === 'Dues Payment') return;
      const amtNum = parseFloat(t.amount.replace(/[^\d.]/g, '')) || 0;
      const paidAmtNum = t.paidAmount || 0;
      if (t.status === 'Unpaid') {
        cust.activeJobs += 1;
        const outstandingNum = parseFloat(cust.outstanding.replace(/[^\d.]/g, '')) || 0;
        cust.outstanding = `₹${(outstandingNum + amtNum).toLocaleString('en-IN')}`;
      } else if (t.status === 'Partially Paid') {
        cust.activeJobs += 1;
        const outstandingNum = parseFloat(cust.outstanding.replace(/[^\d.]/g, '')) || 0;
        cust.outstanding = `₹${(outstandingNum + (amtNum - paidAmtNum)).toLocaleString('en-IN')}`;
        const paidNum = parseFloat(cust.paid.replace(/[^\d.]/g, '')) || 0;
        cust.paid = `₹${(paidNum + paidAmtNum).toLocaleString('en-IN')}`;
      } else {
        const paidNum = parseFloat(cust.paid.replace(/[^\d.]/g, '')) || 0;
        cust.paid = `₹${(paidNum + amtNum).toLocaleString('en-IN')}`;
      }
      
      if (t.workType === 'Tunch') {
        cust.workBreakdown.tunch += 1;
      } else if (t.workType === 'Marking') {
        cust.workBreakdown.marking += 1;
      } else if (t.workType === 'Shouldering') {
        cust.workBreakdown.shouldering += 1;
      } else if (t.workType === 'Buy') {
        cust.workBreakdown.buy += 1;
      } else if (t.workType === 'Sell') {
        cust.workBreakdown.sell += 1;
      }
    });

    return customers;
  }, [dbCustomers, transactions]);

  const getCustomerBranchName = (created_by?: string) => {
    if (!created_by) return 'Unassigned';
    const creator = usersMap[created_by];
    if (!creator || !creator.branch_id) return 'Unassigned';
    const b = branches.find(br => br.id === creator.branch_id);
    return b ? b.name : 'Unassigned';
  };

  const selectedCustomer = dynamicCustomers.find(c => c.id === customerId) || null;
  
  React.useEffect(() => {
    if (selectedCustomer && showWalletModal) {
      setWalletCustomer(selectedCustomer);
    }
  }, [selectedCustomer, showWalletModal]);

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

    let matchesSubmission = true;
    if (!startDate && !endDate) {
      matchesSubmission = filterBySubmission(txn);
    }

    return matchesText && matchesDate && matchesSubmission;
  };

  const filteredTransactions = transactions.filter(matchesSearch);
  const filteredCustomers = dynamicCustomers.filter(c => c.name.trim().toLowerCase().includes(searchQuery.trim().toLowerCase()) || c.id.trim().toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const pendingCustomers = dbCustomers.filter(c => c.status === 'Pending');

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
            <NotificationBell />
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
                const isPending = txn.status === 'Unpaid' || txn.status === 'Partially Paid';
                
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
                        <p className={`font-headline text-base font-bold tracking-tight ${isPending ? 'text-error' : 'text-primary'}`}>
                          {txn.amount}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {isPending && <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>}
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            (txn.status === 'Fully Paid' || txn.status === 'Paid') ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                          }`}>
                            {(txn.status === 'Fully Paid' || txn.status === 'Paid') ? (txn.workType === 'Buy' ? 'Settled' : 'Paid') : txn.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  
                    <div className="flex items-center gap-4 border-t border-outline-variant/20 pt-3">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] text-outline">build</span>
                        <span className="text-[9px] text-outline font-bold uppercase tracking-wider">{txn.workType === 'Buy' ? 'Buy (Cash)' : txn.workType === 'Sell' ? 'Sell (Cash)' : txn.workType}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] text-outline">payments</span>
                        <span className="text-[9px] text-outline font-bold uppercase tracking-wider">{txn.type}</span>
                      </div>
                      
                      {(txn.workType === 'Tunch' || txn.workType === 'Buy' || txn.workType === 'Sell') && txn.impureWeight && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-outline">scale</span>
                          <span className="text-[9px] text-outline font-bold uppercase tracking-wider">{txn.impureWeight}</span>
                        </div>
                      )}
                      {(txn.workType === 'Tunch' || txn.workType === 'Buy' || txn.workType === 'Sell') && txn.pureWeight && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-outline">workspace_premium</span>
                          <span className="text-[9px] text-outline font-bold uppercase tracking-wider">{txn.pureWeight}g Pure</span>
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

            {user?.role === 'Super Admin' && (
              <button 
                onClick={() => setShowAddCustomerModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-secondary/20 transition-colors mt-2"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                Add New Customer
              </button>
            )}

            {user?.role === 'Super Admin' && pendingCustomers.length > 0 && (
               <div className="space-y-3">
                 <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1 text-secondary flex items-center gap-2">
                   <span className="material-symbols-outlined text-sm">hourglass_top</span>
                   Pending Approvals
                 </h3>
                 {pendingCustomers.map(pc => (
                    <div key={pc.id} className="luxury-card p-4 flex items-center justify-between border-l-4 border-secondary bg-secondary/5">
                       <div>
                          <p className="font-headline font-bold text-primary text-[15px]">{pc.name}</p>
                          <p className="text-[10px] text-outline font-bold mt-0.5">{pc.phone} {pc.address ? `• ${pc.address}` : ''}</p>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => handleApproveCustomer(pc.id)} className="px-4 py-2 bg-secondary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/90 transition-colors">Approve</button>
                       </div>
                    </div>
                 ))}
               </div>
            )}

            <div className="space-y-6">
              {isSuperSa ? (
                (() => {
                  const groups: Record<string, typeof filteredCustomers> = {};
                  filteredCustomers.forEach(customer => {
                    const bName = getCustomerBranchName(customer.created_by);
                    if (!groups[bName]) groups[bName] = [];
                    groups[bName].push(customer);
                  });

                  return Object.keys(groups).sort().map(bName => (
                    <div key={bName} className="space-y-3">
                      <h4 className="font-label text-[11px] uppercase tracking-[0.2em] text-secondary font-bold px-1 flex items-center gap-2 mt-4 first:mt-0">
                        <span className="material-symbols-outlined text-sm">domain</span>
                        {bName}
                      </h4>
                      <div className="space-y-3">
                        {groups[bName].map(customer => {
                          const behavior = analyzeCustomerBehavior(customer.ledger, payments, policy);
                          return (
                          <div key={customer.id} onClick={() => { setSearchQuery(''); setSearchParams({ customerId: customer.id, tab: activeTab }); }} className="luxury-card p-4 flex items-center justify-between cursor-pointer group hover:bg-surface-bright">
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-fixed/60 to-primary-fixed/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/10 shadow-inner relative">
                                {customer.initials}
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                                  behavior.level === 'Excellent' ? 'bg-emerald-500 text-white' :
                                  behavior.level === 'Good' ? 'bg-blue-500 text-white' :
                                  behavior.level === 'Fine' ? 'bg-amber-500 text-white' :
                                  behavior.level === 'Poor' ? 'bg-orange-500 text-white' :
                                  behavior.level === 'No History' ? 'bg-slate-400 text-white' :
                                  'bg-red-500 text-white'
                                }`}>
                                  <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                                    {behavior.level === 'Excellent' ? 'star' :
                                     behavior.level === 'Good' ? 'thumb_up' :
                                     behavior.level === 'Fine' ? 'remove' :
                                     behavior.level === 'Poor' ? 'warning' :
                                     behavior.level === 'No History' ? 'hourglass_empty' :
                                     'error'}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="font-headline font-bold text-primary text-[15px] flex items-center gap-1.5">
                                  {customer.name}
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${
                                    behavior.level === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                                    behavior.level === 'Good' ? 'bg-blue-100 text-blue-700' :
                                    behavior.level === 'Fine' ? 'bg-amber-100 text-amber-700' :
                                    behavior.level === 'Poor' ? 'bg-orange-100 text-orange-700' :
                                    behavior.level === 'No History' ? 'bg-slate-100 text-slate-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {behavior.score}
                                  </span>
                                </p>
                                <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">{customer.id} • {customer.activeJobs} Jobs</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-white transition-colors premium-shadow">
                              <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  ));
                })()
              ) : (
                filteredCustomers.map(customer => {
                  const behavior = analyzeCustomerBehavior(customer.ledger, payments, policy);
                  return (
                  <div key={customer.id} onClick={() => { setSearchQuery(''); setSearchParams({ customerId: customer.id, tab: activeTab }); }} className="luxury-card p-4 flex items-center justify-between cursor-pointer group hover:bg-surface-bright">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-fixed/60 to-primary-fixed/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/10 shadow-inner relative">
                        {customer.initials}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                          behavior.level === 'Excellent' ? 'bg-emerald-500 text-white' :
                          behavior.level === 'Good' ? 'bg-blue-500 text-white' :
                          behavior.level === 'Fine' ? 'bg-amber-500 text-white' :
                          behavior.level === 'Poor' ? 'bg-orange-500 text-white' :
                          behavior.level === 'No History' ? 'bg-slate-400 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                            {behavior.level === 'Excellent' ? 'star' :
                             behavior.level === 'Good' ? 'thumb_up' :
                             behavior.level === 'Fine' ? 'remove' :
                             behavior.level === 'Poor' ? 'warning' :
                             behavior.level === 'No History' ? 'hourglass_empty' :
                             'error'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-primary text-[15px] flex items-center gap-1.5">
                          {customer.name}
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${
                            behavior.level === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                            behavior.level === 'Good' ? 'bg-blue-100 text-blue-700' :
                            behavior.level === 'Fine' ? 'bg-amber-100 text-amber-700' :
                            behavior.level === 'Poor' ? 'bg-orange-100 text-orange-700' :
                            behavior.level === 'No History' ? 'bg-slate-100 text-slate-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {behavior.score}
                          </span>
                        </p>
                        <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">{customer.id} • {customer.activeJobs} Jobs</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-white transition-colors premium-shadow">
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </div>
                  </div>
                )})
              )}
              {filteredCustomers.length === 0 && (
                <div className="p-8 text-center text-outline text-sm font-medium">No customers found.</div>
              )}
            </div>
          </div>
        )}

        {/* View: Particular Customer Detail */}
        {selectedCustomer && (() => {
          const behavior = analyzeCustomerBehavior(selectedCustomer.ledger, payments, policy);
          return (
            <div className="animate-fade-in space-y-6">
            <header className="flex justify-between items-start">
              <button onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); navigate(-1); }} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-outline hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Directory
              </button>
              <div className="flex items-center gap-3">
                {user?.role === 'Super Admin' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowPdfOptions({ customer: selectedCustomer, behavior })} 
                      className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                      Download PDF
                    </button>
                    <button onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)} className="px-4 py-2 bg-error/10 text-error border border-error/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-error/20 transition-colors shadow-sm">
                      Delete Customer
                    </button>
                  </div>
                )}
                  <NotificationBell />
              </div>
            </header>
            
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
                    <p className={`text-sm font-black mt-0.5 ${selectedCustomer.outstanding !== '₹0' && selectedCustomer.outstanding !== '₹ 0' ? 'text-error' : 'text-tertiary'}`}>{selectedCustomer.outstanding}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Pieces breakdowns separately */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              {[
                { 
                  label: 'Tunch Pcs', 
                  val: selectedCustomer.workBreakdown.tunch, 
                  icon: 'science', 
                  iconColor: 'bg-tertiary/10 text-tertiary'
                },
                { 
                  label: 'Marking Pcs', 
                  val: selectedCustomer.workBreakdown.marking, 
                  icon: 'verified', 
                  iconColor: 'bg-secondary/10 text-secondary'
                },
                { 
                  label: 'Shoulder Pcs', 
                  val: selectedCustomer.workBreakdown.shouldering, 
                  icon: 'precision_manufacturing', 
                  iconColor: 'bg-primary/10 text-primary'
                },
                { 
                  label: 'Buy Jobs', 
                  val: selectedCustomer.workBreakdown.buy, 
                  icon: 'shopping_cart', 
                  iconColor: 'bg-emerald-500/10 text-emerald-600'
                },
                { 
                  label: 'Sell Jobs', 
                  val: selectedCustomer.workBreakdown.sell, 
                  icon: 'sell', 
                  iconColor: 'bg-amber-500/10 text-amber-600'
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

            {/* Customer Wallet Card (Admin/Super Admin only) */}
            {['Admin', 'Super Admin'].includes(user?.role || '') && (
              <div className="luxury-card p-5 bg-white border border-outline-variant/10 space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#C9A646] text-[20px]">account_balance_wallet</span>
                    <h3 className="font-headline font-bold text-primary text-[14px]">Customer Advance Wallet</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setWalletCustomer(selectedCustomer);
                      loadWalletLogs(selectedCustomer.id);
                      setWalletTab('history');
                      setShowWalletModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[9px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[10px]">settings_accessibility</span>
                    Manage Wallet
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/80 space-y-0.5">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-700">Cash Balance</p>
                    <p className="font-headline text-base font-extrabold text-emerald-600">₹{(selectedCustomer.advance_cash || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/80 space-y-0.5">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-amber-700">Pure Gold</p>
                    <p className="font-headline text-base font-extrabold text-amber-600">{(selectedCustomer.advance_pure_gold || 0).toFixed(3)}g</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-600">Pure Silver</p>
                    <p className="font-headline text-base font-extrabold text-slate-700">{(selectedCustomer.advance_pure_silver || 0).toFixed(3)}g</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Behavior Profile */}
            <div className="luxury-card p-5 bg-white border border-outline-variant/10 space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">insights</span>
                  <h3 className="font-headline font-bold text-primary text-[14px]">Payment Behavior Profile</h3>
                </div>
                <div className="flex items-center gap-2">
                  {user?.role === 'Super Admin' ? (
                    <button 
                      onClick={() => { setFormPolicy(policy); setShowPolicyModal(true); }} 
                      className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[9px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[10px]">settings</span>
                      Configure Policy
                    </button>
                  ) : (
                    <span className="text-[9px] font-bold text-outline uppercase tracking-wider bg-surface-container/50 px-2.5 py-1 rounded-full border border-outline-variant/5">
                      Active Policy: Excellent &le; {policy.excellent}d
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
                {/* Score & Level Badge */}
                <div className="space-y-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined font-black text-lg ${
                      behavior.level === 'Excellent' ? 'text-emerald-500' :
                      behavior.level === 'Good' ? 'text-teal-500' :
                      behavior.level === 'Fine' ? 'text-amber-500' :
                      behavior.level === 'Poor' ? 'text-orange-500' :
                      behavior.level === 'No History' ? 'text-slate-400' : 'text-red-600'
                    }`}>{
                      behavior.level === 'Excellent' ? 'verified' :
                      behavior.level === 'Good' ? 'recommend' :
                      behavior.level === 'Fine' ? 'info' :
                      behavior.level === 'Poor' ? 'warning' :
                      behavior.level === 'No History' ? 'hourglass_empty' : 'dangerous'
                    }</span>
                    <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      behavior.level === 'Excellent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      behavior.level === 'Good' ? 'bg-teal-50 text-teal-600 border border-teal-200' :
                      behavior.level === 'Fine' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      behavior.level === 'Poor' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                      behavior.level === 'No History' ? 'bg-slate-50 text-slate-600 border border-slate-200' :
                      'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {behavior.level} Rating
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-black text-primary leading-none">{behavior.score}</p>
                    <p className="text-xs font-bold text-outline">/ 100</p>
                  </div>
                </div>

                {/* Score progress bar */}
                <div className="flex-1 w-full space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-outline">
                    <span>Performance Score</span>
                    <span>{behavior.level === 'No History' ? 'No History' : behavior.score >= 90 ? 'Excellent credit' : behavior.score >= 75 ? 'Good standing' : behavior.score >= 55 ? 'Satisfactory' : behavior.score >= 30 ? 'High Risk' : 'Disabled Credit'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-outline-variant/10 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        behavior.level === 'Excellent' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                        behavior.level === 'Good' ? 'bg-gradient-to-r from-teal-500 to-teal-400' :
                        behavior.level === 'Fine' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                        behavior.level === 'Poor' ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                        behavior.level === 'No History' ? 'bg-slate-300' :
                        'bg-gradient-to-r from-red-600 to-red-500'
                      }`}
                      style={{ width: `${behavior.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Behavior Description text */}
              <p className="text-[11px] leading-relaxed text-outline/90 bg-surface-container/30 px-3.5 py-2.5 rounded-xl border border-outline-variant/10">
                {behavior.level === 'Excellent' && "Consistently clears outstanding dues well within policy limits or resolves payments immediately. Highly reliable credit behavior."}
                {behavior.level === 'Good' && "Clears dues promptly with minor delays. Good payment discipline with low risk."}
                {behavior.level === 'Fine' && "Resolves dues within moderate clearance limits. Satisfactory standing but requires regular follow-ups."}
                {behavior.level === 'Poor' && "Frequently delays dues settlement beyond the policy limits. High-risk client, caution advised on further credit."}
                {behavior.level === 'Impossible' && "Dues highly overdue for extended periods. Critical clearance defaults. Credit option should be suspended."}
                {behavior.level === 'No History' && "No billing history available. The client has not been assigned any billable jobs yet."}
              </p>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-surface-container/30 p-2.5 rounded-xl border border-outline-variant/10 space-y-0.5">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider">On-Time Rate</p>
                  <p className={`font-headline text-sm font-extrabold ${behavior.onTimeRate >= 80 ? 'text-emerald-600' : behavior.onTimeRate >= 60 ? 'text-amber-600' : 'text-error'}`}>{behavior.onTimeRate}%</p>
                </div>
                <div className="bg-surface-container/30 p-2.5 rounded-xl border border-outline-variant/10 space-y-0.5">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Avg Dues Age</p>
                  <p className="font-headline text-sm font-extrabold text-primary">{behavior.avgDaysToPay}d</p>
                </div>
                <div className="bg-surface-container/30 p-2.5 rounded-xl border border-outline-variant/10 space-y-0.5">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Max Delay</p>
                  <p className={`font-headline text-sm font-extrabold ${behavior.maxDelay <= policy.excellent ? 'text-primary' : behavior.maxDelay <= policy.good ? 'text-amber-600' : 'text-error'}`}>{behavior.maxDelay}d</p>
                </div>
              </div>
            </div>

            {/* Dues Status Banner */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              selectedCustomer.outstanding !== '₹0' && selectedCustomer.outstanding !== '₹ 0'
                ? 'bg-error/5 border-error/20 text-error' 
                : 'bg-tertiary/5 border-tertiary/20 text-tertiary'
            }`}>
              <span className="material-symbols-outlined text-[20px]">{selectedCustomer.outstanding !== '₹0' && selectedCustomer.outstanding !== '₹ 0' ? 'warning' : 'verified'}</span>
              <div className="text-left">
                <p className="text-xs font-bold">{selectedCustomer.outstanding !== '₹0' && selectedCustomer.outstanding !== '₹ 0' ? 'Dues Pending Settlement' : 'Ledger Fully Settled'}</p>
                <p className="text-[9px] opacity-75 mt-0.5">{selectedCustomer.outstanding !== '₹0' && selectedCustomer.outstanding !== '₹ 0' ? 'Please complete payment collection or settlement.' : 'No outstanding balances for this client.'}</p>
              </div>
            </div>

            {/* Direct Dues Payment Action */}
            {['Admin', 'Super Admin'].includes(user?.role || '') && selectedCustomer.outstanding !== '₹0' && selectedCustomer.outstanding !== '₹ 0' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 mt-2 text-center"
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                Record Dues Payment
              </button>
            )}

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
                const filteredHistoryLedger = selectedCustomer.ledger.filter(txn => {
                  if (historyDateFilter) {
                    return txn.isoDate === historyDateFilter;
                  }
                  return filterBySubmission(txn);
                });

                if (filteredHistoryLedger.length === 0) {
                  return (
                    <div className="luxury-card p-6 text-center border border-outline-variant/10 bg-white rounded-2xl">
                      <span className="material-symbols-outlined text-outline text-3xl mb-1.5">calendar_today</span>
                      <p className="text-xs text-outline font-bold">No intake records on this date.</p>
                    </div>
                  );
                }

                return filteredHistoryLedger.map(txn => {
                  const isPending = txn.status === 'Unpaid' || txn.status === 'Partially Paid';
                  return (
                    <div key={txn.id} onClick={() => setSearchParams({ transactionId: txn.id, customerId: selectedCustomer.id, tab: activeTab })} className="luxury-card p-4 border border-outline-variant/10 relative overflow-hidden group cursor-pointer active:scale-[0.99] transition-transform bg-white">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPending ? 'bg-error' : 'bg-tertiary'}`}></div>
                      <div className="flex justify-between items-start pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPending ? 'bg-error-container/30 text-error group-hover:bg-error-container/50' : getWorkColor(txn.workType)}`}>
                            <span className="material-symbols-outlined text-[20px]">{getWorkIcon(txn.workType)}</span>
                          </div>
                          <div>
                            <p className={`font-headline font-bold text-[13px] ${isPending ? 'text-error' : 'text-primary'}`}>{txn.workType === 'Dues Payment' ? 'Dues Payment' : `${txn.workType} Work`}</p>
                            <p className="text-[10px] font-bold text-outline tracking-wider uppercase mt-0.5">{txn.date} • {txn.timestamp}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-headline text-base font-black ${isPending ? 'text-error' : 'text-primary'}`}>
                            {txn.amount}
                          </p>
                          <p className="text-[8px] font-bold text-outline uppercase tracking-widest mt-1 opacity-70">{txn.id}</p>
                        </div>
                      </div>
                      <div className="pl-14 pr-2 flex justify-between items-center mt-2.5">
                        <p className={`text-[11px] font-medium leading-relaxed truncate ${isPending ? 'text-error/80' : 'text-outline'}`}>
                          {txn.details}
                        </p>
                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${isPending ? 'bg-error text-white' : 'bg-tertiary/10 text-tertiary'}`}>
                          {(txn.status === 'Fully Paid' || txn.status === 'Paid' || txn.status === 'Completed') ? (txn.workType === 'Buy' ? 'Settled' : 'Paid') : txn.status}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        );
      })()}
      </main>

      <BillingDetailsModal 
        isOpen={!!selectedTransaction}
        onClose={handleCloseModal}
        txn={selectedTransaction}
        usersMap={usersMap}
        onOptimisticUpdate={(id, updates) => {
          setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        }}
      />

      <AddCustomerModal 
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onAdd={handleAddDirectCustomer}
      />

      {selectedCustomer && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          customer={selectedCustomer}
          userId={user?.id || ''}
          onSuccess={() => {
            // Success
          }}
        />
      )}

      {/* Super Admin Policy Limits Modal */}
      {showPolicyModal && formPolicy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border border-outline-variant/20 shadow-2xl relative animate-scale-up space-y-6">
            <header className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
              <div>
                <h3 className="font-headline font-bold text-primary text-base">Clearance Policy Settings</h3>
                <p className="text-[10px] text-outline font-semibold">Configure customer credit evaluation levels</p>
              </div>
              <button 
                onClick={() => setShowPolicyModal(false)} 
                className="w-8 h-8 rounded-full bg-surface-container/50 flex items-center justify-center text-outline hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </header>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (formPolicy.excellent >= formPolicy.good || formPolicy.good >= formPolicy.fine || formPolicy.fine >= formPolicy.poor) {
                alert("Clearance limits must be in increasing order (Excellent < Good < Fine < Poor).");
                return;
              }
              
              setSavingPolicy(true);
              try {
                const { error } = await supabase
                  .from('app_settings')
                  .upsert({ key: 'customer_behavior_policy', value: formPolicy, updated_at: new Date().toISOString() });
                if (error) throw error;
                setPolicy(formPolicy);
                setShowPolicyModal(false);
                alert("Scoring policy limits updated successfully!");
              } catch (err: any) {
                console.error(err);
                alert(`Failed to save policy: ${err.message || err}`);
              } finally {
                setSavingPolicy(false);
              }
            }} className="space-y-4 text-left">
              {[
                { name: 'excellent', label: 'Excellent Clearance (Days)' },
                { name: 'good', label: 'Good Clearance (Days)' },
                { name: 'fine', label: 'Fine Clearance (Days)' },
                { name: 'poor', label: 'Poor Clearance (Days)' }
              ].map((field) => {
                const key = field.name as keyof typeof policy;
                const val = formPolicy[key];
                return (
                  <div key={field.name} className="space-y-1.5">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider">{field.label}</label>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setFormPolicy(prev => prev ? { ...prev, [key]: Math.max(1, prev[key] - 1) } : null)}
                        className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/30 font-bold text-primary hover:bg-surface-bright active:scale-95 transition-all text-sm"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        value={val}
                        onChange={e => {
                          const parsed = Math.max(1, parseInt(e.target.value) || 1);
                          setFormPolicy(prev => prev ? { ...prev, [key]: parsed } : null);
                        }}
                        className="flex-1 w-full bg-white border border-outline-variant/30 rounded-xl py-2.5 text-center font-extrabold text-sm text-primary focus:outline-none focus:border-primary transition-all"
                      />
                      <button 
                        type="button" 
                        onClick={() => setFormPolicy(prev => prev ? { ...prev, [key]: prev[key] + 1 } : null)}
                        className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/30 font-bold text-primary hover:bg-surface-bright active:scale-95 transition-all text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowPolicyModal(false)}
                  className="flex-1 py-3 bg-surface-container text-outline border border-outline-variant/30 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingPolicy}
                  className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary-dark transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingPolicy ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Report Type Modal */}
      {showPdfOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 border border-outline-variant/10 shadow-2xl space-y-4">
            <div>
              <h3 className="font-headline font-bold text-primary text-base">Select Statement Format</h3>
              <p className="text-xs text-outline mt-1 font-medium">Choose how you want to export this ledger file.</p>
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={async () => {
                  const data = showPdfOptions;
                  setShowPdfOptions(null);
                  const toastId = toast.loading('Generating Super Admin Report...');
                  try {
                    await generateCustomerPDFReport(data.customer, data.behavior, usersMap, 'super_admin');
                  } finally {
                    toast.dismiss(toastId);
                  }
                }}
                className="w-full text-left p-3.5 rounded-xl border border-outline-variant/15 hover:bg-slate-50 transition-colors flex items-start gap-3 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">admin_panel_settings</span>
                <div>
                  <p className="text-xs font-bold text-primary">Super Admin Report</p>
                  <p className="text-[10px] text-outline mt-0.5 font-medium">Includes internal credit behavior ratings and delay metrics.</p>
                </div>
              </button>

              <button 
                onClick={async () => {
                  const data = showPdfOptions;
                  setShowPdfOptions(null);
                  const toastId = toast.loading('Generating Customer Report...');
                  try {
                    await generateCustomerPDFReport(data.customer, data.behavior, usersMap, 'customer');
                  } finally {
                    toast.dismiss(toastId);
                  }
                }}
                className="w-full text-left p-3.5 rounded-xl border border-outline-variant/15 hover:bg-slate-50 transition-colors flex items-start gap-3 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">person</span>
                <div>
                  <p className="text-xs font-bold text-primary">Customer Statement</p>
                  <p className="text-[10px] text-outline mt-0.5 font-medium">Clean billing statement ready for sharing. Excludes score metrics.</p>
                </div>
              </button>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-outline-variant/5">
              <button 
                onClick={() => setShowPdfOptions(null)}
                className="flex-1 py-3 text-xs font-bold text-outline uppercase tracking-wider hover:bg-slate-50 rounded-xl transition-all border border-outline-variant/10 text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Wallet Modal */}
      {showWalletModal && walletCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-outline-variant/10 shadow-2xl space-y-4 flex flex-col max-h-[85vh] overflow-hidden animate-modal-up">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3 shrink-0">
              <div>
                <h3 className="font-headline font-bold text-primary text-base flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#C9A646]">account_balance_wallet</span>
                  Wallet Account: {walletCustomer.name}
                </h3>
                <p className="text-[10px] text-outline font-bold uppercase tracking-wider mt-0.5">ID: {walletCustomer.id}</p>
              </div>
              <button 
                onClick={() => setShowWalletModal(false)}
                className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-outline hover:text-primary active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Wallet Balances Quick View */}
            <div className="grid grid-cols-3 gap-3 shrink-0 text-center bg-slate-50 p-3 rounded-2xl border border-outline-variant/10">
              <div className="space-y-0.5">
                <p className="text-[8px] font-bold uppercase tracking-wider text-outline">Cash Balance</p>
                <p className="font-headline text-sm font-extrabold text-emerald-600">₹{(walletCustomer.advance_cash || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-bold uppercase tracking-wider text-outline">Pure Gold</p>
                <p className="font-headline text-sm font-extrabold text-amber-600">{(walletCustomer.advance_pure_gold || 0).toFixed(3)}g</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-bold uppercase tracking-wider text-outline">Pure Silver</p>
                <p className="font-headline text-sm font-extrabold text-slate-600">{(walletCustomer.advance_pure_silver || 0).toFixed(3)}g</p>
              </div>
            </div>

            {/* Tab Switches */}
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 gap-1">
              {[
                { id: 'history', label: 'History Logs', icon: 'history' },
                { id: 'action', label: 'Deposit / Withdraw', icon: 'swap_vertical_circle' },
                { id: 'adjust', label: 'Adjust Dues', icon: 'assignment_turned_in' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setWalletTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${walletTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-grow overflow-y-auto pr-1">
              
              {/* TAB 1: HISTORY LOGS */}
              {walletTab === 'history' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Wallet Transaction Logs</p>
                  {loadingWalletLogs ? (
                    <div className="text-center p-8 text-outline text-xs">Loading logs...</div>
                  ) : walletLogs.length === 0 ? (
                    <div className="text-center p-8 text-outline text-xs border border-dashed border-outline-variant/20 rounded-2xl">No transaction history found.</div>
                  ) : (
                    <div className="space-y-2">
                      {walletLogs.map((log: any) => (
                        <div key={log.id} className="p-3 bg-white border border-outline-variant/10 rounded-xl space-y-1">
                          <div className="flex justify-between items-start">
                            <span className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              log.type === 'Deposit' ? 'bg-emerald-50 text-emerald-600' :
                              log.type === 'Withdrawal' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {log.type}
                            </span>
                            <span className="text-[9px] text-outline font-bold">
                              {new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline pt-1">
                            <p className="text-xs font-semibold text-primary">{log.details}</p>
                            <p className={`text-xs font-extrabold shrink-0 ${log.type === 'Deposit' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {log.type === 'Deposit' ? '+' : '-'}
                              {log.asset_type === 'Cash' ? `₹${Number(log.amount).toLocaleString('en-IN')}` : `${log.amount}g`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DEPOSIT / WITHDRAW */}
              {walletTab === 'action' && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Add or Remove Funds/Metals</p>
                  
                  {/* Action Mode Toggle */}
                  <div className="flex gap-2">
                    {['Deposit', 'Withdrawal'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setWalletType(type as any)}
                        className={`flex-grow flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${walletType === type ? 'bg-primary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30'}`}
                      >
                        {type === 'Deposit' ? 'Deposit (Receive Extra)' : 'Withdraw (Give Back)'}
                      </button>
                    ))}
                  </div>

                  {/* Asset Type Selector */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block">Select Asset</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Cash', 'Pure Gold', 'Pure Silver'].map(asset => (
                        <button
                          key={asset}
                          type="button"
                          onClick={() => setWalletAsset(asset as any)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-colors ${walletAsset === asset ? 'bg-[#001e40] text-white border-transparent' : 'bg-white text-outline border-outline-variant/30'}`}
                        >
                          {asset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount / Weight input */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block">
                      {walletAsset === 'Cash' ? 'Amount (₹) *' : 'Weight (grams) *'}
                    </label>
                    <input
                      type="number"
                      value={walletAmount}
                      onChange={e => setWalletAmount(e.target.value)}
                      placeholder={walletAsset === 'Cash' ? 'e.g. 5000' : 'e.g. 2.500'}
                      className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-semibold text-primary placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Details input */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block">Remarks / Notes</label>
                    <input
                      type="text"
                      value={walletDetails}
                      onChange={e => setWalletDetails(e.target.value)}
                      placeholder="e.g. Received extra cash during settlement, keep as advance"
                      className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-semibold text-primary placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleWalletTxnSubmit}
                    disabled={isSubmittingWallet}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingWallet ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Submit Wallet Transaction
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 3: ADJUST OUTSTANDING */}
              {walletTab === 'adjust' && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Adjust Dues against pending tasks</p>
                  
                  {/* Select Outstanding Due */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block">Select Outstanding Job / Due *</label>
                    {(() => {
                      const pendingTx = walletCustomer.ledger.filter(t => t.status === 'Unpaid' || t.status === 'Partially Paid');
                      if (pendingTx.length === 0) {
                        return <div className="text-center p-4 text-xs font-semibold text-outline bg-slate-50 rounded-xl border border-dashed">No outstanding dues to adjust!</div>;
                      }
                      return (
                        <div className="space-y-2 max-h-[160px] overflow-y-auto border border-outline-variant/10 rounded-xl p-2 bg-slate-50/50">
                          {pendingTx.map(t => {
                            const txAmt = parseFloat(t.amount.replace(/[^\d.]/g, '')) || 0;
                            const txPaid = t.paidAmount || 0;
                            const due = txAmt - txPaid;
                            return (
                              <div 
                                key={t.id} 
                                onClick={() => setSelectedAdjTxId(t.id)}
                                className={`p-2.5 rounded-lg border transition-all cursor-pointer text-left ${selectedAdjTxId === t.id ? 'bg-[#001e40]/5 border-[#001e40] shadow-sm' : 'bg-white border-outline-variant/10 hover:border-slate-300'}`}
                              >
                                <div className="flex justify-between items-start">
                                  <span className="text-[9.5px] font-extrabold text-primary">{t.id} • {t.workType} ({t.metal})</span>
                                  <span className="text-[10px] font-extrabold text-error">Due: ₹{due.toLocaleString('en-IN')}</span>
                                </div>
                                <p className="text-[8.5px] text-outline mt-0.5 truncate font-medium">{t.date} • {t.details}</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Only show due options if one is selected */}
                  {selectedAdjTxId && (
                    <div className="space-y-3.5 animate-fade-in border-t border-outline-variant/10 pt-3">
                      
                      {/* Asset to adjust with */}
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block">Adjust with Wallet Asset</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Cash', 'Pure Gold', 'Pure Silver'].map(asset => (
                            <button
                              key={asset}
                              type="button"
                              onClick={() => {
                                setWalletAsset(asset as any);
                                setWalletAmount('');
                                setAdjWeightAmount('');
                              }}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${walletAsset === asset ? 'bg-[#001e40] text-white border-transparent' : 'bg-white text-outline border-outline-variant/30'}`}
                            >
                              {asset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Input based on asset selected */}
                      {walletAsset === 'Cash' ? (
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block">Cash Amount to Adjust (₹) *</label>
                          <input
                            type="number"
                            value={walletAmount}
                            onChange={e => setWalletAmount(e.target.value)}
                            placeholder="e.g. 2000"
                            className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-semibold text-primary focus:outline-none focus:border-primary"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block">Metal Weight (grams) *</label>
                            <input
                              type="number"
                              value={adjWeightAmount}
                              onChange={e => setAdjWeightAmount(e.target.value)}
                              placeholder="e.g. 1.000"
                              className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl px-3 py-2.5 text-xs font-semibold text-primary focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-outline mb-1.5 block">Convert Rate (₹ / gram) *</label>
                            <input
                              type="number"
                              value={adjMetalRate}
                              onChange={e => setAdjMetalRate(e.target.value)}
                              placeholder="e.g. 7200"
                              className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl px-3 py-2.5 text-xs font-semibold text-primary focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                      )}

                      {/* Display calculated adjustment value */}
                      {walletAsset !== 'Cash' && adjWeightAmount && adjMetalRate && (
                        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-left">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Calculated Adjustment Value</p>
                          <p className="text-xs font-extrabold text-primary mt-0.5">
                            ₹{((parseFloat(adjWeightAmount) || 0) * (parseFloat(adjMetalRate) || 0)).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}

                      {/* Submit Adjustment Button */}
                      <button
                        onClick={handleWalletAdjustSubmit}
                        disabled={isSubmittingWallet}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingWallet ? (
                          <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Confirm Adjustment
                          </>
                        )}
                      </button>

                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        </div>
      )}

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
