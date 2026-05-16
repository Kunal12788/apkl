import React, { useState } from 'react';

type WorkType = 'TUNCH' | 'MARKING' | 'SHOULDERING';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (taskData: any) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Type Select, 2: Form, 3: Summary/Confirm 1, 4: Confirm 2
  const [workType, setWorkType] = useState<WorkType | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    address: '',
    phone: '',
    impureWeight: '',
    purity: '',
    pureWeight: '',
    settlementCondition: 'Only Tunch',
    fee: '',
    logoName: '',
    carat: '22k',
    pieces: '',
    broughtBy: 'Customer',
    pointsUsed: ''
  });

  if (!isOpen) return null;

  const handleNext = () => setStep(step + 1);
  const handleBack = () => {
    if (step === 1) onClose();
    else setStep(step - 1);
  };

  const selectType = (type: WorkType) => {
    setWorkType(type);
    setStep(2);
  };

  const reset = () => {
    setStep(1);
    setWorkType(null);
    setFormData({
      customerName: '', address: '', phone: '', impureWeight: '', purity: '', pureWeight: '',
      settlementCondition: 'Only Tunch', fee: '', logoName: '', carat: '22k', pieces: '',
      broughtBy: 'Customer', pointsUsed: ''
    });
  };

  const handleFinalSubmit = () => {
    onSuccess({ 
      ...formData, 
      workType, 
      id: `TASK-${Math.floor(1000 + Math.random() * 9000)}`, 
      date: 'Just Now',
      status: 'In Progress',
      progressPercentage: 10,
      assignedTo: 'Marcus' // Default assignment
    });
    reset();
    onClose();
  };

  const inputClass = "w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl py-4 px-5 text-sm font-bold text-[#003366] placeholder-[#94A3B8] focus:outline-none focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/5 transition-all shadow-inner";
  const labelClass = "text-[9px] font-black uppercase tracking-[0.25em] text-[#94A3B8] mb-2 block px-2";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 transition-all duration-500 overflow-hidden">
      {/* Premium Backdrop with Sapphire Leak */}
      <div className="absolute inset-0 bg-[#001e40]/60 backdrop-blur-xl animate-fade-in" onClick={onClose}>
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#007BFF]/20 blur-[120px] rounded-full animate-pulse"></div>
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#003366]/30 blur-[120px] rounded-full animate-pulse delay-700"></div>
      </div>
      
      {/* Modal Content - Enhanced Glassmorphism */}
      <div className="relative w-full max-w-lg bg-white/95 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-[0_32px_120px_rgba(0,30,64,0.4)] animate-slide-up flex flex-col max-h-[92dvh] border-t border-white/20">
        
        {/* Header - Institutional Design */}
        <div className="bg-white px-10 pt-10 pb-6 border-b border-[#F1F5F9] shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#003366] via-[#007BFF] to-[#003366]"></div>
          <div className="flex justify-between items-center mb-6">
            <button onClick={handleBack} className="w-11 h-11 rounded-2xl border border-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#003366] hover:bg-[#F8FAFC] transition-all active:scale-90">
              <span className="material-symbols-outlined text-xl">{step === 1 ? 'keyboard_arrow_down' : 'arrow_back'}</span>
            </button>
            <div className="text-center">
              <h2 className="font-headline text-[15px] font-black text-[#003366] tracking-[0.05em] uppercase">
                {step === 1 ? 'New Operation' : step === 2 ? `${workType} PROTOCOL` : step === 3 ? 'AUDIT VERIFICATION' : 'FINAL COMMIT'}
              </h2>
              <div className="flex justify-center gap-1.5 mt-2">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ease-out ${step >= s ? 'w-6 bg-[#003366]' : 'w-2 bg-[#E2E8F0]'}`}></div>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-[#F8FAFC] flex items-center justify-center text-[#64748B] hover:text-error transition-colors">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Content Area - Premium Spacing */}
        <div className="flex-grow overflow-y-auto hide-scrollbar p-10 bg-white">
          
          {/* STEP 1: Premium Type Selection */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center mb-8">
                <p className="text-[13px] font-medium text-[#64748B] leading-relaxed">Initialize a new secure audit by selecting the specific operational workflow below.</p>
              </div>
              
              <button onClick={() => selectType('TUNCH')} className="w-full luxury-card p-7 flex items-center justify-between group bg-[#F8FAFC] border-none hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white text-[#003366] flex items-center justify-center shadow-sm group-hover:bg-[#003366] group-hover:text-white transition-all duration-500 group-hover:rotate-6">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>science</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-headline text-[17px] font-black text-[#003366] tracking-tight">TUNCH AUDIT</h3>
                    <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-[0.2em] mt-1">Purity & Valuation</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center border border-[#E2E8F0] group-hover:border-[#003366] transition-all">
                  <span className="material-symbols-outlined text-sm text-[#E2E8F0] group-hover:text-[#003366]">arrow_forward_ios</span>
                </div>
              </button>

              <button onClick={() => selectType('MARKING')} className="w-full luxury-card p-7 flex items-center justify-between group bg-[#F8FAFC] border-none hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white text-[#10B981] flex items-center justify-center shadow-sm group-hover:bg-[#10B981] group-hover:text-white transition-all duration-500 group-hover:-rotate-6">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-headline text-[17px] font-black text-[#003366] tracking-tight">MARKING LOGO</h3>
                    <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-[0.2em] mt-1">Hallmark Protocol</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center border border-[#E2E8F0] group-hover:border-[#10B981] transition-all">
                  <span className="material-symbols-outlined text-sm text-[#E2E8F0] group-hover:text-[#10B981]">arrow_forward_ios</span>
                </div>
              </button>

              <button onClick={() => selectType('SHOULDERING')} className="w-full luxury-card p-7 flex items-center justify-between group bg-[#F8FAFC] border-none hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white text-[#EF4444] flex items-center justify-center shadow-sm group-hover:bg-[#EF4444] group-hover:text-white transition-all duration-500 group-hover:scale-110">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>precision_manufacturing</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-headline text-[17px] font-black text-[#003366] tracking-tight">SHOULDERING</h3>
                    <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-[0.2em] mt-1">Soldering Precision</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center border border-[#E2E8F0] group-hover:border-[#EF4444] transition-all">
                  <span className="material-symbols-outlined text-sm text-[#E2E8F0] group-hover:text-[#EF4444]">arrow_forward_ios</span>
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: Refined Data Entry Forms */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              {workType === 'TUNCH' && (
                <div className="space-y-6">
                  <div className="bg-[#F1F5F9]/50 p-6 rounded-[2rem] border border-[#F1F5F9] space-y-4">
                    <label className={labelClass}>Client Information</label>
                    <input className={inputClass} placeholder="Client Full Name" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                    <input className={inputClass} placeholder="Audit Site Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    <input className={inputClass} placeholder="Contact Vector (Phone)" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  
                  <div className="space-y-4">
                    <label className={labelClass}>Gold Audit Parameters</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                         <input className={inputClass} placeholder="Impure (g)" value={formData.impureWeight} onChange={e => setFormData({...formData, impureWeight: e.target.value})} />
                         <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#94A3B8] tracking-widest">GRAMS</span>
                      </div>
                      <div className="relative">
                         <input className={inputClass} placeholder="Purity (%)" value={formData.purity} onChange={e => setFormData({...formData, purity: e.target.value})} />
                         <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#94A3B8] tracking-widest">PERCENT</span>
                      </div>
                    </div>
                    <div className="relative">
                      <input className={inputClass} placeholder="Calculated Pure Weight (g)" value={formData.pureWeight} onChange={e => setFormData({...formData, pureWeight: e.target.value})} />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#003366] tracking-widest">NET PURE</span>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Operational Protocol</label>
                    <div className="grid grid-cols-1 gap-3">
                      {['Only Tunch', 'Cash (Impure/Pure at Front)', 'Cash (Gold at Back)'].map(cond => (
                        <button 
                          key={cond}
                          onClick={() => setFormData({...formData, settlementCondition: cond})}
                          className={`w-full py-4.5 px-6 rounded-2xl text-[11px] font-black tracking-widest transition-all duration-300 border ${formData.settlementCondition === cond ? 'bg-[#003366] border-[#003366] text-white shadow-[0_10px_20px_rgba(0,51,102,0.2)]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-white hover:border-[#CBD5E1]'}`}
                        >
                          {cond.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <label className={labelClass}>Strategic Fee (INR)</label>
                    <input className={`${inputClass} !text-[#10B981] !text-lg !py-5`} placeholder="0.00" value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
                    <span className="absolute left-5 top-[52px] text-lg font-black text-[#10B981]">₹</span>
                  </div>
                </div>
              )}

              {workType === 'MARKING' && (
                <div className="space-y-6">
                   <div className="space-y-4">
                    <label className={labelClass}>Branding Details</label>
                    <input className={inputClass} placeholder="Client Entity Name" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                    <input className={inputClass} placeholder="Institutional Logo (e.g. RCJ)" value={formData.logoName} onChange={e => setFormData({...formData, logoName: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className={labelClass}>Carat Specification</label>
                    <div className="grid grid-cols-4 gap-3">
                      {['22k', '18k', '14k', '9k'].map(k => (
                        <button 
                          key={k}
                          onClick={() => setFormData({...formData, carat: k})}
                          className={`py-4 rounded-2xl text-[12px] font-black tracking-widest transition-all border ${formData.carat === k ? 'bg-[#10B981] border-[#10B981] text-white shadow-lg' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'}`}
                        >
                          {k.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className={labelClass}>Total Units</label>
                       <input className={inputClass} placeholder="Pieces" value={formData.pieces} onChange={e => setFormData({...formData, pieces: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className={labelClass}>Handling Fee</label>
                       <input className={inputClass} placeholder="₹ 0.00" value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Custody Vector</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['Customer', 'Staff Member'].map(b => (
                        <button 
                          key={b}
                          onClick={() => setFormData({...formData, broughtBy: b})}
                          className={`py-4.5 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${formData.broughtBy === b ? 'bg-[#003366] border-[#003366] text-white shadow-xl' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'}`}
                        >
                          {b.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {workType === 'SHOULDERING' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className={labelClass}>Precision Task Parameters</label>
                    <input className={inputClass} placeholder="Customer Identification" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                    <input className={inputClass} placeholder="Total Solder Points" value={formData.pointsUsed} onChange={e => setFormData({...formData, pointsUsed: e.target.value})} />
                  </div>

                  <div>
                    <label className={labelClass}>Custody Verification</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['Customer', 'Staff Member'].map(b => (
                        <button 
                          key={b}
                          onClick={() => setFormData({...formData, broughtBy: b})}
                          className={`py-4.5 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${formData.broughtBy === b ? 'bg-[#003366] border-[#003366] text-white shadow-xl' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'}`}
                        >
                          {b.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <label className={labelClass}>Precision Service Fee</label>
                    <input className={`${inputClass} !text-[#EF4444] !text-lg !py-5`} placeholder="0.00" value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
                    <span className="absolute left-5 top-[52px] text-lg font-black text-[#EF4444]">₹</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Premium Review/Audit Certificate */}
          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-[#F0F7FF] text-[#003366] flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/50 relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div>
                   <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: '"FILL" 1' }}>description</span>
                </div>
                <h3 className="font-headline text-3xl font-black text-[#003366] tracking-tight">Audit Review</h3>
                <p className="text-[13px] font-medium text-[#64748B] mt-2">Stage 1: Verify all operational vectors for permanent ledger entry.</p>
              </div>
              
              <div className="bg-white rounded-[2.5rem] p-8 border border-[#E2E8F0] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <span className="material-symbols-outlined text-[80px]">verified</span>
                </div>
                
                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between items-end border-b border-[#F1F5F9] pb-4">
                    <div>
                      <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-1">Audit Protocol</p>
                      <p className="text-base font-black text-[#003366]">{workType} WORK</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-1">Status</p>
                      <p className="text-[10px] font-black text-secondary px-3 py-1 bg-secondary/10 rounded-full">DRAFT</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Strategic Partner</span>
                      <span className="text-sm font-bold text-[#003366]">{formData.customerName}</span>
                    </div>
                    
                    {workType === 'TUNCH' && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Net Pure Weight</span>
                          <span className="text-sm font-black text-primary">{formData.pureWeight}g</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Settlement Vector</span>
                          <span className="text-[11px] font-bold text-[#007BFF] bg-[#F0F7FF] px-3 py-1 rounded-lg">{formData.settlementCondition}</span>
                        </div>
                      </>
                    )}

                    <div className="pt-4 border-t border-[#F1F5F9] flex justify-between items-center">
                      <span className="text-[10px] font-black text-[#003366] uppercase tracking-[0.3em]">Institutional Fee</span>
                      <span className="text-2xl font-black text-[#10B981]">₹ {formData.fee}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Final Secure Authorization */}
          {step === 4 && (
            <div className="space-y-10 animate-fade-in text-center py-6">
              <div className="relative mx-auto w-32 h-32 mb-4">
                <div className="absolute inset-0 bg-[#FEF2F2] rounded-[2.5rem] animate-ping opacity-20"></div>
                <div className="relative w-32 h-32 rounded-[2.5rem] bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center border-4 border-white shadow-[0_20px_50px_rgba(239,68,68,0.3)]">
                  <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: '"FILL" 1' }}>security</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-headline text-4xl font-black text-[#003366] tracking-tight">Final Auth</h3>
                <p className="text-[11px] font-black text-[#EF4444] uppercase tracking-[0.4em] px-4 py-1.5 bg-[#FEF2F2] inline-block rounded-full">Secure Commit Required</p>
              </div>
              
              <p className="text-[15px] font-medium text-[#64748B] leading-relaxed px-6">By authorizing this commit, you are digitally signing this audit into the permanent Aurora Divine ledger. This operation cannot be reversed by staff members.</p>
              
              <div className="bg-[#F8FAFC] p-8 rounded-[2.5rem] border-2 border-dashed border-[#E2E8F0] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#E2E8F0]"></div>
                <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.3em] mb-4">Verification Layer 2</p>
                <div className="h-20 w-full bg-white rounded-2xl flex items-center justify-center border border-[#F1F5F9] shadow-inner">
                  <p className="text-[13px] font-black text-[#003366]/30 uppercase tracking-[0.1em]">Awaiting Digital Key...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions - Premium Button Design */}
        <div className="p-10 bg-white border-t border-[#F1F5F9] shrink-0">
          {step > 1 && (
            <button 
              onClick={step === 4 ? handleFinalSubmit : handleNext} 
              className={`w-full py-6 rounded-[2.2rem] font-black text-[12px] tracking-[0.3em] flex items-center justify-center gap-4 active:scale-[0.98] transition-all shadow-[0_20px_40px_-10px_rgba(0,51,102,0.3)] uppercase ${step === 4 ? 'bg-[#003366] text-white' : 'bg-[#007BFF] text-white'}`}
            >
              {step === 2 ? 'Initialize Review' : step === 3 ? 'Finalize Protocol' : 'Execute Secure Commit'}
              <span className="material-symbols-outlined text-xl">{step === 4 ? 'vpn_key' : 'chevron_right'}</span>
            </button>
          )}
          
          {step === 1 && (
            <div className="text-center space-y-3">
               <p className="text-[10px] text-[#94A3B8] font-black uppercase tracking-[0.3em]">Institutional Forge v2.4</p>
               <div className="flex justify-center gap-4 opacity-30">
                  <span className="material-symbols-outlined text-sm">enhanced_encryption</span>
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  <span className="material-symbols-outlined text-sm">shield</span>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
