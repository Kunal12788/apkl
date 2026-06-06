import React, { useState } from 'react';

interface TaskReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionTask: any;
  onVerified: (task: any) => void;
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

export const TaskReconciliationModal: React.FC<TaskReconciliationModalProps> = ({ isOpen, onClose, collectionTask, onVerified }) => {
  const [formData, setFormData] = useState({
    pieces: '',
    weight: '',
    purity: '22K',
    category: 'TUNCH',
  });
  const [result, setResult] = useState<'IDLE' | 'MATCH' | 'MISMATCH'>('IDLE');

  if (!isOpen || !collectionTask) return null;

  const handleCheck = () => {
    const isMatch = 
      formData.pieces === collectionTask.pieces &&
      parseFloat(formData.weight) === parseFloat(collectionTask.weight) &&
      formData.purity === collectionTask.purity &&
      formData.category === collectionTask.category;
    
    setResult(isMatch ? 'MATCH' : 'MISMATCH');
  };

  const handleFinalize = () => {
    if (result === 'MATCH') {
      onVerified({ ...collectionTask, status: 'Completed', verifiedBy: 'Staff Member', verifiedAt: new Date().toISOString() });
    }
  };

  const inp = () => `w-full h-12 bg-white border border-outline-variant/40 rounded-DEFAULT px-4 text-sm text-primary font-medium focus:outline-none focus:border-secondary transition-colors`;
  const lbl = "text-[10px] font-bold uppercase tracking-[0.14em] text-outline mb-1 block";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001e40]/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md flex flex-col rounded-[2.5rem] overflow-hidden border border-white/30 shadow-2xl bg-background animate-modalUp"
        style={{ minHeight: '85svh', maxHeight: '92svh' }}>
        
        {/* HEADER */}
        <div className="shrink-0 bg-gradient-to-br from-secondary to-[#003366] px-6 pt-8 pb-6 relative overflow-hidden">
           <div className="relative z-10 flex justify-between items-center text-white">
              <div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-70 mb-1">Audit Protocol</p>
                 <h2 className="text-2xl font-bold tracking-tight text-white">Reconciliation</h2>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                 <span className="material-symbols-outlined">close</span>
              </button>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        </div>

        {/* CONTENT */}
        <div className="flex-grow overflow-y-auto hide-scrollbar px-6 py-6 space-y-6">
           <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-bold text-outline uppercase">Collection ID</span>
                 <span className="text-[10px] font-bold text-primary">{collectionTask.id}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-bold text-outline uppercase">Customer</span>
                 <span className="text-sm font-bold text-primary">{collectionTask.customerName}</span>
              </div>
           </div>

           <SectionCard title="Staff Independent Audit" icon="app_registration" color="bg-secondary/5 text-secondary">
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className={lbl}>Verified Pieces</label>
                    <input className={inp()} placeholder="Qty" value={formData.pieces} onChange={e => setFormData({...formData, pieces: e.target.value})} />
                 </div>
                 <div>
                    <label className={lbl}>Verified Weight (g)</label>
                    <input className={inp()} placeholder="0.00" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className={lbl}>Purity</label>
                    <select className={inp()} value={formData.purity} onChange={e => setFormData({...formData, purity: e.target.value})}>
                       {['24K', '22K', '18K', '14K', '9K'].map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className={lbl}>Category</label>
                    <select className={inp()} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                       {['TUNCH', 'MARKING', 'SHOULDERING'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
              </div>
           </SectionCard>

           {result === 'MATCH' && (
             <div className="p-5 rounded-2xl bg-tertiary/10 border border-tertiary/30 flex items-center gap-4 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-tertiary flex items-center justify-center text-white shrink-0 shadow-lg shadow-tertiary/20">
                   <span className="material-symbols-outlined text-2xl">done_all</span>
                </div>
                <div>
                   <p className="text-sm font-bold text-tertiary">Data Reconciliation Successful</p>
                   <p className="text-[11px] text-tertiary/80 font-medium">Internal values match collection intake. Proceed to commit.</p>
                </div>
             </div>
           )}

           {result === 'MISMATCH' && (
             <div className="p-5 rounded-2xl bg-error/5 border border-error/20 flex items-center gap-4 animate-shake">
                <div className="w-12 h-12 rounded-full bg-error flex items-center justify-center text-white shrink-0 shadow-lg shadow-error/20">
                   <span className="material-symbols-outlined text-2xl">warning</span>
                </div>
                <div>
                   <p className="text-sm font-bold text-error">Audit Mismatch Detected</p>
                   <p className="text-[11px] text-error/80 font-medium">Physical verification does not match intake records. Re-check items.</p>
                </div>
             </div>
           )}
        </div>

        {/* FOOTER */}
        <div className="shrink-0 p-6 bg-white border-t border-outline-variant/10 flex gap-3">
           {result === 'IDLE' || result === 'MISMATCH' ? (
             <button 
               onClick={handleCheck}
               className="w-full h-14 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
             >
               <span className="material-symbols-outlined text-sm">rule</span>
               CHECK AUDIT DATA
             </button>
           ) : (
             <button 
               onClick={handleFinalize}
               className="w-full h-14 bg-tertiary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all animate-bounce-slow"
             >
               <span className="material-symbols-outlined">verified_user</span>
               AUTHORIZE & COMPLETE
             </button>
           )}
        </div>
      </div>
    </div>
  );
};
