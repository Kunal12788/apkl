import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';

export const SuperAdminWorkScreen: React.FC = () => {
  const navigate = useNavigate();
  
  // Date filtering state
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(today);
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, tasksRes, txRes] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase.from('tasks').select('*').gte('iso_date', fromDate).lte('iso_date', toDate),
        supabase.from('transactions').select('*').gte('iso_date', fromDate).lte('iso_date', toDate)
      ]);
      
      if (usersRes.error) throw usersRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (txRes.error) throw txRes.error;
      
      setUsers(usersRes.data || []);
      setTasks(tasksRes.data || []);
      setTransactions(txRes.data || []);
      
    } catch (err) {
      console.error('Error fetching work metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  // Aggregate stats based on roles
  const userStats = useMemo(() => {
    return users.map(user => {
      let stats = {
        tunch: 0,
        marking: 0,
        shouldering: 0,
        totalTasks: 0,
        totalTransactions: 0
      };

      if (user.role === 'Staff') {
        // Staff metrics: Tasks assigned to them that are completed
        const staffTasks = tasks.filter(t => t.assigned_to === user.id && t.status === 'Completed');
        staffTasks.forEach(t => {
          const pieces = parseInt(t.pieces || '0', 10) || 0;
          if (t.work_type === 'Tunch') stats.tunch += pieces;
          if (t.work_type === 'Marking') stats.marking += pieces;
          if (t.work_type === 'Shouldering') stats.shouldering += pieces;
        });
      } else if (user.role === 'Collection Staff') {
        // Collection Staff metrics: Tasks brought by them
        const broughtTasks = tasks.filter(t => t.brought_by === user.id);
        broughtTasks.forEach(t => {
          const pieces = parseInt(t.pieces || '0', 10) || 0;
          if (t.work_type === 'Tunch') stats.tunch += pieces;
          if (t.work_type === 'Marking') stats.marking += pieces;
          if (t.work_type === 'Shouldering') stats.shouldering += pieces;
        });
      } else if (user.role === 'Admin') {
        // Admin metrics: Total tasks and transactions for their branch
        // For tasks, we find tasks assigned to staff in their branch
        const branchStaffIds = users.filter(u => u.branch_id === user.branch_id && u.role === 'Staff').map(u => u.id);
        const branchTasks = tasks.filter(t => branchStaffIds.includes(t.assigned_to));
        stats.totalTasks = branchTasks.length;

        // Note: Transactions don't have branch_id directly, but typically happen at the branch
        // We'll count all transactions in the branch for simplicity if there's a branch concept in tx,
        // else we'll just count total tasks as a solid metric.
      }

      return { ...user, stats };
    });
  }, [users, tasks, transactions]);

  const filteredUsers = userStats.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background text-on-background font-body min-h-[100svh] relative overflow-y-auto hide-scrollbar">
      <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-outline-variant/20 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary shadow-sm hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-xl font-bold text-primary leading-tight">Work Metrics</h1>
            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Operational Analytics</p>
          </div>
        </div>
      </header>

      <main className="px-6 pt-6 pb-24 max-w-5xl mx-auto space-y-6">
        
        {/* Date Filter */}
        <div className="bg-white p-5 rounded-3xl border border-outline-variant/20 shadow-md luxury-card flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <span className="text-[9px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">From Date</span>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none focus:border-tertiary transition-all"
            />
          </div>
          <div className="flex-1 relative group">
            <span className="text-[9px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">To Date</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none focus:border-tertiary transition-all"
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input 
            type="text" 
            placeholder="Search users by name or role..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-3xl border border-outline-variant/20">
                <p className="text-outline text-sm font-medium">No users found.</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="bg-white rounded-[2rem] p-5 border border-outline-variant/20 shadow-sm luxury-card relative overflow-hidden group hover:shadow-md transition-all">
                  
                  {user.role === 'Staff' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>}
                  {user.role === 'Collection Staff' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary"></div>}
                  {user.role === 'Admin' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-tertiary"></div>}
                  {user.role === 'Super Admin' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error"></div>}

                  <div className="flex justify-between items-start mb-4 pl-3">
                    <div>
                      <h3 className="font-headline font-bold text-lg text-primary">{user.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-outline bg-surface-container px-2 py-0.5 rounded-md">
                          {user.role}
                        </span>
                        {user.branch_id && (
                          <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-[#003366]/5 px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#003366]/10">
                            <span className="material-symbols-outlined text-[12px]">domain</span>
                            {user.branch_id.replace('BR-', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {user.role === 'Staff' && (
                    <div className="grid grid-cols-3 gap-2 pl-3">
                      <div className="bg-[#003366]/5 p-3 rounded-2xl flex flex-col items-center justify-center border border-[#003366]/10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">Tunch</span>
                        <span className="font-headline font-black text-primary text-xl">{user.stats.tunch}</span>
                        <span className="text-[8px] font-medium text-outline">Pieces Done</span>
                      </div>
                      <div className="bg-[#003366]/5 p-3 rounded-2xl flex flex-col items-center justify-center border border-[#003366]/10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">Marking</span>
                        <span className="font-headline font-black text-primary text-xl">{user.stats.marking}</span>
                        <span className="text-[8px] font-medium text-outline">Pieces Done</span>
                      </div>
                      <div className="bg-[#003366]/5 p-3 rounded-2xl flex flex-col items-center justify-center border border-[#003366]/10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">Shoulder</span>
                        <span className="font-headline font-black text-primary text-xl">{user.stats.shouldering}</span>
                        <span className="text-[8px] font-medium text-outline">Pieces Done</span>
                      </div>
                    </div>
                  )}

                  {user.role === 'Collection Staff' && (
                    <div className="grid grid-cols-3 gap-2 pl-3">
                      <div className="bg-secondary/5 p-3 rounded-2xl flex flex-col items-center justify-center border border-secondary/10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">Tunch</span>
                        <span className="font-headline font-black text-secondary text-xl">{user.stats.tunch}</span>
                        <span className="text-[8px] font-medium text-outline">Pieces Brought</span>
                      </div>
                      <div className="bg-secondary/5 p-3 rounded-2xl flex flex-col items-center justify-center border border-secondary/10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">Marking</span>
                        <span className="font-headline font-black text-secondary text-xl">{user.stats.marking}</span>
                        <span className="text-[8px] font-medium text-outline">Pieces Brought</span>
                      </div>
                      <div className="bg-secondary/5 p-3 rounded-2xl flex flex-col items-center justify-center border border-secondary/10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">Shoulder</span>
                        <span className="font-headline font-black text-secondary text-xl">{user.stats.shouldering}</span>
                        <span className="text-[8px] font-medium text-outline">Pieces Brought</span>
                      </div>
                    </div>
                  )}

                  {user.role === 'Admin' && (
                    <div className="grid grid-cols-2 gap-2 pl-3">
                      <div className="bg-tertiary/5 p-4 rounded-2xl flex flex-col items-center justify-center border border-tertiary/10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1">Branch Tasks</span>
                        <span className="font-headline font-black text-tertiary text-2xl">{user.stats.totalTasks}</span>
                        <span className="text-[9px] font-medium text-outline mt-1 text-center">Total tasks handled by staff under this branch</span>
                      </div>
                    </div>
                  )}
                  
                  {user.role === 'Super Admin' && (
                    <div className="pl-3 mt-2">
                      <p className="text-xs text-outline italic">Master account. System-wide visibility.</p>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};
