import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { supabase } from '../supabaseClient';

type WorkType = 'TUNCH' | 'MARKING' | 'SHOULDERING' | 'BUY_SELL';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  status: string;
}

// Defined OUTSIDE the parent component so React never treats these
// as new component types on re-render (which would unmount inputs mid-typing).
const ToggleBtn = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-2 bg-surface-container p-1 rounded-full">
    {options.map(opt => (
      <button key={opt} onClick={() => onChange(opt)}
        className={`flex-1 py-2 rounded-full text-[11px] font-bold transition-colors ${value === opt ? 'button-gradient text-white shadow-sm' : 'text-on-surface-variant'}`}>
        {opt}
      </button>
    ))}
  </div>
);

const SectionCard = ({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) => (
  <div className="luxury-card overflow-hidden">
    <div className={`px-5 py-3 flex items-center gap-2.5 border-b border-outline-variant/10 ${color}`}>
      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
      <p className="text-[10px] font-black uppercase tracking-[0.15em]">{title}</p>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

// Local scanning removed - standard image upload mode active

const getActualPureWeight = (impureStr: string, purityStr: string): string => {
  const impure = parseFloat(impureStr);
  const purity = parseFloat(purityStr);
  if (isNaN(impure) || isNaN(purity)) return "";
  const raw = (impure * purity) / 100;
  // Fix floating point precision issues by rounding to 10 decimal places, then parsing back to float to drop trailing zeros.
  return parseFloat(raw.toFixed(10)).toString();
};

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (taskData: any) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useSession();
  const [step, setStep] = useState(1);
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isCollection = user?.role === 'Collection Staff';

  const [formData, setFormData] = useState({
    metal: 'Gold',
    customerName: '', address: '', phone: '', customerId: '',
    impureWeight: '', purity: '', pureWeight: '',
    settlementCondition: 'Only Tunch', fee: '',
    feeStatus: 'Paid',
    feePaymentMode: 'Cash',
    productType: 'Jewellery',
    logoName: '', carat: '22k', pieces: '',
    broughtBy: 'Customer', pointsUsed: '',
    pointSuggestion: 'Gold', totalWeight: '',
    pendingPureLiability: false,
    pendingCashLiability: false,
    cashHandlingMode: 'Front',
    cashRate: '',
    cashAmount: ''
  });

  const [pieceCategories, setPieceCategories] = useState<Record<string, string>>({
    '22k': '', '18k': '', '14k': '', '9k': ''
  });
  
  const [taskImages, setTaskImages] = useState<Record<number, File>>({});
  const [uploadingSlots, setUploadingSlots] = useState<Record<number, boolean>>({});
  const [uploadedUrls, setUploadedUrls] = useState<Record<number, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  React.useEffect(() => {
    const fetchCustomers = async () => {
      if (!isOpen) return;

      let branchUserIds: string[] = [];
      const isSuperSa = user?.role === 'Super Admin';
      if (!isSuperSa && user?.branch_id) {
        const { data: bUsers } = await supabase
          .from('users')
          .select('id')
          .eq('branch_id', user.branch_id);
        if (bUsers) {
          branchUserIds = bUsers.map((bu: any) => bu.id);
        }
      }

      const { data } = await supabase.from('customers').select('*').eq('status', 'Approved');
      if (data) {
        if (!isSuperSa && user?.branch_id && branchUserIds.length > 0) {
          setCustomers(data.filter(c => branchUserIds.includes(c.created_by)));
        } else {
          setCustomers(data);
        }
      }
    };
    fetchCustomers();

    window.addEventListener('databaseSync', fetchCustomers);
    return () => {
      window.removeEventListener('databaseSync', fetchCustomers);
    };
  }, [isOpen, user?.branch_id, user?.role]);

  const handleRequestCustomer = async () => {
      if (!formData.customerName || !formData.phone || !formData.address) {
         alert('Please enter name, phone number, and address to request a new customer.');
         return;
      }
      try {
         const newId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
         await supabase.from('customers').insert([{
            id: newId,
            name: formData.customerName,
            phone: formData.phone,
            address: formData.address,
            status: 'Pending',
            created_by: user?.id
         }]);
         alert('Customer approval request sent to Super Admin.');
         setShowDropdown(false);
         setFormData(prev => ({ ...prev, customerName: '', phone: '', address: '' }));
         onClose();
      } catch (e) {
         console.error(e);
         alert('Failed to request customer.');
      }
  };

  const handleAddCustomerDirectly = async () => {
      if (!formData.customerName || !formData.phone || !formData.address) {
         alert('Please enter name, phone number, and address to add a customer.');
         return;
      }
      try {
         const newId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
         const newCust = {
            id: newId,
            name: formData.customerName,
            phone: formData.phone,
            address: formData.address,
            status: 'Approved',
            created_by: user?.id
         };
         await supabase.from('customers').insert([newCust]);
         setCustomers(prev => [...prev, newCust]);
         alert('Customer added successfully!');
         setShowDropdown(false);
      } catch (e) {
         console.error(e);
         alert('Failed to add customer.');
      }
  };

  if (!isOpen) return null;

  const up = (key: string, val: string) => {
    setFormData(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => { const n = {...e}; delete n[key]; return n; });
    
    if (key === 'pieces') {
      setPieceCategories({ '22k': '', '18k': '', '14k': '', '9k': '' });
      setTaskImages({});
      setUploadingSlots({});
      setUploadedUrls({});
    }
  };

  const getRequiredImages = (numPieces: number) => {
    if (numPieces <= 0) return 0;
    const slots = Math.ceil(numPieces / 10);
    return Math.min(10, slots);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.customerName.trim()) e.customerName = 'Required';
    else {
      const match = customers.find(c => c.name.toLowerCase() === formData.customerName.trim().toLowerCase());
      if (!match) e.customerName = 'Must select an approved customer';
    }
    const numPieces = parseInt(formData.pieces) || 0;
    
    if (workType === 'TUNCH') {
      if (!formData.address.trim()) e.address = 'Required';
      if (!formData.phone.trim()) e.phone = 'Required';
      if (!formData.impureWeight.trim()) e.impureWeight = 'Required';
      if (!formData.pieces.trim()) e.pieces = 'Required';
      if (!isCollection) {
        if (!formData.purity.trim()) e.purity = 'Required';
        if (!formData.pureWeight.trim()) e.pureWeight = 'Required';
        if (!formData.fee.trim()) e.fee = 'Required';
      }
    }
    if (workType === 'MARKING') {
      if (!formData.logoName.trim()) e.logoName = 'Required';
      if (!formData.totalWeight.trim()) e.totalWeight = 'Required';
      if (!formData.pieces.trim()) e.pieces = 'Required';
      else if (numPieces > 1) {
        const sum = Object.values(pieceCategories).reduce((a, b) => a + (parseInt(b) || 0), 0);
        if (sum !== numPieces) {
           e.pieces = `Sum of categories (${sum}) must equal total pieces (${numPieces})`;
        }
      }
      if (!isCollection) {
        if (!formData.fee.trim()) e.fee = 'Required';
      }
    }
    if (workType === 'SHOULDERING') {
      if (!formData.pieces.trim()) e.pieces = 'Required';
      if (!isCollection) {
        if (!formData.pointsUsed.trim()) e.pointsUsed = 'Required';
        if (!formData.fee.trim()) e.fee = 'Required';
      }
    }
    if (workType === 'BUY_SELL') {
      if (!formData.address.trim()) e.address = 'Required';
      if (!formData.phone.trim()) e.phone = 'Required';
      if (!formData.pureWeight.trim()) e.pureWeight = 'Required';
      if (!formData.cashRate.trim()) e.cashRate = 'Required';
      if (!formData.cashAmount.trim()) e.cashAmount = 'Required';
    }
    
    if (numPieces > 0 && (workType === 'TUNCH' || workType === 'MARKING' || workType === 'SHOULDERING')) {
      const reqImgs = getRequiredImages(numPieces);
      if (Object.keys(taskImages).length < reqImgs) {
         e.images = `Please upload all ${reqImgs} verification photos.`;
      } else {
         const isStillUploading = Array.from({ length: reqImgs }).some((_, idx) => {
           return uploadingSlots[idx] || !uploadedUrls[idx];
         });
         if (isStillUploading) {
           e.images = `Please wait for all photos to finish uploading.`;
         }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 2 && !validate()) return;
    setStep(s => s + 1);
  };

  const handleFinalSubmit = async () => {
    setIsUploading(true);
    try {
      const numPieces = parseInt(formData.pieces) || 0;
      const reqImgs = getRequiredImages(numPieces);
      let urls: string[] = [];
      for (let i = 0; i < reqImgs; i++) {
        if (uploadedUrls[i]) {
          urls.push(uploadedUrls[i]);
        }
      }

      let serialId = '0001';
      try {
        const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
        if (count !== null) {
          serialId = String(count + 1).padStart(4, '0');
        }
      } catch (e) {
        console.error('Failed to get task count for serial ID', e);
      }

      const activePure = formData.pureWeight.trim();
      const finalAmt = formData.cashAmount.trim();

      onSuccess({ 
        ...formData, 
        pureWeight: activePure,
        cashAmount: finalAmt,
        workType, 
        pieceCategories,
        images: urls,
        id: isCollection ? `COL-${serialId}` : `TASK-${serialId}`, 
        date: 'Just Now', 
        status: 'In Progress', 
        progressPercentage: 10, 
        assignedTo: 'Staff' 
      });
      
      setStep(1); 
      setWorkType(null); 
      setErrors({}); 
      setTaskImages({});
      setUploadingSlots({});
      setUploadedUrls({});
      setFormData({ metal: 'Gold', customerName: '', address: '', phone: '', customerId: '', impureWeight: '', purity: '', pureWeight: '', settlementCondition: 'Only Tunch', fee: '', feeStatus: 'Paid', feePaymentMode: 'Cash', productType: 'Jewellery', logoName: '', carat: '22k', pieces: '', broughtBy: 'Customer', pointsUsed: '', pointSuggestion: 'Gold', totalWeight: '', pendingPureLiability: false, pendingCashLiability: false, cashHandlingMode: 'Front', cashRate: '', cashAmount: '' });
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to submit task. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const getExpectedPiecesForSlot = (index: number, totalPieces: number) => {
    const maxSlots = getRequiredImages(totalPieces);
    if (maxSlots <= 1) return totalPieces;
    const isLast = index === maxSlots - 1;
    if (isLast) {
      return totalPieces - (maxSlots - 1) * 10;
    }
    return 10;
  };

  const handleImageChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Store the image locally first for preview
      setTaskImages(prev => ({ ...prev, [index]: file }));
      if (errors['images']) {
         setErrors(errs => { const n = {...errs}; delete n['images']; return n; });
      }

      // Mark slot as uploading
      setUploadingSlots(prev => ({ ...prev, [index]: true }));

      try {
        // Upload image to Supabase storage to get its path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_task_${index}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('task_images').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('task_images').getPublicUrl(fileName);
        setUploadedUrls(prev => ({ ...prev, [index]: publicUrl }));
      } catch (err: any) {
        console.error("Upload error:", err);
        alert("Failed to upload image. Please try again.");
      } finally {
        setUploadingSlots(prev => ({ ...prev, [index]: false }));
      }
    }
  };

  const getSlotLabel = (idx: number, totalPieces: number) => {
    const maxSlots = getRequiredImages(totalPieces);
    if (maxSlots <= 1) {
      return `Pieces 1-${totalPieces}`;
    }
    const start = idx * 10 + 1;
    const isLast = idx === maxSlots - 1;
    const end = isLast ? totalPieces : (idx + 1) * 10;
    return `Pieces ${start}-${end}`;
  };

  const renderImageUploads = () => {
    const numPieces = parseInt(formData.pieces) || 0;
    if (numPieces <= 0) return null;
    const requiredImages = getRequiredImages(numPieces);

    return (
      <div className="mt-4 bg-surface-container/30 p-4 rounded-2xl border border-outline-variant/30">
        <div className="flex justify-between items-center mb-1">
          <label className={lbl}>Upload Verification Photos *</label>
          <span className="text-[9px] font-bold text-outline uppercase tracking-wider bg-outline-variant/10 px-2 py-0.5 rounded-full">
            {requiredImages} {requiredImages === 1 ? 'Slot' : 'Slots'}
          </span>
        </div>
        {errMsg('images')}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {Array.from({ length: requiredImages }).map((_, idx) => {
            const hasImage = !!taskImages[idx];
            const isUploadingSlot = uploadingSlots[idx];

            return (
              <div 
                key={idx} 
                className={`relative aspect-square rounded-xl border-2 border-dashed bg-white overflow-hidden flex flex-col items-center justify-center transition-all ${
                  isUploadingSlot 
                    ? 'border-secondary/60 bg-secondary/5 shadow-inner' 
                    : hasImage 
                    ? 'border-primary/40 bg-[#003366]/[0.01]' 
                    : 'border-outline-variant/40 hover:border-primary/40'
                }`}
              >
                {isUploadingSlot ? (
                  <div className="absolute inset-0 bg-[#001e40]/5 flex flex-col items-center justify-center backdrop-blur-[1px]">
                    <span className="w-8 h-8 border-3 border-secondary/20 border-t-secondary rounded-full animate-spin"></span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-secondary mt-2.5">Uploading...</span>
                  </div>
                ) : hasImage ? (
                  <>
                    <img 
                      src={URL.createObjectURL(taskImages[idx])} 
                      alt={getSlotLabel(idx, numPieces)} 
                      className="w-full h-full object-cover animate-fade-in" 
                    />
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#003366]/90 text-white font-bold text-[8px] flex items-center gap-1 shadow-md backdrop-blur-sm animate-fade-in">
                      <span className="material-symbols-outlined text-[8px] font-bold">image</span>
                      UPLOADED
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setTaskImages(p => { const n={...p}; delete n[idx]; return n; });
                        setUploadedUrls(p => { const n={...p}; delete n[idx]; return n; });
                      }} 
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-error/90 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-md hover:scale-105 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </>
                ) : (
                  <>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={(e) => handleImageChange(idx, e)} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                    <span className="material-symbols-outlined text-outline-variant text-3xl mb-1.5">add_a_photo</span>
                    <span className="text-[9px] font-bold text-outline uppercase tracking-wider">{getSlotLabel(idx, numPieces)}</span>
                    <span className="text-[7px] text-outline/50 uppercase tracking-widest mt-0.5">
                      {getExpectedPiecesForSlot(idx, numPieces)} Pieces
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };



  const inp = (err?: string) => `w-full h-12 bg-white border ${err ? 'border-error' : 'border-outline-variant/40'} rounded-DEFAULT px-4 text-sm text-primary font-medium placeholder-outline/40 focus:outline-none focus:border-secondary transition-colors`;
  const lbl = "text-[10px] font-bold uppercase tracking-[0.14em] text-outline mb-1 block truncate";
  const errMsg = (k: string) => errors[k] ? <p className="text-[10px] text-error mt-1 font-medium">{errors[k]}</p> : null;

  const stepTitles = ['Select Operation', 'Enter Details', 'Review & Confirm', 'Authorize Entry'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001e40]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md flex flex-col rounded-[2rem] overflow-hidden border border-white/30 shadow-[0_-20px_80px_rgba(0,30,64,0.4)]"
        style={{ minHeight: step === 1 ? '72svh' : '88svh', maxHeight: '92svh', animation: 'modalUp 0.35s cubic-bezier(0.22,1,0.36,1)' }}>

        {/* NAVY HEADER */}
        <div className="shrink-0 bg-gradient-to-br from-[#001e40] to-[#003366] px-6 pt-7 pb-5 relative overflow-hidden">
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[100px] text-white/[0.04] pointer-events-none select-none">
            {workType === 'TUNCH' ? 'science' : workType === 'MARKING' ? 'verified' : workType === 'SHOULDERING' ? 'precision_manufacturing' : 'add_task'}
          </span>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (step === 1) { onClose(); } else setStep(s => s - 1); }}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-all active:scale-90">
              <span className="material-symbols-outlined text-[18px]">{step === 1 ? 'keyboard_arrow_down' : 'arrow_back'}</span>
            </button>
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">Work Registry</p>
              <h2 className="font-headline text-[16px] font-bold text-white leading-tight mt-0.5">{stepTitles[step - 1]}</h2>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white/80 hover:bg-red-500/30 transition-all active:scale-90">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="flex gap-1.5">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1 rounded-full flex-1 transition-all duration-500 ${step > s ? 'bg-[#C9A646]' : step === s ? 'bg-[#C9A646]/70' : 'bg-white/15'}`} />
            ))}
          </div>
        </div>

        {/* BODY — flex col so step 1 can center itself, steps 2-4 scroll independently */}
        <div className="flex-grow bg-background flex flex-col overflow-hidden">

          {/* ── STEP 1: Centered selection ── */}
          {step === 1 && (
            <div className="flex-grow flex flex-col justify-center px-6 py-8 gap-3">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-2xl bg-white/80 border border-outline-variant/20 premium-shadow flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>add_task</span>
                </div>
                <h3 className="font-headline text-[18px] font-bold text-primary">New Work Order</h3>
                <p className="text-[12px] text-on-surface-variant mt-1">Select the operation to begin.</p>
              </div>
              <div className="space-y-3">
                {((user?.role === 'Admin' || user?.role === 'Super Admin') ? [
                  { type: 'BUY_SELL' as WorkType, action: 'Buy', icon: 'shopping_cart', title: 'Buy', desc: 'Direct gold/silver purchase', accent: 'border-l-emerald-500', iconBg: 'bg-emerald-50 text-emerald-600' },
                  { type: 'BUY_SELL' as WorkType, action: 'Sell', icon: 'sell', title: 'Sell', desc: 'Direct gold/silver sale', accent: 'border-l-amber-500', iconBg: 'bg-amber-50 text-amber-600' }
                ] : [
                  { type: 'TUNCH' as WorkType, action: undefined, icon: 'science', title: 'Tunch', desc: 'Purity testing & gold exchange', accent: 'border-l-secondary', iconBg: 'bg-secondary/10 text-secondary' },
                  { type: 'MARKING' as WorkType, action: undefined, icon: 'verified', title: 'Marking', desc: 'Logo hallmarking & branding', accent: 'border-l-tertiary-container', iconBg: 'bg-tertiary-container/20 text-tertiary' },
                  { type: 'SHOULDERING' as WorkType, action: undefined, icon: 'precision_manufacturing', title: 'Shouldering', desc: 'Precision soldering work', accent: 'border-l-error', iconBg: 'bg-error/10 text-error' },
                ]).map(({ type, action, icon, title, desc, accent, iconBg }) => (
                  <button key={`${type}-${action || ''}`} onClick={() => { 
                    setWorkType(type); 
                    if (type === 'BUY_SELL') {
                      setFormData(f => ({ ...f, settlementCondition: action || 'Buy' }));
                    }
                    setStep(2); 
                  }}
                    className={`w-full luxury-card p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all border-l-4 ${accent} hover:shadow-lg group`}>
                    <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
                    </div>
                    <div className="flex-grow">
                      <p className="font-headline text-[15px] font-bold text-primary">{title}</p>
                      <p className="text-[11px] text-outline mt-0.5">{desc}</p>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Form ── */}
          {step === 2 && (
            <div className="flex-grow overflow-y-auto hide-scrollbar px-6 py-6 space-y-4 animate-fade-in">
              <SectionCard title="Metal Selection" icon="diamond" color="bg-primary/5 text-primary">
                <div>
                  <label className={lbl}>Select Metal Type *</label>
                  <div className="flex gap-3 mt-1">
                    {[
                      { metal: 'Gold', icon: 'workspace_premium', activeClass: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white shadow-md shadow-amber-500/20' },
                      { metal: 'Silver', icon: 'workspace_premium', activeClass: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/20' }
                    ].map(({ metal, icon, activeClass }) => {
                      const isActive = formData.metal === metal;
                      return (
                        <button
                          type="button"
                          key={metal}
                          onClick={() => up('metal', metal)}
                          className={`flex-grow flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                            isActive 
                              ? `${activeClass} border-transparent scale-[1.01]`
                              : 'bg-surface-container/40 text-outline border-outline-variant/20 hover:bg-surface-container/80'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-base ${isActive ? 'text-white' : metal === 'Gold' ? 'text-amber-500' : 'text-slate-400'}`}>
                            {icon}
                          </span>
                          {metal}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SectionCard>

              {/* Client Section - Shared across all Work Types */}
              <SectionCard title="Client Details" icon="person" color="bg-secondary/5 text-secondary">
                <div className="relative">
                    <label className={lbl}>Customer Name *</label>
                    <input 
                      className={inp(errors.customerName)} 
                      placeholder="Full name" 
                      value={formData.customerName} 
                      onChange={e => { up('customerName', e.target.value); up('customerId', ''); setShowDropdown(true); }} 
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                    />
                    {errMsg('customerName')}
                    {showDropdown && formData.customerName && (
                       <div className="absolute z-50 w-full mt-1 bg-white border border-outline-variant/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {customers.filter(c => c.name.toLowerCase().includes(formData.customerName.toLowerCase())).map(c => (
                             <div key={c.id} className="px-4 py-2 hover:bg-surface-container cursor-pointer border-b border-outline-variant/10"
                                onClick={() => {
                                   up('customerName', c.name);
                                   up('phone', c.phone || '');
                                   up('address', c.address || '');
                                   up('customerId', c.id);
                                   setShowDropdown(false);
                                }}
                             >
                                <p className="text-sm font-bold text-primary">{c.name}</p>
                                <p className="text-[10px] text-outline">{c.phone}</p>
                             </div>
                          ))}
                          {customers.filter(c => c.name.toLowerCase().includes(formData.customerName.toLowerCase())).length === 0 && (
                             <div className="px-4 py-3 text-center">
                                <p className="text-xs text-outline">Customer not found</p>
                             </div>
                          )}
                       </div>
                    )}
                  </div>
                  <div>
                    <label className={lbl}>Address *</label>
                    <input className={inp(errors.address)} placeholder="Full address" value={formData.address} onChange={e => up('address', e.target.value)} />
                    {errMsg('address')}
                  </div>
                  <div>
                    <label className={lbl}>Phone *</label>
                    <input className={inp(errors.phone)} placeholder="+91 XXXXX XXXXX" value={formData.phone} onChange={e => up('phone', e.target.value)} />
                    {errMsg('phone')}
                  </div>
                  {formData.customerName && !customers.some(c => c.name.toLowerCase() === formData.customerName.toLowerCase()) && (
                     <div className="pt-2 animate-fade-in">
                        <button 
                          type="button"
                          onClick={user?.role === 'Super Admin' ? handleAddCustomerDirectly : handleRequestCustomer}
                          className="w-full h-12 bg-secondary text-white rounded-xl text-[12px] font-bold uppercase tracking-widest hover:bg-secondary/90 transition-colors shadow-md flex flex-col items-center justify-center gap-0.5"
                        >
                          <span>{user?.role === 'Super Admin' ? 'Add Customer Directly' : 'Submit Approval'}</span>
                        </button>
                        <p className="text-[10px] text-outline text-center mt-2">Fill name, address, and phone before submitting.</p>
                     </div>
                  )}
                </SectionCard>

              {workType === 'TUNCH' && (<>
                <SectionCard title="Product Received" icon="category" color="bg-primary/5 text-primary">
                  <div>
                    <label className={lbl}>Type of Item *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Jewellery', 'Sample', 'Coin', 'Bar', 'Scrap', 'Other'].map(pt => (
                        <button key={pt} onClick={() => up('productType', pt)}
                          className={`py-2.5 rounded-xl text-[11px] font-bold transition-all border ${formData.productType === pt ? 'button-gradient text-white border-transparent shadow-sm' : 'bg-white border-outline-variant/30 text-on-surface-variant hover:border-secondary/40 hover:text-secondary'}`}>
                          {pt}
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Gold Audit Parameters" icon="science" color="bg-tertiary/5 text-tertiary">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Impure Wt. (g) *</label>
                      <input className={inp(errors.impureWeight)} placeholder="e.g. 12.45" value={formData.impureWeight} onChange={e => up('impureWeight', e.target.value)} />
                      {errMsg('impureWeight')}
                    </div>
                    <div>
                      <label className={lbl}>No. of Pieces *</label>
                      <input className={inp(errors.pieces)} placeholder="Qty" value={formData.pieces} onChange={e => up('pieces', e.target.value)} />
                      {errMsg('pieces')}
                    </div>
                  </div>
                  {!isCollection && (
                    <div className="mt-3">
                      <label className={lbl}>Purity (%) *</label>
                      <input className={inp(errors.purity)} placeholder="e.g. 91.6" value={formData.purity} onChange={e => up('purity', e.target.value)} />
                      {errMsg('purity')}
                    </div>
                  )}
                </SectionCard>

                {!isCollection && (
                  <>
                    <SectionCard title="Actual Pure Weight" icon="calculate" color="bg-secondary/5 text-secondary">
                      <div>
                        <label className={lbl}>Calculated Weight (g)</label>
                        <div className="w-full h-12 bg-secondary/5 border border-secondary/20 rounded-DEFAULT px-4 flex items-center text-sm font-extrabold text-secondary">
                          {getActualPureWeight(formData.impureWeight, formData.purity) || '0.000'} g
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard title="Pure Weight" icon="workspace_premium" color="bg-tertiary/5 text-tertiary">
                      <div>
                        <label className={lbl}>Manually Entered Pure Weight (g) *</label>
                        <input className={inp(errors.pureWeight)} placeholder="Enter rounded pure weight" value={formData.pureWeight} onChange={e => up('pureWeight', e.target.value)} />
                        {errMsg('pureWeight')}
                      </div>
                    </SectionCard>
                  </>
                )}

                <SectionCard title="Settlement Condition" icon="handshake" color="bg-surface-container text-on-surface-variant">
                  <div className="space-y-2">
                    {['Only Tunch', 'Pure Gold', 'Cash'].map(cond => (
                      <button key={cond} onClick={() => up('settlementCondition', cond)}
                        className={`w-full h-11 px-4 rounded-full text-[12px] font-semibold text-left transition-all flex items-center gap-2.5 ${formData.settlementCondition === cond ? 'button-gradient text-white shadow-md' : 'bg-surface-container text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container-high'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${formData.settlementCondition === cond ? 'bg-white' : 'bg-outline-variant'}`} />
                        {cond}
                      </button>
                    ))}
                  </div>
                  {formData.settlementCondition === 'Cash' && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/20">
                      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline mb-2 block">Impure Metal Custody *</label>
                      <div className="flex gap-2">
                        {['Front', 'Back'].map(mode => (
                          <button 
                            key={mode} type="button" 
                            onClick={() => up('cashHandlingMode', mode)}
                            className={`flex-grow py-2.5 rounded-xl text-[11px] font-bold border transition-all ${formData.cashHandlingMode === mode ? 'button-gradient text-white border-transparent shadow-sm' : 'bg-white border-outline-variant/30 text-on-surface-variant hover:border-secondary/40 hover:text-secondary'}`}
                          >
                            {mode === 'Front' ? 'Staff (Kept with Staff)' : 'Admin (Kept with Admin)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {renderImageUploads()}
                </SectionCard>

                {!isCollection && (
                  <SectionCard title="Service Fee" icon="payments" color="bg-secondary/5 text-secondary">
                    <div>
                      <label className={lbl}>Amount (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">₹</span>
                        <input className={`${inp(errors.fee)} pl-8 font-bold text-secondary`} placeholder="0.00" value={formData.fee} onChange={e => up('fee', e.target.value)} />
                      </div>
                      {errMsg('fee')}
                    </div>
                    <div>
                      <label className={lbl}>Payment Status</label>
                      <ToggleBtn options={['Paid', 'Due']} value={formData.feeStatus} onChange={v => up('feeStatus', v)} />
                    </div>
                    <div>
                      <label className={lbl}>Payment Mode</label>
                      <ToggleBtn options={['Cash', 'UPI']} value={formData.feePaymentMode} onChange={v => up('feePaymentMode', v)} />
                    </div>
                  </SectionCard>
                )}
              </>)}

              {workType === 'MARKING' && (<>
                <SectionCard title="Marking Details" icon="verified" color="bg-tertiary/5 text-tertiary">
                  <div>
                    <label className={lbl}>Logo Design *</label>
                    <input className={inp(errors.logoName)} placeholder="e.g. RCJ, AJ" value={formData.logoName} onChange={e => up('logoName', e.target.value)} />
                    {errMsg('logoName')}
                  </div>
                </SectionCard>

                <SectionCard title="Specifications" icon="tune" color="bg-primary/5 text-primary">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Total Weight (g) *</label>
                      <input className={inp(errors.totalWeight)} placeholder="e.g. 15.2" value={formData.totalWeight} onChange={e => up('totalWeight', e.target.value)} />
                      {errMsg('totalWeight')}
                    </div>
                    <div>
                      <label className={lbl}>No. of Pieces *</label>
                      <input className={inp(errors.pieces)} placeholder="Qty" value={formData.pieces} onChange={e => up('pieces', e.target.value)} />
                      {errMsg('pieces')}
                    </div>
                  </div>

                  {parseInt(formData.pieces) === 1 && (
                    <div className="mt-3 animate-fade-in">
                      <label className={lbl}>Carat</label>
                      <div className="flex gap-2">
                        {['22k','18k','14k','9k'].map(k => (
                          <button key={k} onClick={() => up('carat', k)}
                            className={`flex-1 h-11 rounded-full text-[12px] font-bold transition-all ${formData.carat === k ? 'button-gradient text-white shadow-md' : 'bg-surface-container text-on-surface-variant border border-outline-variant/20'}`}>
                            {k.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {parseInt(formData.pieces) > 1 && (() => {
                    const totalPieces = parseInt(formData.pieces) || 0;
                    const currentSum = Object.values(pieceCategories).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
                    const isMatching = currentSum === totalPieces;
                    
                    const adjustCategory = (key: string, delta: number) => {
                      setPieceCategories(prev => {
                        const currentVal = parseInt(prev[key]) || 0;
                        const newVal = Math.max(0, currentVal + delta);
                        const otherSum = Object.entries(prev)
                          .filter(([k]) => k !== key)
                          .reduce((s, [_, v]) => s + (parseInt(v) || 0), 0);
                        if (delta > 0 && (otherSum + newVal) > totalPieces) return prev;
                        return {
                          ...prev,
                          [key]: newVal === 0 ? '' : String(newVal)
                        };
                      });
                    };

                    return (
                      <div className="mt-4 bg-surface-container/20 p-5 rounded-2xl border border-outline-variant/30 backdrop-blur-md animate-fade-in">
                        <div className="flex justify-between items-center mb-3">
                          <label className={lbl}>Carat Breakdown</label>
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider transition-all duration-300 ${
                            isMatching 
                              ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            Sum: {currentSum} / {totalPieces}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3.5">
                          {['22k', '18k', '14k', '9k'].map(k => {
                            const val = parseInt(pieceCategories[k]) || 0;
                            return (
                              <div key={k} className="bg-white p-3.5 rounded-xl border border-outline-variant/20 flex flex-col items-center justify-between shadow-sm">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{k}</span>
                                <div className="flex items-center justify-between w-full mt-2.5 bg-surface-container/40 rounded-full p-1 border border-outline-variant/10">
                                  <button
                                    type="button"
                                    onClick={() => adjustCategory(k, -1)}
                                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-outline hover:text-primary active:scale-90 transition-all border border-outline-variant/10 shadow-sm"
                                  >
                                    <span className="material-symbols-outlined text-sm font-bold">remove</span>
                                  </button>
                                  <span className="text-sm font-black text-primary w-8 text-center">{val}</span>
                                  <button
                                    type="button"
                                    onClick={() => adjustCategory(k, 1)}
                                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-outline hover:text-primary active:scale-90 transition-all border border-outline-variant/10 shadow-sm"
                                  >
                                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {!isCollection && (
                    <div className="mt-3">
                      <label className={lbl}>Brought By</label>
                      <ToggleBtn options={['Customer', 'Staff']} value={formData.broughtBy === 'Staff Member' ? 'Staff' : formData.broughtBy} onChange={v => up('broughtBy', v === 'Staff' ? 'Staff Member' : v)} />
                    </div>
                  )}
                  {renderImageUploads()}
                </SectionCard>

                {!isCollection && (
                  <SectionCard title="Service Fee" icon="payments" color="bg-secondary/5 text-secondary">
                    <div>
                      <label className={lbl}>Amount (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">₹</span>
                        <input className={`${inp(errors.fee)} pl-8 font-bold text-secondary`} placeholder="0.00" value={formData.fee} onChange={e => up('fee', e.target.value)} />
                      </div>
                      {errMsg('fee')}
                    </div>
                    <div>
                      <label className={lbl}>Payment Status</label>
                      <ToggleBtn options={['Paid', 'Due']} value={formData.feeStatus} onChange={v => up('feeStatus', v)} />
                    </div>
                    <div>
                      <label className={lbl}>Payment Mode</label>
                      <ToggleBtn options={['Cash', 'UPI']} value={formData.feePaymentMode} onChange={v => up('feePaymentMode', v)} />
                    </div>
                  </SectionCard>
                )}
              </>)}

              {workType === 'SHOULDERING' && (<>
                <SectionCard title="Shouldering Details" icon="precision_manufacturing" color="bg-error/5 text-error">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Total Weight (g)</label>
                      <input className={inp(errors.totalWeight)} placeholder="e.g. 10.5" value={formData.totalWeight} onChange={e => up('totalWeight', e.target.value)} />
                      {errMsg('totalWeight')}
                    </div>
                    <div>
                      <label className={lbl}>No. of Pieces *</label>
                      <input className={inp(errors.pieces)} placeholder="Qty" value={formData.pieces} onChange={e => up('pieces', e.target.value)} />
                      {errMsg('pieces')}
                    </div>
                  </div>

                  {!isCollection ? (
                    <>
                      <div className="mt-3">
                        <label className={lbl}>Points Used *</label>
                        <input className={inp(errors.pointsUsed)} placeholder="Total solder points" value={formData.pointsUsed} onChange={e => up('pointsUsed', e.target.value)} />
                        {errMsg('pointsUsed')}
                      </div>
                      <div className="mt-3">
                        <label className={lbl}>Material Brought By</label>
                        <ToggleBtn options={['Customer', 'Staff']} value={formData.broughtBy === 'Staff Member' ? 'Staff' : formData.broughtBy} onChange={v => up('broughtBy', v === 'Staff' ? 'Staff Member' : v)} />
                      </div>
                    </>
                  ) : (
                    <div className="mt-3">
                      <label className={lbl}>Point Suggestion</label>
                      <div className="flex gap-3">
                         {['Gold', 'Silver'].map(pt => (
                           <button key={pt} onClick={() => up('pointSuggestion', pt)}
                             className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.pointSuggestion === pt ? 'bg-primary text-white border-transparent shadow-sm' : 'bg-white text-outline border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary'}`}>
                             <span className="material-symbols-outlined text-sm">{pt === 'Gold' ? 'stars' : 'toll'}</span>
                             <span className="text-[10px] font-bold uppercase tracking-widest">{pt} Points</span>
                           </button>
                         ))}
                      </div>
                    </div>
                  )}
                  {renderImageUploads()}
                </SectionCard>

                {!isCollection && (
                  <SectionCard title="Service Fee" icon="payments" color="bg-secondary/5 text-secondary">
                    <div>
                      <label className={lbl}>Amount (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">₹</span>
                        <input className={`${inp(errors.fee)} pl-8 font-bold text-secondary`} placeholder="0.00" value={formData.fee} onChange={e => up('fee', e.target.value)} />
                      </div>
                      {errMsg('fee')}
                    </div>
                    <div>
                      <label className={lbl}>Payment Status</label>
                      <ToggleBtn options={['Paid', 'Due']} value={formData.feeStatus} onChange={v => up('feeStatus', v)} />
                    </div>
                    <div>
                      <label className={lbl}>Payment Mode</label>
                      <ToggleBtn options={['Cash', 'UPI']} value={formData.feePaymentMode} onChange={v => up('feePaymentMode', v)} />
                    </div>
                  </SectionCard>
                )}
              </>)}

              {workType === 'BUY_SELL' && (<>
                <SectionCard title="Metal Parameters" icon="balance" color="bg-primary/5 text-primary">
                  <div>
                    <label className={lbl}>Weight of Pure {formData.metal} (g) *</label>
                    <input className={inp(errors.pureWeight)} placeholder="e.g. 10.000" type="number" step="0.001" value={formData.pureWeight} onChange={e => {
                      const pureVal = e.target.value;
                      up('pureWeight', pureVal);
                      
                      // Auto calculate cash amount
                      const rateNum = parseFloat(formData.cashRate) || 0;
                      const pureNum = parseFloat(pureVal) || 0;
                      const calculatedAmt = pureNum && rateNum ? (pureNum * rateNum).toFixed(2) : '';
                      up('cashAmount', calculatedAmt);
                    }} />
                    {errMsg('pureWeight')}
                  </div>
                </SectionCard>

                <SectionCard title="Pricing & Cash" icon="payments" color="bg-emerald-500/5 text-emerald-600">
                  <div>
                    <label className={lbl}>Price Per Gram (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">₹</span>
                      <input className={`${inp(errors.cashRate)} pl-8 font-bold text-secondary`} placeholder="e.g. 7000" type="number" value={formData.cashRate} onChange={e => {
                        const rateVal = e.target.value;
                        up('cashRate', rateVal);
                        
                        // Auto calculate cash amount
                        const pureNum = parseFloat(formData.pureWeight) || 0;
                        const rateNum = parseFloat(rateVal) || 0;
                        const calculatedAmt = pureNum && rateNum ? (pureNum * rateNum).toFixed(2) : '';
                        up('cashAmount', calculatedAmt);
                      }} />
                    </div>
                    {errMsg('cashRate')}
                  </div>
                  
                  <div className="mt-3">
                    <label className={lbl}>Calculated Total Price</label>
                    <div className="w-full h-12 bg-emerald-500/5 border border-emerald-500/20 rounded-DEFAULT px-4 flex items-center text-sm font-extrabold text-emerald-600">
                      ₹ {(() => {
                        const pureNum = parseFloat(formData.pureWeight) || 0;
                        const rateNum = parseFloat(formData.cashRate) || 0;
                        return pureNum && rateNum ? (pureNum * rateNum).toLocaleString('en-IN') : '0.00';
                      })()}
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className={lbl}>{formData.settlementCondition === 'Buy' ? 'Actual Amount Given *' : 'Actual Amount Received *'}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">₹</span>
                      <input className={`${inp(errors.cashAmount)} pl-8 font-bold text-secondary`} placeholder="0.00" type="number" value={formData.cashAmount} onChange={e => up('cashAmount', e.target.value)} />
                    </div>
                    {errMsg('cashAmount')}
                  </div>
                </SectionCard>
              </>)}



              {Object.keys(errors).length > 0 && (
                <div className="glass-effect rounded-2xl border border-error/20 p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-error text-[18px] shrink-0" style={{ fontVariationSettings: '"FILL" 1' }}>error</span>
                  <p className="text-[12px] text-error font-medium">Please fill in all required fields marked with *</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && (
            <div className="flex-grow overflow-y-auto hide-scrollbar px-6 py-6 space-y-4 animate-fade-in">
              <div className="luxury-card overflow-hidden">
                <div className="bg-gradient-to-br from-[#001e40] to-[#003366] p-5 relative">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-6 -mt-6 blur-xl"></div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">Operation Summary</p>
                  <p className="font-headline text-xl font-bold text-white mt-1">{workType} Work Order</p>
                  <p className="text-[11px] text-white/40 mt-0.5">Verify before final authorization</p>
                </div>
                <div className="bg-white p-5 space-y-3">
                  {[
                    ['Client', formData.customerName],
                    ...(workType === 'TUNCH' ? [
                      ['Phone', formData.phone],
                      ['Impure Wt.', `${formData.impureWeight}g`],
                      ...(!isCollection ? [
                        ['Purity', `${formData.purity}%`],
                        ['Pure Wt.', `${formData.pureWeight}g`]
                      ] : []),
                      ['Settlement', formData.settlementCondition],
                      ['Pieces', formData.pieces],
                      ['Images', `${Object.keys(taskImages).length} uploaded`]
                    ] : []),
                    ...(workType === 'MARKING' ? [
                      ['Logo', formData.logoName],
                      ...(parseInt(formData.pieces) > 1 ? [
                        ['Carat Breakdown', Object.entries(pieceCategories).filter(([_, v]) => parseInt(v) > 0).map(([k, v]) => `${v}x ${k.toUpperCase()}`).join(', ') || 'None']
                      ] : [
                        ['Carat', formData.carat.toUpperCase()]
                      ]),
                      ['Total Weight', `${formData.totalWeight}g`],
                      ['Pieces', formData.pieces],
                      ['Images', `${Object.keys(taskImages).length} uploaded`],
                      ...(!isCollection ? [['Brought By', formData.broughtBy]] : [])
                    ] : []),
                    ...(workType === 'SHOULDERING' ? [
                      ['Total Weight', formData.totalWeight ? `${formData.totalWeight}g` : 'N/A'],
                      ['Pieces', formData.pieces],
                      ['Images', `${Object.keys(taskImages).length} uploaded`],
                      ...(!isCollection ? [
                        ['Points', formData.pointsUsed],
                        ['Brought By', formData.broughtBy]
                      ] : [
                        ['Suggestion', `${formData.pointSuggestion} Points`]
                      ])
                    ] : []),
                    ...(workType === 'BUY_SELL' ? [
                      ['Operation', formData.settlementCondition],
                      ['Metal', formData.metal],
                      ['Pure Weight', `${formData.pureWeight}g`],
                      ['Price per gram', `₹${formData.cashRate}/g`],
                      ['Total Amount', `₹${Number(formData.cashAmount || 0).toLocaleString('en-IN')}`]
                    ] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center py-1 border-b border-outline-variant/10 last:border-0">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline">{label}</span>
                      <span className="text-[13px] font-semibold text-primary">{value}</span>
                    </div>
                  ))}
                  {!isCollection && workType !== 'BUY_SELL' && (
                    <div className="pt-2 flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Total Fee ({formData.feePaymentMode})</p>
                      <p className="font-headline text-2xl font-bold text-tertiary">₹ {formData.fee}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="glass-effect rounded-2xl border border-outline-variant/20 p-4 flex items-start gap-3 premium-shadow">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>info</span>
                <p className="text-[12px] text-on-surface-variant font-medium leading-relaxed">Verify all details carefully. This is your first checkpoint before final authorization.</p>
              </div>
            </div>
          )}

          {/* ── STEP 4: Final Auth ── */}
          {step === 4 && (
            <div className="flex-grow overflow-y-auto hide-scrollbar px-6 py-8 space-y-5 animate-fade-in text-center">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border border-[#C9A646]/30 scale-110 animate-ping opacity-20"></div>
                <div className="w-24 h-24 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[44px] text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>verified_user</span>
                </div>
              </div>
              <div>
                <h3 className="font-headline text-[22px] font-bold text-primary">Authorize Entry</h3>
                <p className="text-[12px] text-on-surface-variant font-medium leading-relaxed px-4 mt-1.5">You are committing this work order to the institutional ledger. This action is permanent.</p>
              </div>
              <div className="luxury-card p-5 text-left border border-[#C9A646]/30">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-tertiary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>workspace_premium</span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary">Checkpoint 2 · Final</p>
                </div>
                <div className="flex justify-between items-center py-1"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline">Operation</span><span className="text-[13px] font-semibold text-primary">{workType === 'BUY_SELL' ? `${formData.settlementCondition} ${formData.metal}` : workType}</span></div>
                <div className="flex justify-between items-center py-1"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline">Client</span><span className="text-[13px] font-semibold text-primary">{formData.customerName}</span></div>
                {workType === 'BUY_SELL' ? (
                  <div className="pt-3 border-t border-[#C9A646]/20 flex justify-between items-center mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Total Cash {formData.settlementCondition === 'Buy' ? 'Paid' : 'Received'}</p>
                    <p className="font-headline text-[22px] font-bold text-emerald-600">
                      ₹ {(() => {
                        const calcPure = getActualPureWeight(formData.impureWeight, formData.purity);
                        const activePure = formData.pureWeight.trim() || calcPure;
                        const rateNum = parseFloat(formData.cashRate) || 0;
                        const calcTotal = parseFloat(activePure) && rateNum ? (parseFloat(activePure) * rateNum).toFixed(2) : '0';
                        const totalStr = formData.cashAmount.trim() || calcTotal;
                        return parseFloat(totalStr) ? parseFloat(totalStr).toLocaleString('en-IN') : '0.00';
                      })()}
                    </p>
                  </div>
                ) : !isCollection && (
                  <div className="pt-3 border-t border-[#C9A646]/20 flex justify-between items-center mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Authorized Fee ({formData.feePaymentMode})</p>
                    <p className="font-headline text-[22px] font-bold text-tertiary">₹ {formData.fee}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {step > 1 && (
          <div className="shrink-0 px-6 pb-8 pt-4 bg-white/90 backdrop-blur-sm border-t border-outline-variant/10">
            <button onClick={step === 4 ? handleFinalSubmit : handleNext} disabled={isUploading}
              className="w-full h-14 button-gradient text-on-primary rounded-full font-bold text-[12px] tracking-[0.15em] uppercase flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all btn-shimmer-effect shadow-[0_8px_24px_rgba(0,30,64,0.2)] disabled:opacity-70">
              {step === 2 ? 'Continue to Review' : step === 3 ? 'Proceed to Authorization' : (isUploading ? 'Uploading & Saving...' : 'Confirm & Commit Entry')}
              {isUploading ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-[18px]">{step === 4 ? 'verified' : 'arrow_forward'}</span>}
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        @keyframes laserSweep {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .laser-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: #0088ff;
          box-shadow: 0 0 8px #0088ff, 0 0 15px #0088ff;
          animation: laserSweep 2s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes pingOnce {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-ping-once {
          animation: pingOnce 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
