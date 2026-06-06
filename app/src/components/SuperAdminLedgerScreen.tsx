import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';
import { fitText } from '../utils';

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

  const initialLedger = cachedSaLedger ? cachedSaLedger.map(mapDbToSaEntry) : [];
  const initialTransfers = cachedTransfers ? cachedTransfers.map(mapDbToTransfer) : [];

  const [saLedger, setSaLedger] = useState<SuperAdminLedgerEntry[]>(initialLedger);
  const [pendingTransfers, setPendingTransfers] = useState<RefiningTransfer[]>(initialTransfers);
  
  // Approval Workflow State
  const [ledgerMode, setLedgerMode] = useState<'prompt' | 'approval' | 'current'>('prompt');
  const [pendingBranchGroups, setPendingBranchGroups] = useState<any[]>([]);
  const [selectedBranchForApproval, setSelectedBranchForApproval] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<0 | 1>(0);
  const [approving, setApproving] = useState(false);

  const [activeMetal, setActiveMetal] = useState<'Gold' | 'Silver'>('Gold');
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(cachedSaLedger !== null && initialLedger.length === 0);
  const [loading, setLoading] = useState<boolean>(cachedSaLedger === null);

  const [setupPureInput, setSetupPureInput] = useState('');
  const [setupImpureInput, setSetupImpureInput] = useState('');
  const [setupCashInput, setSetupCashInput] = useState('');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustPure, setAdjustPure] = useState('');
  const [adjustImpure, setAdjustImpure] = useState('');
  const [adjustCash, setAdjustCash] = useState('');

  // Custom Corporate Action Modal states
  const [showLedgerActionModal, setShowLedgerActionModal] = useState(false);
  const [ledgerActionTab, setLedgerActionTab] = useState<'exchange' | 'cash' | 'allocate'>('exchange');
  
  // Exchange form states
  const [exchangeMetal, setExchangeMetal] = useState<'Gold' | 'Silver'>('Gold');
  const [exchangeImpure, setExchangeImpure] = useState('');
  const [exchangePurity, setExchangePurity] = useState('');
  const [exchangePure, setExchangePure] = useState('');
  const [exchangeServiceFee, setExchangeServiceFee] = useState('');
  
  // Cash form states
  const [cashType, setCashType] = useState<'Sale' | 'Purchase'>('Sale');
  const [cashMetal, setCashMetal] = useState<'Gold' | 'Silver'>('Gold');
  const [cashWeight, setCashWeight] = useState('');
  const [cashRate, setCashRate] = useState('');
  const [cashTotalAmount, setCashTotalAmount] = useState('');

  // Selected Transfer for Refining Processing
  const [selectedTransfer, setSelectedTransfer] = useState<RefiningTransfer | null>(null);
  const [netPureAchieved, setNetPureAchieved] = useState('');

  // Allocation form states
  const [allocBranchId, setAllocBranchId] = useState('');
  const [allocMetal, setAllocMetal] = useState<'Gold' | 'Silver'>('Gold');
  const [allocWeight, setAllocWeight] = useState('');
  const [allocCash, setAllocCash] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  const [availableBranches, setAvailableBranches] = useState<{id: string, name: string}[]>([]);
  
  // Branch Daily Reports
  const [branchReports, setBranchReports] = useState<any[]>([]);

  // Fetch all corporate data from Supabase
  const fetchData = async () => {
    // Already initialized from cache synchronously on mount, background fetch handles update

    try {
      // Fetch Super Admin Ledger and pending refining transfers in parallel
      const [ledgerRes, transfersRes, branchEntriesRes, usersRes, reportsRes] = await Promise.all([
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
          .eq('is_approved', false)
          .order('created_at', { ascending: false }),
        supabase.from('users').select('*'),
        supabase
          .from('branch_daily_reports')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (ledgerRes.error) throw ledgerRes.error;
      if (transfersRes.error) throw transfersRes.error;
      if (reportsRes.error) throw reportsRes.error;

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

      if (branchEntriesRes.data && usersRes.data) {
        const usersMap = usersRes.data.reduce((acc: any, u: any) => {
          acc[u.id] = u.branch_id || 'Unknown Branch';
          return acc;
        }, {});
        
        // Extract unique branches for allocation
        const uniqueBranches = Array.from(new Set(usersRes.data.map((u: any) => u.branch_id))).filter(id => id && id !== 'HEAD-OFFICE');
        setAvailableBranches(uniqueBranches.map((id: any) => ({ id, name: id })));
        
        const grouped: any = {};
        branchEntriesRes.data.forEach((entry: any) => {
           const branch = usersMap[entry.staff_id] || 'Unknown Branch';
           const key = `${entry.iso_date}_${branch}`;
           if (!grouped[key]) {
             grouped[key] = {
               iso_date: entry.iso_date,
               branch_name: branch,
               entries: [],
               totalPureGoldGiven: 0,
               totalImpureGoldReceived: 0,
               totalCashReceived: 0,
               totalCashPaid: 0,
               totalPureSilverGiven: 0,
               totalImpureSilverReceived: 0
             };
           }
           grouped[key].entries.push(entry);
           grouped[key].totalPureGoldGiven += Number(entry.pure_gold_out || 0);
           grouped[key].totalImpureGoldReceived += Number(entry.impure_gold_in || 0);
           grouped[key].totalPureSilverGiven += Number(entry.pure_silver_out || 0);
           grouped[key].totalImpureSilverReceived += Number(entry.impure_silver_in || 0);
           grouped[key].totalCashReceived += Number(entry.cash_received || 0);
           grouped[key].totalCashPaid += Number(entry.cash_paid || 0);
        });
        setPendingBranchGroups(Object.values(grouped).sort((a: any, b: any) => b.iso_date.localeCompare(a.iso_date)));
        
        if (reportsRes.data) {
          setBranchReports(reportsRes.data);
        }
      }

    } catch (err) {
      console.error('Error fetching Super Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Auto weight/cash calculation helpers
  const handleExchangeImpureChange = (val: string) => {
    setExchangeImpure(val);
    const impure = parseFloat(val) || 0;
    const purity = parseFloat(exchangePurity) || 0;
    setExchangePure(purity > 0 ? (impure * (purity / 100)).toFixed(3) : '');
  };

  const handleExchangePurityChange = (val: string) => {
    setExchangePurity(val);
    const impure = parseFloat(exchangeImpure) || 0;
    const purity = parseFloat(val) || 0;
    setExchangePure(purity > 0 ? (impure * (purity / 100)).toFixed(3) : '');
  };

  const handleCashWeightChange = (val: string) => {
    setCashWeight(val);
    const weight = parseFloat(val) || 0;
    const rate = parseFloat(cashRate) || 0;
    setCashTotalAmount(rate > 0 ? (weight * rate).toFixed(2) : '');
  };

  const handleCashRateChange = (val: string) => {
    setCashRate(val);
    const weight = parseFloat(cashWeight) || 0;
    const rate = parseFloat(val) || 0;
    setCashTotalAmount(rate > 0 ? (weight * rate).toFixed(2) : '');
  };

  // Handle exchange and cash form submission
  const handleLedgerActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dateStr = 'Today';
      const isoDateStr = new Date().toISOString().split('T')[0];
      const entryId = `CORP-${Math.floor(1000 + Math.random() * 9000)}`;
      
      let newEntry = {
        id: entryId,
        date: dateStr,
        iso_date: isoDateStr,
        type: '',
        branch_name: 'HEAD-OFFICE',
        pure_gold_change: 0,
        impure_gold_change: 0,
        calculated_pure_gold: 0,
        pure_silver_change: 0,
        impure_silver_change: 0,
        calculated_pure_silver: 0,
        cash_change: 0,
        details: ''
      };
      
      if (ledgerActionTab === 'exchange') {
        const impureVal = parseFloat(exchangeImpure) || 0;
        const purityVal = parseFloat(exchangePurity) || 0;
        const pureVal = parseFloat(exchangePure) || 0;
        const feeVal = parseFloat(exchangeServiceFee) || 0;
        
        newEntry.type = 'Exchange';
        newEntry.details = `Exchange transaction for ${exchangeMetal}. Impure: ${impureVal.toFixed(3)}g (${purityVal.toFixed(2)}% purity). Pure Given: ${pureVal.toFixed(3)}g. Service Fee: ₹${feeVal.toLocaleString('en-IN')}.`;
        newEntry.cash_change = feeVal;
        
        if (exchangeMetal === 'Gold') {
          newEntry.impure_gold_change = impureVal;
          newEntry.pure_gold_change = -pureVal;
          newEntry.calculated_pure_gold = pureVal;
        } else {
          newEntry.impure_silver_change = impureVal;
          newEntry.pure_silver_change = -pureVal;
          newEntry.calculated_pure_silver = pureVal;
        }
      } else if (ledgerActionTab === 'allocate') {
        const weightVal = parseFloat(allocWeight) || 0;
        const cashVal = parseFloat(allocCash) || 0;
        
        if (!allocBranchId) {
          alert('Please select a branch.');
          return;
        }

        // 1. Insert into stock_allocations
        const { error: allocError } = await supabase.from('stock_allocations').insert([{
          id: `ALLOC-${Math.floor(1000 + Math.random() * 9000)}`,
          branch_id: allocBranchId,
          branch_name: allocBranchId,
          staff_id: null,
          metal: allocMetal,
          pure_weight: weightVal,
          cash_amount: cashVal,
          allocated_by: 'SUPER-001',
          date: dateStr,
          iso_date: isoDateStr,
          notes: allocNotes
        }]);
        if (allocError) throw allocError;

        newEntry.type = 'Branch Allocation';
        newEntry.details = `Allocated ${weightVal.toFixed(3)}g Pure ${allocMetal} and ₹${cashVal.toLocaleString('en-IN')} to ${allocBranchId}. Notes: ${allocNotes}`;
        newEntry.cash_change = -cashVal;
        
        if (allocMetal === 'Gold') {
          newEntry.pure_gold_change = -weightVal;
        } else {
          newEntry.pure_silver_change = -weightVal;
        }
      } else {
        const weightVal = parseFloat(cashWeight) || 0;
        const rateVal = parseFloat(cashRate) || 0;
        const totalVal = parseFloat(cashTotalAmount) || 0;
        
        if (cashType === 'Sale') {
          newEntry.type = 'Cash Sale';
          newEntry.details = `Cash Sale of Pure ${cashMetal}. Weight: ${weightVal.toFixed(3)}g @ ₹${rateVal.toLocaleString('en-IN')}/g. Total Cash Received: ₹${totalVal.toLocaleString('en-IN')}.`;
          newEntry.cash_change = totalVal;
          
          if (cashMetal === 'Gold') {
            newEntry.pure_gold_change = -weightVal;
          } else {
            newEntry.pure_silver_change = -weightVal;
          }
        } else {
          newEntry.type = 'Cash Purchase';
          newEntry.details = `Cash Purchase of Pure ${cashMetal}. Weight: ${weightVal.toFixed(3)}g @ ₹${rateVal.toLocaleString('en-IN')}/g. Total Cash Paid: ₹${totalVal.toLocaleString('en-IN')}.`;
          newEntry.cash_change = -totalVal;
          
          if (cashMetal === 'Gold') {
            newEntry.pure_gold_change = weightVal;
          } else {
            newEntry.pure_silver_change = weightVal;
          }
        }
      }
      
      const { error } = await supabase.from('super_admin_ledger').insert([newEntry]);
      if (error) throw error;
      
      // Reset state and modal
      setShowLedgerActionModal(false);
      setExchangeImpure('');
      setExchangePurity('');
      setExchangePure('');
      setExchangeServiceFee('');
      setCashWeight('');
      setCashRate('');
      setCashTotalAmount('');
      setAllocWeight('');
      setAllocCash('');
      setAllocNotes('');
      setAllocBranchId('');
      
      fetchData();
    } catch (err) {
      console.error('Error creating ledger entry:', err);
      alert('Failed to save ledger entry.');
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

  // Handle Branch Approval (approves all pending groups for a specific branch)
  const handleApproveBranch = async (branchName: string) => {
    setApproving(true);
    try {
      // Find all groups for this branch
      const branchGroups = pendingBranchGroups.filter((g: any) => g.branch_name === branchName);
      
      for (const group of branchGroups) {
        const entryIds = group.entries.map((e: any) => e.id);
        
        // Update the ledger entries to approved
        const { error: updateError } = await supabase
          .from('ledger_entries')
          .update({ is_approved: true })
          .in('id', entryIds);

        if (updateError) throw updateError;

        const netCash = group.totalCashReceived - group.totalCashPaid;

        // Insert consolidation into Super Admin Ledger
        const newEntry = {
          id: `SAL-${Math.floor(1000 + Math.random() * 9000)}`,
          date: 'Today',
          iso_date: new Date().toISOString().split('T')[0],
          type: 'Branch Consolidation',
          branch_name: group.branch_name,
          pure_gold_change: -group.totalPureGoldGiven,
          impure_gold_change: group.totalImpureGoldReceived,
          calculated_pure_gold: group.totalImpureGoldReceived * 0.92,
          pure_silver_change: -group.totalPureSilverGiven,
          impure_silver_change: group.totalImpureSilverReceived,
          calculated_pure_silver: group.totalImpureSilverReceived * 0.92,
          cash_change: netCash,
          details: `Approved daily ledger for ${group.branch_name} on ${group.iso_date}. Pure Gold Given: ${group.totalPureGoldGiven.toFixed(3)}g, Impure Gold Recv: ${group.totalImpureGoldReceived.toFixed(3)}g, Net Cash: ₹${netCash.toLocaleString('en-IN')}.`
        };

        const { error: insertError } = await supabase
          .from('super_admin_ledger')
          .insert([newEntry]);

        if (insertError) throw insertError;
      }

      setSelectedBranchForApproval(null);
      setConfirmStep(0);
      fetchData();
    } catch (e) {
      console.error('Error approving branch data:', e);
      alert('Failed to approve branch data.');
    } finally {
      setApproving(false);
    }
  };

  const currentPureStock = saLedger.reduce((s, e) => s + (activeMetal === 'Gold' ? e.pureGoldChange : e.pureSilverChange), 0);
  const currentImpureStock = saLedger.reduce((s, e) => s + (activeMetal === 'Gold' ? e.impureGoldChange : e.impureSilverChange), 0);
  const currentCashStock = saLedger.reduce((s, e) => s + e.cashChange, 0);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtG = (n: number) => `${n.toFixed(3)}g`;

  if (loading) {
    return (
      <div className="bg-background text-on-background font-body-md min-h-[100svh] flex flex-col items-center justify-center ambient-bg relative z-10 w-full overflow-hidden">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
        <p className="font-label-caps text-[10px] tracking-widest text-outline">Retrieving Corporate Records...</p>
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
                  setConfirmStep(0);
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
                        setConfirmStep(0);
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
                  const netCash = group.totalCashReceived - group.totalCashPaid;
                  return (
                    <div key={idx} className="luxury-card bg-white rounded-[2rem] border border-outline-variant/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-fade-in">
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
                      
                      <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-[#755b00]/5">diamond</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Gold Given</p>
                          <p className="font-headline font-black text-[#755b00] text-xl">{group.totalPureGoldGiven.toFixed(3)}g</p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-amber-600/5">local_fire_department</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Gold Recv (Impure)</p>
                          <p className="font-headline font-black text-amber-600 text-xl">{group.totalImpureGoldReceived.toFixed(3)}g</p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-emerald-600/5">payments</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Net Cash</p>
                          <p className={`font-headline font-black text-xl ${netCash >= 0 ? 'text-emerald-600' : 'text-error'}`}>
                            {netCash >= 0 ? '+' : ''}{fmt(netCash)}
                          </p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
                          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-4xl text-slate-500/5">diamond</span>
                          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Silver Recv (Impure)</p>
                          <p className="font-headline font-black text-slate-500 text-xl">{group.totalImpureSilverReceived.toFixed(3)}g</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => {
                    if (confirmStep === 0) {
                      setConfirmStep(1);
                    } else {
                      handleApproveBranch(selectedBranchForApproval);
                    }
                  }}
                  disabled={approving}
                  className={`w-full sm:w-auto px-10 py-4 text-white rounded-[1.5rem] font-bold text-sm uppercase tracking-widest shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:transform-none disabled:shadow-none ${
                    confirmStep === 1 
                      ? 'bg-gradient-to-r from-error to-red-600 shadow-red-500/30 hover:shadow-red-500/50 animate-pulse' 
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/50'
                  }`}
                >
                  {approving ? (
                    <>
                      <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                      Merging Data...
                    </>
                  ) : confirmStep === 1 ? (
                    <>
                      <span className="material-symbols-outlined">warning</span>
                      Are you sure? Click again to execute!
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">fact_check</span>
                      Confirm & Merge Branch Data
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background ambient-bg text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 max-w-5xl mx-auto pt-8 pb-32 relative space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-2 animate-fade-in">
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
          <button 
            onClick={async () => {
              // Clear DB super admin ledger for testing setup
              if (window.confirm("Are you sure you want to reset all corporate records for testing setup?")) {
                try {
                  await supabase.from('super_admin_ledger').delete().neq('id', '');
                  await supabase.from('refining_transfers').delete().neq('id', '');
                  fetchData();
                } catch (e) {
                  console.error(e);
                }
              }
            }}
            className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative active:scale-95 transition-transform shrink-0"
            title="Reset Initial Details"
          >
            <span className="material-symbols-outlined text-xl">restart_alt</span>
          </button>
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
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Super Pure Stock</p>
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
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline">Super Impure Stock</p>
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
              <p className="label-institutional text-outline uppercase px-1">Branch End-Of-Day Reports</p>
              {branchReports.length === 0 ? (
                <div className="luxury-card p-6 bg-slate-50 border border-outline-variant/10 text-center">
                  <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">inventory</span>
                  <p className="text-xs text-outline font-semibold">No daily reports submitted yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {branchReports.slice(0, 5).map(report => (
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
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                          <p className="text-[8px] uppercase tracking-widest font-bold text-outline mb-0.5">Gold Used</p>
                          <p className="text-xs font-black text-[#755b00]">{fmtG(report.gold_used)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                          <p className="text-[8px] uppercase tracking-widest font-bold text-outline mb-0.5">Silver Used</p>
                          <p className="text-xs font-black text-slate-500">{fmtG(report.silver_used)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                          <p className="text-[8px] uppercase tracking-widest font-bold text-outline mb-0.5">Cash Recv</p>
                          <p className="text-xs font-black text-emerald-600">{fmt(report.cash_received)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1 px-1">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Closing Pure Gold: <span className="text-primary font-black">{fmtG(report.closing_pure_gold)}</span></p>
                        <p className="text-[8px] uppercase tracking-widest font-bold text-outline">Closing Cash: <span className="text-primary font-black">{fmt(report.closing_cash)}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Super Admin Ledger History */}
            <div className="space-y-3">
              <p className="label-institutional text-outline uppercase px-1">Corporate Ledger History</p>
              <div className="space-y-3">
                {saLedger.map(entry => (
                  <div key={entry.id} className="luxury-card p-5 bg-white border border-outline-variant/20 relative overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between mb-2">
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
                        {entry.pureGoldChange !== 0 && (
                          <p className={`text-xs font-black ${entry.pureGoldChange > 0 ? 'text-[#755b00]' : 'text-error'}`}>
                            {entry.pureGoldChange > 0 ? '+' : ''}{fmtG(entry.pureGoldChange)}
                          </p>
                        )}
                        {entry.impureGoldChange !== 0 && (
                          <p className={`text-xs font-black ${entry.impureGoldChange > 0 ? 'text-amber-600' : 'text-error'}`}>
                            {entry.impureGoldChange > 0 ? '+' : ''}{fmtG(entry.impureGoldChange)} (Impure)
                          </p>
                        )}
                        {entry.calculatedPureGold !== 0 && (
                          <p className={`text-xs font-black ${entry.calculatedPureGold > 0 ? 'text-[#755b00]' : 'text-error'}`}>
                            {entry.calculatedPureGold > 0 ? '+' : ''}{fmtG(entry.calculatedPureGold)} (Expected Pure)
                          </p>
                        )}
                        {entry.cashChange !== 0 && (
                          <p className={`text-xs font-black ${entry.cashChange > 0 ? 'text-emerald-600' : 'text-error'}`}>
                            {entry.cashChange > 0 ? '+' : ''}{fmt(entry.cashChange)}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-outline font-medium border-t border-outline-variant/10 pt-2">{entry.details}</p>
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

        {/* Corporate Transaction Modal (Exchange & Cash) */}
        {showLedgerActionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-headline text-lg font-bold text-primary">New Corporate Entry</h3>
                <button 
                  type="button"
                  onClick={() => setShowLedgerActionModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-[#003366]/5 p-1 rounded-2xl border border-outline-variant/10 mb-4">
                <button
                  type="button"
                  onClick={() => setLedgerActionTab('exchange')}
                  className={`flex-grow py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${
                    ledgerActionTab === 'exchange' ? 'bg-[#003366] text-white shadow-md' : 'text-outline hover:text-primary'
                  }`}
                >
                  Exchange
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerActionTab('cash')}
                  className={`flex-grow py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${
                    ledgerActionTab === 'cash' ? 'bg-[#003366] text-white shadow-md' : 'text-outline hover:text-primary'
                  }`}
                >
                  Cash
                </button>
              </div>

              {/* Form Container */}
              <form onSubmit={handleLedgerActionSubmit} className="space-y-4 overflow-y-auto hide-scrollbar flex-grow pr-1">
                
                {ledgerActionTab === 'exchange' ? (
                  <>
                    {/* EXCHANGE FORM */}
                    
                    {/* Metal Selector (Gold/Silver) */}
                    <div>
                      <label className="text-[8px] font-bold uppercase tracking-widest text-outline mb-1.5 block">Select Metal Type *</label>
                      <div className="flex gap-2 bg-surface-container p-1 rounded-2xl">
                        {[
                          { metal: 'Gold', icon: 'workspace_premium', activeClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' },
                          { metal: 'Silver', icon: 'workspace_premium', activeClass: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm' }
                        ].map(({ metal, icon, activeClass }) => {
                          const isActive = exchangeMetal === metal;
                          return (
                            <button
                              type="button"
                              key={metal}
                              onClick={() => setExchangeMetal(metal as 'Gold' | 'Silver')}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                                isActive ? activeClass : 'text-outline hover:text-primary'
                              }`}
                            >
                              <span className={`material-symbols-outlined text-sm ${isActive ? 'text-white' : metal === 'Gold' ? 'text-amber-500' : 'text-slate-400'}`}>
                                {icon}
                              </span>
                              {metal}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Impure Weight Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Impure Weight (g) *</span>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={exchangeImpure}
                        onChange={e => handleExchangeImpureChange(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. 150.000"
                      />
                    </div>

                    {/* Purity Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Purity (%) *</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={exchangePurity}
                        onChange={e => handleExchangePurityChange(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. 92.00"
                      />
                    </div>

                    {/* Pure Weight Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Pure Weight Given (g) *</span>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={exchangePure}
                        onChange={e => setExchangePure(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. 138.000"
                      />
                    </div>

                    {/* Service Fee Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Service Fee (INR)</span>
                      <input 
                        type="number" 
                        value={exchangeServiceFee}
                        onChange={e => setExchangeServiceFee(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. 500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* CASH FORM */}
                    
                    {/* Type Selector (Purchase vs Sale) */}
                    <div>
                      <label className="text-[8px] font-bold uppercase tracking-widest text-outline mb-1.5 block">Transaction Type *</label>
                      <div className="flex gap-2 bg-surface-container p-1 rounded-2xl">
                        {[
                          { type: 'Sale', label: 'Cash Sale (Sell)', activeClass: 'bg-emerald-600 text-white shadow-sm' },
                          { type: 'Purchase', label: 'Cash Purchase (Buy)', activeClass: 'bg-error text-white shadow-sm' }
                        ].map(({ type, label, activeClass }) => {
                          const isActive = cashType === type;
                          return (
                            <button
                              type="button"
                              key={type}
                              onClick={() => setCashType(type as 'Sale' | 'Purchase')}
                              className={`flex-1 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                                isActive ? activeClass : 'text-outline hover:text-primary'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Metal Selector (Gold/Silver) */}
                    <div>
                      <label className="text-[8px] font-bold uppercase tracking-widest text-outline mb-1.5 block">Select Metal Type *</label>
                      <div className="flex gap-2 bg-surface-container p-1 rounded-2xl">
                        {[
                          { metal: 'Gold', icon: 'workspace_premium', activeClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' },
                          { metal: 'Silver', icon: 'workspace_premium', activeClass: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm' }
                        ].map(({ metal, icon, activeClass }) => {
                          const isActive = cashMetal === metal;
                          return (
                            <button
                              type="button"
                              key={metal}
                              onClick={() => setCashMetal(metal as 'Gold' | 'Silver')}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                                isActive ? activeClass : 'text-outline hover:text-primary'
                              }`}
                            >
                              <span className={`material-symbols-outlined text-sm ${isActive ? 'text-white' : metal === 'Gold' ? 'text-amber-500' : 'text-slate-400'}`}>
                                {icon}
                              </span>
                              {metal}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pure Weight Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Pure Weight (g) *</span>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={cashWeight}
                        onChange={e => handleCashWeightChange(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. 10.000"
                      />
                    </div>

                    {/* Rate Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Rate per gram (INR) *</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={cashRate}
                        onChange={e => handleCashRateChange(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. 6000.00"
                      />
                    </div>

                    {/* Total Amount Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Total Cash Amount (INR) *</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={cashTotalAmount}
                        onChange={e => setCashTotalAmount(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. 60000.00"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* ALLOCATE FORM */}
                    
                    {/* Branch Selector */}
                    <div>
                      <label className="text-[8px] font-bold uppercase tracking-widest text-outline mb-1.5 block">Select Branch *</label>
                      <select
                        required
                        value={allocBranchId}
                        onChange={e => setAllocBranchId(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                      >
                        <option value="" disabled>Select a branch...</option>
                        {availableBranches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Metal Selector (Gold/Silver) */}
                    <div className="mt-2">
                      <label className="text-[8px] font-bold uppercase tracking-widest text-outline mb-1.5 block">Select Metal Type *</label>
                      <div className="flex gap-2 bg-surface-container p-1 rounded-2xl">
                        {[
                          { metal: 'Gold', icon: 'workspace_premium', activeClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' },
                          { metal: 'Silver', icon: 'workspace_premium', activeClass: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm' }
                        ].map(({ metal, icon, activeClass }) => {
                          const isActive = allocMetal === metal;
                          return (
                            <button
                              type="button"
                              key={metal}
                              onClick={() => setAllocMetal(metal as 'Gold' | 'Silver')}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                                isActive ? activeClass : 'text-outline hover:text-primary'
                              }`}
                            >
                              <span className={`material-symbols-outlined text-sm ${isActive ? 'text-white' : metal === 'Gold' ? 'text-amber-500' : 'text-slate-400'}`}>
                                {icon}
                              </span>
                              {metal}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pure Weight Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Allocated Pure Weight (g)</span>
                      <input 
                        type="number" 
                        step="0.001"
                        value={allocWeight}
                        onChange={e => setAllocWeight(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. 50.000"
                      />
                    </div>

                    {/* Cash Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Allocated Cash (INR)</span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={allocCash}
                        onChange={e => setAllocCash(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. 100000.00"
                      />
                    </div>

                    {/* Notes Input */}
                    <div className="relative group mt-1">
                      <span className="text-[8px] absolute -top-2 left-4 bg-white px-1.5 text-outline font-bold uppercase tracking-widest z-10">Allocation Notes</span>
                      <input 
                        type="text" 
                        value={allocNotes}
                        onChange={e => setAllocNotes(e.target.value)}
                        className="w-full bg-white border border-outline-variant/30 rounded-2xl py-3 px-4 text-xs font-bold text-primary focus:outline-none"
                        placeholder="e.g. Weekly stock refill"
                      />
                    </div>
                  </>
                )}

                {/* Submit / Cancel Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowLedgerActionModal(false)}
                    className="flex-1 py-3 bg-surface-container text-primary font-bold text-xs uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-[#003366] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-transform"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Floating Action Button for Corporate Entries */}
      <button 
        onClick={() => setShowLedgerActionModal(true)}
        className="fixed bottom-28 right-8 w-16 h-16 bg-[#003366] text-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,30,64,0.3)] backdrop-blur-md flex items-center justify-center active:scale-90 active:rotate-12 transition-all z-[60] border-2 border-white/20 group overflow-hidden animate-fade-in"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span className="material-symbols-outlined text-3xl relative z-10 transition-transform group-hover:scale-110">add</span>
        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
      </button>

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
