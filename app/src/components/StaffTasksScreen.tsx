import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TaskReconciliationModal } from './TaskReconciliationModal';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import { getCachedData, setCachedData } from '../cache';

type TaskStatus = 'In Progress' | 'Pending' | 'Completed' | 'Settlement';

interface Task {
  id: string;
  customerName: string;
  customerId: string;
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  assignedTo: string;
  status: TaskStatus;
  progressPercentage: number;
  impureWeight?: string;
  pureWeight?: string;
  dateGiven: string;
  isoDate: string;
  estimatedCompletion: string;
  notes: string;
  broughtBy: string;
  source?: string;
  pieces?: string;
  weight?: string;
  purity?: string;
  category?: string;
  customerPhone?: string;
  customerAddress?: string;
  settlementCondition?: string;
  productType?: string;
  logoName?: string;
  carat?: string;
  pointSuggestion?: string;
  createdBy?: string;
  metal: 'Gold' | 'Silver';
  totalWeight?: string;
  pieceCategories?: Record<string, string>;
  images?: string[];
  auditImages?: string[];
  createdAt?: string;
  cashHandlingMode?: 'Front' | 'Back';
  cashRatePerGram?: number;
  cashAmount?: number;
  pendingPureLiability?: boolean;
  pendingCashLiability?: boolean;
  staffSubmittedAt?: string;
  adminSubmittedAt?: string;
}

const mapDbToTask = (t: any): Task => ({
  id: t.id,
  customerName: t.customer_name,
  customerId: t.customer_id,
  workType: t.work_type,
  assignedTo: t.assigned_to,
  status: t.status,
  progressPercentage: t.progress_percentage,
  impureWeight: t.impure_weight,
  pureWeight: t.pure_weight,
  dateGiven: t.date_given,
  isoDate: t.iso_date,
  estimatedCompletion: t.estimated_completion,
  notes: t.notes,
  broughtBy: t.brought_by,
  source: t.source,
  pieces: t.pieces,
  weight: t.weight,
  purity: t.purity,
  category: t.category,
  customerPhone: t.customer_phone,
  customerAddress: t.customer_address,
  settlementCondition: t.settlement_condition,
  productType: t.product_type,
  logoName: t.logo_name,
  carat: t.carat,
  pointSuggestion: t.point_suggestion,
  createdBy: t.created_by,
  metal: t.metal,
  totalWeight: t.total_weight,
  pieceCategories: t.piece_categories,
  images: t.images,
  auditImages: t.audit_images,
  createdAt: t.created_at,
  cashHandlingMode: t.cash_handling_mode,
  cashRatePerGram: t.cash_rate_per_gram,
  cashAmount: t.cash_amount,
  pendingPureLiability: t.pending_pure_liability,
  pendingCashLiability: t.pending_cash_liability,
  staffSubmittedAt: t.staff_submitted_at,
  adminSubmittedAt: t.admin_submitted_at
});

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

const getStatusColor = (status: string) => {
  switch(status) {
    case 'Completed': return 'bg-tertiary-container/10 text-tertiary-container border-tertiary-container/20';
    case 'In Progress': return 'bg-secondary-container/10 text-secondary-container border-secondary-container/20';
    case 'Pending': return 'bg-error-container/50 text-error border-error/20';

    default: return 'bg-surface-container text-outline border-outline/20';
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
      <FilterChip label="Tunch" icon="science" value="Tunch" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="Marking" icon="verified" value="Marking" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="Shouldering" icon="precision_manufacturing" value="Shouldering" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="By Staff" icon="badge" value="Staff" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="By Customer" icon="person" value="Customer" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
    </div>
  </div>
);

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdateStatus: (task: Task, action?: string) => void;
  onDeleteTask: (id: string) => void;
  isAdminOrSuper?: boolean;
  onProcessTask?: (task: Task, details: { 
    impureWeight?: string; 
    purity?: string; 
    pureWeight?: string; 
    settlementCondition?: string; 
    serviceFee?: string;
    paymentMode?: 'Cash' | 'UPI';
    totalWeight?: string;
    pieces?: string;
    carat?: string;
    logoName?: string;
    pointsCount?: string;
    pointsType?: string;
    broughtBy?: string;
    cashHandlingMode?: 'Front' | 'Back';
  }) => void;
  onFinalizePricing?: (task: Task, finalPrice: string, paymentMode?: 'Cash' | 'UPI', cashRate?: string, cashAmount?: string) => void;
}

const extractFee = (settlementCondition?: string) => {
  if (!settlementCondition) return '';
  const match = settlementCondition.match(/₹(\d+)/);
  return match ? match[1] : '';
};

