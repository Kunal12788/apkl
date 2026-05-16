import React, { useState } from 'react';

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
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    logoName: '',
    purity: '22K',
    category: 'TUNCH',
    pieces: '',
    details: '',
    weight: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!formData.pieces) err.pieces = 'Required';
    if (!formData.weight) err.weight = 'Required';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validate()) setStep(2);
  };

  const handleSubmit = () => {
     onSuccess({ ...formData, timestamp: new Date().toISOString(), id: `COL-${Math.floor(Math.random() * 9000) + 1000}` });
     setFormData({ customerName: '', logoName: '', purity: '22K', category: 'TUNCH', pieces: '', details: '', weight: '' });
     setStep(1);
  };

  const inp = (err?: string) => `w-full h-12 bg-white border ${err ? 'border-error' : 'border-outline-variant/40'} rounded-DEFAULT px-4 text-sm text-primary font-medium focus:outline-none focus:border-secondary transition-colors`;
  const lbl = "text-[10px] font-bold uppercase tracking-[0.14em] text-outline mb-1 block";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001e40]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md flex flex-col rounded-[2.5rem] overflow-hidden border border-white/30 shadow-[0_-20px_80px_rgba(0,30,64,0.4)] bg-background animate-modalUp"
        style={{ minHeight: '85svh', maxHeight: '92svh' }}>
        
        {/* HEADER */}
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

        {/* STEPPER */}
        <div className="px-6 py-4 bg-white border-b border-outline-variant/10 flex items-center justify-center gap-2">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= s ? 'bg-primary text-white' : 'bg-surface-container text-outline'}`}>{s}</div>
                {s < 2 && <div className={`w-12 h-0.5 rounded-full ${step > s ? 'bg-primary' : 'bg-surface-container'}`}></div>}
              </div>
            ))}
        </div>

        {/* CONTENT */}
        <div className="flex-grow overflow-y-auto hide-scrollbar px-6 py-6 space-y-4">
           {step === 1 ? (
             <>
               <SectionCard title="Customer Information" icon="person" color="bg-primary/5 text-primary">
                  <div>
                    <label className={lbl}>Customer Name *</label>
                    <input className={inp(errors.customerName)} placeholder="Enter full name" value={formData.customerName} onChange={e => up('customerName', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Logo / Brand Name</label>
                    <input className={inp()} placeholder="e.g. RCJ, AJ" value={formData.logoName} onChange={e => up('logoName', e.target.value)} />
                  </div>
               </SectionCard>

               <SectionCard title="Product Details" icon="inventory_2" color="bg-secondary/5 text-secondary">
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className={lbl}>No. of Pieces *</label>
                        <input className={inp(errors.pieces)} placeholder="Qty" value={formData.pieces} onChange={e => up('pieces', e.target.value)} />
                     </div>
                     <div>
                        <label className={lbl}>Total Weight (g) *</label>
                        <input className={inp(errors.weight)} placeholder="0.00" value={formData.weight} onChange={e => up('weight', e.target.value)} />
                     </div>
                  </div>
                  <div>
                     <label className={lbl}>Item Description</label>
                     <input className={inp()} placeholder="e.g. Chains, Rings, Mix" value={formData.details} onChange={e => up('details', e.target.value)} />
                  </div>
               </SectionCard>
             </>
           ) : (
             <>
               <SectionCard title="Technical Specs" icon="settings" color="bg-tertiary/5 text-tertiary">
                  <div>
                    <label className={lbl}>Purity Standard</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['24K', '22K', '18K', '14K', '9K', 'Other'].map(k => (
                        <button 
                          key={k} 
                          onClick={() => up('purity', k)}
                          className={`py-2.5 rounded-xl text-[11px] font-bold border transition-all ${formData.purity === k ? 'bg-primary text-white border-transparent' : 'bg-white text-outline border-outline-variant/30 hover:border-primary/40'}`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Job Category</label>
                    <div className="space-y-2">
                       {['TUNCH', 'MARKING', 'SHOULDERING'].map(cat => (
                         <button 
                           key={cat} 
                           onClick={() => up('category', cat)}
                           className={`w-full py-3 px-4 rounded-xl text-left flex items-center justify-between border transition-all ${formData.category === cat ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-outline-variant/20 text-outline'}`}
                         >
                            <span className="text-xs font-bold uppercase tracking-wider">{cat}</span>
                            {formData.category === cat && <span className="material-symbols-outlined text-sm">check_circle</span>}
                         </button>
                       ))}
                    </div>
                  </div>
               </SectionCard>

               <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/10 space-y-2">
                  <div className="flex items-center gap-2 text-secondary">
                     <span className="material-symbols-outlined text-[18px]">verified_user</span>
                     <p className="text-[10px] font-bold uppercase tracking-wider">Operational Audit</p>
                  </div>
                  <p className="text-[11px] text-outline leading-relaxed">By initiating this task, you confirm receipt of the mentioned items under secure custody protocol.</p>
               </div>
             </>
           )}
        </div>

        {/* FOOTER */}
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
