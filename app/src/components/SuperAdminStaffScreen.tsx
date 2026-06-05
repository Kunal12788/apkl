import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import { triggerAppleToast } from './AppleToast';

// Create a separate client for auth signups so we don't log out the Super Admin
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const adminAuthClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

interface Branch {
  id: string;
  name: string;
  created_at?: string;
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  admin_id?: string | null;
  branch_id?: string | null;
  passkey?: string; // Stored just for reference if needed
}

export const SuperAdminStaffScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isFullyAuthenticated } = useSession();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'allocation' | 'logs'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Access Control & Activity Logs State
  const [loginAllowed, setLoginAllowed] = useState(true);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);

  // Modals
  const [showHireModal, setShowHireModal] = useState(false);
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState<string | null>(null); // holds branch_id when open
  const [showEditModal, setShowEditModal] = useState<UserProfile | null>(null);

  // Forms
  const [hireForm, setHireForm] = useState({
    name: '', email: '', phone: '', role: 'Staff', passkey: '', branch_id: ''
  });
  const [editForm, setEditForm] = useState({
    id: '', name: '', email: '', role: 'Staff', passkey: '', branch_id: ''
  });
  const [newBranchName, setNewBranchName] = useState('');
  const [allocateUserId, setAllocateUserId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchData = async () => {
    try {
      const [usersRes, branchesRes, settingsRes, logsRes] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase.from('branches').select('*').order('name'),
        supabase.from('login_settings').select('*').eq('id', 'login_allowed').maybeSingle(),
        supabase.from('staff_logs').select('*').order('created_at', { ascending: false }).limit(100)
      ]);
      if (usersRes.error) throw usersRes.error;
      if (branchesRes.error) throw branchesRes.error;
      
      setUsers(usersRes.data || []);
      setBranches(branchesRes.data || []);
      
      if (settingsRes.data) {
        setLoginAllowed(settingsRes.data.value);
      }
      if (logsRes.data) {
        setActivityLogs(logsRes.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshLogsAndSettings = async () => {
    setFetchingLogs(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        supabase.from('login_settings').select('*').eq('id', 'login_allowed').maybeSingle(),
        supabase.from('staff_logs').select('*').order('created_at', { ascending: false }).limit(100)
      ]);
      if (settingsRes.data) {
        setLoginAllowed(settingsRes.data.value);
      }
      if (logsRes.data) {
        setActivityLogs(logsRes.data);
      }
    } catch (err) {
      console.error('Error refreshing logs:', err);
    } finally {
      setFetchingLogs(false);
    }
  };

  const handleToggleLogin = async () => {
    const newValue = !loginAllowed;
    setLoginAllowed(newValue);
    
    triggerAppleToast(
      'Security Action',
      `Staff login access is now ${newValue ? 'ENABLED' : 'DISABLED'}`,
      newValue ? 'login' : 'logout'
    );

    try {
      const { error } = await supabase
        .from('login_settings')
        .upsert({ id: 'login_allowed', value: newValue, updated_at: new Date().toISOString() });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to toggle login setting:', err);
      setLoginAllowed(!newValue);
      triggerAppleToast('Security Alert', 'Failed to update login control.', 'logout');
    }
  };

  useEffect(() => {
    if (isFullyAuthenticated) {
      fetchData();
    }
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

      // 1. Sign up user in auth.users using the separate client to trigger Supabase Email Verification
      const { error: authError } = await adminAuthClient.auth.signUp({
        email: hireForm.email,
        password: hireForm.passkey,
        options: { data: { name: hireForm.name, role: hireForm.role } }
      });

      if (authError && !authError.message.includes('User already registered')) {
        throw new Error(authError.message);
      }

      // 2. Insert into public.users
      const newUser = {
        id: newId,
        name: hireForm.name,
        email: hireForm.email,
        phone: hireForm.phone || null,
        role: hireForm.role,
        branch_id: hireForm.branch_id ? hireForm.branch_id : null,
        passkey: hireForm.passkey
      };

      const { error: dbError } = await supabase.from('users').insert([newUser]);
      if (dbError) throw dbError;

      setHireForm({ name: '', email: '', phone: '', role: 'Staff', passkey: '', branch_id: '' });
      setShowHireModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Hire error:', err);
      setSubmitError(err.message || 'Failed to hire member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.email || !editForm.passkey) {
      setSubmitError('Name, Email, and Passkey are required.');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const { error } = await supabase.rpc('update_user_credentials', {
        p_user_id: editForm.id,
        p_name: editForm.name,
        p_email: editForm.email,
        p_passkey: editForm.passkey,
        p_role: editForm.role,
        p_branch_id: editForm.branch_id || null
      });

      if (error) throw error;

      setShowEditModal(null);
      fetchData();
    } catch (err: any) {
      console.error('Edit error:', err);
      setSubmitError(err.message || 'Failed to update member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passkey: user.passkey || '',
      branch_id: user.branch_id || ''
    });
    setSubmitError('');
    setShowEditModal(user);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('branches').insert([{ name: newBranchName }]);
      if (error) throw error;
      setNewBranchName('');
      setShowCreateBranchModal(false);
      fetchData();
    } catch (err) {
      console.error('Error creating branch:', err);
      alert('Failed to create branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAllocateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocateUserId || !showAllocateModal) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('users').update({ branch_id: showAllocateModal }).eq('id', allocateUserId);
      if (error) throw error;
      setAllocateUserId('');
      setShowAllocateModal(null);
      fetchData();
    } catch (err) {
      console.error('Error allocating user:', err);
      alert('Failed to allocate user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeAllocation = async (userId: string) => {
    try {
      const { error } = await supabase.from('users').update({ branch_id: null }).eq('id', userId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error removing allocation:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBranchName = (branchId?: string | null) => {
    if (!branchId) return null;
    const b = branches.find(b => b.id === branchId);
    return b ? b.name : branchId;
  };

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
              <p className="text-[10px] font-bold text-[#F6C358] uppercase tracking-widest opacity-90">Staff & Branches</p>
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
          className={`flex-1 rounded-full py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'all' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
        >
          All Directory
        </button>
        <button 
          onClick={() => setActiveTab('allocation')}
          className={`flex-1 rounded-full py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'allocation' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
        >
          Branch Allocation
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`flex-1 rounded-full py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'logs' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
        >
          Access & Logs
        </button>
      </div>

      <main className="flex-grow overflow-y-auto hide-scrollbar px-4 py-4 pb-32 z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-outline">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-3"></div>
            <p className="text-xs font-bold uppercase tracking-widest">Loading Data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* View: All Staff */}
            {activeTab === 'all' && (
              <div className="animate-fade-in space-y-3">
                {filteredUsers.map(user => (
                  <div key={user.id} className="luxury-card bg-white border border-outline-variant/20 rounded-2xl p-4 flex flex-col gap-3 transition-all hover:bg-surface-bright">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border shadow-sm shrink-0
                          ${user.role === 'Super Admin' ? 'bg-primary/10 text-primary border-primary/20' : 
                            user.role === 'Admin' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
                            'bg-tertiary/10 text-tertiary border-tertiary/20'}`}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mb-1">
                            <p className="font-headline font-bold text-primary text-base">{user.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 border rounded-md text-[9px] font-bold uppercase tracking-widest ${
                                user.role === 'Super Admin' ? 'bg-primary/10 text-primary border-primary/20' : 
                                user.role === 'Admin' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
                                'bg-tertiary/10 text-tertiary border-tertiary/20'
                              }`}>{user.role}</span>
                              {user.branch_id && (
                                <span className="px-2 py-0.5 bg-[#003366]/5 text-[#003366] border border-[#003366]/20 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[10px]">domain</span>
                                  {getBranchName(user.branch_id)}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] font-bold text-outline uppercase tracking-wider">{user.id}</p>
                        </div>
                      </div>
                      
                      {user.role !== 'Super Admin' && (
                        <button 
                          onClick={() => openEditModal(user)}
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-lowest border border-outline-variant/30 text-primary hover:bg-primary/5 hover:border-primary/30 transition-all shrink-0 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-outline font-medium py-8 text-sm">No personnel found.</p>
                )}
              </div>
            )}

            {/* View: Allocation Structure (Branches) */}
            {activeTab === 'allocation' && (
              <div className="animate-fade-in space-y-6">
                
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowCreateBranchModal(true)}
                    className="flex items-center gap-1.5 bg-white border border-outline-variant/30 text-primary px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-sm hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_business</span>
                    Create Branch
                  </button>
                </div>

                {branches.map(branch => {
                  const assignedStaff = users.filter(u => u.branch_id === branch.id);
                  return (
                    <div key={branch.id} className="luxury-card bg-white border border-secondary/20 rounded-3xl overflow-hidden shadow-sm">
                      {/* Branch Header */}
                      <div className="bg-gradient-to-r from-secondary/10 to-transparent p-4 flex items-center justify-between border-b border-secondary/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center premium-shadow">
                            <span className="material-symbols-outlined">domain</span>
                          </div>
                          <div>
                            <p className="font-headline font-extrabold text-primary text-base">{branch.name}</p>
                            <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Branch Location</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="bg-white px-3 py-1 rounded-full border border-secondary/20 shadow-sm">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{assignedStaff.length} Members</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Assigned Staff List */}
                      <div className="p-3 bg-surface-container-lowest">
                        {assignedStaff.length > 0 ? (
                          <div className="space-y-2 mb-3">
                            {assignedStaff.map(staff => (
                              <div key={staff.id} className="bg-white p-3 rounded-xl border border-outline-variant/20 flex items-center justify-between shadow-sm group">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                    ${staff.role === 'Admin' ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'}`}>
                                    {staff.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-headline font-bold text-primary text-sm">{staff.name}</p>
                                    <p className="text-[9px] font-bold text-outline uppercase tracking-wider">{staff.id} • {staff.role}</p>
                                  </div>
                                </div>
                                <button onClick={() => removeAllocation(staff.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-outline opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/10 hover:text-error">
                                  <span className="material-symbols-outlined text-sm">person_remove</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-outline opacity-60 flex flex-col items-center mb-2">
                            <span className="material-symbols-outlined mb-1">group_off</span>
                            <p className="text-[10px] font-bold uppercase tracking-widest">No members assigned</p>
                          </div>
                        )}
                        <button 
                          onClick={() => setShowAllocateModal(branch.id)}
                          className="w-full py-2.5 bg-white border border-dashed border-secondary/40 text-secondary hover:bg-secondary/5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">person_add</span> Allocate User
                        </button>
                      </div>
                    </div>
                  );
                })}
                {branches.length === 0 && (
                  <div className="text-center text-outline font-medium py-12 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl opacity-20">domain_disabled</span>
                    <p className="text-sm">No Branches available.</p>
                  </div>
                )}
              </div>
            )}

            {/* View: Access & Logs */}
            {activeTab === 'logs' && (
              <div className="animate-fade-in space-y-4">
                {/* 1. Login Access Control Card */}
                <div className="luxury-card bg-white border border-outline-variant/20 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-headline font-bold text-primary text-base flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary">vpn_key</span>
                        Staff Login Access
                      </h3>
                      <p className="text-xs text-outline leading-normal max-w-[240px] sm:max-w-none">
                        When switched OFF, all regular staff, admins, and collection staff will be blocked from logging in. Only Super Admins can log in.
                      </p>
                    </div>
                    
                    {/* Toggle Button */}
                    <button 
                      onClick={handleToggleLogin}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0 ${
                        loginAllowed ? 'bg-secondary' : 'bg-outline/30'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          loginAllowed ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className={`mt-4 pt-3 border-t border-outline-variant/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                    loginAllowed ? 'text-emerald-600' : 'text-error'
                  }`}>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        loginAllowed ? 'bg-emerald-400' : 'bg-error'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        loginAllowed ? 'bg-emerald-500' : 'bg-error'
                      }`}></span>
                    </span>
                    {loginAllowed ? 'Staff login active (Normal mode)' : 'Staff login blocked (Super admin only)'}
                  </div>
                </div>

                {/* 2. Staff Activity Timeline */}
                <div className="luxury-card bg-white border border-outline-variant/20 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <h3 className="font-headline font-bold text-primary text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">history</span>
                      Session Activity Log
                    </h3>
                    <button 
                      onClick={refreshLogsAndSettings}
                      disabled={fetchingLogs}
                      className="text-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:text-secondary-dark transition-colors active:scale-95 disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${fetchingLogs ? 'animate-spin' : ''}`}>sync</span>
                      Refresh
                    </button>
                  </div>

                  <div className="max-h-[350px] overflow-y-auto hide-scrollbar space-y-3.5 pr-1">
                    {activityLogs.length > 0 ? (
                      activityLogs.map((log) => {
                        const date = new Date(log.created_at);
                        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const isLogin = log.action === 'login';
                        
                        return (
                          <div key={log.id} className="flex gap-3 items-start text-xs border-b border-outline-variant/10 pb-3 last:border-b-0 last:pb-0">
                            {/* Action Icon Indicator */}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 mt-0.5 ${
                              isLogin 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              <span className="material-symbols-outlined text-base">
                                {isLogin ? 'login' : 'logout'}
                              </span>
                            </div>
                            
                            {/* Log details */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-primary">
                                <span className="font-bold text-[#1c1c1e]">{log.name}</span> <span className="text-outline font-semibold text-[10px]">({log.role})</span> 
                                {isLogin ? ' logged in successfully' : ' logged out safely'}
                              </p>
                              <p className="text-[10px] text-outline mt-0.5 uppercase tracking-wider font-semibold">
                                {log.email} • {log.user_id}
                              </p>
                            </div>

                            {/* Timestamp */}
                            <div className="text-right shrink-0">
                              <p className="font-bold text-primary text-[11px]">{timeStr}</p>
                              <p className="text-[9px] text-outline font-semibold mt-0.5">{dateStr}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-outline opacity-60 flex flex-col items-center">
                        <span className="material-symbols-outlined text-3xl mb-1.5 opacity-40">query_stats</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest">No activity logs recorded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
      </main>

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-[#001e40]/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
          <div className="absolute inset-0" onClick={() => setShowEditModal(null)} />
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative z-10 animate-slide-up sm:animate-modal-up flex flex-col max-h-[90svh]">
            
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="font-headline text-xl font-extrabold text-primary">Edit Member</h3>
                <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-0.5">{editForm.id}</p>
              </div>
              <button onClick={() => setShowEditModal(null)} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:bg-error/10 hover:text-error transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="overflow-y-auto hide-scrollbar pb-2">
              <form id="editForm" onSubmit={handleEditSubmit} className="space-y-4">
                
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
                    value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">Email Address</label>
                  <input 
                    type="email" required
                    value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">Encryption Passkey</label>
                  <input 
                    type="text" required
                    value={editForm.passkey} onChange={e => setEditForm({...editForm, passkey: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">Assign Role</label>
                  <select 
                    value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all appearance-none"
                  >
                    <option value="Staff">Staff (Standard)</option>
                    <option value="Collection Staff">Collection Staff</option>
                    <option value="Admin">Branch Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>

                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary px-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">domain</span> Assign to Branch
                  </label>
                  <select 
                    value={editForm.branch_id} onChange={e => setEditForm({...editForm, branch_id: e.target.value})}
                    className="w-full bg-secondary/5 border border-secondary/20 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none transition-all appearance-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

              </form>
            </div>
            
            <div className="mt-4 pt-4 border-t border-outline-variant/20 shrink-0">
              <button 
                form="editForm" type="submit" disabled={isSubmitting}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 premium-shadow"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-sm">save</span>
                )}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </div>
        </div>
      )}

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
                    value={hireForm.role} onChange={e => setHireForm({...hireForm, role: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all appearance-none"
                  >
                    <option value="Staff">Staff (Standard)</option>
                    <option value="Collection Staff">Collection Staff</option>
                    <option value="Admin">Branch Admin</option>
                  </select>
                </div>

                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary px-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">domain</span> Assign to Branch (Optional)
                  </label>
                  <select 
                    value={hireForm.branch_id} onChange={e => setHireForm({...hireForm, branch_id: e.target.value})}
                    className="w-full bg-secondary/5 border border-secondary/20 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none transition-all appearance-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

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

      {/* Create Branch Modal */}
      {showCreateBranchModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-[#001e40]/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
          <div className="absolute inset-0" onClick={() => setShowCreateBranchModal(false)} />
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative z-10 animate-slide-up sm:animate-modal-up flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-headline text-xl font-extrabold text-primary">Create Branch</h3>
                <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-0.5">Add a new location</p>
              </div>
            </div>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">Branch Name</label>
                <input 
                  type="text" required autoFocus
                  value={newBranchName} onChange={e => setNewBranchName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  placeholder="e.g. Delhi Branch"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCreateBranchModal(false)} className="flex-1 py-3 text-outline font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-surface-container transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting || !newBranchName} className="flex-1 py-3 bg-secondary text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#004a9e] transition-colors disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate User Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-[#001e40]/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
          <div className="absolute inset-0" onClick={() => setShowAllocateModal(null)} />
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative z-10 animate-slide-up sm:animate-modal-up flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-headline text-xl font-extrabold text-primary">Allocate User</h3>
                <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-0.5">Assign personnel to branch</p>
              </div>
            </div>
            <form onSubmit={handleAllocateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">Select User</label>
                <select 
                  required
                  value={allocateUserId} onChange={e => setAllocateUserId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 px-4 text-sm font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all appearance-none"
                >
                  <option value="" disabled>-- Choose a user --</option>
                  {users.filter(u => u.branch_id !== showAllocateModal && u.role !== 'Super Admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAllocateModal(null)} className="flex-1 py-3 text-outline font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-surface-container transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting || !allocateUserId} className="flex-1 py-3 bg-secondary text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#004a9e] transition-colors disabled:opacity-50">Allocate</button>
              </div>
            </form>
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
