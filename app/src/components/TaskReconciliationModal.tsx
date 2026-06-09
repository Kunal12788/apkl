import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

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
  const [auditImages, setAuditImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen || !collectionTask) return null;

  const handleCheck = () => {
    const taskWeight = parseFloat(collectionTask.impureWeight || collectionTask.totalWeight || collectionTask.weight || '0');
    const taskPieces = String(collectionTask.pieces || '1');
    
    const isMatch = 
      String(formData.pieces) === taskPieces &&
      parseFloat(formData.weight || '0') === taskWeight;
    
    setResult(isMatch ? 'MATCH' : 'MISMATCH');
  };

  const handleFinalize = () => {
    if (result === 'MATCH') {
      if (auditImages.length === 0) {
        alert("Please upload at least one audit image.");
        return;
      }
      setIsUploading(true);
      
      const uploadedUrls: string[] = [];
      const uploadTasks: Promise<any>[] = [];
      
      for (const file of auditImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: { publicUrl } } = supabase.storage.from('task_images').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
        
        uploadTasks.push(
          supabase.storage.from('task_images').upload(fileName, file).catch(err => {
            console.error("Background audit image upload failed:", err);
          })
        );
      }
      
      Promise.all(uploadTasks);
      
      const allImages = [...(collectionTask.images || []), ...uploadedUrls];
      
      onVerified({ ...collectionTask, status: 'In Progress', verifiedBy: 'Staff Member', verifiedAt: new Date().toISOString(), images: allImages });
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAuditImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeImage = (idx: number) => {
    setAuditImages(prev => prev.filter((_, i) => i !== idx));
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
              <div className="flex justify-between items-start">
                 <span className="text-[10px] font-bold text-outline uppercase mt-0.5">Customer</span>
                 <div className="text-right">
                   <p className="text-sm font-bold text-primary">{collectionTask.customerName}</p>
                   {collectionTask.customerPhone && <p className="text-[10px] font-medium text-outline">{collectionTask.customerPhone}</p>}
                 </div>
              </div>
              {collectionTask.customerAddress && (
                 <div className="flex justify-between items-start mt-1">
                    <span className="text-[10px] font-bold text-outline uppercase">Address</span>
                    <span className="text-[11px] font-medium text-primary text-right max-w-[200px]">{collectionTask.customerAddress}</span>
                 </div>
              )}
              <div className="flex justify-between items-center mt-1 pt-2 border-t border-primary/10">
                 <span className="text-[10px] font-bold text-outline uppercase">Category</span>
                 <span className="text-xs font-black text-secondary uppercase tracking-widest">{collectionTask.workType}</span>
              </div>
           </div>

           {collectionTask.images && collectionTask.images.length > 0 && (
             <div className="p-4 rounded-2xl bg-surface-container/30 border border-outline-variant/10">
                <p className="text-[10px] font-bold text-outline uppercase mb-2">Uploaded Images ({collectionTask.images.length}) *</p>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                  {collectionTask.images.map((imgUrl: string, idx: number) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-outline-variant/20 shrink-0 bg-surface-container shadow-sm cursor-pointer group" onClick={() => window.open(imgUrl, '_blank')}>
                      <img src={imgUrl} alt={`Piece ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">visibility</span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
           )}

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
              
              <div className="mt-4">
                 <label className={lbl}>Upload Audit Images *</label>
                 <div className="flex gap-3 overflow-x-auto py-2 hide-scrollbar">
                    {auditImages.map((file, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-outline-variant/20 shadow-sm">
                         <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="audit" />
                         <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-error/90 text-white rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px]">close</span>
                         </button>
                      </div>
                    ))}
                    <div className="relative w-20 h-20 border-2 border-dashed border-outline-variant/40 rounded-xl flex flex-col items-center justify-center shrink-0 hover:bg-surface-container/50 transition-colors cursor-pointer bg-white">
                       <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                       <span className="material-symbols-outlined text-outline text-2xl mb-1">add_a_photo</span>
                       <p className="text-[8px] font-bold text-outline uppercase">Upload</p>
                    </div>
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
                disabled={isUploading}
                className="w-full h-14 bg-tertiary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {isUploading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined">check_circle</span>}
                {isUploading ? 'SAVING...' : 'CONFIRM & START WORK'}
              </button>
           )}
        </div>
      </div>
    </div>
  );
};
