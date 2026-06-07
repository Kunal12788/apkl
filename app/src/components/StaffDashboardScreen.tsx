import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';
import { useSession } from '../context/SessionContext';
import { fitText } from '../utils';

export const StaffDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, isFullyAuthenticated } = useSession();
  const userId = user?.id || '';
  const isAdminOrSuper = user?.role === 'Admin' || user?.role === 'Super Admin';
  
  const userName = user?.name || '';
  
  // Directly initialize state from cache for 0ms delay on mount
  const cachedLedger = getCachedData('ledger_data');
  const cachedTx = getCachedData('tx_data');
  const cachedTasks = getCachedData('tasks_data');

  const cachedAllocations = getCachedData('stock_allocations_all');

  const isSuperSa = user?.role === 'Super Admin';
  const initialLedger = cachedLedger 
    ? (isSuperSa ? cachedLedger : cachedLedger.filter((e: any) => e.staff_id === userId))
    : [];
  const initialTx = cachedTx
    ? (isSuperSa ? cachedTx : cachedTx.filter((t: any) => t.created_by === userId || t.createdBy === userId))
    : [];
  const initialTasks = cachedTasks
    ? (isSuperSa ? cachedTasks : cachedTasks.filter((t: any) => t.created_by === userId))
    : [];
  const initialAllocations = cachedAllocations
    ? (isSuperSa ? cachedAllocations : cachedAllocations.filter((a: any) => a.branch_id === user?.branch_id))
    : [];

  let initialPure = 0;
  let initialImpure = 0;
  let initialPureSilver = 0;
  let initialImpureSilver = 0;
  let initialTotalCol = 0;
  let initialCashCol = 0;
  let initialUpiCol = 0;
  let initialRev = { tunch: 0, marking: 0, shouldering: 0 };
  let initialStats = { pending: 0, inProgress: 0, completed: 0 };

  if (initialLedger.length > 0 || initialTx.length > 0 || initialTasks.length > 0 || initialAllocations.length > 0) {
    const totalAllocatedPureGold = initialAllocations.filter((a: any) => a.metal === 'Gold').reduce((s: any, a: any) => s + Number(a.pure_weight || 0), 0);
    const totalAllocatedPureSilver = initialAllocations.filter((a: any) => a.metal === 'Silver').reduce((s: any, a: any) => s + Number(a.pure_weight || 0), 0);

    const totalPureGiven = initialLedger.reduce((s: any, e: any) => s + (Number(e.pure_gold_out) || 0), 0);
    const totalImpureReceived = initialLedger.reduce((s: any, e: any) => s + (Number(e.impure_gold_in) || 0), 0);
    const totalImpureRefined = initialLedger.reduce((s: any, e: any) => s + (Number(e.impure_gold_out) || 0), 0);
    initialPure = totalAllocatedPureGold - totalPureGiven;
    initialImpure = totalImpureReceived - totalImpureRefined;

    const totalPureSilverGiven = initialLedger.reduce((s: any, e: any) => s + (Number(e.pure_silver_out) || 0), 0);
    const totalImpureSilverReceived = initialLedger.reduce((s: any, e: any) => s + (Number(e.impure_silver_in) || 0), 0);
    const totalImpureSilverRefined = initialLedger.reduce((s: any, e: any) => s + (Number(e.impure_silver_out) || 0), 0);
    initialPureSilver = totalAllocatedPureSilver - totalPureSilverGiven;
    initialImpureSilver = totalImpureSilverReceived - totalImpureSilverRefined;

    initialTx.forEach((tx: any) => {
      if (tx.status === 'Paid') {
        const amt = Number(tx.amount) || 0;
        initialTotalCol += amt;
        if (tx.type === 'Cash') initialCashCol += amt;
        if (tx.type === 'UPI') initialUpiCol += amt;
      }
    });

    let revTunch = 0, revMark = 0, revShoulder = 0;
    let volTunch = 0, volMark = 0, volShoulder = 0;
    let cDues = 0, gDues = 0;

    initialTasks.forEach((t: any) => {
      const isCompleted = t.status === 'Completed';
      const w = Number(t.weight_grams) || 0;
      const amt = Number(t.bill_amount) || 0;

      if (t.task_type === 'Tunch') {
        if (isCompleted) { revTunch += amt; volTunch += w; }
      } else if (t.task_type === 'Marking') {
        if (isCompleted) { revMark += amt; volMark += w; }
      } else if (t.task_type === 'Shouldering') {
        if (isCompleted) { revShoulder += amt; volShoulder += w; }
      }

      if (t.payment_status === 'Unpaid') {
        cDues += amt;
        if (isCompleted) gDues += w;
      }

      if (t.status === 'Pending Verification' || t.status === 'Pending') initialStats.pending++;
      else if (t.status === 'In Progress' || t.status === 'Working') initialStats.inProgress++;
      else if (t.status === 'Completed') initialStats.completed++;
    });

    initialRev = { tunch: revTunch, marking: revMark, shouldering: revShoulder };
  }

  // States for Metrics
  const [pureGoldWeight, setPureGoldWeight] = useState(initialPure);
  const [impureGoldWeight, setImpureGoldWeight] = useState(initialImpure);
  const [pureSilverWeight, setPureSilverWeight] = useState(initialPureSilver);
  const [impureSilverWeight, setImpureSilverWeight] = useState(initialImpureSilver);
  const [totalCollected, setTotalCollected] = useState(initialTotalCol);
  const [cashCollection, setCashCollection] = useState(initialCashCol);
  const [upiCollection, setUpiCollection] = useState(initialUpiCol);
  
  const [revenue, setRevenue] = useState(initialRev);
  const [globalStats, setGlobalStats] = useState(initialStats);
  const [tasksStats, setTasksStats] = useState({
    tunch: { processed: 0, pending: 0 },
    marking: { processed: 0, pending: 0 },
    shouldering: { processed: 0, pending: 0 },
  });
  
  const [taskSource, setTaskSource] = useState({
    customers: 0, admin: 0, staff: 0, superAdmin: 0, collectionStaff: 0
  });

  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  const getGreetingName = () => {
    if (userName) return userName;
    if (user?.role === 'Admin') return 'Chief Admin';
    if (user?.role === 'Super Admin') return 'Director';
    return 'Staff Member';
  };

  const getInitials = (name: string) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getWorkBadgeColors = (workType: string) => {
    switch (workType) {
      case 'Tunch':
        return { bg: 'bg-secondary-fixed', text: 'text-primary', icon: 'science' };
      case 'Marking':
        return { bg: 'bg-tertiary-fixed', text: 'text-tertiary', icon: 'verified' };
      case 'Shouldering':
        return { bg: 'bg-primary-fixed', text: 'text-primary', icon: 'precision_manufacturing' };
      default:
        return { bg: 'bg-surface-container', text: 'text-outline', icon: 'work' };
    }
  };

  const getRecentStatusClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-tertiary-container/10 text-tertiary-container';
      case 'In Progress':
        return 'bg-secondary-container/10 text-secondary-container';
      case 'Pending Verification':
        return 'bg-secondary/10 text-secondary';
      default:
        return 'bg-error-container/10 text-error';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // 1. Instantly load from cache
      const cachedLedger = getCachedData('ledger_data');
      const cachedTx = getCachedData('tx_data');
      const cachedTasks = getCachedData('tasks_data');
      const cachedAllocations = getCachedData('stock_allocations_all');

      const isSuperSa = user?.role === 'Super Admin';

      const applyData = (ledgerData: any[] | null, txData: any[] | null, tasksData: any[] | null, allocationsData: any[] | null, branchUserIds: string[]) => {
        const hasBranchFilter = !isSuperSa && user?.branch_id;

        const filteredLedger = ledgerData 
          ? (hasBranchFilter ? ledgerData.filter((e: any) => branchUserIds.includes(e.staff_id)) : ledgerData)
          : [];
        const filteredTx = txData
          ? (hasBranchFilter ? txData.filter((t: any) => branchUserIds.includes(t.created_by) || branchUserIds.includes(t.createdBy)) : txData)
          : [];
        const filteredTasks = tasksData
          ? (hasBranchFilter ? tasksData.filter((t: any) => branchUserIds.includes(t.created_by)) : tasksData)
          : [];
        const filteredAllocations = allocationsData
          ? (hasBranchFilter ? allocationsData.filter((a: any) => a.branch_id === user?.branch_id) : allocationsData)
          : [];

        // Populate metrics
        const totalAllocatedPureGold = filteredAllocations.filter((a: any) => a.metal === 'Gold').reduce((s: any, a: any) => s + Number(a.pure_weight || 0), 0);
        const totalAllocatedPureSilver = filteredAllocations.filter((a: any) => a.metal === 'Silver').reduce((s: any, a: any) => s + Number(a.pure_weight || 0), 0);

        const totalPureGiven = filteredLedger.reduce((s: any, e: any) => s + (Number(e.pure_gold_out) || 0), 0);
        const totalImpureReceived = filteredLedger.reduce((s: any, e: any) => s + (Number(e.impure_gold_in) || 0), 0);
        const totalImpureRefined = filteredLedger.reduce((s: any, e: any) => s + (Number(e.impure_gold_out) || 0), 0);
        
        const totalPureSilverGiven = filteredLedger.reduce((s: any, e: any) => s + (Number(e.pure_silver_out) || 0), 0);
        const totalImpureSilverReceived = filteredLedger.reduce((s: any, e: any) => s + (Number(e.impure_silver_in) || 0), 0);
        const totalImpureSilverRefined = filteredLedger.reduce((s: any, e: any) => s + (Number(e.impure_silver_out) || 0), 0);

        setPureGoldWeight(totalAllocatedPureGold - totalPureGiven); 
        setImpureGoldWeight(totalImpureReceived - totalImpureRefined);
        setPureSilverWeight(totalAllocatedPureSilver - totalPureSilverGiven);
        setImpureSilverWeight(totalImpureSilverReceived - totalImpureSilverRefined);
        
        let collected = 0, cash = 0, upi = 0;
        let revTunch = 0, revMarking = 0, revShouldering = 0;
        filteredTx.forEach((tx: any) => {
          if (tx.status === 'Paid') {
            const amt = Number(tx.amount) || 0;
            collected += amt;
            if (tx.type === 'Cash') cash += amt;
            if (tx.type === 'UPI') upi += amt;

            if (tx.work_type === 'Tunch') revTunch += amt;
            if (tx.work_type === 'Marking') revMarking += amt;
            if (tx.work_type === 'Shouldering') revShouldering += amt;
          }
        });
        setTotalCollected(collected);
        setCashCollection(cash);
        setUpiCollection(upi);
        setRevenue({ tunch: revTunch, marking: revMarking, shouldering: revShouldering });

        // Tasks stats
        let tunch = { processed: 0, pending: 0 };
        let marking = { processed: 0, pending: 0 };
        let shouldering = { processed: 0, pending: 0 };
        let source = { customers: 0, admin: 0, staff: 0, superAdmin: 0, collectionStaff: 0 };
        
        let inProgress = 0;
        let completed = 0;
        let pending = 0;

        filteredTasks.forEach(task => {
          const isDone = task.status === 'Completed';
          if (task.work_type === 'Tunch') { isDone ? tunch.processed++ : tunch.pending++; }
          if (task.work_type === 'Marking') { isDone ? marking.processed++ : marking.pending++; }
          if (task.work_type === 'Shouldering') { isDone ? shouldering.processed++ : shouldering.pending++; }
          
          if (task.source === 'Customer') source.customers++;
          else if (task.source === 'Admin') source.admin++;
          else if (task.source === 'Staff') source.staff++;
          else if (task.source === 'Super Admin') source.superAdmin++;
          else if (task.source === 'Collection Staff') source.collectionStaff++;

          if (task.status === 'In Progress') {
            inProgress++;
          } else if (task.status === 'Completed') {
            completed++;
          } else if (task.status === 'Pending' || task.status === 'Pending Verification') {
            pending++;
          }
        });
        
        setTasksStats({ tunch, marking, shouldering });
        setTaskSource(source);
        setGlobalStats({ inProgress, completed, pending });

        // Sort tasks by created_at DESC
        const sortedTasks = [...filteredTasks].sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });

        const formattedRecent = sortedTasks.slice(0, 5).map((t: any) => ({
          id: t.id,
          customerName: t.customer_name,
          workType: t.work_type,
          assignedTo: t.assigned_to,
          status: t.status
        }));

        setRecentTasks(formattedRecent);
      };

      if (cachedLedger && cachedTx && cachedTasks && cachedAllocations) {
        applyData(cachedLedger, cachedTx, cachedTasks, cachedAllocations, [userId]);
      }

      // Guard database fetches until fully authenticated to prevent RLS/anonymous query errors
      if (!isFullyAuthenticated) return;

      // 2. Fetch fresh data in background in parallel
      try {
        let branchUserIds: string[] = [];
        if (!isSuperSa && user?.branch_id) {
          const { data: bUsers, error: buError } = await supabase
            .from('users')
            .select('id')
            .eq('branch_id', user.branch_id);
          if (!buError && bUsers) {
            branchUserIds = bUsers.map((bu: any) => bu.id);
          }
        }
        if (branchUserIds.length === 0) {
          branchUserIds = [userId];
        }

        const [ledgerRes, txRes, tasksRes, allocationsRes] = await Promise.all([
          supabase.from('ledger_entries').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('stock_allocations').select('*')
        ]);

        const ledgerData = ledgerRes.data;
        if (ledgerData) {
          setCachedData('ledger_data', ledgerData);
        }

        const txData = txRes.data;
        if (txData) {
          setCachedData('tx_data', txData);
        }

        const tasksData = tasksRes.data;
        if (tasksData) {
          setCachedData('tasks_data', tasksData);
        }

        const allocationsData = allocationsRes.data;
        if (allocationsData) {
          setCachedData('stock_allocations_all', allocationsData);
        }

        applyData(ledgerData, txData, tasksData, allocationsData, branchUserIds);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchData();
  }, [userId, isFullyAuthenticated]);



  const totalTasks = globalStats.inProgress + globalStats.completed + globalStats.pending;

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-4 pb-40 relative">
        <div className="absolute bottom-[10%] left-[15%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>ENCRYPTED PRIVACY</div>
        <div className="absolute top-[50%] right-[5%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>TRUSTED INSTITUTION</div>
        <div className="absolute top-[150px] left-[10%] -rotate-12 pointer-events-none select-none z-0 text-[10px] font-headline uppercase tracking-[0.2em] text-primary/5 opacity-80" style={{ opacity: 0.04 }}>SECURITY PROTOCOL ACTIVE</div>
        
        <header className="flex items-center justify-between py-4 mb-2 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#003366] to-[#001e40] border border-white/20 shadow-lg flex-shrink-0 flex items-center justify-center text-white font-headline text-sm font-bold">
              {getInitials(getGreetingName())}
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline text-lg font-bold text-primary leading-tight">Good Morning, {getGreetingName()}</h1>
              <p className="text-xs text-outline font-medium">Your summary for Zurich Main today.</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full glass-effect flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container transition-colors border border-outline-variant/30">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>notifications</span>
          </button>
        </header>

        {/* Gold & Silver Weight Summary */}
        <section className="space-y-3 relative z-10">
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1">Global Assets</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="luxury-card p-6 bg-white border-l-4 border-l-secondary flex flex-col justify-between h-32 relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-secondary">pentagon</span>
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Total Pure Gold</p>
                <span className="material-symbols-outlined text-secondary glow-icon text-lg">star</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="font-headline font-extrabold text-primary" style={fitText(pureGoldWeight.toFixed(2), 6, 1.875, 1.15)}>{pureGoldWeight.toFixed(2)}</span>
                <span className="text-xs font-black text-secondary">gram</span>
              </div>
            </div>
            <div className="luxury-card p-6 bg-white border-l-4 border-l-tertiary-container flex flex-col justify-between h-32 relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-tertiary-container">heap_snapshot_thumbnail</span>
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Total Impure Gold</p>
                <span className="material-symbols-outlined text-tertiary-container glow-icon text-lg">rebase</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="font-headline font-extrabold text-primary" style={fitText(impureGoldWeight.toFixed(2), 6, 1.875, 1.15)}>{impureGoldWeight.toFixed(2)}</span>
                <span className="text-xs font-black text-tertiary-container">gram</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="luxury-card p-6 bg-white border-l-4 border-l-slate-400 flex flex-col justify-between h-32 relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-slate-400">diamond</span>
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Total Pure Silver</p>
                <span className="material-symbols-outlined text-slate-400 glow-icon text-lg">star</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="font-headline font-extrabold text-primary" style={fitText(pureSilverWeight.toFixed(2), 6, 1.875, 1.15)}>{pureSilverWeight.toFixed(2)}</span>
                <span className="text-xs font-black text-slate-400">gram</span>
              </div>
            </div>
            <div className="luxury-card p-6 bg-white border-l-4 border-l-slate-300 flex flex-col justify-between h-32 relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-2 -top-2 text-6xl opacity-5 text-slate-300">lens_blur</span>
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em]">Total Impure Silver</p>
                <span className="material-symbols-outlined text-slate-300 glow-icon text-lg">rebase</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="font-headline font-extrabold text-primary" style={fitText(impureSilverWeight.toFixed(2), 6, 1.875, 1.15)}>{impureSilverWeight.toFixed(2)}</span>
                <span className="text-xs font-black text-slate-300">gram</span>
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
                <span className="font-headline font-extrabold text-white tracking-tight" style={fitText(totalCollected.toLocaleString('en-IN'), 9, 3.0, 1.75)}>{totalCollected.toLocaleString('en-IN')}</span>
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
              <span className="font-headline font-bold text-primary" style={fitText(cashCollection.toLocaleString('en-IN'), 8, 1.25, 0.95)}>{cashCollection.toLocaleString('en-IN')}</span>
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
              <span className="font-headline font-bold text-primary" style={fitText(upiCollection.toLocaleString('en-IN'), 8, 1.25, 0.95)}>{upiCollection.toLocaleString('en-IN')}</span>
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
                <p className="font-headline text-lg font-bold text-primary">₹{revenue.tunch.toLocaleString('en-IN')}</p>
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
                <p className="font-headline text-lg font-bold text-primary">₹{revenue.marking.toLocaleString('en-IN')}</p>
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
                <p className="font-headline text-lg font-bold text-primary">₹{revenue.shouldering.toLocaleString('en-IN')}</p>
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
                <span className="text-primary">{taskSource.customers} Tasks</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full shadow-[0_0_8px_rgba(0,89,187,0.3)]" style={{ width: `${Math.min(100, taskSource.customers * 5)}%` }}></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-primary">admin_panel_settings</span>
                  <span className="text-primary">Admin</span>
                </div>
                <span className="text-primary">{taskSource.admin} Tasks</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(0,30,64,0.3)]" style={{ width: `${Math.min(100, taskSource.admin * 5)}%` }}></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-tertiary-container">badge</span>
                  <span className="text-primary">Staff</span>
                </div>
                <span className="text-primary">{taskSource.staff} Tasks</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-tertiary-container rounded-full" style={{ width: `${Math.min(100, taskSource.staff * 5)}%` }}></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-outline">policy</span>
                  <span className="text-primary">Super Admin</span>
                </div>
                <span className="text-primary">{taskSource.superAdmin} Tasks</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-outline rounded-full" style={{ width: `${Math.min(100, taskSource.superAdmin * 5)}%` }}></div>
              </div>
            </div>
            {!isAdminOrSuper && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-secondary-container">local_shipping</span>
                    <span className="text-primary">Collection Staff</span>
                  </div>
                  <span className="text-primary">{taskSource.collectionStaff} Tasks</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary-container rounded-full" style={{ width: `${Math.min(100, taskSource.collectionStaff * 5)}%` }}></div>
                </div>
              </div>
            )}
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
                  <p className="font-headline text-base font-bold text-primary">{String(tasksStats.tunch.processed).padStart(2, '0')}</p>
                </div>
                <div>
                  <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Pending</p>
                  <p className="font-headline text-base font-bold text-secondary">{String(tasksStats.tunch.pending).padStart(2, '0')}</p>
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
                  <p className="font-headline text-base font-bold text-primary">{String(tasksStats.marking.processed).padStart(2, '0')}</p>
                </div>
                <div>
                  <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Pending</p>
                  <p className="font-headline text-base font-bold text-secondary">{String(tasksStats.marking.pending).padStart(2, '0')}</p>
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
                  <p className="font-headline text-base font-bold text-primary">{String(tasksStats.shouldering.processed).padStart(2, '0')}</p>
                </div>
                <div>
                  <p className="text-[9px] text-outline uppercase font-bold mb-0.5">Pending</p>
                  <p className="font-headline text-base font-bold text-secondary">{String(tasksStats.shouldering.pending).padStart(2, '0')}</p>
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
              <p className="font-headline text-2xl font-bold text-primary">{globalStats.inProgress}</p>
              <div className="mt-2 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary-container" style={{ width: `${totalTasks > 0 ? (globalStats.inProgress / totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="luxury-card p-4 text-center border-b-4 border-b-tertiary-container relative overflow-hidden">
              <span className="material-symbols-outlined text-sm text-tertiary-container mb-1 block glow-icon">task_alt</span>
              <p className="text-[9px] text-outline uppercase font-bold mb-1.5 tracking-wider">Completed</p>
              <p className="font-headline text-2xl font-bold text-primary">{globalStats.completed}</p>
              <div className="mt-2 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-tertiary-container" style={{ width: `${totalTasks > 0 ? (globalStats.completed / totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="luxury-card p-4 text-center relative overflow-hidden">
              <span className="material-symbols-outlined text-sm text-primary mb-1 block glow-icon">pending_actions</span>
              <p className="text-[9px] text-outline uppercase font-bold mb-1.5 tracking-wider">Pending</p>
              <p className="font-headline text-2xl font-bold text-primary">{globalStats.pending}</p>
              <div className="mt-2 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${totalTasks > 0 ? (globalStats.pending / totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
          
          <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold px-1 mt-6">Recent Assignments</h3>
          <div className="luxury-card divide-y divide-surface-container overflow-hidden">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-outline text-sm font-medium">No recent assignments found.</div>
            ) : (
              recentTasks.map((task) => {
                const badge = getWorkBadgeColors(task.workType);
                return (
                  <div key={task.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${badge.bg} flex items-center justify-center text-[10px] font-bold ${badge.text} relative overflow-hidden`}>
                        <span className="material-symbols-outlined text-[10px] absolute opacity-20">{badge.icon}</span>
                        {getInitials(task.assignedTo)}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-primary">{task.workType} Work #{task.id.replace('TASK-', '')}</p>
                        <p className="text-[10px] text-outline">Assigned to: {task.assignedTo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getRecentStatusClass(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

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
