import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';

// Create a separate client for auth signups so we don't log out the Super Admin
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const adminAuthClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

interface UserProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  admin_id?: string | null;
  passkey?: string; // Stored just for reference if needed
}

export const SuperAdminStaffScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isFullyAuthenticated } = useSession();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'allocation'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireForm, setHireForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Staff',
    passkey: '',
    admin_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('name');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFullyAuthenticated) fetchUsers();
  }, [isFullyAuthenticated]);

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hireForm.name || !hireForm.email || !hireForm.passkey) {
      setSubmitError('Name, Email, and Passkey are required.');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Generate ID based on role
      let prefix = 'STAFF-';
      if (hireForm.role === 'Admin') prefix = 'ADMIN-';
      if (hireForm.role === 'Collection Staff') prefix = 'COLL-';
      const newId = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Sign up user in auth.users using the separate client
      const { error: authError } = await adminAuthClient.auth.signUp({
        email: hireForm.email,
        password: hireForm.passkey,
        options: {
          data: {
            name: hireForm.name,
            role: hireForm.role
          }
        }
      });

      if (authError) {
        // If user already exists in auth, we might just proceed to insert in public.users
        if (!authError.message.includes('User already registered')) {
          throw new Error(authError.message);
        }
      }

      // 2. Insert into public.users
      const newUser = {
        id: newId,
        name: hireForm.name,
        email: hireForm.email,
        phone: hireForm.phone || null,
        role: hireForm.role,
        admin_id: (hireForm.role === 'Staff' || hireForm.role === 'Collection Staff') && hireForm.admin_id ? hireForm.admin_id : null,
        passkey: hireForm.passkey
      };

      const { error: dbError } = await supabase.from('users').insert([newUser]);
      if (dbError) throw dbError;

      // Reset & close
      setHireForm({ name: '', email: '', phone: '', role: 'Staff', passkey: '', admin_id: '' });
      setShowHireModal(false);
      fetchUsers();

    } catch (err: any) {
      console.error('Hire error:', err);
      setSubmitError(err.message || 'Failed to hire member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived data
  const admins = users.filter(u => u.role === 'Admin');
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative flex flex-col overflow-hidden">
      
      {/* Header */}
      <header className="shrink-0 bg-gradient-to-br from-[#003366] to-[#001e40] px-6 pt-8 pb-6 relative shadow-lg z-20">
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md border border-white/10 active:scale-95 transition-transform">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-headline font-bold text-white tracking-wide">Personnel</h1>
              <p className="text-[10px] font-bold text-[#F6C358] uppercase tracking-widest opacity-90">Staff & Admins</p>
            </div>
          </div>
          <button 
            onClick={() => setShowHireModal(true)}
            className="flex items-center gap-2 bg-[#F6C358] text-[#001e40] px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform premium-shadow"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Hire
          </button>
        </div>
        
        {/* Search */}
        {activeTab === 'all' && (
          <div className="relative z-10 animate-fade-in">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">search</span>
            <input 
              type="text" 
              placeholder="Search by name, role or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white rounded-2xl py-3 pl-12 pr-4 text-sm font-medium text-primary shadow-lg border-2 border-transparent focus:border-[#F6C358]/50 focus:outline-none transition-all placeholder:text-outline/50"
            />
          </div>
        )}
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
      </header>

      {/* Tabs */}
      <div className="flex bg-surface-container rounded-full p-1.5 shadow-inner mx-4 mt-4 shrink-0 relative z-10">
        <button 
          onClick={() => setActiveTab('all')}
          className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'all' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
        >
          All Directory
        </button>
        <button 
          onClick={() => setActiveTab('allocation')}
          className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'allocation' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
        >
          Allocation Structure
        </button>
      </div>

      <main className="flex-grow overflow-y-auto hide-scrollbar px-4 py-4 pb-32 z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-outline">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-3"></div>
            <p className="text-xs font-bold uppercase tracking-widest">Loading Personnel...</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* View: All Staff */}
            {activeTab === 'all' && (
              <div className="animate-fade-in space-y-3">
                {filteredUsers.map(user => (
                  <div key={user.id} className="luxury-card bg-white border border-outline-variant/20 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-surface-bright">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg border shadow-sm
                        ${user.role === 'Super Admin' ? 'bg-primary/10 text-primary border-primary/20' : 
                          user.role === 'Admin' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
                          'bg-tertiary/10 text-tertiary border-tertiary/20'}`}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-headline font-bold text-primary">{user.name}</p>
                        <p className="text-[9px] font-bold text-outline uppercase tracking-wider">{user.id} • {user.role}</p>
                      </div>
                    </div>
                    {user.admin_id && (
                      <div className="text-right flex flex-col items-end">
                        <p className="text-[8px] font-bold text-outline uppercase tracking-widest">Reports To</p>
                        <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded-md border border-outline-variant/20 mt-0.5">
                          <span className="material-symbols-outlined text-[10px] text-secondary">shield_person</span>
                          <p className="text-[9px] font-bold text-secondary">{users.find(u => u.id === user.admin_id)?.name || user.admin_id}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-outline font-medium py-8 text-sm">No personnel found.</p>
                )}
              </div>
            )}

            {/* View: Allocation Structure */}
            {activeTab === 'allocation' && (
              <div className="animate-fade-in space-y-6">
                {admins.map(admin => {
                  const assignedStaff = users.filter(u => u.admin_id === admin.id);
                  return (
                    <div key={admin.id} className="luxury-card bg-white border border-secondary/20 rounded-3xl overflow-hidden shadow-sm">
                      {/* Admin Header */}
                      <div className="bg-gradient-to-r from-secondary/10 to-transparent p-4 flex items-center justify-between border-b border-secondary/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center premium-shadow">
                            <span className="material-symbols-outlined">shield_person</span>
                          </div>
                          <div>
                            <p className="font-headline font-extrabold text-primary text-base">{admin.name}</p>
                            <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">{admin.id} • Branch Admin</p>
                          </div>
                        </div>
                        <div className="bg-white px-3 py-1 rounded-full border border-secondary/20 shadow-sm">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{assignedStaff.length} Staff</p>
                        </div>
                      </div>
                      
                      {/* Assigned Staff List */}
                      <div className="p-3 bg-surface-container-lowest">
                        {assignedStaff.length > 0 ? (
                          <div className="space-y-2">
                            {assignedStaff.map(staff => (
                              <div key={staff.id} className="bg-white p-3 rounded-xl border border-outline-variant/20 flex items-center gap-3 shadow-sm">
                                <div className="w-8 h-8 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">
                                  <span className="material-symbols-outlined text-sm">person</span>
                                </div>
                                <div>
                                  <p className="font-headline font-bold text-primary text-sm">{staff.name}</p>
                                  <p className="text-[9px] font-bold text-outline uppercase tracking-wider">{staff.id} • {staff.role}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-outline opacity-60 flex flex-col items-center">
                            <span className="material-symbols-outlined mb-1">group_off</span>
                            <p className="text-[10px] font-bold uppercase tracking-widest">No staff assigned</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {admins.length === 0 && (
                  <p className="text-center text-outline font-medium py-8 text-sm">No Admins available in the system.</p>
                )}
              </div>
            )}
            
          </div>
        )}
      </main>

      {/* Hire Member Modal */}
      {showHireModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-[#001e40]/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
          <div className="absolute inset-0" onClick={() => setShowHireModal(false)} />
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative z-10 animate-slide-up sm:animate-modal-up flex flex-col max-h-[90svh]">
            
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="font-headline text-xl font-extrabold text-primary">Hire Member</h3>
                <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-0.5">Add to personnel directory</p>
              </div>
              <button onClick={() => setShowHireModal(false)} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:bg-error/10 hover:text-error transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="overflow-y-auto hide-scrollbar pb-2">
              <form id="hireForm" onSubmit={handleHireSubmit} className="space-y-4">
                
                {submitError && (
                  <div className="bg-error/10 border border-error/20 p-3 rounded-xl flex items-center gap-2 text-error">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <p className="text-xs font-bold">{submitError}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">Full Name</label>
                  <input 
                    type="text" required
                    value={hireForm.name} onChange={e => setHireForm({...hireForm, name: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">Email Address</label>
                  <input 
                    type="email" required
                    value={hireForm.email} onChange={e => setHireForm({...hireForm, email: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">Encryption Passkey</label>
                  <input 
                    type="text" required
                    value={hireForm.passkey} onChange={e => setHireForm({...hireForm, passkey: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Set login password"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">Assign Role</label>
                  <select 
                    value={hireForm.role} onChange={e => setHireForm({...hireForm, role: e.target.value, admin_id: ''})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all appearance-none"
                  >
                    <option value="Staff">Staff (Standard)</option>
                    <option value="Collection Staff">Collection Staff</option>
                    <option value="Admin">Branch Admin</option>
                  </select>
                </div>

                {(hireForm.role === 'Staff' || hireForm.role === 'Collection Staff') && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-secondary px-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">shield_person</span> Report To Admin (Optional)
                    </label>
                    <select 
                      value={hireForm.admin_id} onChange={e => setHireForm({...hireForm, admin_id: e.target.value})}
                      className="w-full bg-secondary/5 border border-secondary/20 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none transition-all appearance-none"
                    >
                      <option value="">-- No Admin Assigned --</option>
                      {admins.map(admin => (
                        <option key={admin.id} value={admin.id}>{admin.name} ({admin.id})</option>
                      ))}
                    </select>
                  </div>
                )}

              </form>
            </div>
            
            <div className="mt-4 pt-4 border-t border-outline-variant/20 shrink-0">
              <button 
                form="hireForm" type="submit" disabled={isSubmitting}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 premium-shadow"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-sm">person_add</span>
                )}
                {isSubmitting ? 'Processing...' : 'Confirm Hire'}
              </button>
            </div>

          </div>
        </div>
      )}

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
