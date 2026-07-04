import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';
import { NotificationBell } from './NotificationBell';

interface User {
  id: string;
  name: string;
  role: string;
  branch_id?: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  created_by?: string;
}

interface Transaction {
  id: string;
  customer_id: string;
  customer_name: string;
  metal: 'Gold' | 'Silver';
  type: string;
  work_type: string;
  amount: string;
  date: string;
  iso_date: string;
  details?: string;
  pure_weight?: string;
  pureWeight?: string;
  created_by?: string;
  createdBy?: string;
  isCashExchange?: boolean;
  pieces?: string;
}

interface Task {
  id: string;
  customer_id: string;
  customer_name: string;
  metal: 'Gold' | 'Silver';
  work_type: string;
  status: string;
  pieces?: string;
  pure_weight?: string;
  pureWeight?: string;
  created_by?: string;
  iso_date: string;
  settlement_condition?: string;
  cash_amount?: number;
}

interface MetricSummary {
  purchaseCount: number;
  purchaseAmount: number;
  purchaseGoldWeight: number;
  purchaseSilverWeight: number;

  salesCount: number;
  salesAmount: number;
  salesGoldWeight: number;
  salesSilverWeight: number;
}

export const SuperAdminStockScreen: React.FC = () => {
  const navigate = useNavigate();

  // Cached lists
  const cachedUsers = getCachedData('users_list');
  const cachedBranches = getCachedData('super_admin_branches');
  const cachedCustomers = getCachedData('db_customers');

  // Core state
  const [users, setUsers] = useState<User[]>(cachedUsers || []);
  const [branches, setBranches] = useState<Branch[]>(cachedBranches || []);
  const [customers, setCustomers] = useState<Customer[]>(cachedCustomers || []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [branchSearch, setBranchSearch] = useState<string>('');

  // Time range filters
  const [timeRangeMode, setTimeRangeMode] = useState<'month' | 'annual' | 'lifetime' | 'custom'>('lifetime');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Helper pad function for dates
  const pad = (n: number) => n < 10 ? `0${n}` : n;

  // Sync date range based on Time Mode selection
  useEffect(() => {
    if (timeRangeMode === 'month') {
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
      setFromDate(`${selectedYear}-${pad(selectedMonth + 1)}-01`);
      setToDate(`${selectedYear}-${pad(selectedMonth + 1)}-${pad(lastDay.getDate())}`);
    } else if (timeRangeMode === 'annual') {
      setFromDate(`${selectedYear}-01-01`);
      setToDate(`${selectedYear}-12-31`);
    } else if (timeRangeMode === 'lifetime') {
      setFromDate('');
      setToDate('');
    }
  }, [timeRangeMode, selectedMonth, selectedYear]);

  // Initial and real-time data fetching
  const fetchData = async () => {
    try {
      const [usersRes, branchesRes, customersRes, transactionsRes, tasksRes] = await Promise.all([
        supabase.from('users').select('id, name, role, branch_id'),
        supabase.from('branches').select('id, name'),
        supabase.from('customers').select('id, name, created_by'),
        supabase.from('transactions').select('*'),
        supabase.from('tasks').select('*').eq('status', 'Completed')
      ]);

      if (usersRes.data) {
        setUsers(usersRes.data);
        setCachedData('users_list', usersRes.data);
      }
      if (branchesRes.data) {
        setBranches(branchesRes.data);
        setCachedData('super_admin_branches', branchesRes.data);
      }
      if (customersRes.data) {
        setCustomers(customersRes.data);
        setCachedData('db_customers', customersRes.data);
      }
      if (transactionsRes.data) {
        setTransactions(transactionsRes.data);
      }
      if (tasksRes.data) {
        setCompletedTasks(tasksRes.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stock metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const syncSub = supabase.channel('public:stock_screen_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(syncSub);
    };
  }, []);

  // Filter items by Date Range
  const filterByDateRange = (isoDateStr?: string) => {
    if (!isoDateStr) return false;
    const datePart = isoDateStr.split('T')[0];
    if (fromDate && datePart < fromDate) return false;
    if (toDate && datePart > toDate) return false;
    return true;
  };

  // Helper function to resolve the branch name for a task or transaction
  const getItemBranchName = (item: any) => {
    const creatorId = item.created_by || item.createdBy || item.staff_id;
    if (creatorId) {
      const u = users.find(user => user.id === creatorId);
      if (u && u.branch_id) {
        const br = branches.find(b => b.id === u.branch_id);
        if (br) return br.name;
      }
    }
    
    // Fallback: lookup by customer creator's branch
    const custId = item.customer_id || item.customerId;
    const custName = item.customer_name || item.customerName;
    if (custId || custName) {
      const dbCust = customers.find(c => (custId && c.id === custId) || (custName && c.name.trim().toLowerCase() === custName.trim().toLowerCase()));
      if (dbCust && dbCust.created_by) {
        const u = users.find(user => user.id === dbCust.created_by);
        if (u && u.branch_id) {
          const br = branches.find(b => b.id === u.branch_id);
          if (br) return br.name;
        }
      }
    }
    return 'Head Office';
  };

  // Helper list to prevent double counting completed Tunch tasks
  const tunchIncrementedTasks = new Set<string>();

  // Process data and aggregate metrics per branch & globally
  const aggregateMetrics = () => {
    const breakdown: Record<string, MetricSummary> = {};
    const global: MetricSummary = {
      purchaseCount: 0,
      purchaseAmount: 0,
      purchaseGoldWeight: 0,
      purchaseSilverWeight: 0,
      salesCount: 0,
      salesAmount: 0,
      salesGoldWeight: 0,
      salesSilverWeight: 0
    };

    tunchIncrementedTasks.clear();

    // 1. Process tasks (for pure gold/silver settled Tunch tasks that lack receipts)
    completedTasks.forEach(task => {
      if (!filterByDateRange(task.iso_date)) return;

      const cond = (task.settlement_condition || '').toLowerCase();
      const isPureGold = cond.includes('pure gold');
      const isPureSilver = cond.includes('pure silver');
      
      if (isPureGold || isPureSilver) {
        const branchName = getItemBranchName(task);
        if (!breakdown[branchName]) {
          breakdown[branchName] = {
            purchaseCount: 0, purchaseAmount: 0, purchaseGoldWeight: 0, purchaseSilverWeight: 0,
            salesCount: 0, salesAmount: 0, salesGoldWeight: 0, salesSilverWeight: 0
          };
        }

        const pcs = Number(task.pieces || 1) || 1;
        const pureW = parseFloat(task.pure_weight || task.pureWeight || '0') || 0;
        
        let amt = 0;
        const isCash = cond.includes('cash');
        if (isCash && task.cash_amount !== null && task.cash_amount !== undefined) {
          amt = Number(task.cash_amount);
        } else {
          const amountMatch = cond.match(/[₹?](\d[\d,]*)/);
          amt = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
        }

        // Tunch task counts as a purchase category
        breakdown[branchName].purchaseCount += pcs;
        global.purchaseCount += pcs;

        breakdown[branchName].purchaseAmount += amt;
        global.purchaseAmount += amt;

        tunchIncrementedTasks.add(task.id);

        if (isPureGold) {
          breakdown[branchName].purchaseGoldWeight += pureW;
          global.purchaseGoldWeight += pureW;
        } else {
          breakdown[branchName].purchaseSilverWeight += pureW;
          global.purchaseSilverWeight += pureW;
        }
      }
    });

    transactions.forEach(t => {
      if (!filterByDateRange(t.iso_date)) return;
      if (t.work_type === 'Dues Payment') return;

      const branchName = getItemBranchName(t);
      if (!breakdown[branchName]) {
        breakdown[branchName] = {
          purchaseCount: 0, purchaseAmount: 0, purchaseGoldWeight: 0, purchaseSilverWeight: 0,
          salesCount: 0, salesAmount: 0, salesGoldWeight: 0, salesSilverWeight: 0
        };
      }

      const pcs = Number(t.pieces || 1) || 1;
      const amtNum = parseFloat(t.amount.replace(/[^\d.]/g, '')) || 0;
      const pureW = parseFloat(t.pureWeight || t.pure_weight || '0') || 0;
      const metalLower = (t.metal || 'Gold').toLowerCase();

      if (t.work_type === 'Tunch') {
        const details = (t.details || '').toLowerCase();
        const type = (t.type || '').toLowerCase();
        const isServiceFee = type.includes('service fee') || details.includes('service fee');

        if (!isServiceFee) {
          const isCash = type.includes('cash') || t.isCashExchange || details.includes('cash');
          const isPureGold = details.includes('pure gold');
          const isPureSilver = details.includes('pure silver');

          if (isCash || isPureGold || isPureSilver) {
            // "Buy Against Tunch" / "Gold Against Tunch" / "Silver Against Tunch" -> Purchase
            breakdown[branchName].purchaseCount += pcs;
            global.purchaseCount += pcs;

            breakdown[branchName].purchaseAmount += amtNum;
            global.purchaseAmount += amtNum;

            if (metalLower.includes('silver') || isPureSilver) {
              breakdown[branchName].purchaseSilverWeight += pureW;
              global.purchaseSilverWeight += pureW;
            } else {
              breakdown[branchName].purchaseGoldWeight += pureW;
              global.purchaseGoldWeight += pureW;
            }
          }
        }
      } else if (t.work_type === 'Buy') {
        // "Buy Works" -> Purchase
        breakdown[branchName].purchaseCount += pcs;
        global.purchaseCount += pcs;

        breakdown[branchName].purchaseAmount += amtNum;
        global.purchaseAmount += amtNum;

        if (metalLower.includes('silver')) {
          breakdown[branchName].purchaseSilverWeight += pureW;
          global.purchaseSilverWeight += pureW;
        } else {
          breakdown[branchName].purchaseGoldWeight += pureW;
          global.purchaseGoldWeight += pureW;
        }
      } else if (t.work_type === 'Sell') {
        // "Sell Works" -> Sales
        breakdown[branchName].salesCount += pcs;
        global.salesCount += pcs;

        breakdown[branchName].salesAmount += amtNum;
        global.salesAmount += amtNum;

        if (metalLower.includes('silver')) {
          breakdown[branchName].salesSilverWeight += pureW;
          global.salesSilverWeight += pureW;
        } else {
          breakdown[branchName].salesGoldWeight += pureW;
          global.salesGoldWeight += pureW;
        }
      }
    });

    return { breakdown, global };
  };

  const { breakdown, global } = aggregateMetrics();

  // Filter branches list based on search term
  const filteredBranches = branches.filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()));

  // Render loading state
  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-[100svh] flex flex-col items-center justify-center ambient-bg relative z-10 w-full overflow-hidden">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
        <p className="text-[10px] tracking-widest text-outline uppercase font-black">Analyzing transaction registry...</p>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body w-full min-h-[100svh] relative overflow-y-auto hide-scrollbar ambient-bg">
      {/* Premium Header */}
      <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-outline-variant/20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary active:scale-95 transition-transform hover:bg-outline-variant/20">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-xl font-bold text-primary leading-tight">Purchase & Sales</h1>
            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Corporate Trade Volume</p>
          </div>
        </div>
        <NotificationBell />
      </header>

      <main className="px-6 pt-6 pb-24 max-w-5xl mx-auto space-y-8">
        {/* Premium Time Range Selectors */}
        <section className="bg-white rounded-[2rem] p-5 shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-outline-variant/20 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'month', label: 'Month-wise' },
              { id: 'annual', label: 'Annually' },
              { id: 'lifetime', label: 'Lifetime' },
              { id: 'custom', label: 'Custom' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setTimeRangeMode(mode.id as any)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  timeRangeMode === mode.id
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface-container text-outline hover:bg-surface-variant'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Conditional Dropdown bar */}
          {timeRangeMode === 'month' && (
            <div className="flex gap-3 animate-fade-in">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="flex-1 bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-xs font-bold text-primary focus:outline-none"
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="flex-1 bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-xs font-bold text-primary focus:outline-none"
              >
                {[0, 1, 2, 3, 4, 5].map(offset => {
                  const y = new Date().getFullYear() - offset;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          )}

          {timeRangeMode === 'annual' && (
            <div className="animate-fade-in">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-xs font-bold text-primary focus:outline-none"
              >
                {[0, 1, 2, 3, 4, 5].map(offset => {
                  const y = new Date().getFullYear() - offset;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          )}

          {timeRangeMode === 'custom' && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <div>
                <label className="text-[8px] font-bold uppercase tracking-wider text-outline mb-1 block">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-xs font-bold text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[8px] font-bold uppercase tracking-wider text-outline mb-1 block">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-xs font-bold text-primary focus:outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* Global Summary Panel */}
        <section className="space-y-4">
          <h3 className="font-headline font-bold text-sm text-outline uppercase tracking-wider px-1">Global Trade volume</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Purchase Summary Card */}
            <div className="luxury-card p-6 bg-gradient-to-br from-emerald-50/50 to-teal-50/10 border-l-4 border-l-emerald-500 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <span className="material-symbols-outlined absolute -right-4 -top-4 text-7xl opacity-5 text-emerald-600">shopping_bag</span>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Total Purchases</p>
                <h4 className="font-headline font-black text-2xl text-primary mt-1">₹{global.purchaseAmount.toLocaleString('en-IN')}</h4>
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-outline-variant/10 pt-4 mt-6 text-left">
                <div>
                  <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Volume</p>
                  <p className="text-sm font-extrabold text-primary mt-0.5">{global.purchaseCount} Pcs</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Gold (Au)</p>
                  <p className="text-sm font-extrabold text-primary mt-0.5">{global.purchaseGoldWeight.toFixed(2)}g</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Silver (Ag)</p>
                  <p className="text-sm font-extrabold text-primary mt-0.5">{global.purchaseSilverWeight.toFixed(2)}g</p>
                </div>
              </div>
            </div>

            {/* Sales Summary Card */}
            <div className="luxury-card p-6 bg-gradient-to-br from-amber-50/50 to-orange-50/10 border-l-4 border-l-amber-500 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <span className="material-symbols-outlined absolute -right-4 -top-4 text-7xl opacity-5 text-amber-600">sell</span>
              <div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Total Sales</p>
                <h4 className="font-headline font-black text-2xl text-primary mt-1">₹{global.salesAmount.toLocaleString('en-IN')}</h4>
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-outline-variant/10 pt-4 mt-6 text-left">
                <div>
                  <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Volume</p>
                  <p className="text-sm font-extrabold text-primary mt-0.5">{global.salesCount} Pcs</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Gold (Au)</p>
                  <p className="text-sm font-extrabold text-primary mt-0.5">{global.salesGoldWeight.toFixed(2)}g</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Silver (Ag)</p>
                  <p className="text-sm font-extrabold text-primary mt-0.5">{global.salesSilverWeight.toFixed(2)}g</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Branch Breakdowns */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
            <h3 className="font-headline font-bold text-sm text-outline uppercase tracking-wider">Branch Performance</h3>
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-outline">search</span>
              <input
                type="text"
                placeholder="Search branch name..."
                value={branchSearch}
                onChange={e => setBranchSearch(e.target.value)}
                className="w-full bg-white border border-outline-variant/30 rounded-full pl-9 pr-4 py-2 text-xs font-bold text-primary focus:outline-none focus:border-primary transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-6">
            {filteredBranches.map(branch => {
              const data = breakdown[branch.name] || {
                purchaseCount: 0, purchaseAmount: 0, purchaseGoldWeight: 0, purchaseSilverWeight: 0,
                salesCount: 0, salesAmount: 0, salesGoldWeight: 0, salesSilverWeight: 0
              };

              return (
                <div key={branch.id} className="luxury-card p-5 bg-white border border-outline-variant/10 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center gap-2 border-b border-outline-variant/5 pb-2.5">
                    <span className="material-symbols-outlined text-[#003366] text-lg">storefront</span>
                    <h4 className="font-headline font-extrabold text-primary text-base">{branch.name}</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Branch Purchase Box */}
                    <div className="bg-surface-container/20 border border-outline-variant/5 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Purchases</span>
                        <span className="text-xs font-extrabold text-primary">₹{data.purchaseAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-left pt-1.5 border-t border-outline-variant/5">
                        <div>
                          <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Volume</p>
                          <p className="text-xs font-bold text-primary mt-0.5">{data.purchaseCount} Pcs</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Gold (Au)</p>
                          <p className="text-xs font-bold text-primary mt-0.5">{data.purchaseGoldWeight.toFixed(2)}g</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Silver (Ag)</p>
                          <p className="text-xs font-bold text-primary mt-0.5">{data.purchaseSilverWeight.toFixed(2)}g</p>
                        </div>
                      </div>
                    </div>

                    {/* Branch Sales Box */}
                    <div className="bg-surface-container/20 border border-outline-variant/5 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Sales</span>
                        <span className="text-xs font-extrabold text-primary">₹{data.salesAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-left pt-1.5 border-t border-outline-variant/5">
                        <div>
                          <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Volume</p>
                          <p className="text-xs font-bold text-primary mt-0.5">{data.salesCount} Pcs</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Gold (Au)</p>
                          <p className="text-xs font-bold text-primary mt-0.5">{data.salesGoldWeight.toFixed(2)}g</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-outline uppercase tracking-wider">Silver (Ag)</p>
                          <p className="text-xs font-bold text-primary mt-0.5">{data.salesSilverWeight.toFixed(2)}g</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredBranches.length === 0 && (
              <div className="text-center text-outline text-xs font-bold py-10">No branches match your search query.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
