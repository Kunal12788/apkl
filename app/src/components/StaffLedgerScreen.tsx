import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData, clearAllDataCaches } from '../cache';
import { fitText } from '../utils';
import { useSession } from '../context/SessionContext';
import { computeStaffBillingTransactions } from '../utils/billingUtils';
import { triggerBlueToast } from './AppleToast';
import { NotificationBell } from './NotificationBell';

interface LedgerEntry {
  pureSilverOut: number;
  pureSilverDue: number;
  impureSilverIn: number;
  impureSilverOut?: number;
  id: string;
  date: string;
  isoDate: string;
  customerName: string;
  transactionType: 'Tunch Only' | 'Exchange' | 'Pending Settlement' | 'Pure Gold Sale' | 'Refining Dispatch';
  pureGoldOut: number;
  pureGoldDue: number;
  impureGoldIn: number;
  impureGoldOut?: number;
  purity?: string;
  cashReceived: number;
  cashPaid: number;
  status: 'Completed' | 'Pending Pure' | 'Pending Cash' | 'No Settlement';
  pureGoldIn?: number;
  pureSilverIn?: number;
  cashRatePerGram?: number;
  cashAmount?: number;
  pendingPureLiability?: boolean;
  pendingCashLiability?: boolean;
  staffSubmittedAt?: string | null;
  adminSubmittedAt?: string | null;
}


// Dynamic Opening Stock variables are calculated from stock_allocations and ledger_entries.

// DB Mapper helper functions
const mapDbToEntry = (db: any): LedgerEntry => ({
  id: db.id,
  date: db.date,
  isoDate: db.iso_date,
  customerName: db.customer_name,
  transactionType: db.transaction_type,
  pureGoldOut: Number(db.pure_gold_out || 0),
  pureGoldDue: Number(db.pure_gold_due || 0),
  impureGoldIn: Number(db.impure_gold_in || 0),
  impureGoldOut: Number(db.impure_gold_out || 0),
  pureSilverOut: Number(db.pure_silver_out || 0),
  pureSilverDue: Number(db.pure_silver_due || 0),
  impureSilverIn: Number(db.impure_silver_in || 0),
  impureSilverOut: Number(db.impure_silver_out || 0),
  purity: db.purity,
  cashReceived: Number(db.cash_received || 0),
  cashPaid: Number(db.cash_paid || 0),
  status: db.status,
  pureGoldIn: Number(db.pure_gold_in || 0),
  pureSilverIn: Number(db.pure_silver_in || 0),
  cashRatePerGram: Number(db.cash_rate_per_gram || 0),
  cashAmount: Number(db.cash_amount || 0),
  pendingPureLiability: db.pending_pure_liability,
  pendingCashLiability: db.pending_cash_liability,
  staffSubmittedAt: db.staff_submitted_at,
  adminSubmittedAt: db.admin_submitted_at
});



