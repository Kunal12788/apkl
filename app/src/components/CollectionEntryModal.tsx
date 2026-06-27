import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import { getCachedData, setCachedData } from '../cache';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  status: string;
}

interface CollectionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

const SectionCard = ({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) => (
  <div className="luxury-card overflow-hidden bg-white">
    <div className={`px-5 py-3 flex items-center gap-2.5 border-b border-outline-variant/10 ${color}`}>
      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
      <p className="text-[10px] font-black uppercase tracking-[0.15em]">{title}</p>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

export const CollectionEntryModal: React.FC<CollectionEntryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    metal: 'Gold',
    customerName: '',
    phone: '',
    address: '',
    logoName: '',
    category: '',
    pieces: '',
    weight: '',
    specifications: '',
    paymentMode: 'Tunch', // Settlement Condition: Tunch, Cash Front, Cash Back
    pointSuggestion: 'Gold', // Gold, Silver
    customerId: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  React.useEffect(() => {
    const fetchCustomers = async () => {
      if (!isOpen) return;

      let branchUserIds: string[] = [];
      const isSuperSa = user?.role === 'Super Admin';
      if (!isSuperSa) {
        const { data: uList } = await supabase
          .from('users')
          .select('id, role, branch_id');
        if (uList) {
          branchUserIds = uList
            .filter((u: any) => u.branch_id === user?.branch_id || u.role === 'Super Admin')
            .map((u: any) => u.id);
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
         alert('Please enter Name, Phone Number, and Address to request a new customer.');
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
         setFormData(prev => ({ ...prev, customerName: '', phone: '', address: '', customerId: '' }));
         onClose(); // Close the modal
         navigate('/dashboard'); // Take back to dashboard
      } catch (e) {
         console.error(e);
         alert('Failed to request customer.');
      }
  };

  if (!isOpen) return null;

  const up = (field: string, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!formData.customerName) err.customerName = 'Required';
    else {
      const match = customers.find(c => c.name.trim().toLowerCase() === formData.customerName.trim().toLowerCase());
      if (!match) err.customerName = 'Must select an approved customer';
    }
    if (!formData.category) err.category = 'Please select a job category';
    if (formData.category === 'TUNCH' && !formData.phone) err.phone = 'Required';
    if (formData.category === 'MARKING' && !formData.pieces) err.pieces = 'Required';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validate()) setStep(2);
  };

  const handleSubmit = async () => {
      let serialId = '0001';
      try {
        const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
        if (count !== null) {
          serialId = String(count + 1).padStart(4, '0');
        }
      } catch (e) {
        console.error('Failed to get task count for serial ID', e);
      }

      const newEntry = { 
        id: `COL-${serialId}`,
        customer_name: formData.customerName,
        customer_phone: formData.phone,
        customer_address: formData.address,
        customer_id: formData.customerId || 'CUST-COL',
        logo_name: formData.logoName,
        work_type: formData.category === 'TUNCH' ? 'Tunch' : formData.category === 'MARKING' ? 'Marking' : 'Shouldering',
        metal: formData.metal,
        pieces: formData.pieces,
        impure_weight: formData.weight,
        notes: formData.specifications || 'Collection intake from field.',
        settlement_condition: formData.paymentMode,
        point_suggestion: formData.pointSuggestion,
        status: 'In Progress',
        progress_percentage: 0,
        source: 'Collection Staff',
        created_by: user?.id || '',
        date_given: 'Just Now',
        iso_date: new Date().toISOString().split('T')[0],
        estimated_completion: 'Awaiting Audit',
        brought_by: 'Collection Staff',
        assigned_to: 'Pending',
        product_type: formData.category === 'TUNCH' ? 'Jewellery' : formData.category === 'MARKING' ? 'Coin Bar' : 'Sample',
      };
      
      try {
        await supabase.from('tasks').insert([newEntry]);
        const currentCache = getCachedData('tasks_data') || [];
        setCachedData('tasks_data', [newEntry, ...currentCache]);
        window.dispatchEvent(new CustomEvent('taskCreated', { detail: newEntry }));
      } catch(e) {
        console.error('Failed to insert task', e);
      }

     onSuccess(newEntry);
     setFormData({ metal: 'Gold', customerName: '', phone: '', address: '', logoName: '', category: '', pieces: '', weight: '', specifications: '', paymentMode: 'Tunch', pointSuggestion: 'Gold', customerId: '' });
     setStep(1);
  };

  const inp = (err?: string) => `w-full h-12 bg-white border ${err ? 'border-error' : 'border-outline-variant/40'} rounded-DEFAULT px-4 text-sm text-primary font-medium focus:outline-none focus:border-secondary transition-colors`;
  const lbl = "text-[10px] font-bold uppercase tracking-[0.14em] text-outline mb-1 block truncate";

  const isCustomerMatched = customers.some(c => c.name.trim().toLowerCase() === formData.customerName.trim().toLowerCase());
  const showApprovalButton = formData.customerName.length > 0 && !isCustomerMatched;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001e40]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md flex flex-col rounded-[2.5rem] overflow-hidden border border-white/30 shadow-[0_-20px_80px_rgba(0,30,64,0.4)] bg-background animate-modalUp"
        style={{ minHeight: '85svh', maxHeight: '92svh' }}>
        
        <div className="shrink-0 bg-gradient-to-br from-primary to-primary-container px-6 pt-8 pb-6 relative overflow-hidden">
           <div className="relative z-10 flex justify-between items-center">
              <div>
                 <p className="text-[10px] font-bold text-tertiary-fixed uppercase tracking-[0.3em] mb-1">Collection Entry</p>
                 <h2 className="text-2xl font-bold text-white tracking-tight">Initiate Intake</h2>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                 <span className="material-symbols-outlined">close</span>
              </button>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        </div>

        <div className="px-6 py-4 bg-white border-b border-outline-variant/10 flex items-center justify-center gap-2">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= s ? 'bg-primary text-white' : 'bg-surface-container text-outline'}`}>{s}</div>
                {s < 2 && <div className={`w-12 h-0.5 rounded-full ${step > s ? 'bg-primary' : 'bg-surface-container'}`}></div>}
              </div>
            ))}
        </div>

        <div className="flex-grow overflow-y-auto hide-scrollbar px-6 py-6 space-y-4">
           {step === 1 ? (
             <>
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

               <SectionCard title="Job Selection" icon="category" color="bg-primary/5 text-primary">
                  <div className="grid grid-cols-3 gap-2">
                     {['TUNCH', 'MARKING', 'SHOULDERING'].map(cat => (
                        <button key={cat} onClick={() => up('category', cat)}
                          className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${formData.category === cat ? 'bg-primary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30'}`}>
                          <span className="material-symbols-outlined text-lg">{cat === 'TUNCH' ? 'science' : cat === 'MARKING' ? 'verified' : 'precision_manufacturing'}</span>
                          <span className="text-[8px] font-bold uppercase tracking-widest">{cat}</span>
                        </button>
                     ))}
                  </div>
                  {errors.category && <p className="text-[10px] text-error mt-2 font-medium text-center">{errors.category}</p>}
               </SectionCard>

               <SectionCard title="Client Details" icon="person" color="bg-secondary/5 text-secondary">
                  <div className="relative">
                    <label className={lbl}>Client Name *</label>
                    <input 
                      className={inp(errors.customerName)} 
                      placeholder="Name of customer" 
                      value={formData.customerName} 
                      onChange={e => {
                        up('customerName', e.target.value);
                        up('customerId', '');
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                    />
                    {errors.customerName && <p className="text-[10px] text-error mt-1">{errors.customerName}</p>}
                    
                    {showDropdown && formData.customerName && (
                       <div className="absolute z-50 w-full mt-1 bg-white border border-outline-variant/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {customers.filter(c => c.name.trim().toLowerCase().includes(formData.customerName.trim().toLowerCase())).map(c => (
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
                                <p className="text-[10px] text-outline">
                                    {c.phone ? `${c.phone}` : ''}
                                    {c.phone && c.address ? ' • ' : ''}
                                    {c.address ? `${c.address}` : ''}
                                 </p>
                             </div>
                          ))}
                          {customers.filter(c => c.name.trim().toLowerCase().includes(formData.customerName.trim().toLowerCase())).length === 0 && (
                             <div className="px-4 py-3 text-center">
                                <p className="text-xs text-outline">Customer not found</p>
                             </div>
                          )}
                       </div>
                    )}
                  </div>
                  
                  {/* Show phone and address for all categories */}
                  <>
                    <div>
                      <label className={lbl}>Phone Number *</label>
                      <input className={inp(errors.phone)} placeholder="+91" value={formData.phone} onChange={e => up('phone', e.target.value)} />
                    </div>

                    {/* Request Approval Button right below the phone number */}
                    {showApprovalButton && (
                       <div className="mt-2 mb-2">
                          <button 
                            type="button"
                            onClick={handleRequestCustomer}
                            className="w-full h-12 bg-secondary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                            SEND APPROVAL
                          </button>
                          <p className="text-[9px] text-outline text-center mt-1">Submit client details to Super Admin for approval.</p>
                       </div>
                    )}

                    <div>
                      <label className={lbl}>Address *</label>
                      <input className={inp()} placeholder="Location details" value={formData.address} onChange={e => up('address', e.target.value)} />
                    </div>
                  </>

                  {formData.category === 'MARKING' && !showApprovalButton && (
                    <div>
                      <label className={lbl}>Entity Logo</label>
                      <input className={inp()} placeholder="Brand logo mark" value={formData.logoName} onChange={e => up('logoName', e.target.value)} />
                    </div>
                  )}
               </SectionCard>
             </>
           ) : (
             <>
               <SectionCard title="Work Specifications" icon="settings" color="bg-tertiary/5 text-tertiary">
                  {formData.category === 'TUNCH' && (
                    <div className="space-y-4">
                      <div>
                        <label className={lbl}>Product Specification</label>
                        <textarea className={`${inp()} h-20 py-3 resize-none`} placeholder="e.g. Chains, Rings, Gold Biscuits" value={formData.specifications} onChange={e => up('specifications', e.target.value)} />
                      </div>
                      <div>
                         <label className={lbl}>Impure Gold Weight (g) *</label>
                         <input type="number" step="0.001" className={inp()} placeholder="0.000" value={formData.weight} onChange={e => up('weight', e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Settlement Condition</label>
                        <div className="grid grid-cols-3 gap-2">
                           {[
                             { value: 'Tunch', label: 'Tunch' },
                             { value: 'Cash Front', label: 'Cash (Staff)' },
                             { value: 'Cash Back', label: 'Cash (Admin)' }
                           ].map(item => (
                             <button key={item.value} onClick={() => up('paymentMode', item.value)}
                               className={`py-2 rounded-lg text-[9px] font-bold uppercase border transition-all ${formData.paymentMode === item.value ? 'bg-secondary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30'}`}>
                               {item.label}
                             </button>
                           ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.category === 'MARKING' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className={lbl}>No. of Pieces *</label>
                            <input type="number" className={inp(errors.pieces)} placeholder="Qty" value={formData.pieces} onChange={e => up('pieces', e.target.value)} />
                         </div>
                         <div>
                            <label className={lbl}>Total Weight (g)</label>
                            <input type="number" step="0.01" className={inp()} placeholder="0.00" value={formData.weight} onChange={e => up('weight', e.target.value)} />
                         </div>
                      </div>
                      <div>
                        <label className={lbl}>Marking Specifications</label>
                        <textarea className={`${inp()} h-20 py-3 resize-none`} placeholder="HALLMARK details..." value={formData.specifications} onChange={e => up('specifications', e.target.value)} />
                      </div>
                    </div>
                  )}

                  {formData.category === 'SHOULDERING' && (
                    <div className="space-y-4">
                      <div>
                        <label className={lbl}>Point Suggestion</label>
                        <div className="flex gap-3">
                           {['Gold', 'Silver'].map(pt => (
                             <button key={pt} onClick={() => up('pointSuggestion', pt)}
                               className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.pointSuggestion === pt ? 'bg-primary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30'}`}>
                               <span className="material-symbols-outlined text-sm">{pt === 'Gold' ? 'stars' : 'toll'}</span>
                               <span className="text-[10px] font-bold uppercase tracking-widest">{pt} Points</span>
                             </button>
                           ))}
                        </div>
                      </div>
                      <div>
                         <label className={lbl}>Total Pieces</label>
                         <input type="number" className={inp()} placeholder="Qty" value={formData.pieces} onChange={e => up('pieces', e.target.value)} />
                      </div>
                    </div>
                  )}
               </SectionCard>
             </>
           )}
        </div>

        <div className="shrink-0 p-6 bg-white border-t border-outline-variant/10 flex gap-3">
           {step === 2 && (
             <button onClick={() => setStep(1)} className="flex-1 h-14 rounded-2xl border border-outline-variant/40 text-outline font-bold flex items-center justify-center gap-2">
                BACK
             </button>
           )}
           <button 
             onClick={step === 1 ? handleNext : handleSubmit}
             className="flex-[2] h-14 button-gradient text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg"
           >
             {step === 1 ? 'SPECIFICATIONS' : 'INITIATE TASK'}
             <span className="material-symbols-outlined text-sm">{step === 1 ? 'arrow_forward' : 'bolt'}</span>
           </button>
        </div>
      </div>
    </div>
  );
};
