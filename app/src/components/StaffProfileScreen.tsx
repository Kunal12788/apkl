import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const StaffProfileScreen: React.FC = () => {
  const navigate = useNavigate();

  const userId = localStorage.getItem('user_id') || 'STAFF-001';
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (!error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile from Supabase:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const getProfileData = () => {
    if (profile) {
      return {
        name: profile.name,
        role: profile.role,
        id: profile.id,
        phone: profile.phone || '+91 98765 43210',
        email: profile.email || 'k7474740@gmail.com'
      };
    }

    if (userId.startsWith('ADMIN-')) {
      return {
        name: 'Delhi Branch Admin',
        role: 'Admin',
        id: 'ADMIN-001',
        phone: '+91 98888 77777',
        email: 'k9836282432@gmail.com'
      };
    }
    if (userId.startsWith('SUPER-')) {
      return {
        name: 'Chief Super Admin',
        role: 'Super Admin',
        id: 'SUPER-001',
        phone: '+91 99999 88888',
        email: 'ssrcreations41@gmail.com'
      };
    }
    return {
      name: 'Marcus Reynolds',
      role: 'Staff',
      id: 'STAFF-001',
      phone: '+91 98765 43210',
      email: 'k7474740@gmail.com'
    };
  };

  if (loading) {
    return <div className="bg-background text-on-background font-body w-full h-[100svh] flex items-center justify-center">Loading...</div>;
  }

  const staffData = getProfileData();

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-32 relative">
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">My Profile</h1>
            <p className="text-xs text-outline font-medium">Manage account and preferences</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative">
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse border border-white"></span>
          </button>
        </header>

        {/* Profile Card */}
        <div className="luxury-card overflow-hidden">
          <div className="bg-gradient-to-br from-[#003366] to-[#001e40] p-6 text-white relative flex flex-col items-center text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 relative shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <span className="material-symbols-outlined text-5xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">person</span>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#C9A646] rounded-full border-2 border-[#001e40] flex items-center justify-center">
                <span className="material-symbols-outlined text-[10px] text-[#001e40] font-bold">verified</span>
              </div>
            </div>
            <h2 className="font-headline text-2xl font-extrabold text-[#F6C358] tracking-tight">{staffData.name}</h2>
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
          <span className="font-label text-[10px] uppercase tracking-widest">LEDGER</span>
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