export const StaffLedgerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const userId = user?.id || '';
  const isAdmin = user?.role === 'Admin';

  const isSuperSa = user?.role === 'Super Admin';
  const isAdminOrSuper = isAdmin || isSuperSa;
  const cacheKeyEntries = isSuperSa ? 'ledger_entries_superadmin' : `ledger_entries_branch_${user?.branch_id || userId}`;
  const cacheKeyAllocations = isSuperSa ? 'stock_allocations_superadmin' : `stock_allocations_branch_${user?.branch_id || userId}`;
  const cacheKeyBranchUsers = `branch_users_${user?.branch_id || 'unknown'}`;

  const cachedEntries = getCachedData(cacheKeyEntries, Infinity);
  const initialEntries = cachedEntries ? cachedEntries.map(mapDbToEntry) : [];

  const cachedAllocations = getCachedData(cacheKeyAllocations, Infinity);
  const initialAllocations = cachedAllocations || [];

  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>(initialEntries);
  const [allocations, setAllocations] = useState<any[]>(initialAllocations);
  const [activeMetal, setActiveMetal] = useState<'Gold' | 'Silver'>('Gold');
  const [, setLoading] = useState(initialEntries.length === 0);
  const [startDate, setStartDate] = useState('');
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<any | null>(null);
  const [hasActiveDataToSubmit, setHasActiveDataToSubmit] = useState(false);

  const [hasUnsubmittedStaffData, setHasUnsubmittedStaffData] = useState(false);
  const [branchStaff, setBranchStaff] = useState<any[]>([]);

  // Admin allocation states
  const [allocStaffId, setAllocStaffId] = useState('');
  const [allocGold, setAllocGold] = useState('');
  const [allocSilver, setAllocSilver] = useState('');
  const [allocCash, setAllocCash] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);
  
  // Load derived billing transactions cache, or calculate it immediately from raw cache
  let cachedBillingTx = getCachedData('staff_billing_tx', Infinity);
  if (!cachedBillingTx) {
    const cachedTx = getCachedData('tx_data', Infinity);
    const cachedTasks = getCachedData('tasks_data', Infinity);
    if (cachedTx && cachedTasks) {
      const cachedBranchUsers = getCachedData(cacheKeyBranchUsers, Infinity) || [];
      const branchUserIds = cachedBranchUsers.length > 0 ? cachedBranchUsers : [userId];

      let filteredTx = cachedTx || [];
      let filteredTasks = cachedTasks || [];
      if (!isSuperSa && user?.branch_id) {
        filteredTx = filteredTx.filter((t: any) => !t.created_by || branchUserIds.includes(t.created_by) || branchUserIds.includes(t.createdBy));
        filteredTasks = filteredTasks.filter((t: any) => !t.created_by || branchUserIds.includes(t.created_by) || branchUserIds.includes(t.createdBy));
      }
      cachedBillingTx = computeStaffBillingTransactions(filteredTx, filteredTasks);
    }
  }
  if (!cachedBillingTx) {
    cachedBillingTx = [];
  }

  let initialBillingCash = 0;
  cachedBillingTx.forEach((tx: any) => {
    const type = tx.type?.trim().toLowerCase() || '';
    if ((tx.status === 'Paid' || tx.status === 'Fully Paid') && type === 'cash') {
      const amtStr = typeof tx.amount === 'string' ? tx.amount.replace(/[^\d.]/g, '') : tx.amount;
      initialBillingCash += Number(amtStr) || 0;
    }
  });

  const [billingCash, setBillingCash] = useState(initialBillingCash);

  const [branchName, setBranchName] = useState('Delhi Branch');

  // Dynamically resolve the staff member's assigned branch name from the database
  useEffect(() => {
    const fetchBranchName = async () => {
      if (user?.branch_id) {
        try {
          const { data, error } = await supabase
            .from('branches')
            .select('name')
            .eq('id', user.branch_id)
            .maybeSingle();
          
          if (!error && data) {
            setBranchName(data.name);
          }
        } catch (err) {
          console.error('Error fetching branch name:', err);
        }
      }
    };
    fetchBranchName();
  }, [user?.branch_id]);

  // Fetch entries from Supabase
  const fetchEntries = async () => {
    try {
      const isSuperSa = user?.role === 'Super Admin';
      let branchUserIds: string[] = getCachedData(cacheKeyBranchUsers) || [];
      let staffUserIds: string[] = [];

      if (!isSuperSa && user?.branch_id) {
        const { data: bUsers, error: buError } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('branch_id', user.branch_id);
        if (!buError && bUsers) {
          branchUserIds = bUsers.map((bu: any) => bu.id);
          setCachedData(cacheKeyBranchUsers, branchUserIds);

          const staff = bUsers.filter((bu: any) => bu.role !== 'Admin' && bu.role !== 'Super Admin');
          setBranchStaff(staff);
          staffUserIds = staff.map((bu: any) => bu.id);
        }
      }

      if (branchUserIds.length === 0) {
        branchUserIds = [userId];
      }

      let entriesQuery = supabase.from('ledger_entries').select('*').order('created_at', { ascending: false });
      let allocationsQuery = supabase.from('stock_allocations').select('*');
      let txQuery = supabase.from('transactions').select('*');
      let tasksQuery = supabase.from('tasks').select('*');

      if (!isSuperSa && user?.branch_id) {
        entriesQuery = entriesQuery.in('staff_id', branchUserIds);
        if (user?.role === 'Admin') {
          allocationsQuery = allocationsQuery.eq('branch_id', user.branch_id);
        } else {
          allocationsQuery = allocationsQuery.eq('staff_id', userId);
        }
      }

      // Check for unsubmitted staff data
      let hasUnsubmitted = false;
      if (user?.role === 'Admin' && user?.branch_id && staffUserIds.length > 0) {
        const [uEntries, uAlloc, uTx, uTasks] = await Promise.all([
          supabase.from('ledger_entries').select('id', { count: 'exact', head: true }).in('staff_id', staffUserIds).is('staff_submitted_at', null),
          supabase.from('stock_allocations').select('id', { count: 'exact', head: true }).eq('branch_id', user.branch_id).is('staff_submitted_at', null),
          supabase.from('transactions').select('id', { count: 'exact', head: true }).in('created_by', staffUserIds).is('staff_submitted_at', null),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).in('created_by', staffUserIds).is('staff_submitted_at', null),
        ]);
        const count = (uEntries.count || 0) + (uAlloc.count || 0) + (uTx.count || 0) + (uTasks.count || 0);
        if (count > 0) {
          hasUnsubmitted = true;
        }
      }
      setHasUnsubmittedStaffData(hasUnsubmitted);

      let hasActiveData = false;
      if (user?.role === 'Admin') {
        const [aEntries, aAlloc, aTx, aTasks] = await Promise.all([
          supabase.from('ledger_entries').select('id', { count: 'exact', head: true }).in('staff_id', branchUserIds).is('admin_submitted_at', null),
          supabase.from('stock_allocations').select('id', { count: 'exact', head: true }).eq('branch_id', user?.branch_id).is('admin_submitted_at', null),
          supabase.from('transactions').select('id', { count: 'exact', head: true }).in('created_by', branchUserIds).is('admin_submitted_at', null),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).in('created_by', branchUserIds).is('admin_submitted_at', null),
        ]);
        const count = (aEntries.count || 0) + (aAlloc.count || 0) + (aTx.count || 0) + (aTasks.count || 0);
        if (count > 0) hasActiveData = true;
      } else if (user?.role === 'Staff' || user?.role === 'Collection Staff') {
        const [sEntries, sAlloc, sTx, sTasks] = await Promise.all([
          supabase.from('ledger_entries').select('id', { count: 'exact', head: true }).eq('staff_id', userId).is('staff_submitted_at', null),
          supabase.from('stock_allocations').select('id', { count: 'exact', head: true }).eq('staff_id', userId).is('staff_submitted_at', null),
          supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('created_by', userId).is('staff_submitted_at', null),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('created_by', userId).is('staff_submitted_at', null),
        ]);
        const count = (sEntries.count || 0) + (sAlloc.count || 0) + (sTx.count || 0) + (sTasks.count || 0);
        if (count > 0) hasActiveData = true;
      }
      setHasActiveDataToSubmit(hasActiveData);

      // Apply clearance / submission filters
      const hasDateSearch = !!startDate;
      if (!hasDateSearch) {
        if (user?.role === 'Staff' || user?.role === 'Collection Staff') {
          entriesQuery = entriesQuery.is('staff_submitted_at', null).is('admin_submitted_at', null);
          allocationsQuery = allocationsQuery.is('staff_submitted_at', null).is('admin_submitted_at', null);
          txQuery = txQuery.is('staff_submitted_at', null).is('admin_submitted_at', null);
          tasksQuery = tasksQuery.is('staff_submitted_at', null).is('admin_submitted_at', null);
        } else if (user?.role === 'Admin') {
          entriesQuery = entriesQuery.or(`staff_id.eq.${userId},staff_submitted_at.not.is.null`).is('admin_submitted_at', null);
          allocationsQuery = allocationsQuery.is('admin_submitted_at', null);
          txQuery = txQuery.or(`created_by.eq.${userId},staff_submitted_at.not.is.null`).is('admin_submitted_at', null);
          tasksQuery = tasksQuery.or(`created_by.eq.${userId},assigned_to.eq.${userId},staff_submitted_at.not.is.null`).is('admin_submitted_at', null);
        } else {
          // For Super Admin viewing active branch ledger
          entriesQuery = entriesQuery.is('admin_submitted_at', null);
          allocationsQuery = allocationsQuery.is('admin_submitted_at', null);
          txQuery = txQuery.is('admin_submitted_at', null);
          tasksQuery = tasksQuery.is('admin_submitted_at', null);
        }
      } else {
        entriesQuery = entriesQuery.eq('iso_date', startDate);
        allocationsQuery = allocationsQuery.eq('iso_date', startDate);
        txQuery = txQuery.eq('iso_date', startDate);
        tasksQuery = tasksQuery.eq('iso_date', startDate);
      }

      const [entriesRes, allocationsRes, txRes, tasksRes] = await Promise.all([
        entriesQuery,
        allocationsQuery,
        txQuery,
        tasksQuery
      ]);

      if (entriesRes.error) throw entriesRes.error;
      if (allocationsRes.error) throw allocationsRes.error;

      if (entriesRes.data) {
        setCachedData(cacheKeyEntries, entriesRes.data);
        setEntries(entriesRes.data.map(mapDbToEntry));
      } else {
        setEntries([]);
      }

      if (allocationsRes.data) {
        setCachedData(cacheKeyAllocations, allocationsRes.data);
        setAllocations(allocationsRes.data);
      } else {
        setAllocations([]);
      }

      if (txRes.data) {
        setCachedData('tx_data', txRes.data);
      }
      if (tasksRes.data) {
        setCachedData('tasks_data', tasksRes.data);
      }

      if (txRes.data || tasksRes.data) {
        let filteredTx = txRes.data || [];
        let filteredTasks = tasksRes.data || [];
        if (!isSuperSa && user?.branch_id) {
          filteredTx = filteredTx.filter((t: any) => !t.created_by || branchUserIds.includes(t.created_by) || branchUserIds.includes(t.createdBy));
          filteredTasks = filteredTasks.filter((t: any) => !t.created_by || branchUserIds.includes(t.created_by));
        }

        const allTx = computeStaffBillingTransactions(filteredTx, filteredTasks);
        setCachedData('staff_billing_tx', allTx);
        let cash = 0;
        allTx.forEach((tx: any) => {
          const type = tx.type?.trim().toLowerCase() || '';
          if ((tx.status === 'Paid' || tx.status === 'Fully Paid') && type === 'cash') {
            const amtStr = typeof tx.amount === 'string' ? tx.amount.replace(/[^\d.]/g, '') : tx.amount;
            cash += Number(amtStr) || 0;
          }
        });
        setBillingCash(cash);
      }
    } catch (err) {
      console.error('Error fetching ledger entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();

    const allocationsSub = supabase.channel('public:stock_allocations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_allocations' }, () => {
        fetchEntries();
      })
      .subscribe();

    const ledgerSub = supabase.channel('public:ledger_entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, () => {
        fetchEntries();
      })
      .subscribe();

    const txSub = supabase.channel('public:transactions_ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchEntries();
      })
      .subscribe();

    const tasksSub = supabase.channel('public:tasks_ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchEntries();
      })
      .subscribe();

    const handleSync = () => {
      fetchEntries();
    };
    window.addEventListener('databaseSync', handleSync);

    return () => {
      supabase.removeChannel(allocationsSub);
      supabase.removeChannel(ledgerSub);
      supabase.removeChannel(txSub);
      supabase.removeChannel(tasksSub);
      window.removeEventListener('databaseSync', handleSync);
    };
  }, [user?.branch_id, isSuperSa, startDate, user?.role]);

  const totalAllocatedPureGold = React.useMemo(() => {
    if (user?.role === 'Admin') {
      const fromSuper = allocations.filter(a => a.staff_id === null && a.metal === 'Gold').reduce((s, a) => s + Number(a.pure_weight || 0), 0);
      const toStaffActive = allocations.filter(a => a.staff_id !== null && a.staff_submitted_at === null && a.metal === 'Gold').reduce((s, a) => s + Number(a.pure_weight || 0), 0);
      return fromSuper - toStaffActive;
    }
    return allocations.filter(a => a.metal === 'Gold').reduce((s, a) => s + Number(a.pure_weight || 0), 0);
  }, [allocations, user?.role]);

  const totalAllocatedPureSilver = React.useMemo(() => {
    if (user?.role === 'Admin') {
      const fromSuper = allocations.filter(a => a.staff_id === null && a.metal === 'Silver').reduce((s, a) => s + Number(a.pure_weight || 0), 0);
      const toStaffActive = allocations.filter(a => a.staff_id !== null && a.staff_submitted_at === null && a.metal === 'Silver').reduce((s, a) => s + Number(a.pure_weight || 0), 0);
      return fromSuper - toStaffActive;
    }
    return allocations.filter(a => a.metal === 'Silver').reduce((s, a) => s + Number(a.pure_weight || 0), 0);
  }, [allocations, user?.role]);

  const totalPureGiven = React.useMemo(() => entries.filter(e => e.transactionType !== 'Tunch Only').reduce((s, e) => s + (activeMetal === 'Gold' ? e.pureGoldOut : e.pureSilverOut), 0), [entries, activeMetal]);
  const totalPureReceived = React.useMemo(() => entries.filter(e => e.transactionType !== 'Tunch Only').reduce((s, e) => s + (activeMetal === 'Gold' ? (e.pureGoldIn || 0) : (e.pureSilverIn || 0)), 0), [entries, activeMetal]);
  const totalImpureReceived = React.useMemo(() => entries.filter(e => e.transactionType !== 'Tunch Only').reduce((s, e) => s + (activeMetal === 'Gold' ? e.impureGoldIn : e.impureSilverIn), 0), [entries, activeMetal]);
  const totalImpureRefined = React.useMemo(() => entries.filter(e => e.transactionType !== 'Tunch Only').reduce((s, e) => s + (activeMetal === 'Gold' ? (e.impureGoldOut || 0) : (e.impureSilverOut || 0)), 0), [entries, activeMetal]);

  const totalAllocatedCash = React.useMemo(() => {
    if (user?.role === 'Admin') {
      const fromSuper = allocations.filter(a => a.staff_id === null).reduce((s, a) => s + Number(a.cash_amount || 0), 0);
      const toStaffActive = allocations.filter(a => a.staff_id !== null && a.staff_submitted_at === null).reduce((s, a) => s + Number(a.cash_amount || 0), 0);
      return fromSuper - toStaffActive;
    }
    return allocations.reduce((s, a) => s + Number(a.cash_amount || 0), 0);
  }, [allocations, user?.role]);
  const totalCashReceived = React.useMemo(() => entries.reduce((s, e) => s + Number(e.cashReceived || 0), 0), [entries]);
  const totalCashPaid = React.useMemo(() => entries.reduce((s, e) => s + Number(e.cashPaid || 0), 0), [entries]);

  const currentPureStock = (activeMetal === 'Gold' ? totalAllocatedPureGold : totalAllocatedPureSilver) + totalPureReceived - totalPureGiven;
  const currentImpureStock = totalImpureReceived - totalImpureRefined; // Impure has no initial allocation
  const currentCashStock = totalAllocatedCash + totalCashReceived + billingCash - totalCashPaid;
  

  const combinedHistory = React.useMemo(() => {
    const history: any[] = [];
    
    // Add allocations
    allocations.forEach(a => {
      if (a.metal === activeMetal || Number(a.cash_amount) > 0) {
        history.push({
          type: 'allocation',
          id: a.id,
          date: new Date(a.created_at || new Date()).toLocaleString(),
          timestamp: new Date(a.created_at || new Date()).getTime(),
          metal: a.metal,
          pureWeight: Number(a.pure_weight),
          cashAmount: Number(a.cash_amount),
          notes: a.notes,
          staff_id: a.staff_id,
          allocated_by: a.allocated_by
        });
      }
    });

    // Add entries
    entries.forEach(e => {
      const isGold = activeMetal === 'Gold';
      const hasGold = e.pureGoldOut > 0 || e.pureGoldDue > 0 || e.impureGoldIn > 0 || (e.impureGoldOut || 0) > 0 || (e.pureGoldIn || 0) > 0;
      const hasSilver = e.pureSilverOut > 0 || e.pureSilverDue > 0 || e.impureSilverIn > 0 || (e.impureSilverOut || 0) > 0 || (e.pureSilverIn || 0) > 0;
      const hasCash = e.cashPaid > 0 || e.cashReceived > 0 || (e.cashAmount || 0) > 0;
      const isTunchOnly = e.transactionType === 'Tunch Only';

      const isMatch = isGold ? (hasGold || isTunchOnly || hasCash) : (hasSilver || isTunchOnly || hasCash);
      
      if (isMatch) {
        history.push({
          type: 'entry',
          id: e.id,
          timestamp: new Date(e.isoDate || new Date()).getTime(),
          entry: e
        });
      }
    });

    // Sort descending by timestamp
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }, [allocations, entries, activeMetal]);

  const handleAdminAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocStaffId) {
      alert("Please select a staff member.");
      return;
    }
    const goldVal = parseFloat(allocGold) || 0;
    const silverVal = parseFloat(allocSilver) || 0;
    const cashVal = parseFloat(allocCash) || 0;
    if (goldVal <= 0 && silverVal <= 0 && cashVal <= 0) {
      alert("Please specify at least one allocation amount (Gold, Silver, or Cash).");
      return;
    }

    const msg = user?.role === 'Admin'
      ? "Required stock is not present, kindly talk to the Super Admin."
      : "Required stock is not present, kindly talk to the Admin.";

    if (goldVal > currentPureStock && activeMetal === 'Gold') {
      triggerBlueToast(msg);
      return;
    }
    if (silverVal > currentPureStock && activeMetal === 'Silver') {
      triggerBlueToast(msg);
      return;
    }
    if (cashVal > currentCashStock) {
      triggerBlueToast(msg);
      return;
    }

    setIsAllocating(true);
    try {
      const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      const isoDateStr = new Date().toISOString().split('T')[0];

      const newAllocations = [];
      const staffName = branchStaff.find(s => s.id === allocStaffId)?.name || 'Staff';

      if (goldVal > 0) {
        newAllocations.push({
          id: `ALLOC-${Math.floor(1000 + Math.random() * 9000)}`,
          branch_id: user?.branch_id,
          branch_name: branchName,
          staff_id: allocStaffId,
          metal: 'Gold',
          pure_weight: goldVal,
          cash_amount: 0,
          allocated_by: userId,
          date: dateStr,
          iso_date: isoDateStr,
          notes: allocNotes || `Allocated by Admin to ${staffName}`
        });
      }

      if (silverVal > 0) {
        newAllocations.push({
          id: `ALLOC-${Math.floor(1000 + Math.random() * 9000)}`,
          branch_id: user?.branch_id,
          branch_name: branchName,
          staff_id: allocStaffId,
          metal: 'Silver',
          pure_weight: silverVal,
          cash_amount: 0,
          allocated_by: userId,
          date: dateStr,
          iso_date: isoDateStr,
          notes: allocNotes || `Allocated by Admin to ${staffName}`
        });
      }

      if (cashVal > 0) {
        newAllocations.push({
          id: `ALLOC-${Math.floor(1000 + Math.random() * 9000)}`,
          branch_id: user?.branch_id,
          branch_name: branchName,
          staff_id: allocStaffId,
          metal: 'Gold',
          pure_weight: 0,
          cash_amount: cashVal,
          allocated_by: userId,
          date: dateStr,
          iso_date: isoDateStr,
          notes: allocNotes || `Allocated by Admin to ${staffName}`
        });
      }

      const { error } = await supabase.from('stock_allocations').insert(newAllocations);
      if (error) throw error;

      alert("Stock successfully allocated to Staff!");
      setAllocStaffId('');
      setAllocGold('');
      setAllocSilver('');
      setAllocCash('');
      setAllocNotes('');
      clearAllDataCaches();
      fetchEntries();
    } catch (err) {
      console.error(err);
      alert("Failed to save allocation.");
    } finally {
      setIsAllocating(false);
    }
  };

  const handleSubmitReport = async () => {
    const isAdmin = user?.role === 'Admin';
    
    const confirmMessage = isAdmin
      ? "Are you sure you want to submit the branch daily report and clear active lists? Once submitted, they will be archived."
      : "Are you sure you want to submit your daily ledger report? Once submitted, active lists will be cleared.";

    if (!window.confirm(confirmMessage)) return;

    if (isAdmin && hasUnsubmittedStaffData) {
      alert("You cannot submit the branch daily report until the branch staff has submitted their report.");
      return;
    }

    if (!hasActiveDataToSubmit) {
      alert("There is no active data to submit.");
      return;
    }

    try {
      const nowStr = new Date().toISOString();
      const today = nowStr.split('T')[0];

      if (isAdmin) {
        // --- 1. Compute values for Branch Daily Report ---
        const todayEntries = entries.filter(e => e.isoDate === today && e.transactionType !== 'Tunch Only');

        const tAllocGold = allocations.filter(a => a.staff_id === null && a.metal === 'Gold').reduce((s, a) => s + Number(a.pure_weight || 0), 0);
        const tAllocSilver = allocations.filter(a => a.staff_id === null && a.metal === 'Silver').reduce((s, a) => s + Number(a.pure_weight || 0), 0);
        const tAllocCash = allocations.filter(a => a.staff_id === null).reduce((s, a) => s + Number(a.cash_amount || 0), 0);

        const pastEntries = entries.filter(e => e.isoDate < today && e.transactionType !== 'Tunch Only');

        const pastGoldUsed = pastEntries.reduce((s, e) => s + e.pureGoldOut, 0);
        const pastSilverUsed = pastEntries.reduce((s, e) => s + e.pureSilverOut, 0);
        const pastCashRecv = pastEntries.reduce((s, e) => s + e.cashReceived, 0);
        const pastCashPaid = pastEntries.reduce((s, e) => s + e.cashPaid, 0);

        const openingPureGold = tAllocGold - pastGoldUsed;
        const openingPureSilver = tAllocSilver - pastSilverUsed;
        const openingCash = tAllocCash + pastCashRecv - pastCashPaid;

        const goldUsed = todayEntries.reduce((s, e) => s + e.pureGoldOut, 0);
        const silverUsed = todayEntries.reduce((s, e) => s + e.pureSilverOut, 0);
        const cashUsed = todayEntries.reduce((s, e) => s + e.cashPaid, 0);
        
        const cashReceived = todayEntries.reduce((s, e) => s + e.cashReceived, 0) + billingCash;
        const impureGoldRecv = todayEntries.reduce((s, e) => s + e.impureGoldIn, 0);
        const impureSilverRecv = todayEntries.reduce((s, e) => s + e.impureSilverIn, 0);

        const closingPureGold = openingPureGold - goldUsed;
        const closingPureSilver = openingPureSilver - silverUsed;
        const closingCash = openingCash + cashReceived - cashUsed;

        // Insert daily report
        const { error: saReportError } = await supabase.from('branch_daily_reports').insert([{
          id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
          branch_id: user?.branch_id || 'BR-DELHI',
          branch_name: branchName,
          staff_id: userId,
          date: 'Today',
          iso_date: today,
          opening_pure_gold: openingPureGold,
          opening_pure_silver: openingPureSilver,
          opening_cash: openingCash,
          gold_used: goldUsed,
          silver_used: silverUsed,
          cash_used: cashUsed,
          cash_received: cashReceived,
          impure_gold_received: impureGoldRecv,
          impure_silver_received: impureSilverRecv,
          closing_pure_gold: closingPureGold,
          closing_pure_silver: closingPureSilver,
          closing_cash: closingCash,
          status: 'Submitted'
        }]);

        if (saReportError) throw saReportError;

        // --- 2. Admin Clearance (clear from active screens for all branch staff) ---
        let branchUserIds: string[] = getCachedData(cacheKeyBranchUsers) || [];
        if (user?.branch_id && branchUserIds.length === 0) {
          const { data: bUsers } = await supabase
            .from('users')
            .select('id')
            .eq('branch_id', user.branch_id);
          if (bUsers) {
            branchUserIds = bUsers.map((bu: any) => bu.id);
          }
        }
        if (branchUserIds.length === 0) {
          branchUserIds = [userId];
        }

        const [r1, r2, r3, r4, r5] = await Promise.all([
          supabase.from('ledger_entries').update({ admin_submitted_at: nowStr }).in('staff_id', branchUserIds).is('admin_submitted_at', null),
          supabase.from('transactions').update({ admin_submitted_at: nowStr }).in('created_by', branchUserIds).is('admin_submitted_at', null),
          supabase.from('tasks').update({ admin_submitted_at: nowStr }).in('created_by', branchUserIds).is('admin_submitted_at', null).neq('status', 'Settlement'),
          supabase.from('tasks').update({ admin_submitted_at: nowStr }).in('assigned_to', branchUserIds).is('admin_submitted_at', null).neq('status', 'Settlement'),
          supabase.from('stock_allocations').update({ admin_submitted_at: nowStr }).eq('branch_id', user?.branch_id).is('admin_submitted_at', null)
        ]);

        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
        if (r3.error) throw r3.error;
        if (r4.error) throw r4.error;
        if (r5.error) throw r5.error;

        alert('Daily report submitted and active lists cleared successfully!');
      } else {
        // --- 3. Staff Clearance (clear from active screens for logged in staff only) ---
        const [r1, r2, r3, r4, r5] = await Promise.all([
          supabase.from('ledger_entries').update({ staff_submitted_at: nowStr }).eq('staff_id', userId).is('staff_submitted_at', null),
          supabase.from('transactions').update({ staff_submitted_at: nowStr }).eq('created_by', userId).is('staff_submitted_at', null),
          supabase.from('tasks').update({ staff_submitted_at: nowStr }).eq('created_by', userId).is('staff_submitted_at', null).neq('status', 'Settlement'),
          supabase.from('tasks').update({ staff_submitted_at: nowStr }).eq('assigned_to', userId).is('staff_submitted_at', null).neq('status', 'Settlement'),
          supabase.from('stock_allocations').update({ staff_submitted_at: nowStr }).eq('branch_id', user?.branch_id).is('staff_submitted_at', null)
        ]);

        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
        if (r3.error) throw r3.error;
        if (r4.error) throw r4.error;
        if (r5.error) throw r5.error;

        alert('Daily report submitted and active lists cleared successfully!');
      }

      clearAllDataCaches();
      fetchEntries();
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Failed to submit report.');
    }
  };

  const handleApproveSettlement = async () => {
    if (!selectedEntry) return;
    try {
      const updates: any = { status: 'Completed' };
      if (selectedEntry.pureGoldDue > 0) {
        updates.pure_gold_out = selectedEntry.pureGoldDue;
        updates.pure_gold_due = 0;
        updates.pending_pure_liability = false;
      }
      if (selectedEntry.pureSilverDue > 0) {
        updates.pure_silver_out = selectedEntry.pureSilverDue;
        updates.pure_silver_due = 0;
        updates.pending_pure_liability = false;
      }
      if (selectedEntry.status === 'Pending Cash' || selectedEntry.pendingCashLiability) {
        updates.cash_paid = 0;
        updates.pending_cash_liability = false;

        // Create Admin ledger entry to deduct cash
        const adminEntryId = `LGR-A-${Math.floor(1000 + Math.random() * 9000)}`;
        const adminLedgerEntry: any = {
          id: adminEntryId,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          iso_date: new Date().toISOString().split('T')[0],
          customer_name: selectedEntry.customerName,
          transaction_type: 'Exchange',
          status: 'Completed',
          purity: selectedEntry.purity || '',
          cash_paid: selectedEntry.cashAmount || 0,
          cash_received: 0,
          cash_rate_per_gram: selectedEntry.cashRatePerGram || 0,
          cash_amount: selectedEntry.cashAmount || 0,
          staff_id: user?.id || '',
          pure_gold_out: 0, pure_silver_out: 0, pure_gold_due: 0, pure_silver_due: 0,
          impure_gold_in: 0, impure_silver_in: 0,
          pending_cash_liability: false
        };
        await supabase.from('ledger_entries').insert([adminLedgerEntry]);
      }

      const { error } = await supabase
        .from('ledger_entries')
        .update(updates)
        .eq('id', selectedEntry.id);
      
      if (error) throw error;
      
      setSelectedEntry({ 
        ...selectedEntry, 
        status: 'Completed',
        pureGoldOut: updates.pure_gold_out || selectedEntry.pureGoldOut,
        pureGoldDue: 0,
        pureSilverOut: updates.pure_silver_out || selectedEntry.pureSilverOut,
        pureSilverDue: 0,
        cashPaid: updates.cash_paid || selectedEntry.cashPaid,
        pendingCashLiability: false,
        pendingPureLiability: false
      });
      fetchEntries();
    } catch (err) {
      console.error('Error approving settlement:', err);
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtG = (n: number) => `${n.toFixed(3)}g`;

  return (
    <div className="bg-background ambient-bg text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 max-w-5xl mx-auto pt-8 pb-32 relative space-y-6">

        {/* Header */}
        {!selectedEntry && (
          <header className="flex flex-col gap-4 mb-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Ledger Panel</h1>
                <p className="text-xs text-outline font-medium">Real-time Stock & Settlement Engine</p>
              </div>
              <NotificationBell />
            </div>
            
            {/* Premium Metal Selector Card */}
            <div className="bg-white rounded-3xl p-2 border border-outline-variant/20 shadow-md flex flex-col sm:flex-row gap-2 w-full relative z-10 overflow-hidden">
              {[
                {
                  metal: 'Gold',
                  icon: 'workspace_premium',
                  symbol: 'Au',
                  sub: '24K / 22K',
                  activeClass: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
                },
                {
                  metal: 'Silver',
                  icon: 'workspace_premium',
                  symbol: 'Ag',
                  sub: '99.9% fine',
                  activeClass: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/20'
                }
              ].map(({ metal, icon, symbol, sub, activeClass }) => {
                const isActive = activeMetal === metal;
                return (
                  <button
                    key={metal}
                    onClick={() => setActiveMetal(metal as 'Gold' | 'Silver')}
                    className={`flex-1 flex items-center justify-between p-3 rounded-2xl transition-all duration-300 overflow-hidden ${
                      isActive 
                        ? `${activeClass} font-bold scale-[1.02] z-10 ring-2 ring-offset-2 ${metal === 'Gold' ? 'ring-amber-500' : 'ring-slate-400'}`
                        : 'bg-[#003366]/5 text-outline hover:bg-[#003366]/10 hover:text-primary z-0'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20' : 'bg-white border border-outline-variant/20 shadow-sm'}`}>
                        <span className={`material-symbols-outlined text-xl ${isActive ? 'text-white' : metal === 'Gold' ? 'text-amber-500' : 'text-slate-400'}`}>
                          {icon}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[9px] font-black uppercase tracking-wider truncate ${isActive ? 'text-white/80' : 'text-outline'}`}>Active Metal</p>
                        <p className={`text-sm md:text-base font-bold font-headline tracking-wide truncate ${isActive ? 'text-white' : 'text-on-background'}`}>{metal}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 pl-2 shrink-0">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        isActive 
                          ? 'bg-white/20 border-white/30 text-white' 
                          : 'bg-white text-outline border-outline-variant/30'
                      }`}>
                        {symbol}
                      </span>
                      <span className={`text-[9px] font-medium whitespace-nowrap ${isActive ? 'text-white/70' : 'text-outline/70'}`}>
                        {sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </header>
        )}

        {selectedEntry && (
          <div className="animate-fade-in space-y-6">
            <button onClick={() => setSelectedEntry(null)} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Ledger
            </button>

            <div className="luxury-card overflow-hidden">
              <div className={`p-6 text-white relative ${selectedEntry.status.includes('Pending') ? 'bg-gradient-to-br from-orange-600 to-orange-800' : 'bg-gradient-to-br from-[#003366] to-[#001e40]'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mb-1">
                      {selectedEntry.transactionType}
                    </p>
                    <h2 className="font-headline text-2xl font-extrabold text-white flex items-baseline gap-1">
                      <span className="material-symbols-outlined text-lg">account_circle</span> {selectedEntry.customerName}
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mt-1">{selectedEntry.id} • {selectedEntry.date}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-2xl">
                      {selectedEntry.transactionType === 'Tunch Only' ? 'science' : selectedEntry.transactionType === 'Exchange' ? 'swap_horiz' : 'pending_actions'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6 bg-white">
                {selectedEntry.transactionType === 'Tunch Only' ? (
                  <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-outline-variant/10 text-center space-y-2">
                    <p className="text-[10px] uppercase font-bold text-outline-variant tracking-widest">Tunch Verification Only</p>
                    <p className="text-xs text-outline font-semibold">No stock flow or cash settlement required.</p>
                    {selectedEntry.purity && (
                      <div className="pt-2 border-t border-outline-variant/10">
                        <span className="text-[9px] uppercase font-bold text-outline block">Purity Evaluated</span>
                        <p className="font-headline text-base font-extrabold text-primary">{selectedEntry.purity}%</p>
                      </div>
                    )}
                    <div className="pt-2 border-t border-outline-variant/10 flex justify-between items-center text-xs">
                      <span className="text-[9px] uppercase font-bold text-outline">Status</span>
                      <p className="font-bold text-primary">{selectedEntry.status}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-b border-outline-variant/20 pb-5">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-outline font-bold">
                        {activeMetal === 'Gold' ? 'Impure Gold In' : 'Impure Silver In'}
                      </p>
                      <p className="font-headline text-sm font-bold text-primary">
                        {activeMetal === 'Gold' ? fmtG(selectedEntry.impureGoldIn) : fmtG(selectedEntry.impureSilverIn)}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] uppercase tracking-widest text-outline font-bold">
                        {activeMetal === 'Gold' ? 'Pure Gold Out' : 'Pure Silver Out'}
                      </p>
                      <p className="font-headline text-sm font-bold text-secondary">
                        {activeMetal === 'Gold' ? fmtG(selectedEntry.pureGoldOut) : fmtG(selectedEntry.pureSilverOut)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-outline font-bold">
                        {activeMetal === 'Gold' ? 'Pure Gold Due' : 'Pure Silver Due'}
                      </p>
                      <p className={`font-headline text-sm font-bold ${
                        (activeMetal === 'Gold' ? selectedEntry.pureGoldDue : selectedEntry.pureSilverDue) > 0 ? 'text-error' : 'text-primary'
                      }`}>
                        {activeMetal === 'Gold' ? fmtG(selectedEntry.pureGoldDue) : fmtG(selectedEntry.pureSilverDue)}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Purity Evaluated</p>
                      <p className="font-headline text-sm font-bold text-primary">{selectedEntry.purity || 'N/A'}</p>
                    </div>
                    {selectedEntry.cashReceived > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Cash Received</p>
                        <p className="font-headline text-sm font-bold text-emerald-600">{isAdminOrSuper ? fmt(selectedEntry.cashReceived) : '[Restricted]'}</p>
                      </div>
                    )}
                    {selectedEntry.cashPaid > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Cash Paid</p>
                        <p className="font-headline text-sm font-bold text-red-600">{isAdminOrSuper ? fmt(selectedEntry.cashPaid) : '[Restricted]'}</p>
                      </div>
                    )}
                    {selectedEntry.cashAmount !== undefined && selectedEntry.cashAmount > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Cash Amount</p>
                        <p className="font-headline text-sm font-bold text-primary">{isAdminOrSuper ? fmt(selectedEntry.cashAmount || 0) : '[Restricted]'}</p>
                      </div>
                    )}
                    {selectedEntry.cashRatePerGram !== undefined && selectedEntry.cashRatePerGram > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Cash Rate / Gram</p>
                        <p className="font-headline text-sm font-bold text-primary">{isAdminOrSuper ? fmt(selectedEntry.cashRatePerGram || 0) : '[Restricted]'}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Centered Status Badge */}
                <div className="flex justify-center pt-4 border-t border-outline-variant/10 mt-4">
                  <span className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest ${
                    selectedEntry.status.includes('Pending') 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/50 animate-pulse' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                  }`}>
                    {selectedEntry.status}
                  </span>
                </div>

                {isAdmin && (selectedEntry.status.includes('Pending') || selectedEntry.status === 'Pending Pure') && (
                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={handleApproveSettlement}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-colors shadow-md flex justify-center items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">workspace_premium</span>
                      {selectedEntry.status === 'Pending Pure' 
                        ? (selectedEntry.pureGoldDue > 0 ? 'Allocate & Give Pure Gold' : 'Allocate & Give Pure Silver')
                        : 'Approve Settlement'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedAllocation && (
          <div className="animate-fade-in space-y-6">
            <button 
              onClick={() => setSelectedAllocation(null)} 
              className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-outline hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Ledger
            </button>

            <div className="luxury-card overflow-hidden">
              <div className="p-6 text-white relative bg-gradient-to-br from-[#003366] to-[#001e40]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mb-1">
                      Stock Allocation
                    </p>
                    <h2 className="font-headline text-2xl font-extrabold text-white flex items-baseline gap-1">
                      <span className="material-symbols-outlined text-lg">inventory_2</span> {!selectedAllocation.staff_id ? 'Super Admin Allocation' : 'Admin Allocation'}
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mt-1">{selectedAllocation.id} • {selectedAllocation.date}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-2xl">
                      inventory_2
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6 bg-white">
                <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-b border-outline-variant/20 pb-5">
                  {selectedAllocation.pureWeight > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-outline font-bold">
                        Pure {selectedAllocation.metal} Allocated
                      </p>
                      <p className="font-headline text-sm font-bold text-secondary">
                        {fmtG(selectedAllocation.pureWeight)}
                      </p>
                    </div>
                  )}
                  {selectedAllocation.cashAmount > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Cash Allocated</p>
                      <p className="font-headline text-sm font-bold text-emerald-600">
                        {fmt(selectedAllocation.cashAmount)}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Timestamp</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedAllocation.date}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Status</p>
                    <p className="font-headline text-sm font-bold text-primary">Completed</p>
                  </div>
                </div>

                {selectedAllocation.notes && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Allocation Details / Notes</p>
                    <p className="text-xs text-primary font-medium">{selectedAllocation.notes}</p>
                  </div>
                )}
                
                <div className="flex justify-center pt-2">
                  <span className="px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                    Allocated Successfully
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedEntry && !selectedAllocation && (
          <div className="space-y-6 animate-fade-in">
              <>
                <div className="flex justify-between items-end flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="label-institutional text-outline uppercase px-1 mb-1">Stock Position</p>
                      <div className="flex items-center gap-2.5 flex-nowrap whitespace-nowrap overflow-visible">
                        <h2 className="font-headline text-3xl font-bold text-primary px-1 tracking-tight whitespace-nowrap">Daily Summary</h2>
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          <input 
                            type="date" 
                            ref={dateInputRef}
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="sr-only"
                          />
                          <button
                            onClick={() => {
                              try {
                                dateInputRef.current?.showPicker();
                              } catch (err) {
                                dateInputRef.current?.click();
                              }
                            }}
                            className="flex items-center gap-2 bg-[#003366]/5 border border-[#003366]/10 hover:bg-[#003366]/10 text-[#003366] rounded-full px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all shadow-xs group active:scale-95 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px] text-[#003366]/70 group-hover:scale-105 transition-transform">calendar_month</span>
                            <span>{startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'All Dates'}</span>
                          </button>
                          {startDate && (
                            <button 
                              onClick={() => setStartDate('')}
                              className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors active:scale-90 shadow-xs border border-rose-200/40"
                              title="Clear Date"
                            >
                              <span className="material-symbols-outlined text-[15px]">close</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(user?.role === 'Staff' || user?.role === 'Collection Staff' || user?.role === 'Admin') && (() => {
                      const isBtnDisabled = (user?.role === 'Admin' && hasUnsubmittedStaffData) || !hasActiveDataToSubmit;
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <button 
                            onClick={handleSubmitReport}
                            disabled={isBtnDisabled}
                            className={`transition-all px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm ${
                              isBtnDisabled 
                                ? 'bg-slate-100 text-outline border border-outline-variant/30 cursor-not-allowed' 
                                : 'bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">cloud_upload</span>
                            {user?.role === 'Admin' ? 'Submit Branch Report' : 'Submit Report'}
                          </button>
                          {isBtnDisabled && (
                            <span className="text-[9px] text-error font-bold uppercase tracking-wider pl-1">
                              {!hasActiveDataToSubmit ? 'No Active Data' : 'Awaiting Staff Submission'}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Live Stock Engine Summary */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-secondary shadow-lg">
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Live Pure Stock</p>
                        <span className="material-symbols-outlined text-secondary glow-icon text-lg">diamond</span>
                      </div>
                      <p className="font-headline font-bold text-primary" style={fitText(fmtG(currentPureStock), 8, 1.5, 1.0)}>{fmtG(currentPureStock)}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Allocated: {fmtG(activeMetal === 'Gold' ? totalAllocatedPureGold : totalAllocatedPureSilver)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-[#755b00] shadow-lg">
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Live Impure Stock</p>
                        <span className="material-symbols-outlined text-[#755b00] glow-icon text-lg">blur_on</span>
                      </div>
                      <p className="font-headline font-bold text-primary" style={fitText(fmtG(currentImpureStock), 8, 1.5, 1.0)}>{fmtG(currentImpureStock)}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Allocated: 0.000</p>
                      </div>
                    </div>
                  </div>
                </div>

                  <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-emerald-500 shadow-lg mb-6">
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Live Cash Stock</p>
                        <span className="material-symbols-outlined text-emerald-500 glow-icon text-lg">payments</span>
                      </div>
                      <p className="font-headline font-bold text-primary" style={fitText(fmt(currentCashStock), 8, 1.5, 1.0)}>{fmt(currentCashStock)}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-outline">
                          Allocated Cash: {fmt(totalAllocatedCash)} • Cash Collected: {fmt(totalCashReceived + billingCash)} • Outflow: {fmt(totalCashPaid)}
                        </p>
                      </div>
                    </div>
                  </div>



                {user?.role === 'Admin' && (
                  <div className="luxury-card p-6 bg-white border border-[#003366]/20 shadow-lg relative overflow-hidden mt-6 animate-fade-in">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#003366]/5 rounded-bl-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
                    <p className="label-institutional text-outline uppercase mb-4 font-black">Allocate Stock to Staff</p>
                    <form onSubmit={handleAdminAllocateSubmit} className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Select Staff Member *</label>
                          <select
                            required
                            value={allocStaffId}
                            onChange={e => setAllocStaffId(e.target.value)}
                            className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                          >
                            <option value="">Choose Staff...</option>
                            {branchStaff.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Cash Amount (₹)</label>
                          <input
                            type="number"
                            placeholder="e.g. 10000"
                            value={allocCash}
                            onChange={e => setAllocCash(e.target.value)}
                            className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Gold Weight (g)</label>
                            <input
                              type="number"
                              step="0.001"
                              placeholder="0.000g"
                              value={allocGold}
                              onChange={e => setAllocGold(e.target.value)}
                              className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Silver Weight (g)</label>
                            <input
                              type="number"
                              step="0.001"
                              placeholder="0.000g"
                              value={allocSilver}
                              onChange={e => setAllocSilver(e.target.value)}
                              className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Allocation Notes</label>
                          <input
                            type="text"
                            placeholder="Optional notes"
                            value={allocNotes}
                            onChange={e => setAllocNotes(e.target.value)}
                            className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2 pt-2">
                        <button
                          type="submit"
                          disabled={isAllocating}
                          className="w-full py-4 bg-[#003366] hover:bg-[#001e40] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-md flex justify-center items-center gap-2"
                        >
                          {isAllocating ? 'Allocating...' : 'Allocate Stock to Staff'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Pending Liability Engine */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Total Pure Disbursed Card */}
                  <div className="luxury-card p-5 bg-gradient-to-br from-slate-50/60 to-white/30 border border-outline-variant/30 rounded-3xl relative overflow-hidden shadow-sm backdrop-blur-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[9px] font-bold text-outline uppercase tracking-[0.15em] mb-1">Total Pure Disbursed</p>
                        <p className="font-headline font-black text-primary tracking-tight" style={fitText(fmtG(totalPureGiven), 8, 1.5, 1.0)}>{fmtG(totalPureGiven)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-base">outbound</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      <span className="text-[8px] text-outline font-bold uppercase tracking-wider">All-Time Disbursed</span>
                    </div>
                  </div>
                </div>

                {/* Audit Log Entries */}
                <div className="space-y-3">
                  <p className="label-institutional text-outline uppercase px-1">Ledger History</p>
                  
                  <div className="space-y-3">
                    {combinedHistory.map((item: any) => {
                      if (item.type === 'allocation') {
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => {
                              setSelectedAllocation(item);
                              setSelectedEntry(null);
                            }} 
                            className="luxury-card p-5 bg-white active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-500">
                                  <span className="material-symbols-outlined text-xl">inventory_2</span>
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-primary">
                                    {!item.staff_id ? 'Super Admin Allocation' : 'Admin Allocation'}
                                  </p>
                                  <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">Stock Allocation • {item.id}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#003366] bg-[#003366]/5 px-2 py-1 rounded-md">
                                  Received
                                </p>
                              </div>
                            </div>

                            {/* Bottom allocation details block mirroring exchange design */}
                            <div className="flex items-center gap-4 px-3 py-3 bg-[#F8FAFC] rounded-2xl border border-outline-variant/10">
                              {item.pureWeight > 0 ? (
                                <>
                                  <div className="flex-1 flex flex-col items-center gap-0.5">
                                    <p className="text-[11px] font-black text-secondary">
                                      {fmtG(item.pureWeight)}
                                    </p>
                                    <p className="text-[7px] uppercase font-black text-outline tracking-widest">Pure {item.metal}</p>
                                  </div>
                                  <div className="w-px h-4 bg-outline-variant/20"></div>
                                </>
                              ) : null}
                              <div className="flex-1 flex flex-col items-center gap-0.5">
                                <p className={`text-[11px] font-black ${item.cashAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {item.cashAmount > 0 ? fmt(item.cashAmount) : '₹0'}
                                </p>
                                <p className="text-[7px] uppercase font-black text-outline tracking-widest">Cash Given</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      const entry = item.entry;
                      return (
                        <div 
                          key={entry.id} 
                          onClick={() => setSelectedEntry(entry)} 
                          className="luxury-card p-5 bg-white active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${entry.status.includes('Pending') ? 'bg-orange-50 text-orange-500' : entry.transactionType === 'Tunch Only' ? 'bg-slate-100 text-slate-500' : 'bg-secondary/10 text-secondary'}`}>
                                <span className="material-symbols-outlined text-xl">{entry.transactionType === 'Tunch Only' ? 'science' : entry.transactionType === 'Exchange' ? 'swap_horiz' : 'pending_actions'}</span>
                              </div>
                              <div>
                                <p className="font-bold text-sm text-primary">{entry.customerName}</p>
                                <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">{entry.transactionType} • {entry.id}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${entry.status === 'Completed' ? 'text-secondary' : entry.status === 'No Settlement' ? 'text-outline' : 'text-orange-500'}`}>
                                {entry.status}
                              </p>
                            </div>
                          </div>

                          {entry.transactionType === 'Tunch Only' ? (
                            <div className="px-3 py-2 bg-[#F8FAFC] rounded-2xl border border-outline-variant/10 text-center">
                              <p className="text-[9px] uppercase font-bold text-outline-variant tracking-wider">Tunch Verification Only — No Stock Flow</p>
                              {entry.purity && (
                                <p className="text-[11px] font-black text-primary mt-0.5">Purity: {entry.purity}%</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 px-3 py-3 bg-[#F8FAFC] rounded-2xl border border-outline-variant/10">
                              <div className="flex-1 flex flex-col items-center gap-0.5">
                                <p className="text-[11px] font-black text-primary">
                                  {activeMetal === 'Gold' ? fmtG(entry.impureGoldIn) : fmtG(entry.impureSilverIn)}
                                </p>
                                <p className="text-[7px] uppercase font-black text-outline tracking-widest">Impure In</p>
                              </div>
                              <div className="w-px h-4 bg-outline-variant/20"></div>
                              <div className="flex-1 flex flex-col items-center gap-0.5">
                                <p className="text-[11px] font-black text-secondary">
                                  {activeMetal === 'Gold' ? fmtG(entry.pureGoldOut) : fmtG(entry.pureSilverOut)}
                                </p>
                                <p className="text-[7px] uppercase font-black text-outline tracking-widest">Pure Out</p>
                              </div>
                              <div className="w-px h-4 bg-outline-variant/20"></div>
                              <div className="flex-1 flex flex-col items-center gap-0.5">
                                <p className={`text-[11px] font-black ${(activeMetal === 'Gold' ? entry.pureGoldDue : entry.pureSilverDue) > 0 ? 'text-error' : 'text-primary'}`}>
                                  {activeMetal === 'Gold' ? fmtG(entry.pureGoldDue) : fmtG(entry.pureSilverDue)}
                                </p>
                                <p className="text-[7px] uppercase font-black text-outline tracking-widest">Due</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
          </div>
        )}


      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
        </a>
        <a onClick={() => navigate('/billing')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
        </a>
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
        </a>
        <a onClick={() => navigate('/ledger')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Ledger</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
        </a>
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
