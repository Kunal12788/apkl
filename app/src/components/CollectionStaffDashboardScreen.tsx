import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollectionEntryModal } from './CollectionEntryModal';

export const CollectionStaffDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);

  // Mock data for collection summary
  const collectionStats = [
    { label: 'Total Collections', value: '42', icon: 'inventory_2', color: 'bg-primary/10 text-primary' },
    { label: 'Pending Verification', value: '12', icon: 'pending_actions', color: 'bg-secondary/10 text-secondary' },
    { label: 'Items in Transit', value: '8', icon: 'local_shipping', color: 'bg-tertiary/10 text-tertiary' },
    { label: 'Today\'s Intake', value: '15', icon: 'today', color: 'bg-primary-container/10 text-primary-container' },
  ];

  const recentCollections = [
    { id: 'COL-8921', customer: 'Ramesh Jewelers', category: 'TUNCH', purity: '22K', status: 'In Transit', time: '10:30 AM' },
    { id: 'COL-8922', customer: 'Sita Ram & Sons', category: 'MARKING', purity: '18K', status: 'Pending', time: '11:15 AM' },
    { id: 'COL-8923', customer: 'Modern Goldsmith', category: 'SHOULDERING', purity: '22K', status: 'Verified', time: '12:05 PM' },
  ];

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-4 pb-40 relative">
        <div className="absolute bottom-[10%] left-[15%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>COLLECTION UNIT</div>
        <div className="absolute top-[50%] right-[5%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>SECURE LOGISTICS</div>
        
        <header className="flex items-center justify-between py-4 mb-2 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full ring-2 ring-white shadow-lg overflow-hidden flex-shrink-0 bg-primary-fixed-dim flex items-center justify-center">
               <span className="material-symbols-outlined text-white text-2xl">local_shipping</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline text-lg font-bold text-primary leading-tight">Collection Desk</h1>
              <p className="text-xs text-outline font-medium">Field Operations Portal</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full glass-effect flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container transition-colors border border-outline-variant/30">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>notifications</span>
          </button>
        </header>

        {/* INTAKE ACTION */}
        <section className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-primary to-primary-container shadow-2xl border border-white/5 glow-primary z-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex flex-col gap-6 relative z-10">
            <div>
              <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-tertiary-fixed font-extrabold mb-2">Operational Intake</h3>
              <p className="text-white/80 text-xs font-medium leading-relaxed max-w-[240px]">Record new items and initiate verification tasks for the main vault.</p>
            </div>
            <button 
              onClick={() => setEntryModalOpen(true)}
              className="w-full h-14 bg-white text-primary rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              NEW COLLECTION ENTRY
            </button>
          </div>
        </section>

        {/* STATS GRID */}
        <section className="grid grid-cols-2 gap-4 relative z-10">
          {collectionStats.map((stat, idx) => (
            <div key={idx} className="luxury-card p-5 space-y-3 bg-white border border-outline-variant/10">
              <div className="flex justify-between items-center">
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-lg">{stat.icon}</span>
                </div>
                <span className="font-headline text-xl font-bold text-primary">{stat.value}</span>
              </div>
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* RECENT ACTIVITY */}
        <section className="space-y-4 relative z-10">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold">Recent Assignments</h3>
            <button className="text-[10px] font-bold text-secondary uppercase tracking-wider">View All</button>
          </div>
          <div className="luxury-card overflow-hidden divide-y divide-outline-variant/10">
            {recentCollections.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between group hover:bg-surface-container-lowest transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-primary`}>
                    {item.category[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{item.customer}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] font-medium text-outline">{item.id}</span>
                       <span className="w-1 h-1 rounded-full bg-outline/30"></span>
                       <span className="text-[10px] font-bold text-secondary">{item.category}</span>
                       <span className="w-1 h-1 rounded-full bg-outline/30"></span>
                       <span className="text-[10px] font-medium text-outline">{item.purity}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-tighter ${
                    item.status === 'Verified' ? 'bg-tertiary/10 text-tertiary' : 
                    item.status === 'In Transit' ? 'bg-secondary/10 text-secondary' : 
                    'bg-outline/10 text-outline'
                  }`}>
                    {item.status}
                  </span>
                  <p className="text-[9px] text-outline/60 mt-1 font-medium">{item.time}</p>
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
        <a onClick={() => navigate('/collections')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">History</span>
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
