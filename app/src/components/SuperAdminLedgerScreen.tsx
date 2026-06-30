import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData, clearAllDataCaches } from '../cache';
import { fitText } from '../utils';
import { clearAllStorageImages } from '../utils/storageUtils';
import { NotificationBell } from './NotificationBell';
import toast from 'react-hot-toast';
import { generateCorporatePDFReport } from '../utils/pdfCorporateUtils';

interface RefiningTransfer {
  metal: 'Gold' | 'Silver';
  impureSilverSent: number;
  calculatedPureSilver: number;
  refinedPureSilverAchieved?: number;
  id: string;
  branchId: string;
  branchName: string;
  impureGoldSent: number;
  calculatedPureGold: number;
  dateSent: string;
  status: 'Pending' | 'Processed';
  refinedPureAchieved?: number;
}

interface SuperAdminLedgerEntry {
  pureSilverChange: number;
  impureSilverChange: number;
  calculatedPureSilver: number;
  id: string;
  date: string;
  isoDate: string;
  type: string;
  branchName?: string;
  pureGoldChange: number;
  impureGoldChange: number;
  calculatedPureGold: number;
  cashChange: number;
  details: string;
}

// DB Mapper helper functions
const mapDbToTransfer = (db: any): RefiningTransfer => ({
  id: db.id,
  branchId: db.branch_id,
  branchName: db.branch_name,
  metal: db.metal || 'Gold',
  impureGoldSent: Number(db.impure_gold_sent || 0),
  calculatedPureGold: Number(db.calculated_pure_gold || (db.impure_gold_sent * 0.92)),
  impureSilverSent: Number(db.impure_silver_sent || 0),
  calculatedPureSilver: Number(db.calculated_pure_silver || 0),
  dateSent: db.date_sent,
  status: db.status,
  refinedPureAchieved: db.refined_pure_achieved ? Number(db.refined_pure_achieved) : undefined,
  refinedPureSilverAchieved: db.refined_pure_silver_achieved ? Number(db.refined_pure_silver_achieved) : undefined
});

const mapDbToSaEntry = (db: any): SuperAdminLedgerEntry => ({
  id: db.id,
  date: db.date,
  isoDate: db.iso_date,
  type: db.type,
  branchName: db.branch_name,
  pureGoldChange: Number(db.pure_gold_change || 0),
  impureGoldChange: Number(db.impure_gold_change || 0),
  calculatedPureGold: Number(db.calculated_pure_gold || 0),
  pureSilverChange: Number(db.pure_silver_change || 0),
  impureSilverChange: Number(db.impure_silver_change || 0),
  calculatedPureSilver: Number(db.calculated_pure_silver || 0),
  cashChange: Number(db.cash_change || 0),
  details: db.details
});

