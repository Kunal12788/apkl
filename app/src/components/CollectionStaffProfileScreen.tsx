import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const CollectionStaffProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id') || 'COLL-001';

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    collections: 124,
    onTimeDelivery: '100%',
    verifiedIntakes: 118
  });

  useEffect(() => {
    const loadProfileAndStats = async () => {
      try {
        // Fetch profile details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!userError && userData) {
          setProfile(userData);
        }

        // Fetch task counts
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('status')
          .eq('created_by', userId);

        if (!tasksError && tasksData) {
          const total = tasksData.length;
          const completed = tasksData.filter((t: any) => t.status === 'Completed').length;
          setStats({
            collections: total,
            onTimeDelivery: '100%',
            verifiedIntakes: completed
          });
        }
      } catch (err) {
        console.error('Error loading collection staff profile or stats:', err);
      }
    };

    loadProfileAndStats();
  }, [userId]);

  const staffData = {
    name: profile?.name || localStorage.getItem('user_name') || 'Staff Member',
    role: profile?.role || localStorage.getItem('user_role') || 'Collection Staff',
    id: profile?.id || userId,
    phone: profile?.phone || '+91 91234 56789',
    email: profile?.email || 'Fetching email...',
    stats
  };

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-32 relative">
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">My Identity</h1>
            <p className="text-xs text-outline font-medium">Field Personnel Security Clearance</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
        </header>

        {/* Profile Card */}
        <div className="luxury-card overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary-container p-8 text-white relative flex flex-col items-center text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 relative shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <span className="material-symbols-outlined text-5xl text-tertiary-fixed drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">local_shipping</span>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-tertiary rounded-full border-2 border-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[10px] text-primary font-bold">verified</span>
              </div>
            </div>
            <h2 className="font-headline text-2xl font-extrabold text-white tracking-tight">{staffData.name}</h2>
            <p className="text-[11px] uppercase tracking-widest text-white/80 font-bold mt-1">{staffData.role}</p>
            <div className="bg-white/10 px-3 py-1 rounded-full mt-3 border border-white/20">
              <p className="text-[10px] uppercase tracking-widest text-white font-bold">{staffData.id}</p>
            </div>
          </div>
          
          <div className="p-5 bg-white border-b border-outline-variant/20 flex flex-col gap-3">
             <div className="flex items-center gap-3">
               <span className="material-symbols-outlined text-outline text-lg">call</span>
               <p className="font-bold text-sm text-primary">{staffData.phone}</p>
             </div>
             <div className="flex items-center gap-3">
               <span className="material-symbols-outlined text-outline text-lg">mail</span>
               <p className="font-bold text-sm text-primary">{staffData.email}</p>
             </div>
          </div>

          <div className="p-5 grid grid-cols-3 gap-4 bg-surface-container-lowest">
             <div className="text-center">
                <p className="text-[8px] font-bold text-outline uppercase mb-1">Collections</p>
                <p className="text-sm font-black text-primary">{staffData.stats.collections}</p>
             </div>
             <div className="text-center border-x border-outline-variant/10">
                <p className="text-[8px] font-bold text-outline uppercase mb-1">On-Time</p>
                <p className="text-sm font-black text-secondary">{staffData.stats.onTimeDelivery}</p>
             </div>
             <div className="text-center">
                <p className="text-[8px] font-bold text-outline uppercase mb-1">Verified</p>
                <p className="text-sm font-black text-tertiary">{staffData.stats.verifiedIntakes}</p>
             </div>
          </div>
        </div>

        {/* Logout Button */}
        <button onClick={() => navigate('/login')} className="w-full mt-4 bg-error/10 border border-error/20 hover:bg-error/20 hover:border-error/30 text-error rounded-2xl py-4 font-bold text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-lg">logout</span>
          Secure Logout
        </button>

      </main>

      {/* Bottom Nav Bar */}
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
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
        </a>
      </nav>
    </div>
  );
};
