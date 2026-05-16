import React from 'react';
import { useNavigate } from 'react-router-dom';

export const CollectionHistoryScreen: React.FC = () => {
  const navigate = useNavigate();

  const history = [
    { id: 'COL-8921', customer: 'Ramesh Jewelers', category: 'TUNCH', purity: '22K', status: 'In Transit', time: '2024-05-16 10:30:15 AM', pieces: '12', weight: '145.50g', logo: 'RJ', type: 'Sample', fee: 'Paid' },
    { id: 'COL-8922', customer: 'Sita Ram & Sons', category: 'MARKING', purity: '18K', status: 'Pending', time: '2024-05-16 11:15:22 AM', pieces: '45', weight: '89.20g', logo: 'SRS', type: 'Jewellery', fee: 'Due' },
    { id: 'COL-8923', customer: 'Modern Goldsmith', category: 'SHOULDERING', purity: '22K', status: 'Verified', time: '2024-05-16 12:05:45 PM', pieces: '8', weight: '210.15g', logo: 'MG', type: 'Jewellery', fee: 'Paid' },
    { id: 'COL-8924', customer: 'Om Shakti Jewelers', category: 'TUNCH', purity: '24K', status: 'Delivered', time: '2024-05-15 04:20:10 PM', pieces: '1', weight: '10.00g', logo: 'OM', type: 'Bullion', fee: 'Paid' },
    { id: 'COL-8925', customer: 'Laxmi Gold', category: 'MARKING', purity: '22K', status: 'In Transit', time: '2024-05-15 05:45:30 PM', pieces: '120', weight: '340.50g', logo: 'LG', type: 'Jewellery', fee: 'Due' },
  ];

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative flex flex-col">
      <header className="shrink-0 bg-primary px-6 pt-8 pb-6 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Collection Audit</h1>
            <p className="text-[10px] font-bold text-tertiary-fixed uppercase tracking-widest">Historical Records</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      </header>

      <main className="flex-grow overflow-y-auto hide-scrollbar px-4 py-6 space-y-4 pb-32">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">filter_list</span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">All Entities</span>
           </div>
           <span className="text-[10px] font-bold text-outline uppercase tracking-wider">{history.length} Records Found</span>
        </div>

        {history.map((item, idx) => (
          <div key={idx} className="luxury-card p-5 bg-white border border-outline-variant/10 space-y-4">
             <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary font-black text-xs">
                      {item.logo || item.customer[0]}
                   </div>
                   <div>
                      <p className="text-sm font-bold text-primary">{item.customer}</p>
                      <p className="text-[10px] font-medium text-outline">{item.id}</p>
                   </div>
                </div>
                <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-tight ${
                  item.status === 'Verified' ? 'bg-tertiary/10 text-tertiary' : 
                  item.status === 'Delivered' ? 'bg-primary/10 text-primary' :
                  item.status === 'In Transit' ? 'bg-secondary/10 text-secondary' : 
                  'bg-outline/10 text-outline'
                }`}>
                  {item.status}
                </span>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/5">
                   <p className="text-[8px] font-bold text-outline uppercase tracking-wider mb-1">Category</p>
                   <p className="text-[10px] font-bold text-primary">{item.category}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/5">
                   <p className="text-[8px] font-bold text-outline uppercase tracking-wider mb-1">Qty / Wt</p>
                   <p className="text-[10px] font-bold text-tertiary">{item.pieces}P / {item.weight}</p>
                </div>
             </div>

             <div className="pt-2 border-t border-outline-variant/5 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-outline">
                   <span className="material-symbols-outlined text-xs">schedule</span>
                   <span className="text-[9px] font-medium">{item.time}</span>
                </div>
                <button className="text-[9px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                   Audit Trail <span className="material-symbols-outlined text-xs">chevron_right</span>
                </button>
             </div>
          </div>
        ))}
      </main>

      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Home</span>
        </a>
        <a onClick={() => navigate('/billing')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
        </a>
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