export const SuperAdminLedgerScreen: React.FC = () => {
  const navigate = useNavigate();

  const cachedSaLedger = getCachedData('super_admin_ledger_all');
  const cachedTransfers = getCachedData('refining_transfers_pending');
  const cachedBranches = getCachedData('super_admin_branches');
  const cachedReports = getCachedData('super_admin_branch_reports');
  const cachedPendingGroups = getCachedData('super_admin_pending_groups');

  const initialLedger = cachedSaLedger ? cachedSaLedger.map(mapDbToSaEntry) : [];
  const initialTransfers = cachedTransfers ? cachedTransfers.map(mapDbToTransfer) : [];

  const [saLedger, setSaLedger] = useState<SuperAdminLedgerEntry[]>(initialLedger);
  const [pendingTransfers, setPendingTransfers] = useState<RefiningTransfer[]>(initialTransfers);
  
  // Approval Workflow State
  const [ledgerMode, setLedgerMode] = useState<'prompt' | 'approval' | 'current'>('prompt');
  const [approvedBranchEntries, setApprovedBranchEntries] = useState<any[]>([]);
  const [usersBranchMap, setUsersBranchMap] = useState<Record<string, string>>({});
  const [currentLedgerBranchFilter, setCurrentLedgerBranchFilter] = useState<string>('All');
  const [pendingBranchGroups, setPendingBranchGroups] = useState<any[]>(cachedPendingGroups || []);
  const [selectedBranchForApproval, setSelectedBranchForApproval] = useState<string | null>(null);
  const [confirmReportId, setConfirmReportId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [activeMetal, setActiveMetal] = useState<'Gold' | 'Silver'>('Gold');
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(cachedSaLedger !== null && initialLedger.length === 0);
  const [loading, setLoading] = useState<boolean>(cachedSaLedger === null || initialLedger.length === 0);

  const [setupPureInput, setSetupPureInput] = useState('');
  const [setupImpureInput, setSetupImpureInput] = useState('');
  const [setupCashInput, setSetupCashInput] = useState('');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustPure, setAdjustPure] = useState('');
  const [adjustImpure, setAdjustImpure] = useState('');
  const [adjustCash, setAdjustCash] = useState('');



  // Selected Transfer for Refining Processing
  const [selectedTransfer, setSelectedTransfer] = useState<RefiningTransfer | null>(null);
  const [netPureAchieved, setNetPureAchieved] = useState('');

  // Allocation form states
  const [allocBranchId, setAllocBranchId] = useState('');
  const [allocGoldWeight, setAllocGoldWeight] = useState('');
  const [allocSilverWeight, setAllocSilverWeight] = useState('');
  const [allocCash, setAllocCash] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  const [availableBranches, setAvailableBranches] = useState<{id: string, name: string}[]>(cachedBranches || []);
  
  // Branch Daily Reports
  const [branchReports, setBranchReports] = useState<any[]>(cachedReports || []);
  const [startDate, setStartDate] = useState('');
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<SuperAdminLedgerEntry | null>(null);

  // Fetch all corporate data from Supabase
  const fetchData = async () => {
    // Already initialized from cache synchronously on mount, background fetch handles update

    try {
      // Fetch Super Admin Ledger and pending refining transfers in parallel
      const [ledgerRes, transfersRes, branchEntriesRes, usersRes, reportsRes, branchesRes] = await Promise.all([
        supabase
          .from('super_admin_ledger')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('refining_transfers')
          .select('*')
          .eq('status', 'Pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('ledger_entries')
          .select('*')
          .not('admin_submitted_at', 'is', null)
          .order('created_at', { ascending: false }),
        supabase.from('users').select('*'),
        supabase
          .from('branch_daily_reports')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('branches').select('*').order('name')
      ]);

      if (ledgerRes.error) throw ledgerRes.error;
      if (transfersRes.error) throw transfersRes.error;
      if (reportsRes.error) throw reportsRes.error;
      if (branchesRes.error) throw branchesRes.error;

      if (branchesRes.data) {
        setAvailableBranches(branchesRes.data);
        setCachedData('super_admin_branches', branchesRes.data);
      }

      const ledgerData = ledgerRes.data;
      if (ledgerData) {
        setCachedData('super_admin_ledger_all', ledgerData);
        const mappedLedger = ledgerData.map(mapDbToSaEntry);
        setSaLedger(mappedLedger);
        setIsFirstTimeSetup(mappedLedger.length === 0);
      }

      const transfersData = transfersRes.data;
      if (transfersData) {
        setCachedData('refining_transfers_pending', transfersData);
        setPendingTransfers(transfersData.map(mapDbToTransfer));
      }

      if (usersRes.data && branchesRes.data) {
        const usersMap = usersRes.data.reduce((acc: any, u: any) => {
          acc[u.id] = u.branch_id || 'Unknown Branch';
          return acc;
        }, {});
        setUsersBranchMap(usersMap);

        const reportsData = reportsRes.data || [];
        const approvedReports = reportsData.filter((r: any) => r.status === 'Approved');
        const pendingReports = reportsData.filter((r: any) => r.status === 'Submitted');

        setBranchReports(approvedReports);
        setCachedData('super_admin_branch_reports', approvedReports);

        const allEntries = branchEntriesRes.data || [];
        const pendingEntries = allEntries.filter((e: any) => !e.is_approved);
        const approvedEntries = allEntries.filter((e: any) => e.is_approved);
        setApprovedBranchEntries(approvedEntries);

        const sortedGroups = pendingReports.map((report: any) => {
          const associatedEntries = pendingEntries.filter((entry: any) => {
            const entryBranchId = usersMap[entry.staff_id] || '';
            return entry.iso_date === report.iso_date && entryBranchId === report.branch_id;
          });

          return {
            report_id: report.id,
            iso_date: report.iso_date,
            branch_id: report.branch_id,
            branch_name: report.branch_name,
            totalPureGoldGiven: Number(report.gold_used || 0),
            totalImpureGoldReceived: Number(report.impure_gold_received || 0),
            totalPureSilverGiven: Number(report.silver_used || 0),
            totalImpureSilverReceived: Number(report.impure_silver_received || 0),
            totalCashReceived: Number(report.cash_received || 0),
            totalCashPaid: Number(report.cash_used || 0),
            closingPureGold: Number(report.closing_pure_gold || 0),
            closingPureSilver: Number(report.closing_pure_silver || 0),
            closingCash: Number(report.closing_cash || 0),
            entries: associatedEntries
          };
        }).sort((a: any, b: any) => b.iso_date.localeCompare(a.iso_date));

        setPendingBranchGroups(sortedGroups);
        setCachedData('super_admin_pending_groups', sortedGroups);
      }

    } catch (err) {
      console.error('Error fetching Super Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

   useEffect(() => {
    fetchData();

    const saLedgerSub = supabase.channel('public:super_admin_ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_ledger' }, () => {
        fetchData();
      })
      .subscribe();

    const transfersSub = supabase.channel('public:refining_transfers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refining_transfers' }, () => {
        fetchData();
      })
      .subscribe();

    const entriesSub = supabase.channel('public:ledger_entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, () => {
        fetchData();
      })
      .subscribe();

    const reportsSub = supabase.channel('public:branch_daily_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branch_daily_reports' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(saLedgerSub);
      supabase.removeChannel(transfersSub);
      supabase.removeChannel(entriesSub);
      supabase.removeChannel(reportsSub);
    };
  }, []);

  useEffect(() => {
    if (selectedBranchForApproval) {
      const hasPending = pendingBranchGroups.some((g: any) => g.branch_name === selectedBranchForApproval);
      if (!hasPending) {
        setSelectedBranchForApproval(null);
      }
    }
  }, [pendingBranchGroups, selectedBranchForApproval]);

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const pureVal = parseFloat(setupPureInput);
    const impureVal = parseFloat(setupImpureInput);
    const cashVal = parseFloat(setupCashInput);
    if (isNaN(pureVal) || isNaN(impureVal) || isNaN(cashVal)) return;

    try {
      const newEntry = {
        id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        date: 'Today',
        iso_date: new Date().toISOString().split('T')[0],
        type: 'Stock Correction',
        pure_gold_change: pureVal,
        impure_gold_change: impureVal,
        calculated_pure_gold: impureVal * 0.92,
        cash_change: cashVal,
        details: 'Initial corporate stock upload setup.'
      };

      const { error } = await supabase
        .from('super_admin_ledger')
        .insert([newEntry]);

      if (error) throw error;

      setIsFirstTimeSetup(false);
      fetchData();
    } catch (err) {
      console.error('Error uploading initial setup:', err);
    }
  };

  // Adjust stock via modal
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pureVal = parseFloat(adjustPure);
    const impureVal = parseFloat(adjustImpure);
    const cashVal = parseFloat(adjustCash);
    if (isNaN(pureVal) || isNaN(impureVal) || isNaN(cashVal)) return;

    try {
      // Stock Correction is an adjustment: we calculate difference and insert
      const currentPure = saLedger.reduce((s, e) => s + (activeMetal === 'Gold' ? e.pureGoldChange : e.pureSilverChange), 0);
      const currentImpure = saLedger.reduce((s, e) => s + (activeMetal === 'Gold' ? e.impureGoldChange : e.impureSilverChange), 0);
      const currentCalculatedPure = saLedger.reduce((s, e) => s + (activeMetal === 'Gold' ? e.calculatedPureGold : (e.calculatedPureSilver || 0)), 0);
      const currentCash = saLedger.reduce((s, e) => s + e.cashChange, 0);

      const pureDiff = pureVal - currentPure;
      const impureDiff = impureVal - currentImpure;
      const calculatedPureDiff = (impureVal * 0.92) - currentCalculatedPure;
      const cashDiff = cashVal - currentCash;

      const newEntry = {
        id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        date: 'Today',
        iso_date: new Date().toISOString().split('T')[0],
        type: 'Stock Correction',
        pure_gold_change: activeMetal === 'Gold' ? pureDiff : 0,
        impure_gold_change: activeMetal === 'Gold' ? impureDiff : 0,
        calculated_pure_gold: activeMetal === 'Gold' ? calculatedPureDiff : 0,
        pure_silver_change: activeMetal === 'Silver' ? pureDiff : 0,
        impure_silver_change: activeMetal === 'Silver' ? impureDiff : 0,
        calculated_pure_silver: activeMetal === 'Silver' ? calculatedPureDiff : 0,
        cash_change: cashDiff,
        details: `Manual Stock Correction adjustment for ${activeMetal}.`
      };

      const { error } = await supabase
        .from('super_admin_ledger')
        .insert([newEntry]);

      if (error) throw error;

      setShowAdjustModal(false);
      fetchData();
    } catch (err) {
      console.error('Error adjusting stock balances:', err);
    }
  };



  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      const isoDateStr = new Date().toISOString().split('T')[0];

      const goldVal = parseFloat(allocGoldWeight) || 0;
      const silverVal = parseFloat(allocSilverWeight) || 0;
      const cashVal = parseFloat(allocCash) || 0;
      
      if (!allocBranchId) {
        alert('Please select a branch.');
        return;
      }

      if (goldVal <= 0 && silverVal <= 0 && cashVal <= 0) {
        alert('Please specify at least one allocation amount (Gold, Silver, or Cash).');
        return;
      }

      const allocations = [];
      const saEntries = [];

      // 1. Gold Allocation
      if (goldVal > 0) {
        allocations.push({
          id: `ALLOC-${Math.floor(1000 + Math.random() * 9000)}`,
          branch_id: allocBranchId,
          branch_name: availableBranches.find(b => b.id === allocBranchId)?.name || allocBranchId,
          staff_id: null,
          metal: 'Gold',
          pure_weight: goldVal,
          cash_amount: 0,
          allocated_by: 'SUPER-001',
          date: dateStr,
          iso_date: isoDateStr,
          notes: allocNotes
        });
        
        saEntries.push({
          id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
          date: dateStr,
          iso_date: isoDateStr,
          type: 'Branch Allocation',
          branch_name: 'HEAD-OFFICE',
          pure_gold_change: -goldVal,
          impure_gold_change: 0,
          calculated_pure_gold: 0,
          pure_silver_change: 0,
          impure_silver_change: 0,
          calculated_pure_silver: 0,
          cash_change: 0,
          details: `Allocated ${goldVal.toFixed(3)}g Pure Gold to ${allocBranchId}. Notes: ${allocNotes}`
        });
      }

      // 2. Silver Allocation
      if (silverVal > 0) {
        allocations.push({
          id: `ALLOC-${Math.floor(1000 + Math.random() * 9000)}`,
          branch_id: allocBranchId,
          branch_name: availableBranches.find(b => b.id === allocBranchId)?.name || allocBranchId,
          staff_id: null,
          metal: 'Silver',
          pure_weight: silverVal,
          cash_amount: 0,
          allocated_by: 'SUPER-001',
          date: dateStr,
          iso_date: isoDateStr,
          notes: allocNotes
        });
        
        saEntries.push({
          id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
          date: dateStr,
          iso_date: isoDateStr,
          type: 'Branch Allocation',
          branch_name: 'HEAD-OFFICE',
          pure_gold_change: 0,
          impure_gold_change: 0,
          calculated_pure_gold: 0,
          pure_silver_change: -silverVal,
          impure_silver_change: 0,
          calculated_pure_silver: 0,
          cash_change: 0,
          details: `Allocated ${silverVal.toFixed(3)}g Pure Silver to ${allocBranchId}. Notes: ${allocNotes}`
        });
      }

      // 3. Cash Allocation
      if (cashVal > 0) {
        allocations.push({
          id: `ALLOC-${Math.floor(1000 + Math.random() * 9000)}`,
          branch_id: allocBranchId,
          branch_name: availableBranches.find(b => b.id === allocBranchId)?.name || allocBranchId,
          staff_id: null,
          metal: 'Gold', // Admin UI calculates cash irrespective of metal
          pure_weight: 0,
          cash_amount: cashVal,
          allocated_by: 'SUPER-001',
          date: dateStr,
          iso_date: isoDateStr,
          notes: allocNotes
        });
        
        saEntries.push({
          id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
          date: dateStr,
          iso_date: isoDateStr,
          type: 'Branch Allocation',
          branch_name: 'HEAD-OFFICE',
          pure_gold_change: 0,
          impure_gold_change: 0,
          calculated_pure_gold: 0,
          pure_silver_change: 0,
          impure_silver_change: 0,
          calculated_pure_silver: 0,
          cash_change: -cashVal,
          details: `Allocated ₹${cashVal.toLocaleString('en-IN')} Cash to ${allocBranchId}. Notes: ${allocNotes}`
        });
      }

      const { error: allocError } = await supabase.from('stock_allocations').insert(allocations);
      if (allocError) throw allocError;

      const { error: saError } = await supabase.from('super_admin_ledger').insert(saEntries);
      if (saError) throw saError;
      
      setAllocGoldWeight('');
      setAllocSilverWeight('');
      setAllocCash('');
      setAllocNotes('');
      alert('Stock successfully allocated!');
      clearAllDataCaches();
      fetchData();
    } catch (err) {
      console.error('Error saving allocation:', err);
      alert('Failed to save allocation');
    }
  };

  // Process Refinery Melt
  const handleProcessRefining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    const achieved = parseFloat(netPureAchieved);
    if (isNaN(achieved) || achieved <= 0) return;

    try {
      // 1. Update refining transfer status to Processed
      const { error: transferError } = await supabase
        .from('refining_transfers')
        .update({ status: 'Processed', refined_pure_achieved: achieved })
        .eq('id', selectedTransfer.id);

      if (transferError) throw transferError;

      // 2. Insert Refining Yield into Super Admin Ledger
      const isSilver = selectedTransfer.metal === 'Silver';
      const newEntry = {
        id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        date: 'Today',
        iso_date: new Date().toISOString().split('T')[0],
        type: 'Refining Yield',
        branch_name: selectedTransfer.branchName,
        pure_gold_change: isSilver ? 0 : achieved,
        impure_gold_change: isSilver ? 0 : -selectedTransfer.impureGoldSent,
        calculated_pure_gold: isSilver ? 0 : -selectedTransfer.calculatedPureGold,
        pure_silver_change: isSilver ? achieved : 0,
        impure_silver_change: isSilver ? -selectedTransfer.impureSilverSent : 0,
        calculated_pure_silver: isSilver ? -selectedTransfer.calculatedPureSilver : 0,
        cash_change: 0,
        details: `Refined ${(isSilver ? selectedTransfer.impureSilverSent : selectedTransfer.impureGoldSent).toFixed(3)}g Impure ${selectedTransfer.metal} from ${selectedTransfer.branchName}. Yielded ${achieved.toFixed(3)}g Pure ${selectedTransfer.metal}.`
      };

      const { error: ledgerError } = await supabase
        .from('super_admin_ledger')
        .insert([newEntry]);

      if (ledgerError) throw ledgerError;

      setSelectedTransfer(null);
      setNetPureAchieved('');
      fetchData();
    } catch (err) {
      console.error('Error processing refinery yield:', err);
    }
  };

  // Handle Branch Approval for a specific daily report
  const handleApproveBranchReport = async (group: any) => {
    setApproving(true);
    try {
      const entryIds = group.entries.map((e: any) => e.id);
      
      // Update the ledger entries to approved (if any exist)
      if (entryIds.length > 0) {
        const { error: updateError } = await supabase
          .from('ledger_entries')
          .update({ is_approved: true })
          .in('id', entryIds);

        if (updateError) throw updateError;
      }

      // Update the branch_daily_reports to Approved for this specific report ID
      const { error: reportUpdateError } = await supabase
        .from('branch_daily_reports')
        .update({ status: 'Approved' })
        .eq('id', group.report_id);

      if (reportUpdateError) throw reportUpdateError;

      // Insert consolidation into Super Admin Ledger
      const newEntry = {
        id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
        date: 'Today',
        iso_date: new Date().toISOString().split('T')[0],
        type: 'Branch Consolidation',
        branch_name: group.branch_name,
        pure_gold_change: group.closingPureGold,
        impure_gold_change: group.totalImpureGoldReceived,
        calculated_pure_gold: group.totalImpureGoldReceived * 0.92,
        pure_silver_change: group.closingPureSilver,
        impure_silver_change: group.totalImpureSilverReceived,
        calculated_pure_silver: group.totalImpureSilverReceived * 0.92,
        cash_change: group.closingCash,
        details: `Approved daily ledger for ${group.branch_name} on ${group.iso_date}. Consolidated Stock returned: Pure Gold: ${group.closingPureGold.toFixed(3)}g, Pure Silver: ${group.closingPureSilver.toFixed(3)}g, Impure Gold: ${group.totalImpureGoldReceived.toFixed(3)}g, Impure Silver: ${group.totalImpureSilverReceived.toFixed(3)}g, Cash: ₹${group.closingCash.toLocaleString('en-IN')}.`
      };

      const { error: insertError } = await supabase
        .from('super_admin_ledger')
        .insert([newEntry]);

      if (insertError) throw insertError;

      setConfirmReportId(null);
      clearAllDataCaches();
      fetchData();
    } catch (e) {
      console.error('Error approving branch data:', e);
      alert('Failed to approve branch data.');
    } finally {
      setApproving(false);
    }
  };

  const handleDownloadCorporateReport = async () => {
    const toastId = toast.loading('Compiling corporate audit data...');
    try {
      const [
        allocationsRes,
        transactionsRes,
        tasksRes,
        usersRes,
        branchesRes
      ] = await Promise.all([
        supabase.from('stock_allocations').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('users').select('*'),
        supabase.from('branches').select('*')
      ]);

      if (allocationsRes.error) throw allocationsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (usersRes.error) throw usersRes.error;
      if (branchesRes.error) throw branchesRes.error;

      await generateCorporatePDFReport({
        saLedger,
        allocations: allocationsRes.data || [],
        transactions: transactionsRes.data || [],
        tasks: tasksRes.data || [],
        users: usersRes.data || [],
        branches: branchesRes.data || [],
        branchReports
      });
      toast.success('Corporate report downloaded successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to compile corporate audit report.');
    } finally {
      toast.dismiss(toastId);
    }
  };

  const currentPureStock = React.useMemo(() => saLedger.reduce((s, e) => s + (activeMetal === 'Gold' ? e.pureGoldChange : e.pureSilverChange), 0), [saLedger, activeMetal]);
  const currentImpureStock = React.useMemo(() => saLedger.reduce((s, e) => s + (activeMetal === 'Gold' ? e.impureGoldChange : e.impureSilverChange), 0), [saLedger, activeMetal]);
  const currentCashStock = React.useMemo(() => saLedger.reduce((s, e) => s + e.cashChange, 0), [saLedger]);

  const filteredBranchReports = React.useMemo(() => {
    let list = branchReports;
    if (currentLedgerBranchFilter !== 'All') {
      list = list.filter(r => r.branch_name === currentLedgerBranchFilter);
    }
    if (startDate) {
      list = list.filter(r => r.iso_date === startDate);
    }
    return list;
  }, [branchReports, currentLedgerBranchFilter, startDate]);

  const filteredSaLedger = React.useMemo(() => {
    if (!startDate) return saLedger;
    return saLedger.filter(entry => entry.isoDate === startDate);
  }, [saLedger, startDate]);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtG = (n: number) => `${n.toFixed(3)}g`;



  if (loading) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center bg-background ambient-bg p-6 relative z-50">
        <div className="w-12 h-12 rounded-full border-4 border-[#003366]/20 border-t-[#003366] animate-spin"></div>
      </div>
    );
  }

  // Initial Prompt UI
  if (ledgerMode === 'prompt') {
    return (
      <div className="min-h-[100svh] flex items-center justify-center bg-background ambient-bg p-6 relative z-50">
        <div className="absolute top-8 left-6">
           <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary shadow-sm active:scale-95 transition-transform">
             <span className="material-symbols-outlined">arrow_back</span>
           </button>
        </div>
        <div className="absolute top-8 right-6">
           <NotificationBell />
        </div>
        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-outline-variant/20 flex flex-col items-center text-center space-y-8 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-[#003366]/10 flex items-center justify-center text-[#003366] mb-2">
            <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
          </div>
          <div>
            <h2 className="font-headline font-bold text-2xl text-primary">Ledger Management</h2>
            <p className="text-sm text-outline mt-2 px-4">Choose which corporate view you wish to access.</p>
          </div>
          
          <div className="w-full space-y-4">
            <button 
              onClick={() => setLedgerMode('approval')}
              className="w-full bg-gradient-to-r from-secondary to-[#004080] text-white py-5 rounded-2xl font-bold text-lg shadow-[0_8px_20px_rgba(112,83,0,0.2)] hover:shadow-[0_10px_25px_rgba(112,83,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="material-symbols-outlined">verified</span>
              Pending Approvals
              {pendingBranchGroups.length > 0 && (
                <span className="absolute right-4 bg-error text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                  {pendingBranchGroups.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setLedgerMode('current')}
              className="w-full bg-white border-2 border-[#003366]/20 text-[#003366] py-5 rounded-2xl font-bold text-lg hover:bg-[#003366]/5 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">account_balance</span>
              Current Ledger Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Approval Dashboard UI
  if (ledgerMode === 'approval') {
    // Get unique branches that have pending groups
    const uniqueBranches = Array.from(new Set(pendingBranchGroups.map(g => g.branch_name)));

    return (
      <div className="bg-background ambient-bg text-on-background font-body w-full min-h-[100svh] relative overflow-y-auto hide-scrollbar">
        <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-outline-variant/20 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (selectedBranchForApproval) {
                  setSelectedBranchForApproval(null);
                  setConfirmReportId(null);
                } else {
                  setLedgerMode('prompt');
                }
              }} 
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary active:scale-95 transition-transform hover:bg-outline-variant/20"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="font-headline text-xl font-bold text-primary leading-tight">
                {selectedBranchForApproval ? `${selectedBranchForApproval} Data` : 'Branch Approvals'}
              </h1>
              <p className="text-[10px] text-outline font-bold uppercase tracking-widest">
                {selectedBranchForApproval ? 'Review & Confirm' : 'Pending Submissions'}
              </p>
            </div>
          </div>
          <NotificationBell />
        </header>

        <main className="px-6 pt-6 pb-24 max-w-5xl mx-auto space-y-6">
          {pendingBranchGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse"></div>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-xl relative z-10 border-4 border-white">
                  <span className="material-symbols-outlined text-5xl">verified</span>
                </div>
              </div>
              <h3 className="font-headline font-black text-3xl text-primary mb-3">All Caught Up!</h3>
              <p className="text-sm text-outline max-w-sm text-center leading-relaxed">
                There are no pending branch ledger submissions. All corporate data is fully synchronized.
              </p>
            </div>
          ) : !selectedBranchForApproval ? (
            // STEP 1: SELECT A BRANCH
            <div className="space-y-6">
              <h2 className="font-headline text-lg font-bold text-primary">Select Branch to Review</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueBranches.map((branchName: string, idx) => {
                  const branchGroups = pendingBranchGroups.filter(g => g.branch_name === branchName);
                  const totalPendingEntries = branchGroups.reduce((sum, g) => sum + g.entries.length, 0);
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedBranchForApproval(branchName);
                        setConfirmReportId(null);
                      }}
                      className="luxury-card bg-white rounded-3xl border border-outline-variant/20 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden animate-fade-in group"
                    >
                      <div className="bg-gradient-to-br from-[#003366] to-[#001e40] p-6 text-white relative">
                        <span className="material-symbols-outlined absolute right-2 bottom-2 text-6xl text-white/5 group-hover:scale-110 transition-transform duration-500">store</span>
                        <h3 className="font-headline font-black text-xl mb-1 relative z-10">{branchName}</h3>
                        <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">Branch Office</p>
                      </div>
                      <div className="p-5 flex justify-between items-center bg-slate-50/50">
                        <div>
                          <p className="text-xs text-outline font-bold">Pending Approval</p>
                          <p className="font-black text-amber-600 text-lg">{totalPendingEntries} Entries</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-[#003366] group-hover:text-white transition-colors">
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // STEP 2: REVIEW BRANCH DETAILS AND CONFIRM
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#003366]/5 to-[#003366]/10 rounded-[2rem] p-6 border border-[#003366]/20">
                <h2 className="font-headline text-lg font-bold text-primary mb-2">Reviewing Data for {selectedBranchForApproval}</h2>
                <p className="text-xs text-outline leading-relaxed">
                  Carefully review the pending dates below. When you click confirm, all pending ledger entries for this branch will be verified and merged into the Corporate Ledger.
                </p>
              </div>

              {pendingBranchGroups
                .filter(group => group.branch_name === selectedBranchForApproval)
                .map((group, idx) => {
                  return (
                    <div key={idx} className="luxury-card bg-white rounded-[2rem] border border-outline-variant/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-fade-in mb-6">
                      <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#003366]/10 flex items-center justify-center text-[#003366]">
                            <span className="material-symbols-outlined text-xl">event</span>
                          </div>
                          <div>
                            <p className="font-headline font-bold text-lg text-primary">{group.iso_date}</p>
                            <p className="text-[10px] uppercase tracking-widest text-outline font-bold">{group.entries.length} Entries from {group.branch_name}</p>
                          </div>
                        </div>
                        <span className="bg-amber-500/10 text-amber-600 font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border border-amber-500/20">
                          Pending
                        </span>
                      </div>
                      
                      {/* Row 1: 4 cards for Gold and Silver stock / received */}
                      <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-[#755b00]/5">diamond</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Pure Gold Received</p>
                          <p className="font-headline font-black text-[#755b00] text-xl">{group.closingPureGold.toFixed(3)}g</p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-amber-600/5">local_fire_department</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Impure Gold Received</p>
                          <p className="font-headline font-black text-amber-600 text-xl">{group.totalImpureGoldReceived.toFixed(3)}g</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-slate-500/5">diamond</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Pure Silver Received</p>
                          <p className="font-headline font-black text-slate-500 text-xl">{group.closingPureSilver.toFixed(3)}g</p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-slate-600/5">local_fire_department</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Impure Silver Received</p>
                          <p className="font-headline font-black text-slate-600 text-xl">{group.totalImpureSilverReceived.toFixed(3)}g</p>
                        </div>
                      </div>

                      {/* Row 2: 2 cards for Disbursed pure gold and silver */}
                      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-[#755b00]/5">trending_up</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Pure Gold Disbursed</p>
                          <p className="font-headline font-black text-[#755b00] text-xl">{group.totalPureGoldGiven.toFixed(3)}g</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-slate-500/5">trending_up</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Pure Silver Disbursed</p>
                          <p className="font-headline font-black text-slate-500 text-xl">{group.totalPureSilverGiven.toFixed(3)}g</p>
                        </div>
                      </div>

                      {/* Row 3: 1 card for leftover cash stock */}
                      <div className="px-6 pb-6 w-full">
                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden flex justify-between items-center">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Cash Stock</p>
                            <p className="font-headline font-black text-emerald-600 text-xl">{fmt(group.closingCash)}</p>
                          </div>
                          <span className="material-symbols-outlined text-emerald-600 text-2xl">payments</span>
                        </div>
                      </div>

                      {/* Toggle button */}
                      <div className="px-6 pb-4 pt-2 border-t border-outline-variant/10 flex justify-between items-center bg-slate-50/50">
                        <button
                          onClick={() => {
                            const key = `${group.iso_date}_${group.branch_name}`;
                            setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
                          }}
                          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#003366] hover:text-[#001e40] transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {expandedGroups[`${group.iso_date}_${group.branch_name}`] ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                          </span>
                          {expandedGroups[`${group.iso_date}_${group.branch_name}`] ? 'Hide Transaction Details' : 'View Transaction Details'}
                        </button>
                        <span className="text-[9px] font-medium text-outline">
                          {group.entries.length} individual entries
                        </span>
                      </div>

                      {/* Collapsible Details list */}
                      {expandedGroups[`${group.iso_date}_${group.branch_name}`] && (
                        <div className="px-6 pb-6 border-t border-outline-variant/10 pt-4 space-y-3 bg-[#F8FAFC] animate-fade-in">
                          <div className="space-y-2.5">
                            {group.entries.length === 0 ? (
                              <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-outline-variant/30 text-outline text-xs font-semibold">
                                No transactions recorded for this day.
                              </div>
                            ) : (
                              group.entries.map((entry: any, eIdx: number) => {
                                return (
                                  <div key={eIdx} className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm text-left">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <p className="font-bold text-sm text-primary">{entry.customer_name}</p>
                                        <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">
                                          {entry.transaction_type} • {entry.id}
                                        </p>
                                      </div>
                                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                        entry.status === 'Completed' ? 'bg-success/15 text-success' : 'bg-orange-500/10 text-orange-600'
                                      }`}>
                                        {entry.status}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-outline-variant/5 text-xs">
                                      {entry.transaction_type === 'Tunch Only' ? (
                                        <div className="col-span-2 sm:col-span-4 text-center py-1.5 bg-slate-50 rounded-xl">
                                          <p className="text-[10px] uppercase font-bold text-outline-variant tracking-wider">Tunch Verification Only — No Stock Flow</p>
                                        </div>
                                      ) : (
                                        <>
                                          {Number(entry.pure_gold_out || 0) > 0 && (
                                            <div>
                                              <span className="text-[9px] uppercase font-bold text-outline">Pure Gold Out</span>
                                              <p className="font-bold text-[#755b00]">{entry.pure_gold_out.toFixed(3)}g</p>
                                            </div>
                                          )}
                                          {Number(entry.impure_gold_in || 0) > 0 && (
                                            <div>
                                              <span className="text-[9px] uppercase font-bold text-outline">Impure Gold In</span>
                                              <p className="font-bold text-amber-600">{entry.impure_gold_in.toFixed(3)}g ({entry.purity || 'N/A'}%)</p>
                                            </div>
                                          )}
                                          {Number(entry.pure_silver_out || 0) > 0 && (
                                            <div>
                                              <span className="text-[9px] uppercase font-bold text-outline">Pure Silver Out</span>
                                              <p className="font-bold text-slate-500">{entry.pure_silver_out.toFixed(3)}g</p>
                                            </div>
                                          )}
                                          {Number(entry.impure_silver_in || 0) > 0 && (
                                            <div>
                                              <span className="text-[9px] uppercase font-bold text-outline">Impure Silver In</span>
                                              <p className="font-bold text-slate-600">{entry.impure_silver_in.toFixed(3)}g</p>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {(Number(entry.cash_received || 0) > 0 || Number(entry.cash_paid || 0) > 0) && (
                                        <div>
                                          <span className="text-[9px] uppercase font-bold text-outline">Cash</span>
                                          <p className="font-bold text-emerald-600">
                                            {Number(entry.cash_received || 0) > 0 ? `+₹${entry.cash_received.toLocaleString()}` : `-₹${entry.cash_paid.toLocaleString()}`}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {/* Confirm & Merge action button inside card */}
                      <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-end bg-slate-50/50">
                        <button
                          onClick={() => {
                            if (confirmReportId === group.report_id) {
                              handleApproveBranchReport(group);
                            } else {
                              setConfirmReportId(group.report_id);
                            }
                          }}
                          disabled={approving}
                          className={`w-full sm:w-auto px-6 py-2.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none disabled:shadow-none ${
                            confirmReportId === group.report_id
                              ? 'bg-gradient-to-r from-error to-red-600 shadow-red-500/30 hover:shadow-red-500/50' 
                              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/50'
                          }`}
                        >
                          {approving && confirmReportId === group.report_id ? (
                            <>
                              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                              Merging...
                            </>
                          ) : confirmReportId === group.report_id ? (
                            <>
                              <span className="material-symbols-outlined text-xs">warning</span>
                              Are you sure? Click again!
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-xs">fact_check</span>
                              Confirm & Merge Report
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background ambient-bg text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      {selectedLedgerEntry ? (
        <main className="px-6 max-w-2xl mx-auto pt-8 pb-32 relative space-y-6 animate-fade-in">
          <button 
            onClick={() => setSelectedLedgerEntry(null)} 
            className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-outline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Ledger
          </button>

          <div className="luxury-card overflow-hidden bg-white border border-outline-variant/10">
            <div className="p-6 text-white relative bg-gradient-to-br from-[#003366] to-[#001e40]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mb-1">
                    Corporate Ledger Entry
                  </p>
                  <h2 className="font-headline text-2xl font-extrabold text-white flex items-baseline gap-1">
                    <span className="material-symbols-outlined text-lg">account_balance</span> {selectedLedgerEntry.type}
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mt-1">{selectedLedgerEntry.id} • {selectedLedgerEntry.date}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined text-2xl">account_balance</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 bg-white">
              <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-b border-outline-variant/20 pb-5">
                {selectedLedgerEntry.pureGoldChange !== 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Pure Gold Change</p>
                    <p className={`font-headline text-sm font-bold ${selectedLedgerEntry.pureGoldChange > 0 ? 'text-[#755b00]' : 'text-error'}`}>
                      {selectedLedgerEntry.pureGoldChange > 0 ? '+' : ''}{fmtG(selectedLedgerEntry.pureGoldChange)}
                    </p>
                  </div>
                )}
                {selectedLedgerEntry.impureGoldChange !== 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Impure Gold Change</p>
                    <p className={`font-headline text-sm font-bold ${selectedLedgerEntry.impureGoldChange > 0 ? 'text-amber-600' : 'text-error'}`}>
                      {selectedLedgerEntry.impureGoldChange > 0 ? '+' : ''}{fmtG(selectedLedgerEntry.impureGoldChange)}
                    </p>
                  </div>
                )}
                {selectedLedgerEntry.pureSilverChange !== 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Pure Silver Change</p>
                    <p className={`font-headline text-sm font-bold ${selectedLedgerEntry.pureSilverChange > 0 ? 'text-slate-500' : 'text-error'}`}>
                      {selectedLedgerEntry.pureSilverChange > 0 ? '+' : ''}{fmtG(selectedLedgerEntry.pureSilverChange)}
                    </p>
                  </div>
                )}
                {selectedLedgerEntry.impureSilverChange !== 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Impure Silver Change</p>
                    <p className={`font-headline text-sm font-bold ${selectedLedgerEntry.impureSilverChange > 0 ? 'text-slate-600' : 'text-error'}`}>
                      {selectedLedgerEntry.impureSilverChange > 0 ? '+' : ''}{fmtG(selectedLedgerEntry.impureSilverChange)}
                    </p>
                  </div>
                )}
                {selectedLedgerEntry.cashChange !== 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Cash Change</p>
                    <p className={`font-headline text-sm font-bold ${selectedLedgerEntry.cashChange > 0 ? 'text-emerald-600' : 'text-error'}`}>
                      {selectedLedgerEntry.cashChange > 0 ? '+' : ''}{fmt(selectedLedgerEntry.cashChange)}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Timestamp</p>
                  <p className="font-headline text-sm font-bold text-primary">{selectedLedgerEntry.date}</p>
                </div>
              </div>

              {selectedLedgerEntry.details && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Details</p>
                  <p className="text-xs text-primary font-medium">{selectedLedgerEntry.details}</p>
                </div>
              )}
              
              <div className="flex justify-center pt-2">
                <span className="px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                  Completed
                </span>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="px-6 max-w-5xl mx-auto pt-8 pb-32 relative space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-2 animate-fade-in">
          <div className="flex items-center">
            <button 
              onClick={() => setLedgerMode('prompt')} 
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary active:scale-95 transition-transform hover:bg-outline-variant/20 mr-3 shrink-0"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Head Office Hub</h1>
              <p className="text-xs text-outline font-medium">Super Admin Global Allocation & Refining Terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button 
              onClick={handleDownloadCorporateReport}
              className="px-4 py-2 bg-[#003366]/10 text-[#003366] border border-[#003366]/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#003366]/20 transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
              title="Download Consolidated Corporate Audit PDF"
            >
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
              Download Report
            </button>
            <button 
              onClick={async () => {
                if (window.confirm("Are you sure you want to permanently delete all corporate records, reports, transactions, ledger entries, tasks, and stock allocations across all roles? This cannot be undone!")) {
                  try {
                    const deleteTable = async (tableName: string) => {
                      try {
                        await supabase.from(tableName).delete().neq('id', '');
                      } catch (err) {
                        console.warn(`Failed to delete from ${tableName}:`, err);
                      }
                    };

                    await clearAllStorageImages();
                    await Promise.all([
                      deleteTable('super_admin_ledger'),
                      deleteTable('refining_transfers'),
                      deleteTable('ledger_entries'),
                      deleteTable('transactions'),
                      deleteTable('tasks'),
                      deleteTable('stock_allocations'),
                      deleteTable('branch_daily_reports'),
                      deleteTable('deletion_requests')
                    ]);

                    clearAllDataCaches();
                    fetchData();
                    alert("All corporate records have been permanently cleared.");
                  } catch (e) {
                    console.error(e);
                    alert("Failed to reset records.");
                  }
                }
              }}
              className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative active:scale-95 transition-transform shrink-0"
              title="Reset Initial Details"
            >
              <span className="material-symbols-outlined text-xl">restart_alt</span>
            </button>
          </div>
        </header>

        {/* Premium Metal Selector Card */}
        <div className="bg-white rounded-3xl p-2 border border-outline-variant/20 shadow-md flex flex-col sm:flex-row gap-2 w-full animate-fade-in relative z-10 overflow-hidden">
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

        {isFirstTimeSetup ? (
          <div className="luxury-card bg-white p-6 border border-outline-variant/20 rounded-[2rem] shadow-xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#003366]/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-[#003366]">upload_file</span>
            </div>
            <h2 className="font-headline text-xl font-bold text-primary mb-2">First-Time Setup</h2>
            <p className="text-xs text-outline mb-6">
              Please enter the initial values for the total pure gold, total impure gold, and total cash available at the Head Office.
            </p>
            <form onSubmit={handleFirstTimeSetup} className="space-y-4">
              <div className="relative group">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Total Pure Gold Stock (grams)</span>
                <input 
                  type="number" 
                  step="0.001"
                  required
                  placeholder="e.g. 1000.000" 
                  value={setupPureInput} 
                  onChange={e => setSetupPureInput(e.target.value)}
                  className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                />
              </div>
              <div className="relative group">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Total Impure Gold Stock (grams)</span>
                <input 
                  type="number" 
                  step="0.001"
                  required
                  placeholder="e.g. 500.000" 
                  value={setupImpureInput} 
                  onChange={e => setSetupImpureInput(e.target.value)}
                  className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                />
              </div>
              <div className="relative group">
                <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Total Cash Balance (INR)</span>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 5000000" 
                  value={setupCashInput} 
                  onChange={e => setSetupCashInput(e.target.value)}
                  className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:border-[#003366] transition-all"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-4 bg-[#003366] hover:bg-[#001e40] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-md"
              >
                Upload Initial Details
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Live Stock Summary */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-secondary shadow-lg">
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Super Pure {activeMetal} Stock</p>
                      <span className="material-symbols-outlined text-secondary glow-icon text-lg">diamond</span>
                    </div>
                    <p className="font-headline font-bold text-primary" style={fitText(fmtG(currentPureStock), 8, 1.5, 1.05)}>{fmtG(currentPureStock)}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Active Stock</p>
                      <button 
                        onClick={() => {
                          setAdjustPure(currentPureStock.toString());
                          setAdjustImpure(currentImpureStock.toString());
                          setAdjustCash(currentCashStock.toString());
                          setShowAdjustModal(true);
                        }}
                        className="text-[8px] uppercase font-bold text-secondary hover:text-primary transition-colors flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[10px]">edit</span>
                        Adjust
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-[#755b00] shadow-lg">
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Super Impure {activeMetal} Stock</p>
                      <span className="material-symbols-outlined text-[#755b00] glow-icon text-lg">local_fire_department</span>
                    </div>
                    <p className="font-headline font-bold text-primary" style={fitText(fmtG(currentImpureStock), 8, 1.5, 1.05)}>{fmtG(currentImpureStock)}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Active Stock</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="luxury-card overflow-hidden bg-white border-l-4 border-l-[#003366] shadow-lg w-full">
                <div className="p-5 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline mb-1">Super Cash Stock</p>
                    <p className="font-headline font-bold text-primary" style={fitText(fmt(currentCashStock), 10, 1.875, 1.25)}>{fmt(currentCashStock)}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="material-symbols-outlined text-[#003366] glow-icon text-2xl mb-1">payments</span>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Active Cash</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Allocate Stock Section */}
            <div className="space-y-4">
              <p className="label-institutional text-outline uppercase px-1">Allocate Stock to Branch</p>
              <div className="luxury-card p-6 bg-white border border-[#003366]/20 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#003366]/5 rounded-bl-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
                <form onSubmit={handleAllocateSubmit} className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Branch & Cash */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Select Branch *</label>
                      <select
                        required
                        value={allocBranchId}
                        onChange={e => setAllocBranchId(e.target.value)}
                        className="w-full bg-slate-50 border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-[#003366]/20 transition-all"
                      >
                        <option value="" disabled>Select a branch...</option>
                        {availableBranches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Cash Allocation (INR)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={allocCash}
                        onChange={e => setAllocCash(e.target.value)}
                        className="w-full bg-slate-50 border border-outline-variant/30 rounded-2xl py-3.5 px-4 text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all placeholder:font-medium placeholder:text-outline/50"
                        placeholder="e.g. 100000"
                      />
                    </div>
                  </div>

                  {/* Right Column: Metals & Submit */}
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Gold Weight (g)</label>
                        <input 
                          type="number" 
                          step="0.001"
                          value={allocGoldWeight}
                          onChange={e => setAllocGoldWeight(e.target.value)}
                          className="w-full bg-slate-50 border border-amber-500/30 rounded-2xl py-3.5 px-4 text-sm font-black text-[#755b00] focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:font-medium placeholder:text-outline/50"
                          placeholder="0.000"
                        />
                        <span className="material-symbols-outlined text-amber-500 absolute top-9 right-4 opacity-50">workspace_premium</span>
                      </div>
                      <div className="flex-1 relative">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Silver Weight (g)</label>
                        <input 
                          type="number" 
                          step="0.001"
                          value={allocSilverWeight}
                          onChange={e => setAllocSilverWeight(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-400/30 rounded-2xl py-3.5 px-4 text-sm font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all placeholder:font-medium placeholder:text-outline/50"
                          placeholder="0.000"
                        />
                        <span className="material-symbols-outlined text-slate-400 absolute top-9 right-4 opacity-50">workspace_premium</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5 block pl-1">Allocation Notes</label>
                      <input 
                        type="text" 
                        value={allocNotes}
                        onChange={e => setAllocNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-[#003366]/20 transition-all placeholder:font-medium placeholder:text-outline/50"
                        placeholder="e.g. Weekly stock refill for Delhi branch"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full py-3.5 bg-[#003366] hover:bg-[#001e40] text-white font-bold text-[11px] uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <span className="material-symbols-outlined text-base">send</span>
                      Confirm Allocation
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Admin Transfers / Refining Melt Section */}
            <div className="space-y-4">
              <p className="label-institutional text-outline uppercase px-1">Refining Melt Queue (Admin Transfers)</p>
              {pendingTransfers.length === 0 ? (
                <div className="luxury-card p-6 bg-slate-50 border border-outline-variant/10 text-center">
                  <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">domain_verification</span>
                  <p className="text-xs text-outline font-semibold">Refinery queue is empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {pendingTransfers.map(transfer => (
                    <div 
                      key={transfer.id}
                      onClick={() => navigate('/refinery')}
                      className="luxury-card p-4 bg-white border border-[#755b00]/20 hover:border-[#755b00]/50 cursor-pointer transition-all duration-300 flex justify-between items-center group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#755b00]/10 text-[#755b00] flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">local_fire_department</span>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-primary">{transfer.branchName}</p>
                          <p className="text-[8px] uppercase tracking-widest font-bold text-outline mt-0.5">Sent: {transfer.dateSent} • ID: {transfer.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-[#755b00] bg-[#755b00]/5 border border-[#755b00]/10 px-2 py-1 rounded-lg">{fmtG(transfer.impureGoldSent)}</span>
                        <span className="material-symbols-outlined text-sm text-outline group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Branch Daily Reports Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <p className="label-institutional text-outline uppercase">Branch End-Of-Day Reports</p>
                {branchReports.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-xs">filter_list</span>
                    <select
                      value={currentLedgerBranchFilter}
                      onChange={e => setCurrentLedgerBranchFilter(e.target.value)}
                      className="bg-white border border-outline-variant/30 rounded-xl py-1 px-3 text-[10px] font-bold text-primary focus:outline-none focus:ring-1 focus:ring-[#003366]/20 transition-all cursor-pointer shadow-sm"
                    >
                      <option value="All">All Branches</option>
                      {availableBranches.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {filteredBranchReports.length === 0 ? (
                <div className="luxury-card p-6 bg-slate-50 border border-outline-variant/10 text-center">
                  <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">inventory</span>
                  <p className="text-xs text-outline font-semibold">No daily reports found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredBranchReports.map(report => (
                    <div 
                      key={report.id}
                      className="luxury-card p-4 bg-white border border-outline-variant/20 shadow-sm flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#003366]/10 text-[#003366] flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                          </div>
                          <div>
                            <p className="font-bold text-xs text-primary">{report.branch_name}</p>
                            <p className="text-[8px] uppercase tracking-widest font-bold text-outline">{report.date} • {report.id}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                          {report.status}
                        </span>
                      </div>
                      {/* EOD Report Details Card */}
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-outline-variant/15 space-y-3 mt-1">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-outline/80 px-1">Report Metrics</p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-2xl text-[#755b00]/5">diamond</span>
                            <p className="text-[8px] uppercase tracking-wider font-bold text-outline mb-0.5">Pure Gold Received</p>
                            <p className="font-headline font-black text-[#755b00] text-sm">{Number(report.closing_pure_gold || 0).toFixed(3)}g</p>
                          </div>
                          
                          <div className="bg-white p-3 rounded-xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-2xl text-amber-600/5">local_fire_department</span>
                            <p className="text-[8px] uppercase tracking-wider font-bold text-outline mb-0.5">Impure Gold Received</p>
                            <p className="font-headline font-black text-amber-600 text-sm">{Number(report.impure_gold_received || 0).toFixed(3)}g</p>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-2xl text-slate-500/5">diamond</span>
                            <p className="text-[8px] uppercase tracking-wider font-bold text-outline mb-0.5">Pure Silver Received</p>
                            <p className="font-headline font-black text-slate-500 text-sm">{Number(report.closing_pure_silver || 0).toFixed(3)}g</p>
                          </div>
                          
                          <div className="bg-white p-3 rounded-xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-2xl text-slate-600/5">local_fire_department</span>
                            <p className="text-[8px] uppercase tracking-wider font-bold text-outline mb-0.5">Impure Silver Received</p>
                            <p className="font-headline font-black text-slate-600 text-sm">{Number(report.impure_silver_received || 0).toFixed(3)}g</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-2xl text-[#755b00]/5">trending_up</span>
                            <p className="text-[8px] uppercase tracking-wider font-bold text-outline mb-0.5">Pure Gold Disbursed</p>
                            <p className="font-headline font-black text-[#755b00] text-sm">{Number(report.gold_used || 0).toFixed(3)}g</p>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-2xl text-slate-500/5">trending_up</span>
                            <p className="text-[8px] uppercase tracking-wider font-bold text-outline mb-0.5">Pure Silver Disbursed</p>
                            <p className="font-headline font-black text-slate-500 text-sm">{Number(report.silver_used || 0).toFixed(3)}g</p>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-outline-variant/10 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1 flex justify-between items-center">
                            <div>
                              <p className="text-[8px] uppercase tracking-wider font-bold text-outline mb-0.5">Cash Stock</p>
                              <p className="font-headline font-black text-emerald-600 text-sm">{fmt(Number(report.closing_cash || 0))}</p>
                            </div>
                            <span className="material-symbols-outlined text-emerald-600 text-xl">payments</span>
                          </div>
                        </div>
                      </div>

                      {/* Toggle button */}
                      <div className="px-2 pb-2 pt-2 border-t border-outline-variant/10 flex justify-between items-center bg-slate-50/50 -mx-4 -mb-2 rounded-b-2xl mt-2">
                        <button
                          onClick={() => {
                            setExpandedGroups(prev => ({ ...prev, [report.id]: !prev[report.id] }));
                          }}
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#003366] hover:text-[#001e40] transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">
                            {expandedGroups[report.id] ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                          </span>
                          {expandedGroups[report.id] ? 'Hide Transaction Details' : 'View Transaction Details'}
                        </button>
                        <span className="text-[8px] font-medium text-outline">
                          {
                            approvedBranchEntries.filter((entry: any) => {
                              const entryBranchId = usersBranchMap[entry.staff_id] || '';
                              return entry.iso_date === report.iso_date && entryBranchId === report.branch_id;
                            }).length
                          } individual entries
                        </span>
                      </div>

                      {/* Collapsible Details list */}
                      {expandedGroups[report.id] && (
                        <div className="px-2 pb-4 border-t border-outline-variant/10 pt-4 space-y-3 bg-[#F8FAFC] -mx-4 -mb-2 rounded-b-2xl animate-fade-in">
                          <div className="space-y-2.5 px-2">
                            {(() => {
                              const associatedEntries = approvedBranchEntries.filter((entry: any) => {
                                const entryBranchId = usersBranchMap[entry.staff_id] || '';
                                return entry.iso_date === report.iso_date && entryBranchId === report.branch_id;
                              });

                              if (associatedEntries.length === 0) {
                                return (
                                  <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-outline-variant/30 text-outline text-[10px] font-semibold">
                                    No transactions recorded for this day.
                                  </div>
                                );
                              }

                              return associatedEntries.map((entry: any, eIdx: number) => {
                                return (
                                  <div key={eIdx} className="bg-white p-3 rounded-xl border border-outline-variant/10 shadow-sm text-left">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <p className="font-bold text-xs text-primary">{entry.customer_name}</p>
                                        <p className="text-[8px] text-outline font-bold tracking-widest uppercase mt-0.5">
                                          {entry.transaction_type} • {entry.id}
                                        </p>
                                      </div>
                                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                        entry.status === 'Completed' ? 'bg-success/15 text-success' : 'bg-orange-500/10 text-orange-600'
                                      }`}>
                                        {entry.status}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/5 text-[10px]">
                                      {entry.transaction_type === 'Tunch Only' ? (
                                        <div className="col-span-2 text-center py-1 bg-slate-50 rounded-xl">
                                          <p className="text-[8px] uppercase font-bold text-outline-variant tracking-wider">Tunch Verification Only — No Stock Flow</p>
                                        </div>
                                      ) : (
                                        <>
                                          {Number(entry.pure_gold_out || 0) > 0 && (
                                            <div>
                                              <span className="text-[8px] uppercase font-bold text-outline">Pure Gold Out</span>
                                              <p className="font-bold text-[#755b00]">{entry.pure_gold_out.toFixed(3)}g</p>
                                            </div>
                                          )}
                                          {Number(entry.impure_gold_in || 0) > 0 && (
                                            <div>
                                              <span className="text-[8px] uppercase font-bold text-outline">Impure Gold In</span>
                                              <p className="font-bold text-amber-600">{entry.impure_gold_in.toFixed(3)}g ({entry.purity || 'N/A'}%)</p>
                                            </div>
                                          )}
                                          {Number(entry.pure_silver_out || 0) > 0 && (
                                            <div>
                                              <span className="text-[8px] uppercase font-bold text-outline">Pure Silver Out</span>
                                              <p className="font-bold text-slate-500">{entry.pure_silver_out.toFixed(3)}g</p>
                                            </div>
                                          )}
                                          {Number(entry.impure_silver_in || 0) > 0 && (
                                            <div>
                                              <span className="text-[8px] uppercase font-bold text-outline">Impure Silver In</span>
                                              <p className="font-bold text-slate-600">{entry.impure_silver_in.toFixed(3)}g</p>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {(Number(entry.cash_received || 0) > 0 || Number(entry.cash_paid || 0) > 0) && (
                                        <div>
                                          <span className="text-[8px] uppercase font-bold text-outline">Cash</span>
                                          <p className="font-bold text-emerald-600">
                                            {Number(entry.cash_received || 0) > 0 ? `+₹${entry.cash_received.toLocaleString()}` : `-₹${entry.cash_paid.toLocaleString()}`}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Super Admin Ledger History */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1 flex-nowrap gap-2">
                <p className="label-institutional text-outline uppercase whitespace-nowrap">Corporate Ledger History</p>
                <div className="flex items-center gap-1.5 shrink-0">
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
                    className="flex items-center gap-2 bg-[#003366]/5 border border-[#003366]/10 hover:bg-[#003366]/10 text-[#003366] rounded-full px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-widest transition-all shadow-xs group active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px] text-[#003366]/70 group-hover:scale-105 transition-transform">calendar_month</span>
                    <span>{startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'All Dates'}</span>
                  </button>
                  {startDate && (
                    <button 
                      onClick={() => setStartDate('')}
                      className="w-6.5 h-6.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors active:scale-90 shadow-xs border border-rose-200/40"
                      title="Clear Date"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {filteredSaLedger.map(entry => (
                  <div 
                    key={entry.id} 
                    onClick={() => setSelectedLedgerEntry(entry)}
                    className="luxury-card p-5 bg-white border border-outline-variant/20 relative overflow-hidden shadow-sm active:scale-[0.98] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.type === 'Refining Yield' ? 'bg-[#755b00]/10 text-[#755b00]' : 'bg-[#003366]/10 text-[#003366]'}`}>
                          <span className="material-symbols-outlined text-sm">
                            {entry.type === 'Refining Yield' ? 'local_fire_department' : 'account_balance'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-primary">{entry.type}</p>
                          <p className="text-[7px] text-outline uppercase font-bold tracking-widest">{entry.date} • {entry.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#003366] bg-[#003366]/5 px-2 py-0.5 rounded">
                          Recorded
                        </span>
                      </div>
                    </div>

                    {/* Bottom block mirroring the exchange layout style */}
                    <div className="flex items-center gap-4 px-3 py-2 bg-[#F8FAFC] rounded-xl border border-outline-variant/10">
                      {entry.pureGoldChange !== 0 ? (
                        <div className="flex-grow flex flex-col items-center gap-0.5">
                          <p className={`text-[10px] font-black ${entry.pureGoldChange > 0 ? 'text-[#755b00]' : 'text-error'}`}>
                            {entry.pureGoldChange > 0 ? '+' : ''}{fmtG(entry.pureGoldChange)}
                          </p>
                          <p className="text-[6px] uppercase font-black text-outline tracking-widest">Pure Gold</p>
                        </div>
                      ) : null}
                      {entry.pureSilverChange !== 0 ? (
                        <div className="flex-grow flex flex-col items-center gap-0.5">
                          <p className={`text-[10px] font-black ${entry.pureSilverChange > 0 ? 'text-slate-500' : 'text-error'}`}>
                            {entry.pureSilverChange > 0 ? '+' : ''}{fmtG(entry.pureSilverChange)}
                          </p>
                          <p className="text-[6px] uppercase font-black text-outline tracking-widest">Pure Silver</p>
                        </div>
                      ) : null}
                      {entry.cashChange !== 0 ? (
                        <div className="flex-grow flex flex-col items-center gap-0.5">
                          <p className={`text-[10px] font-black ${entry.cashChange > 0 ? 'text-emerald-600' : 'text-error'}`}>
                            {entry.cashChange > 0 ? '+' : ''}{fmt(entry.cashChange)}
                          </p>
                          <p className="text-[6px] uppercase font-black text-outline tracking-widest">Cash</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Adjust Stock Modal */}
        {showAdjustModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up">
              <h3 className="font-headline text-lg font-bold text-primary mb-4">Adjust Stock Starting Balances</h3>
              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Opening Pure {activeMetal} (g)</span>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={adjustPure}
                    onChange={e => setAdjustPure(e.target.value)}
                    className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                  />
                </div>
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Opening Impure {activeMetal} (g)</span>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={adjustImpure}
                    onChange={e => setAdjustImpure(e.target.value)}
                    className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                  />
                </div>
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Opening Cash (INR)</span>
                  <input 
                    type="number" 
                    required
                    value={adjustCash}
                    onChange={e => setAdjustCash(e.target.value)}
                    className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="flex-1 py-3 bg-surface-container text-primary font-bold text-xs uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-[#003366] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Process Refining Modal */}
        {selectedTransfer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up">
              <div className="w-16 h-16 rounded-full bg-[#755b00]/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-[#755b00]">local_fire_department</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-center text-primary mb-2">Process Refinery Melt</h3>
              <p className="text-xs text-center text-outline mb-6">
                Processing <strong className="text-primary">{fmtG(selectedTransfer.impureGoldSent)}</strong> of Impure Gold sent from <strong>{selectedTransfer.branchName}</strong>. Please input the final net pure gold yield achieved.
              </p>
              <form onSubmit={handleProcessRefining} className="space-y-4">
                <div className="relative group">
                  <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Net Pure Gold Achieved (g)</span>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    placeholder="e.g. 138.500"
                    value={netPureAchieved}
                    onChange={e => setNetPureAchieved(e.target.value)}
                    className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setSelectedTransfer(null)}
                    className="flex-1 py-3 bg-surface-container text-primary font-bold text-xs uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-[#755b00] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg"
                  >
                    Melt & Add to Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}



        </main>
      )}



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
