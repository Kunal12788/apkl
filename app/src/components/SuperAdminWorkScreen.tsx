import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { NotificationBell } from './NotificationBell';

export const SuperAdminWorkScreen: React.FC = () => {
  const navigate = useNavigate();

  // Helper date formatter
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Time Range States
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthStart = `${currentYear}-${pad(currentMonth + 1)}-01`;
  const monthEnd = `${currentYear}-${pad(currentMonth + 1)}-${pad(new Date(currentYear, currentMonth + 1, 0).getDate())}`;

  const [timeRangeMode, setTimeRangeMode] = useState<'month' | 'annual' | 'lifetime' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedAnnualYear, setSelectedAnnualYear] = useState(currentYear);

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(monthEnd);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [dbCustomers, setDbCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync date range based on Time Mode selection
  useEffect(() => {
    if (timeRangeMode === 'month') {
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
      setFromDate(`${selectedYear}-${pad(selectedMonth + 1)}-01`);
      setToDate(`${selectedYear}-${pad(selectedMonth + 1)}-${pad(lastDay.getDate())}`);
    } else if (timeRangeMode === 'annual') {
      setFromDate(`${selectedAnnualYear}-01-01`);
      setToDate(`${selectedAnnualYear}-12-31`);
    } else if (timeRangeMode === 'lifetime') {
      setFromDate('');
      setToDate('');
    }
  }, [timeRangeMode, selectedMonth, selectedYear, selectedAnnualYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let tasksQuery = supabase.from('tasks').select('*');
      let txQuery = supabase.from('transactions').select('*');

      if (timeRangeMode !== 'lifetime' && fromDate && toDate) {
        tasksQuery = tasksQuery.gte('iso_date', fromDate).lte('iso_date', toDate);
        txQuery = txQuery.gte('iso_date', fromDate).lte('iso_date', toDate);
      }

      const [usersRes, tasksRes, txRes, branchesRes, customersRes] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        tasksQuery,
        txQuery,
        supabase.from('branches').select('*'),
        supabase.from('customers').select('*')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (txRes.error) throw txRes.error;
      if (branchesRes.error) throw branchesRes.error;
      if (customersRes.error) throw customersRes.error;

      setUsers(usersRes.data || []);
      setTasks(tasksRes.data || []);
      setTransactions(txRes.data || []);
      setBranches(branchesRes.data || []);
      setDbCustomers(customersRes.data || []);

    } catch (err) {
      console.error('Error fetching work metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate, timeRangeMode]);

  // Aggregate stats per customer
  const dynamicCustomers = useMemo(() => {
    const customers: any[] = [];

    // Initialize all dbCustomers
    dbCustomers.filter(c => c.status === 'Approved').forEach(c => {
      customers.push({
        id: c.id,
        name: c.name,
        created_by: c.created_by,
        phone: c.phone,
        address: c.address,
        workBreakdown: {
          tunch: 0, marking: 0, shouldering: 0, buy: 0, sell: 0,
          buyAgainstTunch: 0, pureGoldAgainstTunch: 0, pureSilverAgainstTunch: 0,
          
          tunchAmount: 0, markingAmount: 0, shoulderingAmount: 0, buyAmount: 0, sellAmount: 0,
          buyAgainstTunchAmount: 0, pureGoldAgainstTunchAmount: 0, pureSilverAgainstTunchAmount: 0,

          buyAgainstTunchWeight: 0, pureGoldAgainstTunchWeight: 0, pureSilverAgainstTunchWeight: 0,
          buyGoldWeight: 0, buySilverWeight: 0, sellGoldWeight: 0, sellSilverWeight: 0
        }
      });
    });

    const tunchIncrementedTasks = new Set<string>();

    // Aggregate Completed Tasks with Pure Gold/Silver Settlement conditions
    tasks.filter(t => t.status === 'Completed').forEach(task => {
      const cond = (task.settlement_condition || '').toLowerCase();
      const isPureGold = cond.includes('pure gold');
      const isPureSilver = cond.includes('pure silver');
      if (isPureGold || isPureSilver) {
        let cust = customers.find(c => {
          if (c.id && task.customer_id && c.id !== 'CUST-COL' && task.customer_id !== 'CUST-COL') {
            return c.id === task.customer_id;
          }
          if (c.name.trim().toLowerCase() !== (task.customer_name || '').trim().toLowerCase()) return false;
          
          const normPhone = (p?: string) => p ? p.replace(/[^\d]/g, '') : '';
          const cP = normPhone(c.phone);
          const tP = normPhone(task.customer_phone);
          if (cP && tP && cP !== tP) return false;
          
          return true;
        });

        if (cust) {
          const pcs = Number(task.pieces || 1) || 1;
          const pureW = parseFloat(task.pure_weight || task.pureWeight || '0') || 0;
          
          let amt = 0;
          const isCash = cond.includes('cash');
          if (isCash && (task.cash_amount !== null && task.cash_amount !== undefined)) {
            amt = Number(task.cash_amount);
          } else {
            const amountMatch = cond.match(/[₹?](\d[\d,]*)/);
            amt = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
          }

          cust.workBreakdown.tunch += pcs;
          cust.workBreakdown.tunchAmount += amt;
          tunchIncrementedTasks.add(task.id);

          if (isPureGold) {
            cust.workBreakdown.pureGoldAgainstTunch += pcs;
            cust.workBreakdown.pureGoldAgainstTunchAmount += amt;
            cust.workBreakdown.pureGoldAgainstTunchWeight += pureW;
          } else {
            cust.workBreakdown.pureSilverAgainstTunch += pcs;
            cust.workBreakdown.pureSilverAgainstTunchAmount += amt;
            cust.workBreakdown.pureSilverAgainstTunchWeight += pureW;
          }
        }
      }
    });

    // Aggregate Transaction Ledger
    transactions.forEach(t => {
      if (t.work_type === 'Dues Payment') return;

      let cust = customers.find(c => {
        if (c.id && t.customer_id && c.id !== 'CUST-COL' && t.customer_id !== 'CUST-COL') {
          return c.id === t.customer_id;
        }
        if (c.name.trim().toLowerCase() !== (t.customer_name || '').trim().toLowerCase()) return false;
        
        const normPhone = (p?: string) => p ? p.replace(/[^\d]/g, '') : '';
        const cP = normPhone(c.phone);
        const tP = normPhone(t.customer_phone);
        if (cP && tP && cP !== tP) return false;
        
        return true;
      });

      if (!cust) {
        const initials = (t.customer_name || '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        const newCust = {
          id: t.customer_id || 'CUST-COL',
          name: t.customer_name || 'Walk-in Customer',
          initials: initials || 'C',
          created_by: t.created_by,
          phone: t.customer_phone,
          address: t.customer_address,
          workBreakdown: {
            tunch: 0, marking: 0, shouldering: 0, buy: 0, sell: 0,
            buyAgainstTunch: 0, pureGoldAgainstTunch: 0, pureSilverAgainstTunch: 0,
            
            tunchAmount: 0, markingAmount: 0, shoulderingAmount: 0, buyAmount: 0, sellAmount: 0,
            buyAgainstTunchAmount: 0, pureGoldAgainstTunchAmount: 0, pureSilverAgainstTunchAmount: 0,

            buyAgainstTunchWeight: 0, pureGoldAgainstTunchWeight: 0, pureSilverAgainstTunchWeight: 0,
            buyGoldWeight: 0, buySilverWeight: 0, sellGoldWeight: 0, sellSilverWeight: 0
          }
        };
        customers.push(newCust);
        cust = newCust;
      }

      const pcs = Number(t.pieces || 1) || 1;
      const amtNum = parseFloat(String(t.amount || '0').replace(/[^\d.]/g, '')) || 0;
      const pureW = parseFloat(t.pure_weight || t.pureWeight || '0') || 0;
      const metalStr = (t.metal || 'Gold').toLowerCase();

      if (t.work_type === 'Tunch') {
        const details = (t.details || '').toLowerCase();
        const type = (t.type || '').toLowerCase();
        const isServiceFee = type.includes('service fee') || details.includes('service fee');

        if (isServiceFee) {
          if (!t.task_id || !tunchIncrementedTasks.has(t.task_id)) {
            cust.workBreakdown.tunch += pcs;
            cust.workBreakdown.tunchAmount += amtNum;
            if (t.task_id) tunchIncrementedTasks.add(t.task_id);
          }
        } else {
          const isCash = type.includes('cash') || !!t.is_cash_exchange || details.includes('cash');
          if (isCash) {
            cust.workBreakdown.buyAgainstTunch += pcs;
            cust.workBreakdown.buyAgainstTunchAmount += amtNum;
            cust.workBreakdown.buyAgainstTunchWeight += pureW;
          } else if (details.includes('pure gold')) {
            cust.workBreakdown.pureGoldAgainstTunch += pcs;
            cust.workBreakdown.pureGoldAgainstTunchAmount += amtNum;
            cust.workBreakdown.pureGoldAgainstTunchWeight += pureW;
          } else if (details.includes('pure silver')) {
            cust.workBreakdown.pureSilverAgainstTunch += pcs;
            cust.workBreakdown.pureSilverAgainstTunchAmount += amtNum;
            cust.workBreakdown.pureSilverAgainstTunchWeight += pureW;
          }

          if (!t.task_id || !tunchIncrementedTasks.has(t.task_id)) {
            cust.workBreakdown.tunch += pcs;
            cust.workBreakdown.tunchAmount += amtNum;
            if (t.task_id) tunchIncrementedTasks.add(t.task_id);
          }
        }
      } else if (t.work_type === 'Marking') {
        cust.workBreakdown.marking += pcs;
        cust.workBreakdown.markingAmount += amtNum;
      } else if (t.work_type === 'Shouldering') {
        cust.workBreakdown.shouldering += pcs;
        cust.workBreakdown.shoulderingAmount += amtNum;
      } else if (t.work_type === 'Buy') {
        cust.workBreakdown.buy += pcs;
        cust.workBreakdown.buyAmount += amtNum;
        if (metalStr.includes('silver')) {
          cust.workBreakdown.buySilverWeight += pureW;
        } else {
          cust.workBreakdown.buyGoldWeight += pureW;
        }
      } else if (t.work_type === 'Sell') {
        cust.workBreakdown.sell += pcs;
        cust.workBreakdown.sellAmount += amtNum;
        if (metalStr.includes('silver')) {
          cust.workBreakdown.sellSilverWeight += pureW;
        } else {
          cust.workBreakdown.sellGoldWeight += pureW;
        }
      }
    });

    return customers;
  }, [dbCustomers, transactions, tasks]);

  // Determine branch name from customer creator
  const getCustomerBranchName = (created_by?: string) => {
    if (!created_by) return 'Unassigned';
    const creator = users.find(u => u.id === created_by);
    if (!creator || !creator.branch_id) return 'Unassigned';
    const b = branches.find(br => br.id === creator.branch_id);
    return b ? b.name : 'Unassigned';
  };

  // Group customer breakdown metrics branch-wise
  const branchStats = useMemo(() => {
    const statsByBranch: Record<string, {
      marking: number; shouldering: number; tunch: number; buyAgainstTunch: number; pureGoldAgainstTunch: number; pureSilverAgainstTunch: number; buy: number; sell: number;
      markingAmount: number; shoulderingAmount: number; tunchAmount: number; buyAgainstTunchAmount: number; pureGoldAgainstTunchAmount: number; pureSilverAgainstTunchAmount: number; buyAmount: number; sellAmount: number;
      buyAgainstTunchWeight: number; pureGoldAgainstTunchWeight: number; pureSilverAgainstTunchWeight: number; buyGoldWeight: number; buySilverWeight: number; sellGoldWeight: number; sellSilverWeight: number;
    }> = {};

    // Pre-initialize standard branches
    branches.forEach(b => {
      statsByBranch[b.name] = {
        marking: 0, shouldering: 0, tunch: 0, buyAgainstTunch: 0, pureGoldAgainstTunch: 0, pureSilverAgainstTunch: 0, buy: 0, sell: 0,
        markingAmount: 0, shoulderingAmount: 0, tunchAmount: 0, buyAgainstTunchAmount: 0, pureGoldAgainstTunchAmount: 0, pureSilverAgainstTunchAmount: 0, buyAmount: 0, sellAmount: 0,
        buyAgainstTunchWeight: 0, pureGoldAgainstTunchWeight: 0, pureSilverAgainstTunchWeight: 0, buyGoldWeight: 0, buySilverWeight: 0, sellGoldWeight: 0, sellSilverWeight: 0
      };
    });

    statsByBranch['Unassigned'] = {
      marking: 0, shouldering: 0, tunch: 0, buyAgainstTunch: 0, pureGoldAgainstTunch: 0, pureSilverAgainstTunch: 0, buy: 0, sell: 0,
      markingAmount: 0, shoulderingAmount: 0, tunchAmount: 0, buyAgainstTunchAmount: 0, pureGoldAgainstTunchAmount: 0, pureSilverAgainstTunchAmount: 0, buyAmount: 0, sellAmount: 0,
      buyAgainstTunchWeight: 0, pureGoldAgainstTunchWeight: 0, pureSilverAgainstTunchWeight: 0, buyGoldWeight: 0, buySilverWeight: 0, sellGoldWeight: 0, sellSilverWeight: 0
    };

    dynamicCustomers.forEach(cust => {
      const bName = getCustomerBranchName(cust.created_by);
      if (!statsByBranch[bName]) {
        statsByBranch[bName] = {
          marking: 0, shouldering: 0, tunch: 0, buyAgainstTunch: 0, pureGoldAgainstTunch: 0, pureSilverAgainstTunch: 0, buy: 0, sell: 0,
          markingAmount: 0, shoulderingAmount: 0, tunchAmount: 0, buyAgainstTunchAmount: 0, pureGoldAgainstTunchAmount: 0, pureSilverAgainstTunchAmount: 0, buyAmount: 0, sellAmount: 0,
          buyAgainstTunchWeight: 0, pureGoldAgainstTunchWeight: 0, pureSilverAgainstTunchWeight: 0, buyGoldWeight: 0, buySilverWeight: 0, sellGoldWeight: 0, sellSilverWeight: 0
        };
      }

      statsByBranch[bName].marking += cust.workBreakdown.marking;
      statsByBranch[bName].shouldering += cust.workBreakdown.shouldering;
      statsByBranch[bName].tunch += cust.workBreakdown.tunch;
      statsByBranch[bName].buyAgainstTunch += cust.workBreakdown.buyAgainstTunch;
      statsByBranch[bName].pureGoldAgainstTunch += cust.workBreakdown.pureGoldAgainstTunch;
      statsByBranch[bName].pureSilverAgainstTunch += cust.workBreakdown.pureSilverAgainstTunch;
      statsByBranch[bName].buy += cust.workBreakdown.buy;
      statsByBranch[bName].sell += cust.workBreakdown.sell;

      statsByBranch[bName].markingAmount += cust.workBreakdown.markingAmount;
      statsByBranch[bName].shoulderingAmount += cust.workBreakdown.shoulderingAmount;
      statsByBranch[bName].tunchAmount += cust.workBreakdown.tunchAmount;
      statsByBranch[bName].buyAgainstTunchAmount += cust.workBreakdown.buyAgainstTunchAmount;
      statsByBranch[bName].pureGoldAgainstTunchAmount += cust.workBreakdown.pureGoldAgainstTunchAmount;
      statsByBranch[bName].pureSilverAgainstTunchAmount += cust.workBreakdown.pureSilverAgainstTunchAmount;
      statsByBranch[bName].buyAmount += cust.workBreakdown.buyAmount;
      statsByBranch[bName].sellAmount += cust.workBreakdown.sellAmount;

      statsByBranch[bName].buyAgainstTunchWeight += cust.workBreakdown.buyAgainstTunchWeight;
      statsByBranch[bName].pureGoldAgainstTunchWeight += cust.workBreakdown.pureGoldAgainstTunchWeight;
      statsByBranch[bName].pureSilverAgainstTunchWeight += cust.workBreakdown.pureSilverAgainstTunchWeight;
      statsByBranch[bName].buyGoldWeight += cust.workBreakdown.buyGoldWeight;
      statsByBranch[bName].buySilverWeight += cust.workBreakdown.buySilverWeight;
      statsByBranch[bName].sellGoldWeight += cust.workBreakdown.sellGoldWeight;
      statsByBranch[bName].sellSilverWeight += cust.workBreakdown.sellSilverWeight;
    });

    // Remove Unassigned branch if empty
    if (
      statsByBranch['Unassigned'].marking === 0 &&
      statsByBranch['Unassigned'].shouldering === 0 &&
      statsByBranch['Unassigned'].tunch === 0 &&
      statsByBranch['Unassigned'].buyAgainstTunch === 0 &&
      statsByBranch['Unassigned'].pureGoldAgainstTunch === 0 &&
      statsByBranch['Unassigned'].pureSilverAgainstTunch === 0 &&
      statsByBranch['Unassigned'].buy === 0 &&
      statsByBranch['Unassigned'].sell === 0
    ) {
      delete statsByBranch['Unassigned'];
    }

    return statsByBranch;
  }, [dynamicCustomers, branches, users]);

  // Compute Global aggregate summary
  const globalStats = useMemo(() => {
    const total = {
      marking: 0, shouldering: 0, tunch: 0, buyAgainstTunch: 0, pureGoldAgainstTunch: 0, pureSilverAgainstTunch: 0, buy: 0, sell: 0,
      markingAmount: 0, shoulderingAmount: 0, tunchAmount: 0, buyAgainstTunchAmount: 0, pureGoldAgainstTunchAmount: 0, pureSilverAgainstTunchAmount: 0, buyAmount: 0, sellAmount: 0,
      buyAgainstTunchWeight: 0, pureGoldAgainstTunchWeight: 0, pureSilverAgainstTunchWeight: 0, buyGoldWeight: 0, buySilverWeight: 0, sellGoldWeight: 0, sellSilverWeight: 0
    };

    Object.values(branchStats).forEach(branch => {
      total.marking += branch.marking;
      total.shouldering += branch.shouldering;
      total.tunch += branch.tunch;
      total.buyAgainstTunch += branch.buyAgainstTunch;
      total.pureGoldAgainstTunch += branch.pureGoldAgainstTunch;
      total.pureSilverAgainstTunch += branch.pureSilverAgainstTunch;
      total.buy += branch.buy;
      total.sell += branch.sell;

      total.markingAmount += branch.markingAmount;
      total.shoulderingAmount += branch.shoulderingAmount;
      total.tunchAmount += branch.tunchAmount;
      total.buyAgainstTunchAmount += branch.buyAgainstTunchAmount;
      total.pureGoldAgainstTunchAmount += branch.pureGoldAgainstTunchAmount;
      total.pureSilverAgainstTunchAmount += branch.pureSilverAgainstTunchAmount;
      total.buyAmount += branch.buyAmount;
      total.sellAmount += branch.sellAmount;

      total.buyAgainstTunchWeight += branch.buyAgainstTunchWeight;
      total.pureGoldAgainstTunchWeight += branch.pureGoldAgainstTunchWeight;
      total.pureSilverAgainstTunchWeight += branch.pureSilverAgainstTunchWeight;
      total.buyGoldWeight += branch.buyGoldWeight;
      total.buySilverWeight += branch.buySilverWeight;
      total.sellGoldWeight += branch.sellGoldWeight;
      total.sellSilverWeight += branch.sellSilverWeight;
    });

    return total;
  }, [branchStats]);

  // Apply search query filter to branch names
  const filteredBranches = useMemo(() => {
    if (!searchQuery) return branchStats;
    const query = searchQuery.toLowerCase();
    const filtered: typeof branchStats = {};
    Object.keys(branchStats).forEach(bName => {
      if (bName.toLowerCase().includes(query)) {
        filtered[bName] = branchStats[bName];
      }
    });
    return filtered;
  }, [branchStats, searchQuery]);

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
        <NotificationBell />
      </header>

      <main className="px-6 pt-6 pb-24 max-w-5xl mx-auto space-y-6">
        
        {/* Preset Time Range Options & Date Filter */}
        <div className="bg-white p-5 rounded-[2rem] border border-outline-variant/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] luxury-card space-y-4">
          <div className="flex bg-surface-container rounded-full p-1 shadow-inner">
            {(['month', 'annual', 'lifetime', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTimeRangeMode(mode)}
                className={`flex-1 rounded-full py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  timeRangeMode === mode
                    ? 'bg-white premium-shadow text-primary'
                    : 'text-outline hover:text-primary'
                }`}
              >
                {mode === 'month' ? 'Month-wise' : mode === 'annual' ? 'Annually' : mode === 'lifetime' ? 'Lifetime' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Conditional Controls based on Mode */}
          {timeRangeMode === 'month' && (
            <div className="flex gap-4 animate-fade-in">
              <div className="flex-1 relative">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Select Month</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-surface-container/50 border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none focus:border-tertiary focus:bg-white"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 relative">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Select Year</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-surface-container/50 border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none focus:border-tertiary focus:bg-white"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {timeRangeMode === 'annual' && (
            <div className="relative animate-fade-in">
              <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Select Year</span>
              <select
                value={selectedAnnualYear}
                onChange={(e) => setSelectedAnnualYear(Number(e.target.value))}
                className="w-full bg-surface-container/50 border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none focus:border-tertiary focus:bg-white"
              >
                {[2024, 2025, 2026, 2027, 2028].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          )}

          {timeRangeMode === 'custom' && (
            <div className="flex flex-col md:flex-row gap-4 animate-fade-in">
              <div className="flex-1 relative group">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">calendar_today</span> From
                </span>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-surface-container/50 border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none focus:border-tertiary focus:bg-white transition-all hover:border-outline-variant"
                />
              </div>
              <div className="flex-1 relative group">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">event</span> To
                </span>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-surface-container/50 border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none focus:border-tertiary focus:bg-white transition-all hover:border-outline-variant"
                />
              </div>
            </div>
          )}
          
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/70">search</span>
            <input 
              type="text" 
              placeholder="Search branch name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container/30 border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all hover:bg-surface-container/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Global Summary */}
            <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-outline-variant/20 shadow-sm space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="material-symbols-outlined text-sm text-primary">analytics</span>
                <h3 className="font-label text-[10px] uppercase tracking-[0.2em] text-primary font-extrabold">Global Performance Summary</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-2xl border border-primary/15 relative overflow-hidden text-center flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-primary/5">science</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70 mb-1">Tunch Pcs</span>
                  <span className="font-headline font-black text-primary text-xl">{globalStats.tunch} Pcs</span>
                  <span className="text-[10px] font-bold text-outline mt-1">₹{globalStats.tunchAmount.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 p-4 rounded-2xl border border-secondary/15 relative overflow-hidden text-center flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-secondary/5">verified</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-secondary/70 mb-1">Marking Pcs</span>
                  <span className="font-headline font-black text-secondary text-xl">{globalStats.marking} Pcs</span>
                  <span className="text-[10px] font-bold text-outline mt-1">₹{globalStats.markingAmount.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="bg-gradient-to-br from-tertiary/5 to-tertiary/10 p-4 rounded-2xl border border-tertiary/15 relative overflow-hidden text-center flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-tertiary/5">precision_manufacturing</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-tertiary/70 mb-1">Shoulder Pcs</span>
                  <span className="font-headline font-black text-tertiary text-xl">{globalStats.shouldering} Pcs</span>
                  <span className="text-[10px] font-bold text-outline mt-1">₹{globalStats.shoulderingAmount.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 p-4 rounded-2xl border border-emerald-500/15 relative overflow-hidden text-center flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-emerald-500/5">payments</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Buy vs Tunch</span>
                  <span className="font-headline font-black text-emerald-600 text-xl">{globalStats.buyAgainstTunch} Pcs</span>
                  <span className="text-[9px] font-bold text-outline mt-1">
                    {globalStats.buyAgainstTunchWeight.toFixed(3)}g • ₹{globalStats.buyAgainstTunchAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 p-4 rounded-2xl border border-yellow-500/15 relative overflow-hidden text-center flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-yellow-500/5">workspace_premium</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-yellow-600 mb-1">Gold vs Tunch</span>
                  <span className="font-headline font-black text-yellow-600 text-xl">{globalStats.pureGoldAgainstTunch} Pcs</span>
                  <span className="text-[9px] font-bold text-outline mt-1">
                    {globalStats.pureGoldAgainstTunchWeight.toFixed(3)}g • ₹{globalStats.pureGoldAgainstTunchAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                
                <div className="bg-gradient-to-br from-slate-400/5 to-slate-400/10 p-4 rounded-2xl border border-slate-400/15 relative overflow-hidden text-center flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-slate-400/5">monetization_on</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Silver vs Tunch</span>
                  <span className="font-headline font-black text-slate-500 text-xl">{globalStats.pureSilverAgainstTunch} Pcs</span>
                  <span className="text-[9px] font-bold text-outline mt-1">
                    {globalStats.pureSilverAgainstTunchWeight.toFixed(3)}g • ₹{globalStats.pureSilverAgainstTunchAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                
                <div className="bg-gradient-to-br from-teal-500/5 to-teal-500/10 p-4 rounded-2xl border border-teal-500/15 relative overflow-hidden text-center flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-teal-500/5">shopping_cart</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600 mb-1">Buy Works</span>
                  <span className="font-headline font-black text-teal-600 text-xl">{globalStats.buy} Jobs</span>
                  <span className="text-[8px] font-semibold text-outline mt-0.5 leading-none">
                    Au:{globalStats.buyGoldWeight.toFixed(2)}g • Ag:{globalStats.buySilverWeight.toFixed(2)}g
                  </span>
                  <span className="text-[9px] font-bold text-primary/80 mt-0.5">₹{globalStats.buyAmount.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 p-4 rounded-2xl border border-amber-500/15 relative overflow-hidden text-center flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-amber-500/5">sell</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 mb-1">Sell Works</span>
                  <span className="font-headline font-black text-amber-600 text-xl">{globalStats.sell} Jobs</span>
                  <span className="text-[8px] font-semibold text-outline mt-0.5 leading-none">
                    Au:{globalStats.sellGoldWeight.toFixed(2)}g • Ag:{globalStats.sellSilverWeight.toFixed(2)}g
                  </span>
                  <span className="text-[9px] font-bold text-primary/80 mt-0.5">₹{globalStats.sellAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Branch Breakdown */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <span className="material-symbols-outlined text-sm text-primary">domain</span>
                <h3 className="font-label text-[10px] uppercase tracking-[0.2em] text-primary font-extrabold">Branch Breakdown</h3>
              </div>
              
              {Object.keys(filteredBranches).length === 0 ? (
                <div className="text-center py-10 bg-white rounded-3xl border border-outline-variant/20">
                  <p className="text-outline text-sm font-medium">No branch data found.</p>
                </div>
              ) : (
                Object.keys(filteredBranches).map(branchName => {
                  const stats = filteredBranches[branchName];
                  return (
                    <div key={branchName} className="bg-white rounded-[2rem] p-6 border border-outline-variant/20 shadow-sm luxury-card relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                      
                      <div className="flex justify-between items-center mb-5 pl-2">
                        <div>
                          <h3 className="font-headline font-bold text-lg text-primary flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary">domain</span>
                            {branchName}
                          </h3>
                          <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-1">Branch Operational & Valuation Metrics</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-2">
                        <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-[1.25rem] flex flex-col items-center justify-center border border-primary/10 relative overflow-hidden group-hover:border-primary/30 transition-colors">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-primary/5">science</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-primary/70 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">science</span> Tunch Pcs
                          </span>
                          <span className="font-headline font-black text-primary text-xl">{stats.tunch} Pcs</span>
                          <span className="text-[10px] font-bold text-outline mt-1">₹{stats.tunchAmount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 p-4 rounded-[1.25rem] flex flex-col items-center justify-center border border-secondary/10 relative overflow-hidden group-hover:border-secondary/30 transition-colors">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-secondary/5">verified</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-secondary/70 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">verified</span> Marking Pcs
                          </span>
                          <span className="font-headline font-black text-secondary text-xl">{stats.marking} Pcs</span>
                          <span className="text-[10px] font-bold text-outline mt-1">₹{stats.markingAmount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="bg-gradient-to-br from-tertiary/5 to-tertiary/10 p-4 rounded-[1.25rem] flex flex-col items-center justify-center border border-tertiary/10 relative overflow-hidden group-hover:border-tertiary/30 transition-colors">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-tertiary/5">precision_manufacturing</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-tertiary/70 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">hardware</span> Shoulder Pcs
                          </span>
                          <span className="font-headline font-black text-tertiary text-xl">{stats.shouldering} Pcs</span>
                          <span className="text-[10px] font-bold text-outline mt-1">₹{stats.shoulderingAmount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 p-4 rounded-[1.25rem] flex flex-col items-center justify-center border border-emerald-500/10 relative overflow-hidden group-hover:border-emerald-500/30 transition-colors">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-emerald-500/5">payments</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">payments</span> Buy vs Tunch
                          </span>
                          <span className="font-headline font-black text-emerald-600 text-xl">{stats.buyAgainstTunch} Pcs</span>
                          <span className="text-[9px] font-bold text-outline mt-1">
                            {stats.buyAgainstTunchWeight.toFixed(3)}g • ₹{stats.buyAgainstTunchAmount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 p-4 rounded-[1.25rem] flex flex-col items-center justify-center border border-yellow-500/10 relative overflow-hidden group-hover:border-yellow-500/30 transition-colors">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-yellow-500/5">workspace_premium</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-600 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">workspace_premium</span> Gold vs Tunch
                          </span>
                          <span className="font-headline font-black text-yellow-600 text-xl">{stats.pureGoldAgainstTunch} Pcs</span>
                          <span className="text-[9px] font-bold text-outline mt-1">
                            {stats.pureGoldAgainstTunchWeight.toFixed(3)}g • ₹{stats.pureGoldAgainstTunchAmount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="bg-gradient-to-br from-slate-400/5 to-slate-400/10 p-4 rounded-[1.25rem] flex flex-col items-center justify-center border border-slate-400/10 relative overflow-hidden group-hover:border-slate-400/30 transition-colors">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-slate-400/5">monetization_on</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">monetization_on</span> Silver vs Tunch
                          </span>
                          <span className="font-headline font-black text-slate-500 text-xl">{stats.pureSilverAgainstTunch} Pcs</span>
                          <span className="text-[9px] font-bold text-outline mt-1">
                            {stats.pureSilverAgainstTunchWeight.toFixed(3)}g • ₹{stats.pureSilverAgainstTunchAmount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="bg-gradient-to-br from-teal-500/5 to-teal-500/10 p-4 rounded-[1.25rem] flex flex-col items-center justify-center border border-teal-500/10 relative overflow-hidden group-hover:border-teal-500/30 transition-colors">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-teal-500/5">shopping_cart</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-teal-600 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">shopping_cart</span> Buy Works
                          </span>
                          <span className="font-headline font-black text-teal-600 text-xl">{stats.buy} Jobs</span>
                          <span className="text-[8px] font-semibold text-outline mt-0.5 leading-none">
                            Au:{stats.buyGoldWeight.toFixed(2)}g • Ag:{stats.buySilverWeight.toFixed(2)}g
                          </span>
                          <span className="text-[9px] font-bold text-primary/80 mt-0.5">₹{stats.buyAmount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 p-4 rounded-[1.25rem] flex flex-col items-center justify-center border border-amber-500/10 relative overflow-hidden group-hover:border-amber-500/30 transition-colors">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-amber-500/5">sell</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">sell</span> Sell Works
                          </span>
                          <span className="font-headline font-black text-amber-600 text-xl">{stats.sell} Jobs</span>
                          <span className="text-[8px] font-semibold text-outline mt-0.5 leading-none">
                            Au:{stats.sellGoldWeight.toFixed(2)}g • Ag:{stats.sellSilverWeight.toFixed(2)}g
                          </span>
                          <span className="text-[9px] font-bold text-primary/80 mt-0.5">₹{stats.sellAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
};
