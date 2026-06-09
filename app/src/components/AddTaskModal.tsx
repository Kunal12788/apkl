import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { supabase } from '../supabaseClient';

type WorkType = 'TUNCH' | 'MARKING' | 'SHOULDERING';

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
    productType: 'Jewellery',
    logoName: '', carat: '22k', pieces: '',
    broughtBy: 'Customer', pointsUsed: '',
    pointSuggestion: 'Gold', totalWeight: ''
  });

  const [pieceCategories, setPieceCategories] = useState<Record<string, string>>({
    '22k': '', '18k': '', '14k': '', '9k': ''
  });
  
  const [taskImages, setTaskImages] = useState<Record<number, File>>({});
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
    }
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
    
    if (numPieces > 0 && (workType === 'TUNCH' || workType === 'MARKING')) {
      if (Object.keys(taskImages).length < numPieces) {
         e.images = `Please upload all ${numPieces} images.`;
      }
    }
    if (workType === 'SHOULDERING') {
      if (!isCollection) {
        if (!formData.pointsUsed.trim()) e.pointsUsed = 'Required';
        if (!formData.fee.trim()) e.fee = 'Required';
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
    let uploadedUrls: string[] = [];
    const uploadTasks: Promise<any>[] = [];
    
    try {
      const numPieces = parseInt(formData.pieces) || 0;
      for (let i = 0; i < numPieces; i++) {
        const file = taskImages[i];
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: { publicUrl } } = supabase.storage.from('task_images').getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
          
          uploadTasks.push(
            supabase.storage.from('task_images').upload(fileName, file).catch(err => {
              console.error("Background image upload failed:", err);
            })
          );
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

      // Fire and forget uploads
      Promise.all(uploadTasks);

      onSuccess({ 
        ...formData, 
        workType, 
        pieceCategories,
        images: uploadedUrls,
        id: isCollection ? `COL-${serialId}` : `TASK-${serialId}`, 
        date: 'Just Now', 
        status: 'In Progress', 
        progressPercentage: 10, 
        assignedTo: 'Staff' 
      });
      
      setStep(1); setWorkType(null); setErrors({}); setTaskImages({});
      setFormData({ metal: 'Gold', customerName: '', address: '', phone: '', customerId: '', impureWeight: '', purity: '', pureWeight: '', settlementCondition: 'Only Tunch', fee: '', feeStatus: 'Paid', productType: 'Jewellery', logoName: '', carat: '22k', pieces: '', broughtBy: 'Customer', pointsUsed: '', pointSuggestion: 'Gold', totalWeight: '' });
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTaskImages(prev => ({ ...prev, [index]: file }));
      if (errors['images']) {
         setErrors(e => { const n = {...e}; delete n['images']; return n; });
      }
    }
  };

  const renderImageUploads = () => {
    const numPieces = parseInt(formData.pieces) || 0;
    if (numPieces <= 0) return null;
    
    return (
      <div className="mt-4 bg-surface-container/30 p-4 rounded-2xl border border-outline-variant/30">
        <label className={lbl}>Upload Images ({numPieces} needed) *</label>
        {errMsg('images')}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {Array.from({ length: numPieces }).map((_, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl border-2 border-dashed border-outline-variant/40 bg-white overflow-hidden flex flex-col items-center justify-center hover:border-primary/40 transition-colors">
              {taskImages[idx] ? (
                <>
                  <img src={URL.createObjectURL(taskImages[idx])} alt={`Piece ${idx + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setTaskImages(p => { const n={...p}; delete n[idx]; return n; })} className="absolute top-1.5 right-1.5 w-7 h-7 bg-error/90 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-md">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </>
              ) : (
                <>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageChange(idx, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <span className="material-symbols-outlined text-outline-variant text-3xl mb-1.5">add_a_photo</span>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Piece {idx + 1}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };



  const inp = (err?: string) => `w-full h-12 bg-white border ${err ? 'border-error' : 'border-outline-variant/40'} rounded-DEFAULT px-4 text-sm text-primary font-medium placeholder-outline/40 focus:outline-none focus:border-secondary transition-colors`;
  const lbl = "text-[10px] font-bold uppercase tracking-[0.14em] text-outline mb-1 block";
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
                {([
                  { type: 'TUNCH' as WorkType, icon: 'science', title: 'Tunch', desc: 'Purity testing & gold exchange', accent: 'border-l-secondary', iconBg: 'bg-secondary/10 text-secondary' },
                  { type: 'MARKING' as WorkType, icon: 'verified', title: 'Marking', desc: 'Logo hallmarking & branding', accent: 'border-l-tertiary-container', iconBg: 'bg-tertiary-container/20 text-tertiary' },
                  { type: 'SHOULDERING' as WorkType, icon: 'precision_manufacturing', title: 'Shouldering', desc: 'Precision soldering work', accent: 'border-l-error', iconBg: 'bg-error/10 text-error' },
                ]).map(({ type, icon, title, desc, accent, iconBg }) => (
                  <button key={type} onClick={() => { setWorkType(type); setStep(2); }}
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
                  <div className={isCollection ? "grid grid-cols-1" : "grid grid-cols-2 gap-3"}>
                    <div>
                      <label className={lbl}>Impure Wt. (g) *</label>
                      <input className={inp(errors.impureWeight)} placeholder="e.g. 12.45" value={formData.impureWeight} onChange={e => up('impureWeight', e.target.value)} />
                      {errMsg('impureWeight')}
                    </div>
                    {!isCollection && (
                      <div>
                        <label className={lbl}>Purity (%) *</label>
                        <input className={inp(errors.purity)} placeholder="e.g. 91.6" value={formData.purity} onChange={e => up('purity', e.target.value)} />
                        {errMsg('purity')}
                      </div>
                    )}
                  </div>
                  {!isCollection && (
                    <div>
                      <label className={lbl + " !text-tertiary"}>Pure Weight (g) *</label>
                      <input className={`${inp(errors.pureWeight)} !border-tertiary/40 !bg-tertiary-fixed/10`} placeholder="Calculated pure output" value={formData.pureWeight} onChange={e => up('pureWeight', e.target.value)} />
                      {errMsg('pureWeight')}
                    </div>
                  )}
                  <div className="mt-3">
                    <label className={lbl}>No. of Pieces *</label>
                    <input className={inp(errors.pieces)} placeholder="Qty" value={formData.pieces} onChange={e => up('pieces', e.target.value)} />
                    {errMsg('pieces')}
                  </div>
                </SectionCard>

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
                  <div>
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
                  <div className={isCollection ? "grid grid-cols-1 mt-3" : "grid grid-cols-2 gap-3 mt-3"}>
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
                  {parseInt(formData.pieces) > 1 && (
                    <div className="mt-3 bg-surface-container/50 p-4 rounded-xl border border-outline-variant/30">
                      <label className={lbl}>Category Breakdown (Must sum to {formData.pieces})</label>
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {['22k', '18k', '14k', '9k'].map(k => (
                          <div key={k}>
                            <label className="text-[10px] font-bold text-outline uppercase block text-center mb-1.5">{k}</label>
                            <input 
                              type="number" min="0"
                              className="w-full h-10 bg-white border border-outline-variant/40 rounded-lg text-center text-sm font-bold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                              value={pieceCategories[k]}
                              onChange={e => setPieceCategories(p => ({...p, [k]: e.target.value}))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                  </SectionCard>
                )}
              </>)}

              {workType === 'SHOULDERING' && (<>
                <SectionCard title="Shouldering Details" icon="precision_manufacturing" color="bg-error/5 text-error">
                  {!isCollection ? (
                    <>
                      <div>
                        <label className={lbl}>Points Used *</label>
                        <input className={inp(errors.pointsUsed)} placeholder="Total solder points" value={formData.pointsUsed} onChange={e => up('pointsUsed', e.target.value)} />
                        {errMsg('pointsUsed')}
                      </div>
                      <div>
                        <label className={lbl}>Material Brought By</label>
                        <ToggleBtn options={['Customer', 'Staff']} value={formData.broughtBy === 'Staff Member' ? 'Staff' : formData.broughtBy} onChange={v => up('broughtBy', v === 'Staff' ? 'Staff Member' : v)} />
                      </div>
                    </>
                  ) : (
                    <div>
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
                  </SectionCard>
                )}
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
                      ['Carat', formData.carat.toUpperCase()],
                      ['Total Weight', `${formData.totalWeight}g`],
                      ['Pieces', formData.pieces],
                      ['Images', `${Object.keys(taskImages).length} uploaded`],
                      ...(!isCollection ? [['Brought By', formData.broughtBy]] : [])
                    ] : []),
                    ...(workType === 'SHOULDERING' ? [
                      ...(!isCollection ? [
                        ['Points', formData.pointsUsed],
                        ['Brought By', formData.broughtBy]
                      ] : [
                        ['Suggestion', `${formData.pointSuggestion} Points`]
                      ])
                    ] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center py-1 border-b border-outline-variant/10 last:border-0">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline">{label}</span>
                      <span className="text-[13px] font-semibold text-primary">{value}</span>
                    </div>
                  ))}
                  {!isCollection && (
                    <div className="pt-2 flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Total Fee</p>
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
                <div className="flex justify-between items-center py-1"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline">Operation</span><span className="text-[13px] font-semibold text-primary">{workType}</span></div>
                <div className="flex justify-between items-center py-1"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline">Client</span><span className="text-[13px] font-semibold text-primary">{formData.customerName}</span></div>
                {!isCollection && (
                  <div className="pt-3 border-t border-[#C9A646]/20 flex justify-between items-center mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Authorized Fee</p>
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
      <style>{`@keyframes modalUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};
