import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import { getCachedData, setCachedData } from '../cache';
import { fitText } from '../utils';
import { computeCollectionStaffBillingTransactions } from '../utils/billingUtils';

export const CollectionStaffDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, isFullyAuthenticated } = useSession();
  const currentUser = user?.id || '';

  // Directly initialize state from cache for 0ms delay on mount
  const cachedTasks = getCachedData('tasks_data', Infinity);

  const initialTasks = cachedTasks 
    ? cachedTasks.filter((t: any) => t.created_by === currentUser || t.assigned_to === currentUser).map((t: any) => ({
        id: t.id, customerName: t.customer_name, category: t.work_type, pieces: t.pieces, status: t.status, dateGiven: t.date_given, isoDate: t.iso_date || (t.created_at ? t.created_at.split('T')[0] : ''), settlementCondition: t.sett_condition || t.settlement_condition
      }))
    : [];

  // Load derived billing transactions cache, or calculate it immediately from raw cache
  let cachedBillingTx = getCachedData('colstaff_billing_tx', Infinity);
  if (!cachedBillingTx) {
    const cachedTx = getCachedData('tx_data', Infinity);
    if (cachedTx && cachedTasks) {
      let filteredTx = cachedTx.filter((t: any) => t.created_by === currentUser);
      let filteredTasks = cachedTasks.filter((t: any) => t.created_by === currentUser || t.assigned_to === currentUser);
      cachedBillingTx = computeCollectionStaffBillingTransactions(filteredTx, filteredTasks);
    }
  }
  if (!cachedBillingTx) {
    cachedBillingTx = [];
  }

  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [billingTransactions, setBillingTransactions] = useState<any[]>(cachedBillingTx);
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadData = async () => {
      if (!isFullyAuthenticated) return;
      try {
        const [tasksRes, txRes] = await Promise.all([
          supabase
            .from('tasks')
            .select('*')
            .or(`created_by.eq.${currentUser},assigned_to.eq.${currentUser}`)
            .order('created_at', { ascending: false }),
          supabase
            .from('transactions')
            .select('*')
            .eq('created_by', currentUser)
            .order('created_at', { ascending: false })
        ]);

        const tasksData = tasksRes.data;
        const taskError = tasksRes.error;
        if (!taskError && tasksData) {
          setTasks(tasksData.map((t: any) => ({
            id: t.id, customerName: t.customer_name, category: t.work_type, pieces: t.pieces, status: t.status, dateGiven: t.date_given, isoDate: t.iso_date || (t.created_at ? t.created_at.split('T')[0] : ''), settlementCondition: t.settlement_condition
          })));

          // Merge tasks back into in-memory cache
          const allTasks = getCachedData('tasks_data') || [];
          const otherTasks = allTasks.filter((t: any) => t.created_by !== currentUser && t.assigned_to !== currentUser);
          setCachedData('tasks_data', [...otherTasks, ...tasksData]);
        }

        const txData = txRes.data;
        const txError = txRes.error;
        if (!txError && txData) {
          // Merge transactions back into in-memory cache
          const allTx = getCachedData('tx_data') || [];
          const otherTx = allTx.filter((t: any) => t.created_by !== currentUser);
          setCachedData('tx_data', [...otherTx, ...txData]);
        }

        // --- Precompute Billing screen transactions and update state to trigger re-render ---
        let filteredTx = txRes.data || [];
        let filteredTasks = tasksRes.data || [];
        const allTx = computeCollectionStaffBillingTransactions(filteredTx, filteredTasks);
        setCachedData('colstaff_billing_tx', allTx);
        setBillingTransactions(allTx);
        // ------------------------------------------------------------------------
      } catch (err) {
        console.error('Error fetching collection staff data:', err);
      }
    };

    loadData();

    // Listen for newly created tasks to instantly update the UI without waiting for a database reload
    const handleTaskCreated = (e: any) => {
      const newTask = e.detail;
      if (newTask && newTask.created_by === currentUser) {
        setTasks(prev => {
          const mappedTask = {
            id: newTask.id, customerName: newTask.customer_name, category: newTask.work_type, pieces: newTask.pieces, status: newTask.status, dateGiven: newTask.date_given, isoDate: newTask.iso_date, settlementCondition: newTask.settlement_condition
          };
          if (prev.some(t => t.id === mappedTask.id)) return prev;
          return [mappedTask, ...prev];
        });
      }
    };

    window.addEventListener('taskCreated', handleTaskCreated);
    window.addEventListener('databaseSync', loadData);

    return () => {
       window.removeEventListener('taskCreated', handleTaskCreated);
       window.removeEventListener('databaseSync', loadData);
    };
  }, [currentUser, isFullyAuthenticated]);

  // 4. Calculate dues using billing data cache directly to ensure it perfectly matches the Billing Screen instantly
  const activeBillingTx = billingTransactions.length > 0 ? billingTransactions : cachedBillingTx;

  // Combine active tasks with billed/completed transactions for a holistic dashboard view
  const pendingTasks = tasks.filter((t: any) => t.status !== 'Completed').map((t: any) => ({
    id: t.id,
    customerName: t.customerName,
    category: t.category,
    pieces: t.pieces,
    status: t.status,
    isoDate: t.isoDate,
    time: t.dateGiven || t.isoDate,
    settlementCondition: t.settlementCondition
  }));

  const billedItems = activeBillingTx.map((t: any) => ({
    id: t.id,
    customerName: t.customerName || t.customer_name,
    category: (t.workType || t.work_type || 'TUNCH').toUpperCase(),
    pieces: t.pieces || '1',
    status: 'Completed',
    isoDate: t.isoDate || t.iso_date,
    time: t.timestamp || t.date || 'Just Now',
    settlementCondition: t.details || ''
  }));

  const unifiedDashboardItems = [...pendingTasks, ...billedItems];

  // 1. Calculate stats dynamically
  let tunchPcs = 0;
  let markingPcs = 0;
  let shoulderPcs = 0;
  let todaysMarkingPcs = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  unifiedDashboardItems.forEach(t => {
    const pcs = parseInt(t.pieces || '1') || 1;
    const dateStr = t.isoDate || '';
    const cat = (t.category || 'TUNCH').toUpperCase();
    
    // Volume Analysis stats filtered by selected date
    if (!filterDate || dateStr === filterDate) {
      if (cat === 'TUNCH' || cat === 'PURE' || cat === 'CASH') tunchPcs += pcs;
      else if (cat === 'MARKING') markingPcs += pcs;
      else if (cat === 'SHOULDERING') shoulderPcs += pcs;
    }
    
    // Independent stat for Today's Marking pieces
    if (dateStr === todayStr && cat === 'MARKING') {
      todaysMarkingPcs += pcs;
    }
  });

  const collectionStats = [
    { label: 'Tunch Pieces', value: tunchPcs.toLocaleString(), icon: 'science', color: 'bg-tertiary/10 text-tertiary' },
    { label: 'Marking Pieces', value: markingPcs.toLocaleString(), icon: 'verified', color: 'bg-secondary/10 text-secondary' },
    { label: 'Shoulder Pieces', value: shoulderPcs.toLocaleString(), icon: 'precision_manufacturing', color: 'bg-primary/10 text-primary' },
    { label: "Today's Marking", value: todaysMarkingPcs.toLocaleString(), icon: 'today', color: 'bg-primary-container/10 text-primary-container' },
  ];

  // 2. Calculate status stats dynamically
  let pendingCount = unifiedDashboardItems.filter(t => t.status === 'Pending').length;
  let progressCount = unifiedDashboardItems.filter(t => t.status === 'In Progress').length;
  let completedCount = unifiedDashboardItems.filter(t => t.status === 'Completed').length;

  const statusStats = [
    { label: 'Pending', value: pendingCount.toString(), color: 'bg-error/10 text-error' },
    { label: 'In Progress', value: progressCount.toString(), color: 'bg-secondary/10 text-secondary' },
    { label: 'Completed', value: completedCount.toString(), color: 'bg-tertiary/10 text-tertiary' },
  ];

  // 3. Dynamic recent tasks
  const dynamicRecentTasks = unifiedDashboardItems;

  let totalCollected = 0;
  activeBillingTx.forEach((t: any) => {
    const isCollected = t.status === 'Fully Paid' || t.status === 'Paid' || t.status === 'Awaiting Staff' || t.colStaffPaid;
    if (isCollected) {
      if (!filterDate || t.isoDate === filterDate || t.iso_date === filterDate) {
        const amt = parseFloat(String(t.amount || '0').replace(/[^\d.]/g, '')) || 0;
        totalCollected += amt;
      }
    }
  });

  const uniqueCustomersCount = new Set(activeBillingTx.filter((t: any) => {
    const isCollected = t.status === 'Fully Paid' || t.status === 'Paid' || t.status === 'Awaiting Staff' || t.colStaffPaid;
    if (!isCollected) return false;
    if (filterDate && t.isoDate !== filterDate && t.iso_date !== filterDate) return false;
    return true;
  }).map((t: any) => t.customerName || t.customer_name)).size;

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto overflow-x-hidden hide-scrollbar">
      <main className="px-6 space-y-8 max-w-5xl mx-auto pt-4 pb-40 relative">
        <div className="absolute top-[20%] left-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-64 h-64 bg-tertiary/5 rounded-full blur-[100px] pointer-events-none"></div>

        <header className="flex items-center justify-between py-5 mb-2 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl ring-2 ring-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#001e40] to-[#003366] flex items-center justify-center border border-white/20">
               <span className="material-symbols-outlined text-white text-xl animate-pulse">local_shipping</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline text-lg font-extrabold text-primary leading-tight tracking-tight">Collection Unit</h1>
              <p className="text-[9px] text-[#C9A646] font-bold uppercase tracking-[0.25em]">Field Operations Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-11 h-11 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container transition-all premium-shadow relative group active:scale-95">
              <span className="material-symbols-outlined text-xl text-[#003366] transition-transform group-hover:rotate-12">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#C9A646] rounded-full animate-pulse shadow-[0_0_8px_#C9A646]"></span>
            </button>
          </div>
        </header>

        {/* TOTAL COLLECTED BANNER */}
        <section className="relative z-10 animate-fade-in">
          <div className="text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden group border border-white/10" style={{ background: 'linear-gradient(135deg, #001e40 0%, #003366 100%)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-[#34d399]/10 rounded-full blur-3xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/50">Total Amount Collected</p>
                <h2 className="font-headline font-black mt-2 text-white drop-shadow-md" style={fitText(`₹ ${totalCollected.toLocaleString()}`, 10, 1.875, 1.25)}>₹ {totalCollected.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <span className="material-symbols-outlined text-white text-xl">account_balance_wallet</span>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center text-[9px] font-bold">
              <span className="text-white/40 uppercase tracking-wider">Collected From: {uniqueCustomersCount} Customers</span>
              <span className="text-[#34d399] uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#34d399] animate-ping"></span>
                Amount Collected
              </span>
            </div>
          </div>
        </section>

        {/* CATEGORY PIECES */}
        <section className="space-y-4 relative z-10">
           <div className="flex justify-between items-center px-1">
             <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-outline font-extrabold">Volume Analysis</h3>
             <div className="flex items-center gap-2">
               {filterDate && (
                 <button onClick={() => setFilterDate('')} className="text-[9px] text-error uppercase font-bold tracking-widest hover:bg-error/10 px-2 py-1 rounded-full transition-colors flex items-center">
                   Clear
                 </button>
               )}
               <div className="relative flex items-center group cursor-pointer bg-surface-container hover:bg-surface-container-high px-3 py-1.5 rounded-full transition-colors">
                 <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-sm mr-1.5">calendar_month</span>
                 <span className="text-[9px] font-bold text-primary uppercase tracking-wider min-w-[55px] text-center">
                   {filterDate ? new Date(filterDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'ALL TIME'}
                 </span>
                 <input 
                   type="date" 
                   value={filterDate} 
                   onChange={(e) => setFilterDate(e.target.value)}
                   onClick={(e) => {
                     try {
                       if ('showPicker' in HTMLInputElement.prototype) {
                         (e.target as HTMLInputElement).showPicker();
                       }
                     } catch (err) {}
                   }}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
               </div>
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
             {collectionStats.map((stat, idx) => (
               <div key={idx} className="luxury-card p-5 space-y-3 bg-white border border-outline-variant/10 group active:scale-[0.98] transition-transform">
                 <div className="flex justify-between items-center">
                   <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                     <span className="material-symbols-outlined text-lg">{stat.icon}</span>
                   </div>
                   <span className="font-headline text-xl font-bold text-primary">{stat.value}</span>
                 </div>
                 <p className="text-[10px] font-bold text-outline uppercase tracking-wider">{stat.label}</p>
               </div>
             ))}
           </div>
        </section>

        {/* STATUS SUMMARY */}
        <section className="luxury-card p-6 bg-surface-container-lowest border border-outline-variant/10 relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-outline font-extrabold">Workflow Lifecycle</h3>
            <span className="material-symbols-outlined text-outline text-lg">donut_large</span>
          </div>
          <div className="flex justify-between items-center px-2">
            {statusStats.map((stat, i) => (
               <div key={i} className="flex flex-col items-center gap-2 flex-1">
                 <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center font-black text-xs border border-white shadow-sm`}>
                    {stat.value}
                 </div>
                 <span className="text-[9px] font-bold text-outline uppercase tracking-tighter">{stat.label}</span>
               </div>
            ))}
          </div>
        </section>

        {/* RECENT TASKS */}
        <section className="space-y-4 relative z-10">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-label text-[10px] uppercase tracking-[0.25em] text-outline font-extrabold">Field Assignments</h3>
            <button onClick={() => navigate('/tasks')} className="text-[10px] font-bold text-secondary uppercase tracking-wider underline underline-offset-4 decoration-secondary/30">History</button>
          </div>
          <div className="luxury-card overflow-hidden bg-white border border-outline-variant/10">
            {dynamicRecentTasks.length > 0 ? (
              dynamicRecentTasks.slice(0, 5).map((item, idx) => {
                const isCash = item.settlementCondition?.toLowerCase().includes('cash');
                return (
                  <div key={idx} className={`p-5 flex items-center justify-between group transition-colors border-b last:border-0 border-outline-variant/10 ${isCash ? 'cash-light-row' : 'hover:bg-surface-container-lowest bg-white'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black bg-primary/90 text-sm shadow-md`}>
                        {item.category[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary tracking-tight">{item.customerName || item.customer}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[9px] font-black text-secondary tracking-widest uppercase">{item.category}</span>
                           <span className="text-[10px] font-medium text-outline/60">{item.pieces} Pieces</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className={`text-[8px] whitespace-nowrap text-center px-2.5 py-1 rounded-full font-black uppercase tracking-widest border ${
                        item.status === 'Completed' ? 'bg-tertiary/5 text-tertiary border-tertiary/20' : 
                        item.status === 'In Progress' ? 'bg-secondary/5 text-secondary border-secondary/20' : 
                        'bg-error/5 text-error border-error/20'
                      }`}>
                        {item.status}
                      </span>
                      <p className="text-[8px] text-outline/40 font-bold uppercase tracking-[0.1em]">{item.time}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-outline text-xs font-medium bg-white">No recent collection assignments.</div>
            )}
          </div>
        </section>
      </main>



      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Home</span>
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
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
