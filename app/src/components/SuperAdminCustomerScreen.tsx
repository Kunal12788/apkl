import React from 'react';
import { useNavigate } from 'react-router-dom';

export const SuperAdminCustomerScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative flex flex-col overflow-hidden">
      <header className="shrink-0 bg-gradient-to-br from-[#003366] to-[#001e40] px-6 pt-8 pb-6 relative shadow-lg z-20">
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md border border-white/10 active:scale-95 transition-transform">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-headline font-bold text-white tracking-wide">Client Directory</h1>
            <p className="text-[10px] font-bold text-[#F6C358] uppercase tracking-widest opacity-90">Corporate Profiles</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
      </header>

      <main className="flex-grow overflow-y-auto hide-scrollbar px-4 py-6 pb-32 z-10 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center h-40 text-outline opacity-60">
           <span className="material-symbols-outlined text-6xl mb-4 text-primary">construction</span>
           <p className="text-sm font-bold uppercase tracking-widest text-center mt-2 text-primary">Ready for new features</p>
           <p className="text-xs font-medium text-center mt-2">Awaiting your instructions...</p>
        </div>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
        </a>
        <a onClick={() => navigate('/billing')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
        </a>
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
        </a>
        <a onClick={() => navigate('/ledger')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Ledger</span>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
