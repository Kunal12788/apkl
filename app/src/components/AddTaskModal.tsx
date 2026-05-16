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
  const [formData, setFormData] = useState({
    customerName: '', address: '', phone: '',
    impureWeight: '', purity: '', pureWeight: '',
    settlementCondition: 'Only Tunch',
    fee: '', logoName: '', carat: '22k',
    pieces: '', broughtBy: 'Customer', pointsUsed: ''
  });

  if (!isOpen) return null;

  const reset = () => {
    setStep(1); setWorkType(null);
    setFormData({ customerName: '', address: '', phone: '', impureWeight: '', purity: '', pureWeight: '', settlementCondition: 'Only Tunch', fee: '', logoName: '', carat: '22k', pieces: '', broughtBy: 'Customer', pointsUsed: '' });
  };

  const handleFinalSubmit = () => {
    onSuccess({ ...formData, workType, id: `TASK-${Math.floor(1000 + Math.random() * 9000)}`, date: 'Just Now', status: 'In Progress', progressPercentage: 10, assignedTo: 'Staff' });
    reset(); onClose();
  };

  // Input field matching the app's existing input style exactly
  const inputCls = "w-full h-12 bg-white border border-outline-variant/50 rounded-DEFAULT px-4 text-sm text-primary font-medium placeholder-outline/40 focus:outline-none focus:border-secondary focus:bg-white input-sapphire-focus transition-all";

  const stepTitles = ['Select Operation', 'Enter Details', 'Review & Confirm', 'Authorize Entry'];
  const stepSubtitles = ['Choose the type of work', `${workType || ''} Details`, 'Verify before submitting', 'Final confirmation'];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop — matches the ambient bg of other screens */}
      <div className="absolute inset-0 bg-[#001e40]/40 backdrop-blur-md" onClick={onClose} />

      {/* Bottom Sheet — uses the same card system as the rest of the app */}
      <div className="relative w-full max-w-md flex flex-col max-h-[92dvh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden border-t border-white/60 shadow-[0_-20px_80px_rgba(0,30,64,0.3)]"
           style={{ animation: 'fadeSlideUp 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
        
        {/* ── HEADER — navy banner like the billing/ledger screens ── */}
        <div className="shrink-0 bg-gradient-to-br from-[#001e40] to-[#003366] px-6 pt-7 pb-6 relative overflow-hidden">
          {/* subtle background watermark */}
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-white/[0.03] pointer-events-none select-none">
            {workType === 'TUNCH' ? 'science' : workType === 'MARKING' ? 'verified' : workType === 'SHOULDERING' ? 'precision_manufacturing' : 'add_task'}
          </span>

          {/* top row */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => { if (step === 1) { reset(); onClose(); } else setStep(step - 1); }}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-all active:scale-90">
              <span className="material-symbols-outlined text-[18px]">{step === 1 ? 'keyboard_arrow_down' : 'arrow_back'}</span>
            </button>
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/50">Work Registry</p>
              <h2 className="font-headline text-[17px] font-bold text-white leading-tight mt-0.5">{stepTitles[step - 1]}</h2>
              <p className="text-[11px] text-white/50 mt-0.5">{stepSubtitles[step - 1]}</p>
            </div>
            <button onClick={() => { reset(); onClose(); }}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white/80 hover:bg-red-500/30 transition-all active:scale-90">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Step progress — thin gold line like the billing detail page */}
          <div className="flex items-center gap-2">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1 rounded-full flex-1 transition-all duration-500 ${step > s ? 'bg-[#C9A646]' : step === s ? 'bg-[#C9A646]/60' : 'bg-white/15'}`} />
            ))}
          </div>
        </div>

        {/* ── BODY — white/surface matching app body ── */}
        <div className="flex-grow overflow-y-auto hide-scrollbar bg-background px-6 py-6 space-y-4">

          {/* STEP 1 — Operation Selection */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-[12px] text-on-surface-variant text-center mb-4">Select the type of work to begin the audit entry.</p>
              {([
                { type: 'TUNCH' as WorkType, icon: 'science', title: 'Tunch', desc: 'Purity testing & gold exchange', accent: 'border-l-secondary', iconBg: 'bg-secondary/10 text-secondary' },
                { type: 'MARKING' as WorkType, icon: 'verified', title: 'Marking', desc: 'Logo hallmarking & branding', accent: 'border-l-tertiary-container', iconBg: 'bg-tertiary-container/20 text-tertiary' },
                { type: 'SHOULDERING' as WorkType, icon: 'precision_manufacturing', title: 'Shouldering', desc: 'Precision soldering work', accent: 'border-l-error', iconBg: 'bg-error/10 text-error' },
              ]).map(({ type, icon, title, desc, accent, iconBg }) => (
                <button key={type} onClick={() => { setWorkType(type); setStep(2); }}
                  className={`w-full luxury-card p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all border-l-4 ${accent} hover:shadow-lg group`}>
                  <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
                  </div>
                  <div className="flex-grow">
                    <p className="font-headline text-[15px] font-bold text-primary">{title}</p>
                    <p className="text-[11px] text-outline mt-0.5 font-medium">{desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2 — Form Data */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">

              {/* TUNCH FORM */}
              {workType === 'TUNCH' && (<>
                {/* Client Card */}
                <div className="luxury-card p-5 space-y-4 border-l-4 border-l-secondary">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-secondary text-[18px]">person</span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Client Details</p>
                  </div>
                  <Field label="Customer Name" placeholder="Full name" value={formData.customerName} onChange={v => setFormData(f => ({...f, customerName: v}))} inputCls={inputCls} />
                  <Field label="Address" placeholder="Full address" value={formData.address} onChange={v => setFormData(f => ({...f, address: v}))} inputCls={inputCls} />
                  <Field label="Phone Number" placeholder="+91 XXXXX XXXXX" value={formData.phone} onChange={v => setFormData(f => ({...f, phone: v}))} inputCls={inputCls} />
                </div>

                {/* Gold Audit Card */}
                <div className="luxury-card p-5 space-y-4 border-l-4 border-l-tertiary-container">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">science</span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Gold Audit</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Impure Wt. (g)" placeholder="e.g. 12.45" value={formData.impureWeight} onChange={v => setFormData(f => ({...f, impureWeight: v}))} inputCls={inputCls} />
                    <Field label="Purity (%)" placeholder="e.g. 91.6" value={formData.purity} onChange={v => setFormData(f => ({...f, purity: v}))} inputCls={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-tertiary mb-1.5 block">Pure Weight (g)</label>
                    <input className={`${inputCls} !border-tertiary/40 !bg-tertiary-fixed/10 font-bold`} placeholder="Calculated pure output" value={formData.pureWeight} onChange={e => setFormData(f => ({...f, pureWeight: e.target.value}))} />
                  </div>
                </div>

                {/* Settlement */}
                <div className="luxury-card p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Settlement Condition</p>
                  <div className="space-y-2">
                    {['Only Tunch', 'Cash (Impure/Pure at Front)', 'Cash (Gold at Back)'].map(cond => (
                      <button key={cond} onClick={() => setFormData(f => ({...f, settlementCondition: cond}))}
                        className={`w-full h-11 px-4 rounded-full text-[12px] font-bold text-left transition-all flex items-center gap-2.5 ${formData.settlementCondition === cond ? 'button-gradient text-white shadow-md' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/20'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${formData.settlementCondition === cond ? 'bg-white' : 'bg-outline-variant'}`} />
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee */}
                <div className="luxury-card p-5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline mb-1.5 block">Service Fee (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold text-base">₹</span>
                    <input className={`${inputCls} pl-9 !text-secondary font-bold`} placeholder="0.00" value={formData.fee} onChange={e => setFormData(f => ({...f, fee: e.target.value}))} />
                  </div>
                </div>
              </>)}

              {/* MARKING FORM */}
              {workType === 'MARKING' && (<>
                <div className="luxury-card p-5 space-y-4 border-l-4 border-l-tertiary-container">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Marking Details</p>
                  </div>
                  <Field label="Customer Name" placeholder="Full name" value={formData.customerName} onChange={v => setFormData(f => ({...f, customerName: v}))} inputCls={inputCls} />
                  <Field label="Logo Design" placeholder="e.g. RCJ, AJ" value={formData.logoName} onChange={v => setFormData(f => ({...f, logoName: v}))} inputCls={inputCls} />
                </div>

                <div className="luxury-card p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Carat</p>
                  <div className="flex gap-2">
                    {['22k','18k','14k','9k'].map(k => (
                      <button key={k} onClick={() => setFormData(f => ({...f, carat: k}))}
                        className={`flex-1 h-11 rounded-full text-[12px] font-bold tracking-wide transition-all ${formData.carat === k ? 'button-gradient text-white shadow-md' : 'bg-surface-container text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container-high'}`}>
                        {k.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="luxury-card p-4">
                    <Field label="No. of Pieces" placeholder="Quantity" value={formData.pieces} onChange={v => setFormData(f => ({...f, pieces: v}))} inputCls={inputCls} />
                  </div>
                  <div className="luxury-card p-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline mb-1.5 block">Fee (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold text-base">₹</span>
                      <input className={`${inputCls} pl-9`} placeholder="0.00" value={formData.fee} onChange={e => setFormData(f => ({...f, fee: e.target.value}))} />
                    </div>
                  </div>
                </div>

                <div className="luxury-card p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Material Brought By</p>
                  <div className="flex gap-3">
                    {['Customer', 'Staff Member'].map(b => (
                      <button key={b} onClick={() => setFormData(f => ({...f, broughtBy: b}))}
                        className={`flex-1 h-11 rounded-full text-[12px] font-bold transition-all ${formData.broughtBy === b ? 'button-gradient text-white shadow-md' : 'bg-surface-container text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container-high'}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </>)}

              {/* SHOULDERING FORM */}
              {workType === 'SHOULDERING' && (<>
                <div className="luxury-card p-5 space-y-4 border-l-4 border-l-error">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-error text-[18px]">precision_manufacturing</span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Shouldering Details</p>
                  </div>
                  <Field label="Customer Name" placeholder="Full name" value={formData.customerName} onChange={v => setFormData(f => ({...f, customerName: v}))} inputCls={inputCls} />
                  <Field label="Points Used" placeholder="Total solder points" value={formData.pointsUsed} onChange={v => setFormData(f => ({...f, pointsUsed: v}))} inputCls={inputCls} />
                </div>

                <div className="luxury-card p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Material Brought By</p>
                  <div className="flex gap-3">
                    {['Customer', 'Staff Member'].map(b => (
                      <button key={b} onClick={() => setFormData(f => ({...f, broughtBy: b}))}
                        className={`flex-1 h-11 rounded-full text-[12px] font-bold transition-all ${formData.broughtBy === b ? 'button-gradient text-white shadow-md' : 'bg-surface-container text-on-surface-variant border border-outline-variant/20'}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="luxury-card p-5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline mb-1.5 block">Service Fee (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold text-base">₹</span>
                    <input className={`${inputCls} pl-9 !text-secondary font-bold`} placeholder="0.00" value={formData.fee} onChange={e => setFormData(f => ({...f, fee: e.target.value}))} />
                  </div>
                </div>
              </>)}
            </div>
          )}

          {/* STEP 3 — Review */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              {/* Summary card with navy accent — matches the billing screen detail view */}
              <div className="luxury-card overflow-hidden glow-primary">
                <div className="bg-gradient-to-br from-[#001e40] to-[#003366] p-5 relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-xl"></div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">Operation Summary</p>
                  <p className="font-headline text-2xl font-bold text-white mt-1">{workType} Work</p>
                  <p className="text-[11px] text-white/50 mt-0.5">Review before final authorization</p>
                </div>
                <div className="bg-white p-5 space-y-3">
                  <SummaryRow label="Client" value={formData.customerName || '—'} />
                  {workType === 'TUNCH' && (<>
                    <SummaryRow label="Phone" value={formData.phone || '—'} />
                    <SummaryRow label="Impure Wt." value={formData.impureWeight ? `${formData.impureWeight}g` : '—'} />
                    <SummaryRow label="Purity" value={formData.purity ? `${formData.purity}%` : '—'} />
                    <SummaryRow label="Pure Wt." value={formData.pureWeight ? `${formData.pureWeight}g` : '—'} highlight />
                    <SummaryRow label="Settlement" value={formData.settlementCondition} />
                  </>)}
                  {workType === 'MARKING' && (<>
                    <SummaryRow label="Logo" value={formData.logoName || '—'} />
                    <SummaryRow label="Carat" value={formData.carat.toUpperCase()} highlight />
                    <SummaryRow label="Pieces" value={formData.pieces || '—'} />
                    <SummaryRow label="Brought By" value={formData.broughtBy} />
                  </>)}
                  {workType === 'SHOULDERING' && (<>
                    <SummaryRow label="Points" value={formData.pointsUsed || '—'} />
                    <SummaryRow label="Brought By" value={formData.broughtBy} />
                  </>)}
                  <div className="pt-3 border-t border-outline-variant/15 flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Total Fee</p>
                    <p className="font-headline text-2xl font-bold text-tertiary">₹ {formData.fee || '0'}</p>
                  </div>
                </div>
              </div>

              <div className="glass-effect rounded-2xl border border-outline-variant/20 p-4 flex items-start gap-3 premium-shadow">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>info</span>
                <p className="text-[12px] text-on-surface-variant font-medium leading-relaxed">Please review all details carefully. This is your first verification checkpoint before the final authorization.</p>
              </div>
            </div>
          )}

          {/* STEP 4 — Final Auth */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in text-center py-2">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border border-[#C9A646]/30 scale-110 animate-ping opacity-20"></div>
                <div className="w-24 h-24 rounded-full bg-[#001e40]/5 border border-[#001e40]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[44px] text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>verified_user</span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-headline text-[22px] font-bold text-primary">Authorize Entry</h3>
                <p className="text-[12px] text-on-surface-variant font-medium leading-relaxed px-4">You are committing this work order to the institutional ledger. This action is permanent.</p>
              </div>

              {/* Final audit card with gold border — security indicator from design doc */}
              <div className="luxury-card p-5 text-left border border-[#C9A646]/30">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>workspace_premium</span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary">Checkpoint 2 · Final</p>
                </div>
                <SummaryRow label="Operation" value={workType || '—'} />
                <div className="my-2"><SummaryRow label="Client" value={formData.customerName || '—'} /></div>
                <div className="pt-3 border-t border-[#C9A646]/20 flex justify-between items-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-outline">Authorized Fee</p>
                  <p className="font-headline text-[22px] font-bold text-tertiary">₹ {formData.fee || '0'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER CTA ── */}
        {step > 1 && (
          <div className="shrink-0 px-6 pb-8 pt-4 bg-white/80 backdrop-blur-sm border-t border-outline-variant/10">
            <button onClick={step === 4 ? handleFinalSubmit : () => setStep(step + 1)}
              className="w-full h-14 button-gradient text-on-primary rounded-full font-label-caps text-[12px] font-bold tracking-[0.15em] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all btn-shimmer-effect">
              {step === 2 ? 'Continue to Review' : step === 3 ? 'Proceed to Authorization' : 'Confirm & Commit Entry'}
              <span className="material-symbols-outlined text-[18px]">{step === 4 ? 'verified' : 'arrow_forward'}</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// Tiny helper components
const Field = ({ label, placeholder, value, onChange, inputCls }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; inputCls: string }) => (
  <div>
    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline mb-1.5 block">{label}</label>
    <input className={inputCls} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const SummaryRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-outline">{label}</span>
    <span className={`text-[13px] font-semibold ${highlight ? 'text-tertiary' : 'text-primary'}`}>{value}</span>
  </div>
);
