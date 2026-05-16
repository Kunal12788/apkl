import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollectionEntryModal } from './CollectionEntryModal';

export const CollectionStaffDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);

  // Mock data for collection summary
  const collectionStats = [
    { label: 'Tunch Pieces', value: '1,240', icon: 'science', color: 'bg-tertiary/10 text-tertiary' },
    { label: 'Marking Pieces', value: '850', icon: 'verified', color: 'bg-secondary/10 text-secondary' },
    { label: 'Shoulder Pieces', value: '420', icon: 'precision_manufacturing', color: 'bg-primary/10 text-primary' },
    { label: 'Today\'s Pieces', value: '145', icon: 'today', color: 'bg-primary-container/10 text-primary-container' },
  ];

  const statusStats = [
    { label: 'Pending', value: '12', color: 'bg-error/10 text-error' },
    { label: 'In Progress', value: '18', color: 'bg-secondary/10 text-secondary' },
    { label: 'Completed', value: '124', color: 'bg-tertiary/10 text-tertiary' },
  ];

  const recentTasks = [
    { id: 'COL-8921', customer: 'Ramesh Jewelers', category: 'TUNCH', pieces: '12', status: 'Completed', time: '10:30 AM' },
    { id: 'COL-8922', customer: 'Sita Ram & Sons', category: 'MARKING', pieces: '45', status: 'In Progress', time: '11:15 AM' },
    { id: 'COL-8923', customer: 'Modern Goldsmith', category: 'SHOULDERING', pieces: '8', status: 'Pending', time: '12:05 PM' },
    { id: 'COL-8924', customer: 'Om Shakti J.', category: 'TUNCH', pieces: '5', status: 'Completed', time: 'Yesterday' },
    { id: 'COL-8925', customer: 'Laxmi Gold', category: 'MARKING', pieces: '120', status: 'Completed', time: 'Yesterday' },
  ];

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-8 max-w-5xl mx-auto pt-4 pb-40 relative">
        <div className="absolute top-[20%] left-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-64 h-64 bg-tertiary/5 rounded-full blur-[100px] pointer-events-none"></div>

        <header className="flex items-center justify-between py-4 mb-2 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl ring-2 ring-white shadow-lg overflow-hidden flex-shrink-0 bg-primary-fixed-dim flex items-center justify-center">
               <span className="material-symbols-outlined text-white text-2xl">local_shipping</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline text-lg font-bold text-primary leading-tight tracking-tight">Collection Unit</h1>
              <p className="text-[10px] text-outline font-black uppercase tracking-[0.2em]">Field Operations Hub</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full glass-effect flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container transition-colors border border-outline-variant/30">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>notifications</span>
          </button>
        </header>

        {/* CATEGORY PIECES */}
        <section className="space-y-4 relative z-10">
           <div className="flex justify-between items-center px-1">
             <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-outline font-extrabold">Volume Analysis</h3>
             <span className="text-[9px] font-bold text-tertiary uppercase tracking-wider">Live Sync</span>
           </div>
           <div className="grid grid-cols-2 gap-4">
             {collectionStats.map((stat, idx) => (
               <div key={idx} className="luxury-card p-5 space-y-3 bg-white border border-outline-variant/10 group active:scale-[0.98] transition-transform">
                 <div className="flex justify-between items-center">
                   <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                     <span className="material-symbols-outlined text-lg">{stat.icon}</span>
                   </div>
                   <span className="font-headline text-xl font-bold text-primary">{stat.value}</span>
                 </div>
                 <p className="text-[10px] font-bold text-outline uppercase tracking-wider">{stat.label}</p>
               </div>
             ))}
           </div>
        </section>

        {/* STATUS SUMMARY */}
        <section className="luxury-card p-6 bg-surface-container-lowest border border-outline-variant/10 relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-outline font-extrabold">Workflow Lifecycle</h3>
            <span className="material-symbols-outlined text-outline text-lg">donut_large</span>
          </div>
          <div className="flex justify-between items-center px-2">
            {statusStats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center font-black text-xs border border-white shadow-sm`}>
                   {stat.value}
                </div>
                <span className="text-[9px] font-bold text-outline uppercase tracking-tighter">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* RECENT TASKS */}
        <section className="space-y-4 relative z-10">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-outline font-extrabold">Field Assignments</h3>
            <button onClick={() => navigate('/tasks')} className="text-[10px] font-bold text-secondary uppercase tracking-wider underline underline-offset-4 decoration-secondary/30">History</button>
          </div>
          <div className="luxury-card overflow-hidden bg-white border border-outline-variant/10">
            {recentTasks.map((item, idx) => (
              <div key={idx} className="p-5 flex items-center justify-between group hover:bg-surface-container-lowest transition-colors border-b last:border-0 border-outline-variant/10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black bg-primary/90 text-sm shadow-md`}>
                    {item.category[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary tracking-tight">{item.customer}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[9px] font-black text-secondary tracking-widest uppercase">{item.category}</span>
                       <span className="text-[10px] font-medium text-outline/60">{item.pieces} Pieces</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <span className={`text-[8px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border ${
                    item.status === 'Completed' ? 'bg-tertiary/5 text-tertiary border-tertiary/20' : 
                    item.status === 'In Progress' ? 'bg-secondary/5 text-secondary border-secondary/20' : 
                    'bg-error/5 text-error border-error/20'
                  }`}>
                    {item.status}
                  </span>
                  <p className="text-[8px] text-outline/40 font-bold uppercase tracking-[0.1em]">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LOGISTICS TRACKER */}
        <section className="luxury-card p-6 bg-gradient-to-br from-tertiary to-tertiary-container relative overflow-hidden z-10">
           <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-[120px] text-white">location_on</span>
           </div>
           <div className="relative z-10">
              <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-white font-extrabold mb-4">Logistics Protocol</h3>
              <div className="space-y-4">
                 <div className="flex items-center gap-4">
                    <div className="w-1 h-12 bg-white/30 rounded-full flex flex-col items-center justify-between py-1">
                       <div className="w-2 h-2 bg-white rounded-full"></div>
                       <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                    </div>
                    <div className="space-y-3">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Next Handover</span>
                          <span className="text-sm font-bold text-white">Main Vault @ 04:00 PM</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Home</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
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

      <CollectionEntryModal 
        isOpen={isEntryModalOpen} 
        onClose={() => setEntryModalOpen(false)} 
        onSuccess={(data) => {
          console.log('Collection Entry Success:', data);
          setEntryModalOpen(false);
        }}
      />
    </div>
  );
};