const extractPaymentMode = (settlementCondition?: string): 'Cash' | 'UPI' => {
  if (!settlementCondition) return 'Cash';
  if (settlementCondition.toUpperCase().includes('UPI')) return 'UPI';
  return 'Cash';
};

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ 
  isOpen, onClose, task, onUpdateStatus, onDeleteTask, isAdminOrSuper = false, onProcessTask, onFinalizePricing 
}) => {
  const { user } = useSession();
  const userRole = user?.role;

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  };

  const [impureWeightInput, setImpureWeightInput] = useState('');
  const [purityInput, setPurityInput] = useState('');
  const [pureWeightInput, setPureWeightInput] = useState('');
  const [settlementInput, setSettlementInput] = useState('Only Tunch');
  const [serviceFeeInput, setServiceFeeInput] = useState('');
  const [finalPriceInput, setFinalPriceInput] = useState('');
  const [paymentModeInput, setPaymentModeInput] = useState<'Cash' | 'UPI'>('Cash');
  const [cashHandlingMode, setCashHandlingMode] = useState<'Front' | 'Back'>('Front');
  const [cashRateInput, setCashRateInput] = useState('');
  const [cashAmountInputState, setCashAmountInputState] = useState('');

  const [piecesInput, setPiecesInput] = useState('');
  const [totalWeightInput, setTotalWeightInput] = useState('');
  const [caratInput, setCaratInput] = useState('22k');
  const [logoNameInput, setLogoNameInput] = useState('');
  const [pointsCountInput, setPointsCountInput] = useState('');
  const [pointsTypeInput, setPointsTypeInput] = useState('Gold');
  const [broughtByInput, setBroughtByInput] = useState('Customer');

  useEffect(() => {
    if (task) {
      setImpureWeightInput(task.impureWeight || '');
      setPurityInput(task.purity || '');
      setPureWeightInput(task.pureWeight || '');
      setSettlementInput(task.settlementCondition || 'Only Tunch');
      setServiceFeeInput('');
      setFinalPriceInput(extractFee(task.settlementCondition) || '');
      setPaymentModeInput(extractPaymentMode(task.settlementCondition));
      setCashHandlingMode(task.cashHandlingMode || 'Front');
      setCashRateInput(task.cashRatePerGram ? String(task.cashRatePerGram) : '');
      setCashAmountInputState(task.cashAmount ? String(task.cashAmount) : '');
      
      setPiecesInput(task.pieces || '');
      setTotalWeightInput(task.totalWeight || task.weight || '');
      setCaratInput(task.carat || '22k');
      setLogoNameInput(task.logoName || '');
      setPointsCountInput(task.pointSuggestion && !isNaN(Number(task.pointSuggestion.split(' ')[0])) ? task.pointSuggestion.split(' ')[0] : '');
      setPointsTypeInput(task.pointSuggestion ? (task.pointSuggestion.toLowerCase().includes('silver') ? 'Silver' : 'Gold') : (task.metal === 'Silver' ? 'Silver' : 'Gold'));
      setBroughtByInput(task.broughtBy || 'Customer');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const lbl = "text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block";
  const val = "text-xs font-bold text-primary truncate";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up flex flex-col justify-between overflow-hidden"
        style={{ maxHeight: '92svh' }}>

        {/* Header */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div>
            <h3 className="font-headline text-base font-extrabold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">assignment_turned_in</span>
              {task.id} Details
            </h3>
            <p className="text-[9px] text-outline font-bold uppercase tracking-widest mt-0.5">Assigned Facility: {task.assignedTo}</p>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
            task.status === 'Completed' ? 'bg-tertiary/10 text-tertiary border-tertiary/20' : 
            task.status === 'In Progress' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
            'bg-error/10 text-error border-error/20'
          }`}>
            {task.status}
          </span>
        </div>

        {/* Unified Clean Details Container */}
        <div className="space-y-3 flex-grow overflow-y-auto hide-scrollbar pb-4 pr-1">
          
          {/* Section 1: Customer Profile */}
          <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#C9A646] mb-1">Entity Profile</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className={lbl}>Name</span>
                <p className={val}>{task.customerName}</p>
              </div>
              {task.customerPhone && (
                <div>
                  <span className={lbl}>Phone</span>
                  <p className={val}>{task.customerPhone}</p>
                </div>
              )}
              {task.customerAddress && (
                <div className="col-span-2">
                  <span className={lbl}>Address</span>
                  <p className={val}>{task.customerAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Work Specifications */}
          <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary mb-1">Work Specifications</p>
            
            {task.workType === 'Tunch' && (
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <div>
                  <span className={lbl}>Operation</span>
                  <p className={`${val} uppercase text-secondary`}>{task.workType}</p>
                </div>
                {task.metal && (
                  <div>
                    <span className={lbl}>Metal</span>
                    <p className={val}>{task.metal}</p>
                  </div>
                )}
                {task.productType && (
                  <div>
                    <span className={lbl}>Category</span>
                    <p className={val}>{task.productType}</p>
                  </div>
                )}
                {task.impureWeight && (
                  <div>
                    <span className={lbl}>Impure Weight</span>
                    <p className={val}>{task.impureWeight} g</p>
                  </div>
                )}
                {task.purity && (
                  <div>
                    <span className={lbl}>Purity</span>
                    <p className={val}>{task.purity}%</p>
                  </div>
                )}
                {task.pureWeight && (
                  <div>
                    <span className={lbl}>Pure Weight</span>
                    <p className={val}>{task.pureWeight} g</p>
                  </div>
                )}
                {task.pieces && (
                  <div>
                    <span className={lbl}>Pieces</span>
                    <p className={val}>{task.pieces}</p>
                  </div>
                )}
              </div>
            )}

            {task.workType === 'Marking' && (
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <div>
                  <span className={lbl}>Operation</span>
                  <p className={`${val} uppercase text-secondary`}>{task.workType}</p>
                </div>
                {task.metal && (
                  <div>
                    <span className={lbl}>Metal</span>
                    <p className={val}>{task.metal}</p>
                  </div>
                )}
                {task.logoName && (
                  <div>
                    <span className={lbl}>Logo Markings</span>
                    <p className={val}>{task.logoName}</p>
                  </div>
                )}
                {task.carat && (
                  <div>
                    <span className={lbl}>Carat</span>
                    <p className={val}>{task.carat.toUpperCase()}</p>
                  </div>
                )}
                {task.totalWeight && (
                  <div>
                    <span className={lbl}>Total Weight</span>
                    <p className={val}>{task.totalWeight} g</p>
                  </div>
                )}
                {task.pieces && (
                  <div>
                    <span className={lbl}>Pieces</span>
                    <p className={val}>{task.pieces}</p>
                  </div>
                )}
                {task.pieceCategories && Object.keys(task.pieceCategories).some(k => task.pieceCategories?.[k]) && (
                  <div className="col-span-2 bg-surface-container/30 p-2 rounded-xl border border-outline-variant/10 mt-1">
                    <span className={lbl}>Category Breakdown</span>
                    <div className="flex gap-4 mt-1">
                      {Object.entries(task.pieceCategories).map(([k, val]) => val && (
                        <div key={k} className="text-center">
                          <span className="text-[9px] text-outline font-bold uppercase">{k}</span>
                          <p className="text-xs font-black text-primary">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {task.workType === 'Shouldering' && (
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <div>
                  <span className={lbl}>Operation</span>
                  <p className={`${val} uppercase text-secondary`}>{task.workType}</p>
                </div>
                {task.metal && (
                  <div>
                    <span className={lbl}>Metal</span>
                    <p className={val}>{task.metal}</p>
                  </div>
                )}
                {task.pointSuggestion && (
                  <div className="col-span-2">
                    <span className={lbl}>Solder Points</span>
                    <p className={val}>{task.pointSuggestion} Gold/Silver suggested</p>
                  </div>
                )}
                {task.pieces && (
                  <div>
                    <span className={lbl}>Pieces</span>
                    <p className={val}>{task.pieces}</p>
                  </div>
                )}
              </div>
            )}
            {task.settlementCondition && (() => {
                // Staff Cash Blindness: mask cash amounts in settlement condition for non-admin
                const rawCondition = task.settlementCondition;
                const staffBlindCondition = !isAdminOrSuper
                  ? rawCondition.replace(/\[Collected\]\s*(Cash|UPI)\s*₹[\d,]+/gi, '[Settled]').replace(/₹[\d,]+/g, '₹***')
                  : rawCondition;
                return (
                  <div className="pt-2 border-t border-outline-variant/10 mt-2 space-y-1">
                    <div>
                      <span className={lbl}>Settlement Mode</span>
                      <p className={val}>{staffBlindCondition}</p>
                    </div>
                    {task.cashHandlingMode && (
                      <div>
                        <span className={lbl}>Cash Handling Mode</span>
                        <p className={val}>{task.cashHandlingMode === 'Front' ? 'Front (Staff Ledger)' : 'Back (Admin Ledger)'}</p>
                      </div>
                    )}
                    {task.settlementCondition === 'Cash' && isAdminOrSuper && (
                      <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-outline-variant/5">
                        <div>
                          <span className={lbl}>Cash Rate / Gram</span>
                          <p className={val}>₹{task.cashRatePerGram || 'N/A'}</p>
                        </div>
                        <div>
                          <span className={lbl}>Total Cash Amount</span>
                          <p className={val}>₹{task.cashAmount || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            }
          </div>

          {/* Image Gallery Sections */}
          <div className="space-y-3">
            {task.images && task.images.length > 0 && (
              <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#C9A646] mb-1">Collection Staff Images ({task.images.length})</p>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                  {task.images.map((imgUrl, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-outline-variant/20 shrink-0 bg-surface-container shadow-sm cursor-pointer group" onClick={() => window.open(imgUrl, '_blank')}>
                      <img src={imgUrl} alt={`Collection Piece ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">visibility</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {task.auditImages && task.auditImages.length > 0 && (
              <div className="rounded-2xl border border-secondary/20 p-3.5 bg-secondary/5 space-y-2">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-secondary mb-1">Staff Audit Images ({task.auditImages.length})</p>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                  {task.auditImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-secondary/30 shrink-0 bg-surface-container shadow-sm cursor-pointer group" onClick={() => window.open(imgUrl, '_blank')}>
                      <img src={imgUrl} alt={`Audit Piece ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">visibility</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Staff Processing Panel */}
          {task.status === 'In Progress' && userRole === 'Staff' && (
            <div className="rounded-2xl border border-secondary/20 p-3.5 bg-secondary-container/5 space-y-3">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-secondary">Processing details</p>
              
              {task.workType === 'Tunch' && (
                <>
                  <div className="mb-3">
                    <span className={lbl}>Final Impure Weight (g) *</span>
                    <input 
                      type="number" step="0.001" 
                      value={impureWeightInput} 
                      onChange={e => setImpureWeightInput(e.target.value)}
                      placeholder="e.g. 12.5" 
                      className="w-full h-9 bg-white border border-outline-variant/40 rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <span className={lbl}>Purity (%) *</span>
                      <input 
                        type="number" step="0.1" 
                        value={purityInput} 
                        onChange={e => setPurityInput(e.target.value)}
                        placeholder="e.g. 91.6" 
                        className="w-full h-9 bg-white border border-outline-variant/40 rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:border-secondary"
                      />
                    </div>
                    <div>
                      <span className={lbl}>Pure Output (g) *</span>
                      <input 
                        type="number" step="0.001" 
                        value={pureWeightInput} 
                        onChange={e => setPureWeightInput(e.target.value)}
                        placeholder="e.g. 11.4" 
                        className="w-full h-9 bg-white border border-outline-variant/40 rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:border-secondary"
                      />
                    </div>
                  </div>
                  <div>
                    <span className={lbl}>Settlement Condition *</span>
                    <div className="flex gap-2 mt-1">
                      {(task.metal === 'Silver' ? ['Only Tunch', 'Pure Silver', 'Cash'] : ['Only Tunch', 'Pure Gold', 'Cash']).map(opt => (
                        <button 
                          key={opt} type="button" 
                          onClick={() => setSettlementInput(opt)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${settlementInput === opt ? 'bg-secondary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30 hover:border-secondary/40'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {settlementInput === 'Cash' && (
                    <div className="mt-3">
                      <span className={lbl}>Cash Handling Mode *</span>
                      <div className="flex gap-2 mt-1">
                        {['Front', 'Back'].map(mode => (
                          <button 
                            key={mode} type="button" 
                            onClick={() => setCashHandlingMode(mode as 'Front' | 'Back')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${cashHandlingMode === mode ? 'bg-secondary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30 hover:border-secondary/40'}`}
                          >
                            {mode === 'Front' ? 'Front (Staff Ledger)' : 'Back (Admin Ledger)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {task.workType === 'Marking' && (
                <>
                  <div>
                    <span className={lbl}>Final Total Weight (g) *</span>
                    <input 
                      type="number" step="0.001" 
                      value={totalWeightInput} 
                      onChange={e => setTotalWeightInput(e.target.value)}
                      placeholder="e.g. 15.2" 
                      className="w-full h-9 bg-white border border-outline-variant/40 rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={lbl}>Final Pieces *</span>
                      <input 
                        type="number" 
                        value={piecesInput} 
                        onChange={e => setPiecesInput(e.target.value)}
                        placeholder="Qty" 
                        className="w-full h-9 bg-white border border-outline-variant/40 rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:border-secondary"
                      />
                    </div>
                    <div>
                      <span className={lbl}>Logo Markings *</span>
                      <input 
                        type="text" 
                        value={logoNameInput} 
                        onChange={e => setLogoNameInput(e.target.value)}
                        placeholder="Logo" 
                        className="w-full h-9 bg-white border border-outline-variant/40 rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:border-secondary"
                      />
                    </div>
                  </div>
                  <div>
                    <span className={lbl}>Carat Marking *</span>
                    <div className="flex gap-2 mt-1">
                      {['22k', '18k', '14k', '9k'].map(k => (
                        <button 
                          key={k} type="button" 
                          onClick={() => caratInput !== k && setCaratInput(k)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${caratInput === k ? 'bg-secondary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30 hover:border-secondary/40'}`}
                        >
                          {k.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {task.workType === 'Shouldering' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={lbl}>Points Used *</span>
                      <input 
                        type="number" 
                        value={pointsCountInput} 
                        onChange={e => setPointsCountInput(e.target.value)}
                        placeholder="Solder points" 
                        className="w-full h-9 bg-white border border-outline-variant/40 rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:border-secondary"
                      />
                    </div>
                    <div>
                      <span className={lbl}>Points Type *</span>
                      <div className="flex gap-2 mt-1">
                        {['Gold', 'Silver'].map(pt => (
                          <button 
                            key={pt} type="button" 
                            onClick={() => pointsTypeInput !== pt && setPointsTypeInput(pt)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${pointsTypeInput === pt ? 'bg-secondary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30 hover:border-secondary/40'}`}
                          >
                            {pt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className={lbl}>Material Brought By *</span>
                    <div className="flex gap-2 mt-1">
                      {['Customer', 'Staff Member'].map(bb => (
                        <button 
                          key={bb} type="button" 
                          onClick={() => broughtByInput !== bb && setBroughtByInput(bb)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${broughtByInput === bb ? 'bg-secondary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30 hover:border-secondary/40'}`}
                        >
                          {bb}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-secondary/10 space-y-2">
                <div>
                  <span className={lbl}>Service Fee (₹) *</span>
                  <input 
                    type="number" 
                    value={serviceFeeInput} 
                    onChange={e => setServiceFeeInput(e.target.value)}
                    placeholder="e.g. 500" 
                    className="w-full h-9 bg-white border border-outline-variant/40 rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <span className={lbl}>Payment Mode *</span>
                  <div className="flex gap-2">
                    {['Cash', 'UPI'].map(mode => (
                      <button 
                        key={mode} type="button" 
                        onClick={() => setPaymentModeInput(mode as 'Cash' | 'UPI')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${paymentModeInput === mode ? 'bg-secondary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30 hover:border-secondary/40'}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Admin Pricing Panel */}
          {task.status === 'Pending' && isAdminOrSuper && (
            <div className="rounded-2xl border border-tertiary/20 p-3.5 bg-tertiary-container/5 space-y-3">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-tertiary">Admin pricing verification</p>
              
              <div>
                <span className={lbl}>Set Service Price / Fee (₹) *</span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-outline">₹</span>
                  <input 
                    type="number" 
                    value={finalPriceInput} 
                    onChange={e => setFinalPriceInput(e.target.value)}
                    placeholder="e.g. 500" 
                    className="w-full h-10 pl-7 pr-3 bg-white border border-outline-variant/40 rounded-lg text-xs font-bold text-primary focus:outline-none focus:border-tertiary"
                  />
                </div>
              </div>

              {(task.settlementCondition === 'Cash' || settlementInput === 'Cash') && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <span className={lbl}>Cash Rate / Gram (₹) *</span>
                    <input 
                      type="number" 
                      value={cashRateInput} 
                      onChange={e => {
                        setCashRateInput(e.target.value);
                        // Auto-calculate cash amount based on pure weight or impure weight
                        const wtStr = task.pureWeight || pureWeightInput || task.impureWeight || impureWeightInput || '0';
                        const wt = Number(wtStr);
                        if (wt > 0 && e.target.value) {
                          setCashAmountInputState(String(Math.round(wt * Number(e.target.value))));
                        }
                      }}
                      placeholder="e.g. 7200" 
                      className="w-full h-10 px-3 bg-white border border-outline-variant/40 rounded-lg text-xs font-bold text-primary focus:outline-none focus:border-tertiary"
                    />
                  </div>
                  <div>
                    <span className={lbl}>Total Cash Amount (₹) *</span>
                    <input 
                      type="number" 
                      value={cashAmountInputState} 
                      onChange={e => setCashAmountInputState(e.target.value)}
                      placeholder="e.g. 50000" 
                      className="w-full h-10 px-3 bg-white border border-outline-variant/40 rounded-lg text-xs font-bold text-primary focus:outline-none focus:border-tertiary"
                    />
                  </div>
                </div>
              )}

              <div>
                <span className={lbl}>Payment Mode *</span>
                <div className="flex gap-2 mt-1">
                  {['Cash', 'UPI'].map(mode => (
                    <button 
                      key={mode} type="button" 
                      onClick={() => setPaymentModeInput(mode as 'Cash' | 'UPI')}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${paymentModeInput === mode ? 'bg-tertiary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30 hover:border-tertiary/40'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Schedule Card */}
          <div className="rounded-2xl p-4 relative overflow-hidden shadow-md" style={{ background: 'linear-gradient(135deg, #001e40 0%, #003366 100%)', color: '#ffffff' }}>
            <div className="absolute right-0 bottom-0 w-16 h-16 rounded-full blur-lg -mr-4 -mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Intake Date</p>
                {task.dateGiven && task.dateGiven !== 'Just Now' && (
                  <p className="font-headline text-xs font-bold mt-0.5" style={{ color: '#ffffff' }}>{task.dateGiven}</p>
                )}
                {task.createdAt && (
                  <p className="text-[9px] mt-1.5 opacity-85 font-medium flex items-center gap-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span className="material-symbols-outlined text-[10px]">schedule</span>
                    {formatTimestamp(task.createdAt)}
                  </p>
                )}
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#C9A646' }}>Est. Completion</p>
                {task.estimatedCompletion && task.estimatedCompletion !== 'Awaiting Audit' && (
                  <p className="text-xs mt-0.5 font-bold mb-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{task.estimatedCompletion}</p>
                )}
                <p className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 ${
                  task.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' :
                  task.status === 'In Progress' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {task.status}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5 shrink-0 items-center">
          {task.status === 'In Progress' && userRole === 'Staff' ? (
            <button 
              onClick={() => {
                if (!serviceFeeInput.trim() || isNaN(Number(serviceFeeInput)) || Number(serviceFeeInput) <= 0) {
                  alert('Please enter a valid service fee (> 0) before completing.');
                  return;
                }
                if (task.workType === 'Tunch') {
                  if (!impureWeightInput.trim() || !purityInput.trim() || !pureWeightInput.trim()) {
                    alert('Please enter final impure weight, purity, and pure output before completing.');
                    return;
                  }
                  onProcessTask?.(task, { 
                    impureWeight: impureWeightInput, 
                    purity: purityInput, 
                    pureWeight: pureWeightInput, 
                    settlementCondition: settlementInput, 
                    serviceFee: serviceFeeInput,
                    paymentMode: paymentModeInput,
                    cashHandlingMode: cashHandlingMode
                  });
                } else if (task.workType === 'Marking') {
                  if (!totalWeightInput.trim() || !piecesInput.trim() || !logoNameInput.trim()) {
                    alert('Please enter final weight, pieces, and logo design before completing.');
                    return;
                  }
                  onProcessTask?.(task, {
                    totalWeight: totalWeightInput,
                    pieces: piecesInput,
                    carat: caratInput,
                    logoName: logoNameInput,
                    serviceFee: serviceFeeInput,
                    paymentMode: paymentModeInput
                  });
                } else if (task.workType === 'Shouldering') {
                  if (!pointsCountInput.trim()) {
                    alert('Please enter points used before completing.');
                    return;
                  }
                  onProcessTask?.(task, {
                    pointsCount: pointsCountInput,
                    pointsType: pointsTypeInput,
                    broughtBy: broughtByInput,
                    serviceFee: serviceFeeInput,
                    paymentMode: paymentModeInput
                  });
                }
              }}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl transition-all duration-300 shadow-md shadow-emerald-700/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Complete Work
            </button>
          ) : task.status === 'Pending' && userRole === 'Staff' ? (
            <button 
              onClick={() => onUpdateStatus(task)}
              className="flex-1 py-3.5 bg-gradient-to-r from-[#001e40] to-[#003366] hover:from-[#002b5c] hover:to-[#00478f] text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl transition-all duration-300 shadow-md shadow-[#001e40]/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">rule</span>
              Verify Intake Data
            </button>
          ) : task.status === 'Pending' && isAdminOrSuper ? (
            <button 
              onClick={() => {
                if (!finalPriceInput.trim()) {
                  alert('Please enter the service price/fee.');
                  return;
                }
                if (task.settlementCondition === 'Cash') {
                  if (!cashRateInput.trim() || !cashAmountInputState.trim()) {
                    alert('Please enter cash rate and total cash amount.');
                    return;
                  }
                }
                onFinalizePricing?.(task, finalPriceInput, paymentModeInput, cashRateInput, cashAmountInputState);
              }}
              className="flex-1 py-3.5 bg-gradient-to-r from-[#001e40] to-[#003366] hover:from-[#002b5c] hover:to-[#00478f] text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl transition-all duration-300 shadow-md shadow-[#001e40]/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">payments</span>
              Approve & Price
            </button>
          ) : (
            task.status !== 'Completed' && isAdminOrSuper && (
              <button 
                onClick={() => onUpdateStatus(task, 'approve')}
                className="flex-1 py-3.5 bg-gradient-to-r from-[#001e40] to-[#003366] hover:from-[#002b5c] hover:to-[#00478f] text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl transition-all duration-300 shadow-md shadow-[#001e40]/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Approve
              </button>
            )
          )}
          <button 
            onClick={() => onDeleteTask(task.id)}
            className="w-12 h-12 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-2xl transition-all duration-300 active:scale-[0.95] flex items-center justify-center shrink-0 shadow-sm"
            title="Delete Task"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/50 font-black text-xs uppercase tracking-[0.15em] rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-sm"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
};


export const StaffTasksScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, isFullyAuthenticated } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const currentUser = user?.id || '';
  const isAdminOrSuper = user?.role === 'Admin' || user?.role === 'Super Admin';

  const activeTab = (searchParams.get('tab') as TaskStatus) || 'Pending';
  const [toastMessage, setToastMessage] = useState('');
  
  const [isVerificationOpen, setVerificationOpen] = useState(false);
  const [currentVerificationTask, setCurrentVerificationTask] = useState<any>(null);

  const [unsettledEntries, setUnsettledEntries] = useState<any[]>([]);
  const [settlementSearch, setSettlementSearch] = useState('');
  const [selectedSettlement, setSelectedSettlement] = useState<any | null>(null);
  const [newSettlementMode, setNewSettlementMode] = useState<'Pure Gold' | 'Pure Silver' | 'Cash'>('Pure Gold');
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  const fetchUnsettledEntries = async () => {
    try {
      const isSuperSa = user?.role === 'Super Admin';
      const cacheKeyBranchUsers = `branch_users_${user?.branch_id || 'unknown'}`;
      let branchUserIds: string[] = getCachedData(cacheKeyBranchUsers) || [];

      if (!isSuperSa && user?.branch_id && branchUserIds.length === 0) {
        const { data: bUsers, error: buError } = await supabase
          .from('users')
          .select('id')
          .eq('branch_id', user.branch_id);
        if (!buError && bUsers) {
          branchUserIds = bUsers.map((bu: any) => bu.id);
          setCachedData(cacheKeyBranchUsers, branchUserIds);
        }
      }

      if (branchUserIds.length === 0) {
        branchUserIds = [currentUser];
      }

      let query = supabase
        .from('ledger_entries')
        .select('*')
        .eq('transaction_type', 'Tunch Only')
        .eq('status', 'No Settlement')
        .order('created_at', { ascending: false });

      if (!isSuperSa && user?.branch_id) {
        query = query.in('staff_id', branchUserIds);
      }

      const { data, error } = await query;
      if (!error && data) {
        setUnsettledEntries(data);
      }
    } catch (e) {
      console.error('Error fetching unsettled entries:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'Settlement') {
      fetchUnsettledEntries();
    }
  }, [activeTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Load tasks from cache synchronously on mount for 0ms delay
  const cachedTasks = getCachedData('tasks_data');
  const isSuperSa = user?.role === 'Super Admin';
  const initialTasks = cachedTasks
    ? cachedTasks
      .filter((t: any) => isSuperSa ? true : (t.created_by === currentUser || t.assigned_to === currentUser))
      .map(mapDbToTask)
    : [];

  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => {
    const loadTasks = async () => {
      if (!isFullyAuthenticated) return;
      try {
        let branchUserIds: string[] = [];
        if (!isSuperSa && user?.branch_id) {
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

        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        if (data) {
          setCachedData('tasks_data', data);
          let filtered = data;
          if (!isSuperSa && user?.branch_id) {
            filtered = filtered.filter((t: any) => branchUserIds.includes(t.created_by));
          }
          setTasks(filtered.map(mapDbToTask));
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };

    loadTasks();

    const handleSync = (e: any) => {
      const detail = e.detail;
      if (detail && detail.payload && detail.table === 'tasks') {
         const payload = detail.payload;
         if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
         } else if (payload.eventType === 'INSERT') {
            loadTasks(); // Insert might need joining or complex logic, fallback to fetch
         } else if (payload.eventType === 'UPDATE') {
            const t = payload.new;
            setTasks(prev => prev.map(old => old.id === t.id ? mapDbToTask(t) : old));
         }
      } else {
         loadTasks();
      }
    };

    window.addEventListener('databaseSync', handleSync);
    return () => {
      window.removeEventListener('databaseSync', handleSync);
    };
  }, [isAdminOrSuper, isFullyAuthenticated]);

  const selectedTask = tasks.find(t => t.id === taskId) || null;

  const handleCloseModal = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('taskId');
    setSearchParams(newParams);
  };

  const filterBySubmission = (t: Task): boolean => {
    if (user?.role === 'Staff' || user?.role === 'Collection Staff') {
      return !t.staffSubmittedAt && !t.adminSubmittedAt;
    }
    if (user?.role === 'Admin') {
      return !!t.staffSubmittedAt && !t.adminSubmittedAt;
    }
    return !t.adminSubmittedAt;
  };

  const matchesSearch = (task: Task) => {
    let matchesText = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesText = Boolean(
        task.customerName.toLowerCase().includes(q) ||
        task.id.toLowerCase().includes(q) ||
        task.workType.toLowerCase().includes(q) ||
        task.assignedTo.toLowerCase().includes(q) ||
        task.broughtBy.toLowerCase().includes(q) ||
        task.notes.toLowerCase().includes(q)
      );
    }

    let matchesDate = true;
    if (startDate && task.isoDate < startDate) matchesDate = false;
    if (endDate && task.isoDate > endDate) matchesDate = false;

    let matchesSubmission = true;
    if (!startDate && !endDate) {
      matchesSubmission = filterBySubmission(task);
    }

    return matchesText && matchesDate && matchesSubmission;
  };

  const filteredTasks = tasks.filter(t => {
     const isCash = t.settlementCondition?.toLowerCase().includes('cash');
     if (activeTab === 'Pending') {
        return (t.status === 'Pending' || (t.status === 'In Progress' && !isCash)) && matchesSearch(t);
     }
     if (activeTab === 'In Progress') {
        return (t.status === 'In Progress' && isCash) && matchesSearch(t);
     }
     if (activeTab === 'Settlement') {
        return t.status === 'Settlement' && matchesSearch(t);
     }
     return t.status === activeTab && matchesSearch(t);
  });

  const handleDeleteTask = async (id: string) => {
    const reason = window.prompt("Please provide a reason for deleting this task:");
    if (!reason) return;
    try {
      await supabase.from('deletion_requests').insert([{
         item_type: 'Task',
         item_id: id,
         requested_by: user?.id,
         reason: reason,
         status: 'Pending'
      }]);
      setTasks(prev => prev.filter(t => t.id !== id));
      
      // Update cache so switching tabs doesn't show it again before approval
      const cached = getCachedData('tasks_data');
      if (cached) {
         setCachedData('tasks_data', cached.filter((t: any) => t.id !== id));
      }
      
      showToast("Deletion request sent to Super Admin.");
      handleCloseModal();
    } catch(e) {
      console.error(e);
      showToast("Failed to submit request.");
    }
  };

  const handleVerifySuccess = async (verifiedTask: any, isMismatch?: boolean, verifiedDetails?: { pieces: string; weight: string }) => {
     try {
       const updates: any = { status: 'In Progress', progress_percentage: 40 };
       if (verifiedTask.images) {
         updates.images = verifiedTask.images;
       }
       if (verifiedTask.audit_images) {
         updates.audit_images = verifiedTask.audit_images;
       }
       
       if (isMismatch && verifiedDetails) {
         updates.pieces = verifiedDetails.pieces;
         if (verifiedTask.workType === 'Tunch') {
           updates.impure_weight = verifiedDetails.weight;
         } else {
           updates.total_weight = verifiedDetails.weight;
         }

         const intakeWeight = verifiedTask.impureWeight || verifiedTask.totalWeight || verifiedTask.weight || '0';
         const intakePieces = verifiedTask.pieces || '1';
         
         await supabase.from('deletion_requests').insert([{
           item_type: 'Mismatch',
           item_id: verifiedTask.id,
           requested_by: user?.id,
           reason: `Reconciliation Mismatch Override: Staff verified pieces = ${verifiedDetails.pieces} (Intake was ${intakePieces}), weight = ${verifiedDetails.weight}g (Intake was ${intakeWeight}g).`,
           status: 'Pending'
         }]);
       }

       await supabase.from('tasks').update(updates).eq('id', verifiedTask.id);
       
       setTasks(prev => prev.map(t => t.id === verifiedTask.id ? { 
         ...t, 
         ...updates, 
         impureWeight: updates.impure_weight || t.impureWeight,
         totalWeight: updates.total_weight || t.totalWeight,
         pieces: updates.pieces || t.pieces,
         auditImages: verifiedTask.audit_images,
         progressPercentage: 40 
       } : t));
       setVerificationOpen(false);
       showToast(isMismatch ? 'Mismatch reported! Task is now In Progress.' : 'Audit matched! Task is now In Progress.');
       handleCloseModal();
     } catch(e) {
       console.error(e);
       showToast('Error verifying task');
     }
  };

  const handleProcessTask = async (task: Task, details: { 
    impureWeight?: string; 
    purity?: string; 
    pureWeight?: string; 
    settlementCondition?: string; 
    serviceFee?: string;
    paymentMode?: 'Cash' | 'UPI';
    totalWeight?: string;
    pieces?: string;
    carat?: string;
    logoName?: string;
    pointsCount?: string;
    pointsType?: string;
    broughtBy?: string;
    cashHandlingMode?: 'Front' | 'Back';
  }) => {
    try {
      let updatedCondition = task.settlementCondition || '';
      const modeStr = details.paymentMode || 'Cash';
      if (task.workType === 'Tunch') {
        const condition = details.settlementCondition || task.settlementCondition || 'Only Tunch';
        updatedCondition = details.serviceFee && Number(details.serviceFee) > 0 
          ? `${condition} - [Collected] ${modeStr} ₹${details.serviceFee}` 
          : condition;
      } else {
        updatedCondition = details.serviceFee && Number(details.serviceFee) > 0 
          ? `[Collected] ${modeStr} - ₹${details.serviceFee}` 
          : 'Service Fee';
      }

      const nextStatus = 'Pending'; 
      const progress = 90;

      const taskUpdates: any = {
        status: nextStatus,
        progress_percentage: progress,
        settlement_condition: updatedCondition
      };

      if (task.workType === 'Tunch') {
        taskUpdates.impure_weight = details.impureWeight || task.impureWeight;
        taskUpdates.purity = details.purity || task.purity;
        taskUpdates.pure_weight = details.pureWeight || task.pureWeight;
      } else if (task.workType === 'Marking') {
        taskUpdates.total_weight = details.totalWeight || task.totalWeight;
        taskUpdates.pieces = details.pieces || task.pieces;
        taskUpdates.carat = details.carat || task.carat;
        taskUpdates.logo_name = details.logoName || task.logoName;
      } else if (task.workType === 'Shouldering') {
        taskUpdates.point_suggestion = details.pointsCount ? `${details.pointsCount} ${details.pointsType || 'Gold'} Points` : task.pointSuggestion;
        taskUpdates.brought_by = details.broughtBy || task.broughtBy;
      }

      await supabase.from('tasks').update(taskUpdates).eq('id', task.id);

      setTasks(prev => prev.map(t => t.id === task.id ? {
        ...t,
        ...taskUpdates,
        impureWeight: taskUpdates.impure_weight || t.impureWeight,
        purity: taskUpdates.purity || t.purity,
        pureWeight: taskUpdates.pure_weight || t.pureWeight,
        totalWeight: taskUpdates.total_weight || t.totalWeight,
        pieces: taskUpdates.pieces || t.pieces,
        carat: taskUpdates.carat || t.carat,
        logoName: taskUpdates.logo_name || t.logoName,
        pointSuggestion: taskUpdates.point_suggestion || t.pointSuggestion,
        broughtBy: taskUpdates.brought_by || t.broughtBy,
        settlementCondition: updatedCondition,
        status: nextStatus,
        progressPercentage: progress
      } : t));

      // Handle Ledger Entry if Tunch Work
      if (task.workType === 'Tunch') {
        const condition = details.settlementCondition || task.settlementCondition || 'Only Tunch';
        const finalImpure = Number(details.impureWeight || task.impureWeight) || 0;
        const finalPure = Number(details.pureWeight || task.pureWeight) || 0;
        const handlingMode = details.cashHandlingMode || 'Front';

        const newLedgerEntry: any = {
          id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          iso_date: new Date().toISOString().split('T')[0],
          customer_name: task.customerName,
          purity: details.purity || task.purity || '',
          staff_id: user?.id || task.createdBy || '',
          created_at: new Date().toISOString(),
          cash_handling_mode: condition === 'Cash' ? handlingMode : null
        };

        if (condition === 'Only Tunch') {
          newLedgerEntry.transaction_type = 'Tunch Only';
          newLedgerEntry.status = 'No Settlement';
          if (task.metal === 'Silver') {
            newLedgerEntry.impure_silver_in = finalImpure;
          } else {
            newLedgerEntry.impure_gold_in = finalImpure;
          }
          await supabase.from('ledger_entries').insert([newLedgerEntry]);
        } else if (condition === 'Pure Gold' || condition === 'Pure Silver') {
          newLedgerEntry.transaction_type = 'Exchange';
          newLedgerEntry.status = 'Pending Pure';
          if (task.metal === 'Silver') {
            newLedgerEntry.impure_silver_in = finalImpure;
            newLedgerEntry.pure_silver_due = finalPure;
          } else {
            newLedgerEntry.impure_gold_in = finalImpure;
            newLedgerEntry.pure_gold_due = finalPure;
          }
          await supabase.from('ledger_entries').insert([newLedgerEntry]);
        } else if (condition === 'Cash') {
          // Cash handling: Front = metal goes in Staff's ledger (pending cash),
          //               Back  = nothing in Staff's ledger; Admin handles everything
          if (handlingMode === 'Front') {
            newLedgerEntry.transaction_type = 'Exchange';
            newLedgerEntry.status = 'Pending Cash';
            newLedgerEntry.pending_cash_liability = true;
            if (task.metal === 'Silver') {
              newLedgerEntry.impure_silver_in = finalImpure;
              newLedgerEntry.pure_silver_in = finalPure;
            } else {
              newLedgerEntry.impure_gold_in = finalImpure;
              newLedgerEntry.pure_gold_in = finalPure;
            }
            await supabase.from('ledger_entries').insert([newLedgerEntry]);
          }
          // Back mode: no staff ledger entry; Admin will create the entry on finalize
        }

        // Also persist the cash_handling_mode on the task for Admin finalization reference
        if (condition === 'Cash') {
          await supabase.from('tasks').update({ cash_handling_mode: handlingMode }).eq('id', task.id);
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, cashHandlingMode: handlingMode } : t));
        }
      }

      showToast('Task submitted to Admin for pricing & approval.');
      handleCloseModal();
    } catch (e) {
      console.error(e);
      showToast('Error processing task');
    }
  };

  const handleFinalizePricing = async (task: Task, finalPrice: string, paymentMode?: 'Cash' | 'UPI', cashRate?: string, cashAmount?: string) => {
    try {
      const modeStr = paymentMode || 'Cash';
      const isSilver = task.metal === 'Silver';
      const isoDateStr = new Date().toISOString().split('T')[0];

      // Cash Stock Validation System
      const isSuperSa = user?.role === 'Super Admin';
      let allocationsQuery = supabase.from('stock_allocations').select('cash_amount');
      if (!isSuperSa && user?.branch_id) {
        allocationsQuery = allocationsQuery.eq('branch_id', user.branch_id);
      }
      
      let branchUserIds: string[] = [];
      if (!isSuperSa && user?.branch_id) {
        const { data: bUsers } = await supabase.from('users').select('id').eq('branch_id', user.branch_id);
        if (bUsers) branchUserIds = bUsers.map((bu: any) => bu.id);
      }
      if (branchUserIds.length === 0) branchUserIds = [user?.id || ''];
      
      let entriesQuery = supabase.from('ledger_entries').select('cash_received, cash_paid');
      if (!isSuperSa && user?.branch_id) {
        entriesQuery = entriesQuery.in('staff_id', branchUserIds);
      }
      
      const txQuery = supabase.from('transactions').select('amount, status, type');
      
      const [allocationsRes, entriesRes, txRes] = await Promise.all([
        allocationsQuery,
        entriesQuery,
        txQuery
      ]);
      
      const totalAllocatedCash = (allocationsRes.data || []).reduce((s, a) => s + Number(a.cash_amount || 0), 0);
      const totalCashReceived = (entriesRes.data || []).reduce((s, e) => s + Number(e.cash_received || 0), 0);
      const totalCashPaid = (entriesRes.data || []).reduce((s, e) => s + Number(e.cash_paid || 0), 0);
      
      let billingCash = 0;
      (txRes.data || []).forEach((tx: any) => {
        const type = tx.type?.trim().toLowerCase() || '';
        if ((tx.status === 'Paid' || tx.status === 'Fully Paid') && type === 'cash') {
          const amtStr = typeof tx.amount === 'string' ? tx.amount.replace(/[^\d.]/g, '') : tx.amount;
          billingCash += Number(amtStr) || 0;
        }
      });
      
      const currentCashStock = totalAllocatedCash + totalCashReceived + billingCash - totalCashPaid;
      const cashAmountToPay = Number(finalPrice || 0);

      if (modeStr === 'Cash' && cashAmountToPay > currentCashStock) {
        alert(`Insufficient Cash Stock in the Branch! Remaining Stock: ₹${currentCashStock.toLocaleString('en-IN')}. Please request Cash Allocation from Super Admin.`);
        return;
      }

      const updatedCondition = task.settlementCondition?.toLowerCase().includes('cash') 
        ? `${task.settlementCondition} - [Collected] ${modeStr} ₹${finalPrice}` 
        : `[Collected] ${modeStr} - ₹${finalPrice}`;

      // Update task
      await supabase.from('tasks').update({ 
        status: 'Completed', 
        progress_percentage: 100,
        settlement_condition: updatedCondition
      }).eq('id', task.id);
      
      setTasks(prev => prev.map(t => t.id === task.id ? { 
        ...t, 
        status: 'Completed', 
        progressPercentage: 100,
        settlementCondition: updatedCondition 
      } : t));

      // 2. Insert ledger entries based on cash handling mode
      const handlingMode = task.cashHandlingMode || 'Front';
      const isCashSettlement = task.settlementCondition?.toLowerCase().includes('cash');
      const finalCashAmount = cashAmount ? Number(cashAmount) : cashAmountToPay;
      const finalCashRate = cashRate ? Number(cashRate) : 0;
      const entryId = `LGR-${Math.floor(1000 + Math.random() * 9000)}`;

      if (isCashSettlement && handlingMode === 'Front') {
        // Front mode: Update the Staff's existing Pending Cash ledger entry with rate & amount
        // Then create an Admin ledger entry for the cash payout
        const { data: staffEntries } = await supabase
          .from('ledger_entries')
          .select('id')
          .eq('customer_name', task.customerName)
          .eq('status', 'Pending Cash')
          .eq('pending_cash_liability', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (staffEntries && staffEntries.length > 0) {
          await supabase.from('ledger_entries').update({
            status: task.pendingCashLiability ? 'Pending Cash' : 'Completed',
            cash_rate_per_gram: finalCashRate,
            cash_amount: finalCashAmount,
            pending_cash_liability: !!task.pendingCashLiability
          }).eq('id', staffEntries[0].id);
        }

        // Admin entry: records the cash disbursement
        const adminEntry: any = {
          id: entryId,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          iso_date: isoDateStr,
          customer_name: task.customerName,
          transaction_type: 'Exchange',
          status: task.pendingCashLiability ? 'Pending Cash' : 'Completed',
          purity: task.purity || '',
          cash_paid: task.pendingCashLiability ? 0 : (modeStr === 'Cash' ? finalCashAmount : 0),
          cash_received: modeStr === 'UPI' ? finalCashAmount : 0,
          cash_rate_per_gram: finalCashRate,
          cash_amount: finalCashAmount,
          staff_id: user?.id || '',
          pure_gold_out: 0, pure_silver_out: 0, pure_gold_due: 0, pure_silver_due: 0,
          impure_gold_in: 0, impure_silver_in: 0,
          pending_cash_liability: !!task.pendingCashLiability
        };
        await supabase.from('ledger_entries').insert([adminEntry]);

      } else {
        // Back mode or non-cash: Single Admin entry with everything
        const ledgerEntry: any = {
          id: entryId,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          iso_date: isoDateStr,
          customer_name: task.customerName,
          transaction_type: 'Exchange',
          status: (isCashSettlement && task.pendingCashLiability) ? 'Pending Cash' : 'Completed',
          purity: task.purity || '',
          cash_paid: (isCashSettlement && task.pendingCashLiability) ? 0 : (modeStr === 'Cash' ? finalCashAmount : 0),
          cash_received: modeStr === 'UPI' ? finalCashAmount : 0,
          cash_rate_per_gram: finalCashRate,
          cash_amount: finalCashAmount,
          staff_id: user?.id || '',
          pure_gold_out: 0, pure_silver_out: 0, pure_gold_due: 0, pure_silver_due: 0,
          pending_cash_liability: isCashSettlement ? !!task.pendingCashLiability : false
        };

        if (isSilver) {
          ledgerEntry.impure_silver_in = Number(task.impureWeight || 0);
          ledgerEntry.impure_gold_in = 0;
        } else {
          ledgerEntry.impure_gold_in = Number(task.impureWeight || 0);
          ledgerEntry.impure_silver_in = 0;
        }
        await supabase.from('ledger_entries').insert([ledgerEntry]);
      }

      // 3. Create billing transaction
      const newTxn = {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        customer_id: task.customerId || 'CUST-COL',
        customer_name: task.customerName,
        task_id: task.id,
        customer_phone: task.customerPhone || '',
        customer_address: task.customerAddress || '',
        metal: task.metal || 'Gold',
        type: paymentMode || 'Cash',
        work_type: task.workType || 'Tunch',
        amount: finalPrice,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        iso_date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: (Number(finalPrice) > 0) ? 'Unpaid' : 'Paid',
        details: `${task.workType} task completed. Pieces: ${task.pieces || '1'}. ${task.logoName ? 'Logo: ' + task.logoName + '.' : ''} Settlement: ${updatedCondition}. ${task.notes || ''}`.trim(),
        piece_type: task.productType || '',
        impure_weight: task.impureWeight || task.totalWeight || task.weight || '',
        pure_weight: task.pureWeight || '',
        purity_percentage: task.purity || '',
        points_count: task.pointSuggestion && !isNaN(parseInt(task.pointSuggestion)) ? parseInt(task.pointSuggestion) : null,
        points_type: task.pointSuggestion ? (task.pointSuggestion.toLowerCase().includes('silver') ? 'Silver' : 'Gold') : (task.metal === 'Silver' ? 'Silver' : 'Gold'),
        carat_marking: task.carat || '',
        created_by: user?.id || ''
      };

      await supabase.from('transactions').insert([newTxn]);

      showToast('Task approved & completed! Billings & Ledger updated.');
      handleCloseModal();
    } catch(e) {
      console.error(e);
      showToast('Error finalizing pricing');
    }
  };

  const handleUpdateStatus = async (task: Task, action?: string) => {
     try {
       if (action === 'approve' && task.status === 'In Progress') {
         await supabase.from('tasks').update({ status: 'Completed', progress_percentage: 100 }).eq('id', task.id);
         setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Completed', progressPercentage: 100 } : t));
         showToast('Task approved and completed.');
         handleCloseModal();
       } else if (task.status === 'Pending') {
          if (isAdminOrSuper) {
            await supabase.from('tasks').update({ status: 'In Progress', progress_percentage: 40 }).eq('id', task.id);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'In Progress', progressPercentage: 40 } : t));
            showToast('Task started successfully.');
            handleCloseModal();
          } else {
            setCurrentVerificationTask(task);
            setVerificationOpen(true);
          }
       }
     } catch (e) {
       console.error(e);
       showToast('Error updating task status');
     }
  };

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-32 relative">
        {/* Header */}
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Operational Tasks</h1>
            <p className="text-xs text-outline font-medium">Track workflows and assignments</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative">
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse border border-white"></span>
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="relative flex bg-surface-container rounded-full p-1.5 shadow-inner mb-4 w-full justify-between items-center shrink-0 overflow-hidden">
          {/* Active Tab Highlight Indicator */}
          <div 
            className="absolute top-1.5 bottom-1.5 left-1.5 bg-white rounded-full premium-shadow transition-transform duration-300 ease-out z-0"
            style={{
              width: 'calc(25% - 3px)',
              transform: `translateX(${['Pending', 'In Progress', 'Completed', 'Settlement'].indexOf(activeTab) * 100}%)`,
            }}
          />
          {[
            { id: 'Pending', label: 'Pending' },
            { id: 'In Progress', label: 'In Progress' },
            { id: 'Completed', label: 'Completed' },
            { id: 'Settlement', label: 'Settlement' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { 
                  setSearchQuery(''); 
                  setStartDate(''); 
                  setEndDate(''); 
                  setSearchParams({ tab: tab.id }); 
                }}
                className={`relative flex-1 rounded-full py-2.5 text-center text-[9px] min-[370px]:text-[10px] sm:text-xs font-black uppercase tracking-normal transition-all duration-300 whitespace-nowrap px-1 z-10 ${
                  isActive 
                    ? 'text-primary font-extrabold' 
                    : 'text-outline hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* View: All Tasks */}
        {activeTab !== 'Settlement' ? (
          <div className="space-y-4 animate-fade-in">
              <SearchAndFilterSection 
                placeholder="Search tasks, staff, customer..." 
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                startDate={startDate} setStartDate={setStartDate}
                endDate={endDate} setEndDate={setEndDate}
              />
              
              <div className="space-y-4">
                {filteredTasks.map((task) => {
                  const isCash = task.settlementCondition?.toLowerCase().includes('cash');
                  return (
                  <div 
                    key={task.id} 
                    onClick={() => {
                      if (task.status === 'Pending' && !isAdminOrSuper) {
                        setCurrentVerificationTask(task);
                        setVerificationOpen(true);
                      } else {
                        setSearchParams({ taskId: task.id, tab: activeTab });
                      }
                    }} 
                    className={`p-4 relative overflow-hidden group cursor-pointer transition-colors ${isCash ? 'cash-luxury-card' : 'luxury-card border border-outline-variant/10 hover:bg-surface-bright'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${getWorkColor(task.workType)}`}>
                          <span className="material-symbols-outlined text-xl glow-icon">{getWorkIcon(task.workType)}</span>
                        </div>
                        <div>
                          <p className="font-headline font-bold text-primary text-[15px]">{task.workType} Work</p>
                          <p className="text-[10px] text-outline font-bold tracking-widest uppercase mt-0.5">{task.id}</p>
                        </div>
                      </div>
                      <span className={`whitespace-nowrap text-center px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-surface-container/50 rounded-xl p-3 border border-outline-variant/10">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-outline text-sm">groups</span>
                          <div>
                            <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Client</p>
                            <p className="text-xs font-bold text-primary truncate max-w-[120px]">{task.customerName}</p>
                          </div>
                        </div>
                        <div className="h-6 w-px bg-outline-variant/30"></div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-outline text-sm">badge</span>
                          <div>
                            <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Assigned</p>
                            <p className="text-xs font-bold text-primary">{task.assignedTo}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-1 text-[11px] font-medium text-outline">
                        <span className="material-symbols-outlined text-[14px]">directions_walk</span>
                        <span>Brought by: <strong className="text-primary">{task.broughtBy}</strong></span>
                      </div>

                      {(task.status === 'Pending') && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (isAdminOrSuper) {
                              handleUpdateStatus(task);
                            } else {
                              setCurrentVerificationTask(task); 
                              setVerificationOpen(true); 
                            }
                          }}
                          className="w-full py-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-secondary/20 transition-colors"
                        >
                           <span className="material-symbols-outlined text-sm">{isAdminOrSuper ? 'play_arrow' : 'rule'}</span>
                           {isAdminOrSuper ? 'START TASK WORK' : 'VERIFY INTAKE DATA'}
                        </button>
                      )}

                      <div className="px-1 pt-1">
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5">
                          <span>Progress</span>
                          <span className="text-primary">{task.progressPercentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${task.progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                })}
                {filteredTasks.length === 0 && (
                  <div className="p-8 text-center text-outline text-sm font-medium">No tasks found.</div>
                )}
              </div>
            </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input 
                type="text" 
                value={settlementSearch}
                onChange={(e) => setSettlementSearch(e.target.value)}
                placeholder="Search returning customer by name, phone..." 
                className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-10 text-sm font-medium text-primary placeholder-outline focus:outline-none input-sapphire-focus luxury-card transition-all" 
              />
              {settlementSearch && (
                <span onClick={() => setSettlementSearch('')} className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline text-lg cursor-pointer hover:text-primary">close</span>
              )}
            </div>

            {/* List of unsettled tasks & entries */}
            <div className="space-y-4">
              {/* Part 1: Tasks */}
              {filteredTasks.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary px-1">Unsettled Work Orders ({filteredTasks.length})</p>
                  {filteredTasks.map((task) => {
                    const isSilver = task.metal === 'Silver';
                    const impureWeight = parseFloat(task.impureWeight || '0');
                    const metalName = isSilver ? 'Silver' : 'Gold';
                    
                    return (
                      <div 
                        key={task.id} 
                        onClick={() => {
                          setSelectedSettlement({
                            id: task.id,
                            customer_name: task.customerName,
                            date: task.dateGiven,
                            impure_gold_in: isSilver ? 0 : impureWeight,
                            impure_silver_in: isSilver ? impureWeight : 0,
                            purity: task.purity,
                            isTask: true,
                            task: task
                          });
                          setNewSettlementMode(isSilver ? 'Pure Silver' : 'Pure Gold');
                          setCashAmountInput('');
                        }} 
                        className="p-5 bg-white border border-outline-variant/10 hover:bg-surface-bright luxury-card cursor-pointer transition-colors relative overflow-hidden group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-primary bg-primary-fixed/30">
                              <span className="material-symbols-outlined text-xl glow-icon">assignment</span>
                            </div>
                            <div>
                              <p className="font-headline font-bold text-primary text-[15px]">{task.customerName}</p>
                              <p className="text-[10px] text-outline font-bold tracking-widest uppercase mt-0.5">{task.id} • {task.dateGiven}</p>
                            </div>
                          </div>
                          <span className="whitespace-nowrap text-center px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Unsettled Task
                          </span>
                        </div>

                        <div className="flex items-center gap-4 px-3 py-3 bg-[#F8FAFC] rounded-2xl border border-outline-variant/10 mb-3">
                          <div className="flex-grow flex flex-col items-center gap-0.5">
                            <p className="text-[11px] font-black text-primary">{impureWeight.toFixed(3)}g</p>
                            <p className="text-[7px] uppercase font-black text-outline tracking-widest">Impure {metalName}</p>
                          </div>
                          <div className="w-px h-4 bg-outline-variant/20"></div>
                          <div className="flex-grow flex flex-col items-center gap-0.5">
                            <p className="text-[11px] font-black text-secondary">{task.purity || 'N/A'}%</p>
                            <p className="text-[7px] uppercase font-black text-outline tracking-widest">Purity</p>
                          </div>
                        </div>

                        <button 
                          className="w-full py-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-secondary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">swap_horiz</span>
                          PERFORM SETTLEMENT
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Part 2: Ledger Entries Returning Lookup */}
              {(() => {
                const filterEntryBySubmission = (entry: any) => {
                  if (user?.role === 'Super Admin') return true;
                  if (user?.role === 'Admin') return entry.staff_submitted_at && !entry.admin_submitted_at;
                  return !entry.staff_submitted_at;
                };

                const matched = unsettledEntries.filter(entry => {
                  if (!settlementSearch) {
                    return filterEntryBySubmission(entry);
                  }
                  const q = settlementSearch.toLowerCase();
                  return (
                    entry.customer_name?.toLowerCase().includes(q) ||
                    entry.id?.toLowerCase().includes(q) ||
                    entry.purity?.toLowerCase().includes(q)
                  );
                });
                
                return (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-outline px-1 pt-2">Returning Customer History Lookup</p>
                    {matched.map((entry) => {
                      const isSilver = Number(entry.impure_silver_in || 0) > 0;
                      const impureWeight = isSilver ? Number(entry.impure_silver_in) : Number(entry.impure_gold_in);
                      const metalName = isSilver ? 'Silver' : 'Gold';
                      
                      return (
                        <div 
                          key={entry.id} 
                          onClick={() => {
                            setSelectedSettlement(entry);
                            setNewSettlementMode(isSilver ? 'Pure Silver' : 'Pure Gold');
                            setCashAmountInput('');
                          }} 
                          className="p-5 bg-white border border-outline-variant/10 hover:bg-surface-bright luxury-card cursor-pointer transition-colors relative overflow-hidden group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full flex items-center justify-center text-secondary bg-secondary-fixed/30">
                                <span className="material-symbols-outlined text-xl glow-icon">hourglass_empty</span>
                              </div>
                              <div>
                                <p className="font-headline font-bold text-primary text-[15px]">{entry.customer_name}</p>
                                <p className="text-[10px] text-outline font-bold tracking-widest uppercase mt-0.5">{entry.id} • {entry.date}</p>
                              </div>
                            </div>
                            <span className="whitespace-nowrap text-center px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border-slate-200">
                              Ledger Lookup
                            </span>
                          </div>

                          <div className="flex items-center gap-4 px-3 py-3 bg-[#F8FAFC] rounded-2xl border border-outline-variant/10 mb-3">
                            <div className="flex-grow flex flex-col items-center gap-0.5">
                              <p className="text-[11px] font-black text-primary">{impureWeight.toFixed(3)}g</p>
                              <p className="text-[7px] uppercase font-black text-outline tracking-widest">Impure {metalName}</p>
                            </div>
                            <div className="w-px h-4 bg-outline-variant/20"></div>
                            <div className="flex-grow flex flex-col items-center gap-0.5">
                              <p className="text-[11px] font-black text-secondary">{entry.purity || 'N/A'}%</p>
                              <p className="text-[7px] uppercase font-black text-outline tracking-widest">Purity</p>
                            </div>
                          </div>

                          <button 
                            className="w-full py-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-secondary/20 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">swap_horiz</span>
                            PERFORM SETTLEMENT
                          </button>
                        </div>
                      );
                    })}

                    {matched.length === 0 && filteredTasks.length === 0 && (
                      <div className="p-8 text-center text-outline text-sm font-medium">No unsettled entries found.</div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <TaskReconciliationModal 
           isOpen={isVerificationOpen}
           onClose={() => setVerificationOpen(false)}
           collectionTask={currentVerificationTask}
           onVerified={handleVerifySuccess}
        />

      {/* View: Detailed Task Modal */}
      <TaskDetailsModal 
        isOpen={selectedTask !== null} 
        onClose={handleCloseModal} 
        task={selectedTask}
        onUpdateStatus={handleUpdateStatus}
        onDeleteTask={handleDeleteTask}
        isAdminOrSuper={isAdminOrSuper}
        onProcessTask={handleProcessTask}
        onFinalizePricing={handleFinalizePricing}
      />

      {/* View: Perform Settlement Modal */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setSelectedSettlement(null)} />
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up flex flex-col justify-between overflow-hidden"
            style={{ maxHeight: '92svh' }}>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h3 className="font-headline text-base font-extrabold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg text-secondary">swap_horiz</span>
                  Tunch Settlement
                </h3>
                <p className="text-[9px] text-outline font-bold uppercase tracking-widest mt-0.5">Customer: {selectedSettlement.customer_name}</p>
              </div>
              <button onClick={() => setSelectedSettlement(null)} className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-outline hover:text-primary active:scale-90 transition-transform">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 flex-grow overflow-y-auto hide-scrollbar pb-4 pr-1">
              {/* Original Tunch Params */}
              <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#C9A646] mb-1">Intake Parameters</p>
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block">Metal</span>
                    <p className="text-xs font-bold text-primary truncate">{Number(selectedSettlement.impure_silver_in || 0) > 0 ? 'Silver' : 'Gold'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block">Intake Date</span>
                    <p className="text-xs font-bold text-primary truncate">{selectedSettlement.date}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block">Impure Weight</span>
                    <p className="text-xs font-bold text-primary truncate">{Number(selectedSettlement.impure_silver_in || selectedSettlement.impure_gold_in || 0).toFixed(3)}g</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block">Purity</span>
                    <p className="text-xs font-bold text-primary truncate">{selectedSettlement.purity || 'N/A'}%</p>
                  </div>
                </div>
              </div>

              {/* Settlement Form */}
              <div className="rounded-2xl border border-secondary/20 p-3.5 bg-secondary-container/5 space-y-3">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-secondary">Choose Settlement Mode</p>
                
                <div className="flex gap-2">
                  {(Number(selectedSettlement.impure_silver_in || 0) > 0 ? ['Pure Silver', 'Cash'] : ['Pure Gold', 'Cash']).map(mode => (
                    <button 
                      key={mode} type="button" 
                      onClick={() => setNewSettlementMode(mode as any)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-colors ${newSettlementMode === mode ? 'bg-secondary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30 hover:border-secondary/40'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {newSettlementMode === 'Cash' ? (
                  selectedSettlement.isTask ? (
                    <div className="p-3 bg-surface-container/50 rounded-xl border border-outline-variant/10 text-left">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block">Cash Workflow</span>
                      <p className="text-xs font-semibold text-primary">
                        This task will be moved to "In Progress" status. Admin will finalize the gold/silver pricing per gram and total payout amount.
                      </p>
                    </div>
                  ) : (
                    <div className="text-left">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block">Cash Amount Paid to Customer (₹) *</span>
                      <input 
                        type="number" 
                        value={cashAmountInput} 
                        onChange={e => setCashAmountInput(e.target.value)}
                        placeholder="e.g. 15000" 
                        className="w-full h-9 bg-white border border-outline-variant/40 rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:border-secondary"
                      />
                    </div>
                  )
                ) : (
                  <div className="p-3 bg-surface-container/50 rounded-xl border border-outline-variant/10 text-left">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block">Calculated Pure Metal Yield</span>
                    <p className="text-sm font-black text-secondary">
                      {(() => {
                        const isSilver = Number(selectedSettlement.impure_silver_in || 0) > 0;
                        const impure = isSilver ? Number(selectedSettlement.impure_silver_in) : Number(selectedSettlement.impure_gold_in);
                        const purity = parseFloat(selectedSettlement.purity) || 0;
                        const yieldWeight = impure * (purity / 100);
                        return `${yieldWeight.toFixed(3)}g Pure ${isSilver ? 'Silver' : 'Gold'}`;
                      })()}
                    </p>
                    <p className="text-[8.5px] text-outline font-medium mt-1">This will create a liability for Admin allocation from Live Pure Stock.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 mt-4 shrink-0">
              <button 
                onClick={() => setSelectedSettlement(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/50 font-black text-[10px] uppercase tracking-[0.15em] rounded-2xl transition-all"
              >
                Dismiss
              </button>
              <button 
                onClick={async () => {
                  const isCashMode = newSettlementMode === 'Cash';
                  const cashToPay = Number(cashAmountInput || 0);
                  
                  if (isCashMode && !selectedSettlement.isTask && (!cashAmountInput.trim() || isNaN(cashToPay) || cashToPay <= 0)) {
                    alert('Please enter a valid cash amount paid.');
                    return;
                  }
                  
                  setIsSubmittingSettlement(true);
                  try {
                    const isSilver = Number(selectedSettlement.impure_silver_in || 0) > 0 || selectedSettlement.task?.metal === 'Silver';
                    const impure = isSilver 
                      ? Number(selectedSettlement.impure_silver_in || selectedSettlement.task?.impureWeight || 0) 
                      : Number(selectedSettlement.impure_gold_in || selectedSettlement.task?.impureWeight || 0);
                    const purity = parseFloat(selectedSettlement.purity) || 0;
                    const calculatedPure = impure * (purity / 100);

                    // Special Task-specific flow for Cash settlement (follows cash work workflow)
                    if (selectedSettlement.isTask && isCashMode) {
                      let taskLedgerId = selectedSettlement.id;
                      const { data: matchedLedger } = await supabase
                        .from('ledger_entries')
                        .select('id')
                        .eq('customer_name', selectedSettlement.customer_name)
                        .eq('transaction_type', 'Tunch Only')
                        .eq('status', 'No Settlement')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                      
                      if (matchedLedger) {
                        taskLedgerId = matchedLedger.id;
                      }

                      const taskUpdates = {
                        status: 'In Progress' as any,
                        progress_percentage: 40,
                        settlement_condition: 'Cash'
                      };
                      await supabase.from('tasks').update(taskUpdates).eq('id', selectedSettlement.id);
                      setTasks(prev => prev.map(t => t.id === selectedSettlement.id ? { ...t, ...taskUpdates, progressPercentage: 40 } : t));

                      if (taskLedgerId) {
                        await supabase.from('ledger_entries').update({
                          transaction_type: 'Exchange',
                          status: 'Completed',
                          details: 'Converted to Cash Task'
                        }).eq('id', taskLedgerId);
                      }

                      showToast('Task moved to In Progress. Awaiting Admin pricing approval.');
                      setSelectedSettlement(null);
                      fetchUnsettledEntries();
                      return;
                    }

                    // Cash Stock Validation for Settlement Modal
                    if (isCashMode) {
                      const isSuperSa = user?.role === 'Super Admin';
                      let allocationsQuery = supabase.from('stock_allocations').select('cash_amount');
                      if (!isSuperSa && user?.branch_id) {
                        allocationsQuery = allocationsQuery.eq('branch_id', user.branch_id);
                      }
                      
                      let branchUserIds: string[] = [];
                      if (!isSuperSa && user?.branch_id) {
                        const { data: bUsers } = await supabase.from('users').select('id').eq('branch_id', user.branch_id);
                        if (bUsers) branchUserIds = bUsers.map((bu: any) => bu.id);
                      }
                      if (branchUserIds.length === 0) branchUserIds = [user?.id || ''];
                      
                      let entriesQuery = supabase.from('ledger_entries').select('cash_received, cash_paid');
                      if (!isSuperSa && user?.branch_id) {
                        entriesQuery = entriesQuery.in('staff_id', branchUserIds);
                      }
                      
                      const txQuery = supabase.from('transactions').select('amount, status, type');
                      
                      const [allocationsRes, entriesRes, txRes] = await Promise.all([
                        allocationsQuery,
                        entriesQuery,
                        txQuery
                      ]);
                      
                      const totalAllocatedCash = (allocationsRes.data || []).reduce((s, a) => s + Number(a.cash_amount || 0), 0);
                      const totalCashReceived = (entriesRes.data || []).reduce((s, e) => s + Number(e.cash_received || 0), 0);
                      const totalCashPaid = (entriesRes.data || []).reduce((s, e) => s + Number(e.cash_paid || 0), 0);
                      
                      let billingCash = 0;
                      (txRes.data || []).forEach((tx: any) => {
                        const type = tx.type?.trim().toLowerCase() || '';
                        if ((tx.status === 'Paid' || tx.status === 'Fully Paid') && type === 'cash') {
                          const amtStr = typeof tx.amount === 'string' ? tx.amount.replace(/[^\d.]/g, '') : tx.amount;
                          billingCash += Number(amtStr) || 0;
                        }
                      });
                      
                      const currentCashStock = totalAllocatedCash + totalCashReceived + billingCash - totalCashPaid;
                      if (cashToPay > currentCashStock) {
                        alert(`Insufficient Cash Stock in the Branch! Remaining Stock: ₹${currentCashStock.toLocaleString('en-IN')}. Please request Cash Allocation from Super Admin.`);
                        setIsSubmittingSettlement(false);
                        return;
                      }
                    }

                    // If it is a task, find the associated ledger entry ID
                    let ledgerEntryId = selectedSettlement.id;
                    if (selectedSettlement.isTask) {
                      const { data: matchedLedger } = await supabase
                        .from('ledger_entries')
                        .select('id')
                        .eq('customer_name', selectedSettlement.customer_name)
                        .eq('transaction_type', 'Tunch Only')
                        .eq('status', 'No Settlement')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                      
                      if (matchedLedger) {
                        ledgerEntryId = matchedLedger.id;
                      }
                    }

                    const ledgerUpdates: any = {
                      transaction_type: 'Exchange'
                    };

                    if (isCashMode) {
                      ledgerUpdates.status = 'Completed';
                      ledgerUpdates.cash_paid = cashToPay;
                      
                      // Also create a billing transaction
                      const newTxn = {
                        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                        customer_id: selectedSettlement.task?.customerId || 'CUST-COL',
                        customer_name: selectedSettlement.customer_name,
                        metal: isSilver ? 'Silver' : 'Gold',
                        type: 'Cash',
                        work_type: 'Tunch',
                        amount: String(cashToPay),
                        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                        iso_date: new Date().toISOString().split('T')[0],
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: 'Paid',
                        details: `Cash settlement for completed Tunch gold. Original Entry ID: ${ledgerEntryId}`,
                        piece_type: 'Jewellery',
                        impure_weight: String(impure),
                        pure_weight: String(calculatedPure),
                        purity_percentage: String(purity),
                        created_by: user?.id || '',
                        is_cash_exchange: true
                      };
                      await supabase.from('transactions').insert([newTxn]);
                    } else {
                      // Pure metal due
                      ledgerUpdates.status = 'Pending Pure';
                      if (isSilver) {
                        ledgerUpdates.pure_silver_due = calculatedPure;
                        ledgerUpdates.pure_silver_out = 0;
                        ledgerUpdates.pure_gold_due = 0;
                        ledgerUpdates.pure_gold_out = 0;
                      } else {
                        ledgerUpdates.pure_gold_due = calculatedPure;
                        ledgerUpdates.pure_gold_out = 0;
                        ledgerUpdates.pure_silver_due = 0;
                        ledgerUpdates.pure_silver_out = 0;
                      }
                    }

                    // Update ledger entries
                    const { error } = await supabase
                      .from('ledger_entries')
                      .update(ledgerUpdates)
                      .eq('id', ledgerEntryId);

                    if (error) throw error;
                    
                    // If it was a task, close it
                    if (selectedSettlement.isTask) {
                      await supabase.from('tasks').update({ status: 'Completed', progress_percentage: 100 }).eq('id', selectedSettlement.id);
                      setTasks(prev => prev.map(t => t.id === selectedSettlement.id ? { ...t, status: 'Completed', progressPercentage: 100 } : t));
                    }

                    showToast(isCashMode ? 'Cash settlement completed & billed successfully.' : 'Pure metal exchange settlement registered. Pending Admin allocation.');
                    setSelectedSettlement(null);
                    fetchUnsettledEntries();
                  } catch (e) {
                    console.error(e);
                    alert('Failed to submit settlement.');
                  } finally {
                    setIsSubmittingSettlement(false);
                  }
                }}
                disabled={isSubmittingSettlement}
                className="flex-grow flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-[10px] uppercase tracking-[0.15em] rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {isSubmittingSettlement ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Confirm Settlement
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
        
        {/* Toast Notification System */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in w-11/12 max-w-sm">
            <div className="bg-[#003366] text-white py-3.5 px-5 rounded-2xl shadow-[0_10px_40px_rgba(0,51,102,0.3)] flex items-center gap-3 border border-white/10">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-sm">notifications_active</span>
              </div>
              <span className="font-bold text-[13px] tracking-wide flex-1">{toastMessage}</span>
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
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
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
