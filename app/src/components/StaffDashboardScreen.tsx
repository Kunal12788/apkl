import React from 'react';
import { useNavigate } from 'react-router-dom';

export const StaffDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background text-on-background font-body w-full h-[100dvh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-4 pb-40 relative">
        <div className="absolute bottom-[10%] left-[15%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>ENCRYPTED PRIVACY</div>
        <div className="absolute top-[50%] right-[5%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>TRUSTED INSTITUTION</div>
        <div className="absolute top-[150px] left-[10%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>SECURITY PROTOCOL ACTIVE</div>
        
        <header className="flex items-center justify-between py-4 mb-2 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full ring-2 ring-white shadow-lg overflow-hidden flex-shrink-0">
              <img alt="Alexander" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpdrf99bDdfFpnDvy5kTrQVQd1kj_gCs6s77-dXisJ3110rcMyGR4miPVoNL98OJeSZfvzSFzxV6bTGHqe8Wm6-DK5_ybI9CJ809JcKDSLcI8oMY60PfWZyqH1r9UC04GBPzUWhfGJh1zq16PPTCX8oRDOM0NlRA0L3zeIBIvYKx0xisgWjy6YP60CTxYqKDoaVx1yCIYcUAzsDSXtR58WxPaBzADrcCb1Kvcdt_AiXCXkqpj-CIzgAEVMuykcCyl68gArkDBckrG7" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline text-lg font-bold text-primary leading-tight">Good Morning, Alexander</h1>
              <p className="text-xs text-outline font-medium">Your summary for Zurich Main today.</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full glass-effect flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container transition-colors border border-outline-variant/30">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>notifications</span>
          </button>
        </header>

        {/* Gold Weight Summary */}
        <section className="space-y-3 relative z-10">
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Gold Weight Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="luxury-card p-6 bg-white border-l-4 border-l-secondary flex flex-col justify-between h-32 relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-secondary">pentagon</span>
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Pure Gold Weight</p>
                <span className="material-symbols-outlined text-secondary glow-icon text-lg">payments</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline text-3xl font-extrabold text-primary">12.45</span>
                <span className="text-xs font-black text-secondary">gram</span>
              </div>
            </div>
            <div className="luxury-card p-6 bg-white border-l-4 border-l-tertiary-container flex flex-col justify-between h-32 relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-tertiary-container">heap_snapshot_thumbnail</span>
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Impure Gold Weight</p>
                <span className="material-symbols-outlined text-tertiary-container glow-icon text-lg">rebase</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline text-3xl font-extrabold text-primary">8.32</span>
                <span className="text-xs font-black text-tertiary-container">gram</span>
              </div>
            </div>
          </div>
        </section>

        {/* 1. Top Section: Total Amount Collected hero card */}
        <section className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-[#003366] via-[#002244] to-[#001e40] shadow-2xl border border-white/5 glow-primary z-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 right-10 w-48 h-48 bg-white/[0.02] -mb-24 -mr-12 rounded-full border border-white/10 pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-[#F6C358] font-extrabold mb-4">Total Amount Collected</h3>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-3xl font-bold text-[#F6C358] drop-shadow-[0_0_8px_rgba(246,195,88,0.4)]">₹</span>
                <span className="font-headline text-5xl font-extrabold text-white tracking-tight">8,42,500</span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center text-[#F6C358] border border-white/20 shadow-xl backdrop-blur-xl relative overflow-hidden">
              <span className="material-symbols-outlined text-3xl drop-shadow-[0_0_10px_rgba(246,195,88,0.5)] z-10">account_balance_wallet</span>
              <span className="material-symbols-outlined absolute text-5xl opacity-10 -bottom-2 -right-2">account_balance</span>
            </div>
          </div>
        </section>

        {/* 2. Second Section: Side-by-side breakdown of Cash and UPI */}
        <section className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-white rounded-2xl p-5 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F6C358]"></div>
            <div className="flex justify-between items-start mb-1.5">
              <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">Cash Collection</p>
              <span className="material-symbols-outlined text-sm text-[#F6C358] opacity-60">payments</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-[#F6C358]">₹</span>
              <span className="font-headline text-xl font-bold text-primary">3,12,000</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#003366]/5 shadow-sm relative overflow-hidden luxury-card">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
            <div className="flex justify-between items-start mb-1.5">
              <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">UPI Collection</p>
              <span className="material-symbols-outlined text-sm text-secondary opacity-60">qr_code_2</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-secondary">₹</span>
              <span className="font-headline text-xl font-bold text-primary">5,30,500</span>
            </div>
          </div>
        </section>

        {/* 3. Third Section: Job Revenue Analytics */}
        <section className="space-y-3 relative z-10">
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Job Revenue Analytics</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="luxury-card p-4 flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tertiary-fixed/30 to-tertiary-fixed/10 flex items-center justify-center text-tertiary border border-tertiary/20 shadow-inner">
                  <span className="material-symbols-outlined text-xl glow-icon">science</span>
                </div>
                <span className="font-headline font-bold text-primary text-sm tracking-wide">TUNCH</span>
              </div>
              <div className="text-right z-10">
                <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Revenue</p>
                <p className="font-headline text-lg font-bold text-primary">₹1,24,000</p>
              </div>
              <span className="material-symbols-outlined absolute right-2 text-6xl text-primary/[0.03] -bottom-4 rotate-12">science</span>
            </div>
            
            <div className="luxury-card p-4 flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-fixed/30 to-secondary-fixed/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-inner">
                  <span className="material-symbols-outlined text-xl glow-icon">verified</span>
                </div>
                <span className="font-headline font-bold text-primary text-sm tracking-wide">MARKING</span>
              </div>
              <div className="text-right z-10">
                <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Revenue</p>
                <p className="font-headline text-lg font-bold text-primary">₹4,82,500</p>
              </div>
              <span className="material-symbols-outlined absolute right-2 text-6xl text-primary/[0.03] -bottom-4 rotate-12">new_releases</span>
            </div>
            
            <div className="luxury-card p-4 flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-fixed/30 to-primary-fixed/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <span className="material-symbols-outlined text-xl glow-icon">precision_manufacturing</span>
                </div>
                <span className="font-headline font-bold text-primary text-sm tracking-wide">SHOULDERING</span>
              </div>
              <div className="text-right z-10">
                <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Revenue</p>
                <p className="font-headline text-lg font-bold text-primary">₹2,36,000</p>
              </div>
              <span className="material-symbols-outlined absolute right-2 text-6xl text-primary/[0.03] -bottom-4 rotate-12">precision_manufacturing</span>
            </div>
          </div>
        </section>

        {/* 4. TASK SOURCE */}
        <section className="space-y-3 relative z-10">
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Task Source</h3>
          <div className="luxury-card p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-secondary">groups</span>
                  <span className="text-primary">Customers</span>
                </div>
                <span className="text-primary">124 Tasks</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[45%] rounded-full shadow-[0_0_8px_rgba(0,89,187,0.3)]"></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-primary">admin_panel_settings</span>
                  <span className="text-primary">Admin</span>
                </div>
                <span className="text-primary">82 Tasks</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[30%] rounded-full shadow-[0_0_8px_rgba(0,30,64,0.3)]"></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-tertiary-container">badge</span>
                  <span className="text-primary">Staff</span>
                </div>
                <span className="text-primary">45 Tasks</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-tertiary-container w-[18%] rounded-full"></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-outline">policy</span>
                  <span className="text-primary">Super Admin</span>
                </div>
                <span className="text-primary">12 Tasks</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-outline w-[5%] rounded-full"></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-secondary-container">local_shipping</span>
                  <span className="text-primary">Collection Staff</span>
                </div>
                <span className="text-primary">56 Tasks</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary-container w-[22%] rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Operational Volume */}
        <section className="space-y-3 relative z-10">
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Operational Volume</h3>
          <div className="space-y-2">
            <div className="luxury-card p-4 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-surface-container group-hover:bg-tertiary-fixed/20 transition-colors">
                  <span className="material-symbols-outlined text-lg text-tertiary">science</span>
                </div>
                <div>
                  <p className="font-headline font-bold text-primary text-sm">TUNCH</p>
                  <p className="text-[9px] text-on-surface-variant">Verification Jobs</p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Processed</p>
                  <p className="font-headline text-base font-bold text-primary">64</p>
                </div>
                <div>
                  <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Pending</p>
                  <p className="font-headline text-base font-bold text-secondary">08</p>
                </div>
              </div>
            </div>
            <div className="luxury-card p-4 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-surface-container group-hover:bg-secondary-fixed/20 transition-colors">
                  <span className="material-symbols-outlined text-lg text-secondary">verified</span>
                </div>
                <div>
                  <p className="font-headline font-bold text-primary text-sm">MARKING</p>
                  <p className="text-[9px] text-on-surface-variant">Hallmarking Jobs</p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Processed</p>
                  <p className="font-headline text-base font-bold text-primary">158</p>
                </div>
                <div>
                  <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Pending</p>
                  <p className="font-headline text-base font-bold text-secondary">14</p>
                </div>
              </div>
            </div>
            <div className="luxury-card p-4 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-surface-container group-hover:bg-primary-fixed/20 transition-colors">
                  <span className="material-symbols-outlined text-lg text-primary">precision_manufacturing</span>
                </div>
                <div>
                  <p className="font-headline font-bold text-primary text-sm">SHOULDERING</p>
                  <p className="text-[9px] text-on-surface-variant">Workshop Jobs</p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Processed</p>
                  <p className="font-headline text-base font-bold text-primary">42</p>
                </div>
                <div>
                  <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Pending</p>
                  <p className="font-headline text-base font-bold text-secondary">12</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Global Workflow Status & Recent Assignments */}
        <section className="space-y-4 relative z-10">
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Global Workflow Status</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="luxury-card p-4 text-center relative overflow-hidden">
              <span className="material-symbols-outlined text-sm text-secondary-container mb-1 block glow-icon">rotate_right</span>
              <p className="text-[9px] text-outline uppercase font-bold mb-1.5 tracking-wider">In Progress</p>
              <p className="font-headline text-2xl font-bold text-primary">34</p>
              <div className="mt-2 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary-container w-[65%]"></div>
              </div>
            </div>
            <div className="luxury-card p-4 text-center border-b-4 border-b-tertiary-container relative overflow-hidden">
              <span className="material-symbols-outlined text-sm text-tertiary-container mb-1 block glow-icon">task_alt</span>
              <p className="text-[9px] text-outline uppercase font-bold mb-1.5 tracking-wider">Completed</p>
              <p className="font-headline text-2xl font-bold text-primary">264</p>
              <div className="mt-2 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-tertiary-container w-[90%]"></div>
              </div>
            </div>
            <div className="luxury-card p-4 text-center relative overflow-hidden">
              <span className="material-symbols-outlined text-sm text-primary mb-1 block glow-icon">package_2</span>
              <p className="text-[9px] text-outline uppercase font-bold mb-1.5 tracking-wider">Delivered</p>
              <p className="font-headline text-2xl font-bold text-primary">192</p>
              <div className="mt-2 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[75%]"></div>
              </div>
            </div>
          </div>
          
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1 mt-6">Recent Assignments</h3>
          <div className="luxury-card divide-y divide-surface-container overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-[10px] font-bold text-primary relative overflow-hidden">
                  <span className="material-symbols-outlined text-[10px] absolute opacity-20">science</span>
                  MA
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary">Tunch Verification #892</p>
                  <p className="text-[10px] text-outline">Assigned to: Marcus</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] px-2 py-0.5 bg-secondary-container/10 text-secondary-container rounded-full font-bold">In Progress</span>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-[10px] font-bold text-tertiary relative overflow-hidden">
                  <span className="material-symbols-outlined text-[10px] absolute opacity-20">verified</span>
                  EL
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary">Marking Job #341</p>
                  <p className="text-[10px] text-outline">Assigned to: Elena</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] px-2 py-0.5 bg-tertiary-container/10 text-tertiary-container rounded-full font-bold">New</span>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-[10px] font-bold text-primary relative overflow-hidden">
                  <span className="material-symbols-outlined text-[10px] absolute opacity-20">precision_manufacturing</span>
                  JU
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary">Shouldering Work #219</p>
                  <p className="text-[10px] text-outline">Assigned to: Julian</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] px-2 py-0.5 bg-secondary-container/10 text-secondary-container rounded-full font-bold">In Progress</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FAB */}
      <button className="fixed bottom-28 right-8 w-16 h-16 bg-primary text-on-primary rounded-full shadow-[0_8px_30px_rgb(0,30,64,0.4)] backdrop-blur-sm flex items-center justify-center active:scale-95 transition-all z-50 border-2 border-white/10">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
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
        <a onClick={() => navigate('/ledger')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">LEDGER</span>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
