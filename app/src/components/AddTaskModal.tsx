import React, { useState } from 'react';

type WorkType = 'TUNCH' | 'MARKING' | 'SHOULDERING';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (taskData: any) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
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
      assignedTo: 'Marcus'
    });
    reset();
    onClose();
  };

  const inputClass = "w-full bg-white/40 border border-white/50 rounded-3xl py-5 px-6 text-base font-bold text-[#003366] placeholder-[#003366]/30 focus:outline-none focus:border-[#C9A646] focus:ring-4 focus:ring-[#C9A646]/10 transition-all shadow-inner backdrop-blur-md";
  const labelClass = "text-[10px] font-black uppercase tracking-[0.3em] text-[#003366]/50 mb-3 block px-3";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 transition-all duration-700 overflow-hidden font-body">
      {/* Institutional Backdrop */}
      <div className="absolute inset-0 bg-[#001e40]/70 backdrop-blur-2xl animate-fade-in" onClick={onClose}>
         <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
            <div className="absolute top-[10%] left-[-10%] w-[600px] h-[600px] bg-[#C9A646]/10 blur-[150px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-[#007BFF]/10 blur-[150px] rounded-full animate-pulse delay-1000"></div>
         </div>
      </div>
      
      {/* Main Container - Luxury Card Design */}
      <div className="relative w-full max-w-xl bg-white/95 rounded-t-[4rem] sm:rounded-[4rem] overflow-hidden shadow-[0_40px_100px_rgba(0,30,64,0.5)] animate-slide-up flex flex-col max-h-[94dvh] border-t border-white/40">
        
        {/* Progress Bar / Header */}
        <div className="bg-white/50 backdrop-blur-md px-12 pt-12 pb-6 border-b border-[#F1F5F9] shrink-0 relative">
          <div className="flex justify-between items-center mb-8">
            <button onClick={handleBack} className="w-14 h-14 rounded-3xl bg-white border border-[#F1F5F9] flex items-center justify-center text-[#003366] hover:text-[#C9A646] hover:shadow-xl transition-all active:scale-90">
              <span className="material-symbols-outlined text-2xl">{step === 1 ? 'keyboard_arrow_down' : 'arrow_back'}</span>
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black tracking-[0.4em] text-[#003366]/40 uppercase mb-1">Vault Registry</p>
              <h2 className="font-headline text-[18px] font-black text-[#003366] tracking-tight">
                {step === 1 ? 'NEW OPERATION' : step === 2 ? `${workType} PROTOCOL` : step === 3 ? 'AUDIT VERIFICATION' : 'FINAL AUTHORIZATION'}
              </h2>
            </div>
            <button onClick={onClose} className="w-14 h-14 rounded-3xl bg-[#F8FAFC] flex items-center justify-center text-[#64748B] hover:text-[#EF4444] transition-all hover:bg-red-50">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          {/* Luxury Stepper */}
          <div className="flex justify-between px-4 relative">
             <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#E2E8F0] -translate-y-1/2 z-0"></div>
             <div className="absolute top-1/2 left-0 h-[2px] bg-[#C9A646] -translate-y-1/2 z-0 transition-all duration-700 ease-out" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
             {[1, 2, 3, 4].map(s => (
               <div key={s} className={`w-3 h-3 rounded-full relative z-10 transition-all duration-500 border-4 ${step >= s ? 'bg-[#C9A646] border-white scale-125 shadow-[0_0_15px_rgba(201,166,70,0.4)]' : 'bg-[#E2E8F0] border-white'}`}></div>
             ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto hide-scrollbar p-12 bg-gradient-to-b from-white to-[#F8FAFC]">
          
          {/* STEP 1: Operation Selection - Redesigned to look like Premium Asset Cards */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-10">
                <p className="text-[14px] font-medium text-[#64748B] leading-relaxed max-w-[280px] mx-auto">Initialize a secure work order by selecting the institutional protocol below.</p>
              </div>
              
              <button onClick={() => selectType('TUNCH')} className="w-full relative group luxury-card p-8 flex items-center gap-8 bg-white border-none hover:shadow-[0_20px_60px_rgba(0,51,102,0.1)] transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-20 h-20 rounded-[2rem] bg-[#F0F7FF] text-[#003366] flex items-center justify-center shadow-inner group-hover:bg-[#003366] group-hover:text-white transition-all duration-500 transform group-hover:rotate-12">
                  <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: '"FILL" 1' }}>science</span>
                </div>
                <div className="text-left flex-grow">
                  <h3 className="font-headline text-[20px] font-black text-[#003366] tracking-tight">TUNCH AUDIT</h3>
                  <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-[0.25em] mt-2">Purity Verification</p>
                </div>
                <span className="material-symbols-outlined text-[#E2E8F0] group-hover:text-[#003366] group-hover:translate-x-2 transition-all">chevron_right</span>
              </button>

              <button onClick={() => selectType('MARKING')} className="w-full relative group luxury-card p-8 flex items-center gap-8 bg-white border-none hover:shadow-[0_20px_60px_rgba(0,51,102,0.1)] transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-20 h-20 rounded-[2rem] bg-[#F0FDF4] text-[#10B981] flex items-center justify-center shadow-inner group-hover:bg-[#10B981] group-hover:text-white transition-all duration-500 transform group-hover:-rotate-12">
                  <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                </div>
                <div className="text-left flex-grow">
                  <h3 className="font-headline text-[20px] font-black text-[#003366] tracking-tight">MARKING LOGO</h3>
                  <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-[0.25em] mt-2">Institutional Hallmark</p>
                </div>
                <span className="material-symbols-outlined text-[#E2E8F0] group-hover:text-[#10B981] group-hover:translate-x-2 transition-all">chevron_right</span>
              </button>

              <button onClick={() => selectType('SHOULDERING')} className="w-full relative group luxury-card p-8 flex items-center gap-8 bg-white border-none hover:shadow-[0_20px_60px_rgba(0,51,102,0.1)] transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#EF4444]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-20 h-20 rounded-[2rem] bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shadow-inner group-hover:bg-[#EF4444] group-hover:text-white transition-all duration-500 transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: '"FILL" 1' }}>precision_manufacturing</span>
                </div>
                <div className="text-left flex-grow">
                  <h3 className="font-headline text-[20px] font-black text-[#003366] tracking-tight">SHOULDERING</h3>
                  <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-[0.25em] mt-2">Precision Soldering</p>
                </div>
                <span className="material-symbols-outlined text-[#E2E8F0] group-hover:text-[#EF4444] group-hover:translate-x-2 transition-all">chevron_right</span>
              </button>
            </div>
          )}

          {/* STEP 2: Data Capture - Floating Group Design */}
          {step === 2 && (
            <div className="space-y-10 animate-fade-in pb-10">
              {workType === 'TUNCH' && (
                <div className="space-y-8">
                  <section className="bg-white p-8 rounded-[3rem] shadow-xl shadow-[#003366]/5 space-y-6 border border-[#F1F5F9]">
                    <label className={labelClass}>CLIENT CUSTODY</label>
                    <input className={inputClass} placeholder="Enter Client Identity" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                    <input className={inputClass} placeholder="Site Allocation Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    <input className={inputClass} placeholder="Secure Contact Vector" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </section>
                  
                  <section className="space-y-6">
                    <label className={labelClass}>METALLURGY PARAMETERS</label>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="relative group">
                         <input className={inputClass} placeholder="Impure Weight" value={formData.impureWeight} onChange={e => setFormData({...formData, impureWeight: e.target.value})} />
                         <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-[#94A3B8] tracking-widest uppercase opacity-40 group-focus-within:opacity-100 transition-opacity">grams</span>
                      </div>
                      <div className="relative group">
                         <input className={inputClass} placeholder="Purity Vector" value={formData.purity} onChange={e => setFormData({...formData, purity: e.target.value})} />
                         <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-[#94A3B8] tracking-widest uppercase opacity-40 group-focus-within:opacity-100 transition-opacity">percent</span>
                      </div>
                    </div>
                    <div className="relative group">
                      <input className={`${inputClass} !text-[#C9A646] !border-[#C9A646]/30 !bg-[#C9A646]/5`} placeholder="Calculated Net Pure" value={formData.pureWeight} onChange={e => setFormData({...formData, pureWeight: e.target.value})} />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#C9A646] tracking-widest uppercase">pure gold net</span>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <label className={labelClass}>SETTLEMENT PROTOCOL</label>
                    <div className="grid grid-cols-1 gap-3">
                      {['Only Tunch', 'Cash (Impure/Pure at Front)', 'Cash (Gold at Back)'].map(cond => (
                        <button 
                          key={cond}
                          onClick={() => setFormData({...formData, settlementCondition: cond})}
                          className={`w-full py-5 px-8 rounded-3xl text-[12px] font-black tracking-widest transition-all duration-500 border ${formData.settlementCondition === cond ? 'bg-[#003366] border-[#003366] text-white shadow-[0_20px_40px_rgba(0,51,102,0.3)] scale-[1.02]' : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-white hover:border-[#CBD5E1]'}`}
                        >
                          {cond.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </section>

                  <div className="relative">
                    <label className={labelClass}>STRATEGIC SERVICE FEE</label>
                    <input className={`${inputClass} !text-[#10B981] !text-2xl !py-7 !pl-12`} placeholder="0.00" value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
                    <span className="absolute left-7 top-[62px] text-2xl font-black text-[#10B981]">₹</span>
                  </div>
                </div>
              )}

              {workType === 'MARKING' && (
                <div className="space-y-8">
                   <section className="bg-white p-8 rounded-[3rem] shadow-xl shadow-[#003366]/5 space-y-6 border border-[#F1F5F9]">
                    <label className={labelClass}>HALLMARK REGISTRY</label>
                    <input className={inputClass} placeholder="Customer Identification" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                    <input className={inputClass} placeholder="Institutional Logo (e.g. RCJ)" value={formData.logoName} onChange={e => setFormData({...formData, logoName: e.target.value})} />
                  </section>
                  
                  <section className="space-y-6">
                    <label className={labelClass}>ASSET PURITY SPEC</label>
                    <div className="grid grid-cols-4 gap-4">
                      {['22k', '18k', '14k', '9k'].map(k => (
                        <button 
                          key={k}
                          onClick={() => setFormData({...formData, carat: k})}
                          className={`py-5 rounded-[1.5rem] text-[13px] font-black tracking-widest transition-all duration-500 border ${formData.carat === k ? 'bg-[#10B981] border-[#10B981] text-white shadow-lg scale-110' : 'bg-white border-[#E2E8F0] text-[#64748B]'}`}
                        >
                          {k.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </section>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                       <label className={labelClass}>UNIT VOLUME</label>
                       <input className={inputClass} placeholder="Pieces" value={formData.pieces} onChange={e => setFormData({...formData, pieces: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className={labelClass}>SERVICE FEE</label>
                       <input className={inputClass} placeholder="₹ 0.00" value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>ASSET CUSTODY ORIGIN</label>
                    <div className="grid grid-cols-2 gap-5">
                      {['Customer', 'Staff Member'].map(b => (
                        <button 
                          key={b}
                          onClick={() => setFormData({...formData, broughtBy: b})}
                          className={`py-5 rounded-3xl text-[11px] font-black tracking-widest transition-all duration-500 border ${formData.broughtBy === b ? 'bg-[#003366] border-[#003366] text-white shadow-[0_15px_30px_rgba(0,51,102,0.2)]' : 'bg-white border-[#E2E8F0] text-[#64748B]'}`}
                        >
                          {b.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {workType === 'SHOULDERING' && (
                <div className="space-y-8">
                  <section className="bg-white p-8 rounded-[3rem] shadow-xl shadow-[#003366]/5 space-y-6 border border-[#F1F5F9]">
                    <label className={labelClass}>PRECISION LOGISTICS</label>
                    <input className={inputClass} placeholder="Customer Entity" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                    <input className={inputClass} placeholder="Total Solder Vectors" value={formData.pointsUsed} onChange={e => setFormData({...formData, pointsUsed: e.target.value})} />
                  </section>

                  <div>
                    <label className={labelClass}>MATERIAL SOURCE</label>
                    <div className="grid grid-cols-2 gap-5">
                      {['Customer', 'Staff Member'].map(b => (
                        <button 
                          key={b}
                          onClick={() => setFormData({...formData, broughtBy: b})}
                          className={`py-5 rounded-3xl text-[11px] font-black tracking-widest transition-all duration-500 border ${formData.broughtBy === b ? 'bg-[#003366] border-[#003366] text-white shadow-xl' : 'bg-white border-[#E2E8F0] text-[#64748B]'}`}
                        >
                          {b.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <label className={labelClass}>SHOULDERING FEE</label>
                    <input className={`${inputClass} !text-[#EF4444] !text-2xl !py-7 !pl-12`} placeholder="0.00" value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
                    <span className="absolute left-7 top-[62px] text-2xl font-black text-[#EF4444]">₹</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Audit Summary - Design as a high-security document */}
          {step === 3 && (
            <div className="space-y-10 animate-fade-in pb-10">
              <div className="text-center">
                <div className="w-28 h-28 rounded-[2.5rem] bg-[#F8FAFC] border border-white shadow-[0_20px_40px_rgba(0,30,64,0.1)] flex items-center justify-center mx-auto mb-6 relative">
                   <div className="absolute inset-2 border-2 border-dashed border-[#C9A646]/20 rounded-[2rem]"></div>
                   <span className="material-symbols-outlined text-[56px] text-[#C9A646]" style={{ fontVariationSettings: '"FILL" 1' }}>description</span>
                </div>
                <h3 className="font-headline text-[28px] font-black text-[#003366] tracking-tight">Audit Summary</h3>
                <p className="text-[14px] font-medium text-[#64748B] mt-2">Stage 1 Verification: Review and validate all operational parameters.</p>
              </div>
              
              <div className="bg-white rounded-[3.5rem] p-10 shadow-[0_40px_80px_-20px_rgba(0,30,64,0.15)] border border-[#F1F5F9] relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#C9A646]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                
                <div className="space-y-8 relative z-10">
                  <div className="flex justify-between items-start border-b border-[#F1F5F9] pb-6">
                    <div>
                      <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.3em] mb-2">Protocol</p>
                      <p className="text-lg font-black text-[#003366]">{workType} OPERATION</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.3em] mb-2">Verification</p>
                      <div className="flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-1.5 rounded-full">
                         <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                         <span className="text-[11px] font-black tracking-widest">PENDING</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex justify-between items-center group">
                      <span className="text-[11px] font-black text-[#94A3B8] uppercase tracking-widest">Strategic Partner</span>
                      <span className="text-[15px] font-black text-[#003366] group-hover:text-[#C9A646] transition-colors">{formData.customerName || 'NOT SPECIFIED'}</span>
                    </div>
                    
                    {workType === 'TUNCH' && (
                      <div className="bg-[#F8FAFC] p-6 rounded-[2rem] space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Net Pure Target</span>
                          <span className="text-lg font-black text-[#003366]">{formData.pureWeight || '0.000'}g</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Settlement Loop</span>
                          <span className="text-[11px] font-black text-[#007BFF] uppercase tracking-widest">{formData.settlementCondition}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-8 border-t border-[#F1F5F9] flex justify-between items-end">
                      <div>
                         <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.3em] mb-1">Operational Fee</p>
                         <p className="text-4xl font-black text-[#10B981]">₹{formData.fee || '0'}</p>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
                         <span className="material-symbols-outlined text-3xl">currency_rupee</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Final Security Commit - Design for High Stakes */}
          {step === 4 && (
            <div className="space-y-12 animate-fade-in text-center py-10">
              <div className="relative mx-auto w-40 h-40 mb-4">
                <div className="absolute inset-0 bg-[#FEF2F2] rounded-[3.5rem] animate-ping opacity-10"></div>
                <div className="relative w-40 h-40 rounded-[3.5rem] bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shadow-[0_30px_60px_rgba(239,68,68,0.25)] border-2 border-white">
                  <span className="material-symbols-outlined text-[80px]" style={{ fontVariationSettings: '"FILL" 1' }}>encrypted</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-headline text-[32px] font-black text-[#003366] tracking-tight">Vault Commit</h3>
                <p className="text-[12px] font-black text-[#EF4444] uppercase tracking-[0.5em] px-8 py-2 bg-[#FEF2F2] inline-block rounded-full border border-[#EF4444]/20 shadow-sm">Critical Authorization Required</p>
              </div>
              
              <p className="text-[16px] font-medium text-[#64748B] leading-relaxed px-10">By authorizing this commit, you are digitally notarizing this operation into the permanent institutional ledger. This action is definitive and irreversible.</p>
              
              <div className="bg-[#F8FAFC] p-10 rounded-[3rem] border-2 border-dashed border-[#E2E8F0] relative group">
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.4em] mb-6 relative z-10">Digital Signature Required</p>
                <div className="h-24 w-full bg-white rounded-3xl flex items-center justify-center border border-[#F1F5F9] shadow-inner group-hover:shadow-2xl transition-all relative z-10">
                   <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-[#003366]/20 animate-pulse">fingerprint</span>
                      <p className="text-[14px] font-black text-[#003366]/30 uppercase tracking-[0.2em]">Awaiting Key Injection...</p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-12 pb-12 pt-8 bg-white/80 backdrop-blur-md border-t border-[#F1F5F9] shrink-0">
          {step > 1 && (
            <button 
              onClick={step === 4 ? handleFinalSubmit : handleNext} 
              className={`w-full py-7 rounded-[2.5rem] font-black text-[13px] tracking-[0.4em] flex items-center justify-center gap-4 active:scale-[0.97] transition-all duration-500 shadow-[0_25px_50px_-12px_rgba(0,51,102,0.4)] uppercase group relative overflow-hidden ${step === 4 ? 'bg-[#003366] text-white' : 'bg-[#C9A646] text-white shadow-[0_25px_50px_-12px_rgba(201,166,70,0.4)]'}`}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <span className="relative z-10">{step === 2 ? 'Initiate Audit' : step === 3 ? 'Finalize Protocol' : 'Execute Secure Commit'}</span>
              <span className="material-symbols-outlined text-xl relative z-10 group-hover:translate-x-2 transition-transform">{step === 4 ? 'verified_user' : 'arrow_forward'}</span>
            </button>
          )}
          
          {step === 1 && (
            <div className="text-center">
               <p className="text-[11px] text-[#94A3B8] font-black uppercase tracking-[0.4em] mb-2 opacity-50">Operational Hub v3.0</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
