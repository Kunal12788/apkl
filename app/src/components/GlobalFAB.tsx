import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { AddTaskModal } from './AddTaskModal';
import { useSession } from '../context/SessionContext';
import { triggerBlueToast } from './AppleToast';

export const GlobalFAB: React.FC = () => {
  const { user, isFullyAuthenticated } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Define paths where the FAB should be hidden (e.g., login, splash)
  const hideOnPaths = ['/login', '/forgot', '/splash', '/'];
  if (hideOnPaths.includes(location.pathname) || user?.role === 'Super Admin' || !isFullyAuthenticated) return null;

  return (
    <>
      {/* Global FAB - Institutional Design */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 right-8 w-16 h-16 bg-[#003366] text-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,30,64,0.3)] backdrop-blur-md flex items-center justify-center active:scale-90 active:rotate-12 transition-all z-[60] border-2 border-white/20 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span className="material-symbols-outlined text-3xl relative z-10 transition-transform group-hover:scale-110">add</span>
        
        {/* Subtle Pulse Effect */}
        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
      </button>

      {/* Global Add Task Modal */}
      <AddTaskModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onSuccess={async (data) => {
          console.log('Global Task Created:', data);
          try {
            const isCollection = user?.role === 'Collection Staff';
            const generatedCustomerId = data.customerId || `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
            const isSilver = data.metal === 'Silver';
            const dateStr = 'Today';
            const isoDateStr = new Date().toISOString().split('T')[0];

            let serialId = '0001';
            try {
              const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
              if (count !== null) {
                serialId = String(count + 1).padStart(4, '0');
              }
            } catch (e) {
              console.error('Failed to get task count for serial ID', e);
            }

            const taskIdGenerated = isCollection ? `COL-${serialId}` : `TASK-${serialId}`;

            // COLLECTION STAFF WORKFLOW: Always write directly to the tasks table with status 'Pending' and progress 0 (No stock validation)
            if (isCollection) {
              const newTask = {
                id: taskIdGenerated,
                customer_name: data.customerName || 'Walk-in Customer',
                customer_id: generatedCustomerId,
                metal: data.metal || 'Gold',
                customer_address: data.address,
                customer_phone: data.phone,
                impure_weight: data.impureWeight || null,
                purity: data.purity || null,
                pure_weight: data.pureWeight || null,
                settlement_condition: data.settlementCondition || 'Only Tunch',
                product_type: data.productType || 'Jewellery',
                pieces: data.pieces || '1',
                brought_by: 'Collection Staff',
                work_type: data.workType === 'MARKING' ? 'Marking' : data.workType === 'SHOULDERING' ? 'Shouldering' : 'Tunch',
                date_given: data.date,
                status: 'Pending',
                progress_percentage: 0,
                assigned_to: 'Staff',
                source: 'Collection Staff',
                created_by: user?.id || '',
                created_at: new Date().toISOString(),
                iso_date: isoDateStr,
                estimated_completion: 'Awaiting Audit',
                notes: data.notes || 'Created by Collection Staff',
                images: data.images || [],
                logo_name: data.logoName || null,
                carat: data.carat || null,
                point_suggestion: data.pointsUsed ? `${data.pointsUsed} ${data.pointSuggestion || 'Gold'} Points` : null,
                total_weight: data.totalWeight || null,
                pending_pure_liability: false,
                pending_cash_liability: false,
                was_settlement_category: false
              };

              const { error: taskError } = await supabase.from('tasks').insert([newTask]);
              if (taskError) throw taskError;

              toast.success(`${newTask.work_type} task registered successfully as Pending verification.`);
              window.dispatchEvent(new CustomEvent('databaseSync'));
              return;
            }

            // Rule 0: Direct Buy and Sell direct transaction (Bypasses tasks, inserts completed ledger and transactions)
            if (data.workType === 'BUY_SELL') {
              const isBuy = data.settlementCondition === 'Buy';
              const calculatedPure = Number(data.pureWeight || 0);
              const totalAmount = Number(data.cashAmount || 0);
              const cashRate = Number(data.cashRate || 0);

              const isSuperSa = user?.role === 'Super Admin';
              let allocationsQuery = supabase.from('stock_allocations').select('*');
              if (!isSuperSa && user?.branch_id) {
                allocationsQuery = allocationsQuery.eq('branch_id', user.branch_id);
              }
              
              let branchUserIds: string[] = [];
              if (!isSuperSa && user?.branch_id) {
                const { data: bUsers } = await supabase.from('users').select('id').eq('branch_id', user.branch_id);
                if (bUsers) branchUserIds = bUsers.map((bu: any) => bu.id);
              }
              if (branchUserIds.length === 0) branchUserIds = [user?.id || ''];
              
              let entriesQuery = supabase.from('ledger_entries').select('*');
              if (!isSuperSa && user?.branch_id) {
                entriesQuery = entriesQuery.in('staff_id', branchUserIds);
              }
              
              const [allocationsRes, entriesRes] = await Promise.all([
                allocationsQuery,
                entriesQuery
              ]);

              const metalType = isSilver ? 'Silver' : 'Gold';

              if (!isBuy) {
                // Selling: Validation for Pure Metal Stock
                const totalAllocatedPure = (allocationsRes.data || []).filter((a: any) => a.metal === metalType).reduce((s, a) => s + Number(a.pure_weight || 0), 0);
                const totalPureGiven = (entriesRes.data || []).reduce((s, e) => s + (metalType === 'Gold' ? (Number(e.pure_gold_out) || 0) : (Number(e.pure_silver_out) || 0)), 0);
                const totalPureReceived = (entriesRes.data || []).reduce((s, e) => s + (metalType === 'Gold' ? (Number(e.pure_gold_in) || 0) : (Number(e.pure_silver_in) || 0)), 0);
                const currentPureStock = totalAllocatedPure + totalPureReceived - totalPureGiven;

                if (calculatedPure > currentPureStock) {
                  const msg = user?.role === 'Admin'
                    ? "Required stock is not present, kindly talk to the Super Admin."
                    : "Required stock is not present, kindly talk to the Admin.";
                  triggerBlueToast(msg);
                  return;
                }
              } else {
                // Buying: Validation for Cash Stock
                const totalAllocatedCash = (allocationsRes.data || []).reduce((s, a) => s + Number(a.cash_amount || 0), 0);
                const totalCashReceived = (entriesRes.data || []).reduce((s, e) => s + Number(e.cash_received || 0), 0);
                const totalCashPaid = (entriesRes.data || []).reduce((s, e) => s + Number(e.cash_paid || 0), 0);
                const currentCashStock = totalAllocatedCash + totalCashReceived - totalCashPaid;

                if (totalAmount > currentCashStock) {
                  const msg = user?.role === 'Admin'
                    ? "Required cash stock is not present, kindly talk to the Super Admin."
                    : "Required cash stock is not present, kindly talk to the Admin.";
                  triggerBlueToast(msg);
                  return;
                }
              }

              const depositToWallet = !!data.depositToWallet;

              // 1. Create Ledger Entry
              const entryId = `LGR-${Math.floor(1000 + Math.random() * 9000)}`;
              const ledgerEntry: any = {
                id: entryId,
                date: dateStr,
                iso_date: isoDateStr,
                customer_name: data.customerName || 'Walk-in Customer',
                transaction_type: isBuy ? 'Buy' : 'Sell',
                status: 'Completed',
                purity: data.purity || '',
                staff_id: user?.id || '',
                pure_gold_out: 0,
                pure_silver_out: 0,
                pure_gold_in: 0,
                pure_silver_in: 0,
                impure_gold_in: 0,
                impure_silver_in: 0,
                cash_paid: isBuy ? 0 : totalAmount,
                cash_received: isBuy ? totalAmount : 0,
                cash_rate_per_gram: cashRate,
                cash_amount: totalAmount,
                pending_pure_liability: false,
                pending_cash_liability: false
              };

              if (isSilver) {
                if (isBuy) {
                  ledgerEntry.impure_silver_in = 0;
                  ledgerEntry.pure_silver_in = calculatedPure;
                } else {
                  ledgerEntry.pure_silver_out = depositToWallet ? 0 : calculatedPure;
                }
              } else {
                if (isBuy) {
                  ledgerEntry.impure_gold_in = 0;
                  ledgerEntry.pure_gold_in = calculatedPure;
                } else {
                  ledgerEntry.pure_gold_out = depositToWallet ? 0 : calculatedPure;
                }
              }

              const { error: ledgerError } = await supabase.from('ledger_entries').insert([ledgerEntry]);
              if (ledgerError) throw ledgerError;

              // Perform wallet deposit if requested
              if (depositToWallet && generatedCustomerId && generatedCustomerId !== 'CUST-COL') {
                const { data: custData } = await supabase
                  .from('customers')
                  .select('advance_cash, advance_pure_gold, advance_pure_silver')
                  .eq('id', generatedCustomerId)
                  .maybeSingle();

                if (isBuy) {
                  const currentAdvance = custData ? Number(custData.advance_cash || 0) : 0;
                  await supabase
                    .from('customers')
                    .update({ advance_cash: currentAdvance + totalAmount })
                    .eq('id', generatedCustomerId);

                  const advId = `ADV-FAB-${Math.floor(1000 + Math.random() * 9000)}`;
                  await supabase
                    .from('customer_advances')
                    .insert([{
                      id: advId,
                      customer_id: generatedCustomerId,
                      customer_name: data.customerName || 'Walk-in Customer',
                      type: 'Deposit',
                      asset_type: 'Cash',
                      amount: totalAmount,
                      details: `Auto-deposit from Buy transaction ${entryId}`,
                      created_by: user?.id
                    }]);
                } else {
                  if (isSilver) {
                    const currentAdvance = custData ? Number(custData.advance_pure_silver || 0) : 0;
                    await supabase
                      .from('customers')
                      .update({ advance_pure_silver: currentAdvance + calculatedPure })
                      .eq('id', generatedCustomerId);
                  } else {
                    const currentAdvance = custData ? Number(custData.advance_pure_gold || 0) : 0;
                    await supabase
                      .from('customers')
                      .update({ advance_pure_gold: currentAdvance + calculatedPure })
                      .eq('id', generatedCustomerId);
                  }

                  const advId = `ADV-FAB-${Math.floor(1000 + Math.random() * 9000)}`;
                  await supabase
                    .from('customer_advances')
                    .insert([{
                      id: advId,
                      customer_id: generatedCustomerId,
                      customer_name: data.customerName || 'Walk-in Customer',
                      type: 'Deposit',
                      asset_type: isSilver ? 'Pure Silver' : 'Pure Gold',
                      amount: calculatedPure,
                      details: `Auto-deposit from Sell transaction ${entryId}`,
                      created_by: user?.id
                    }]);
                }
              }

              // 2. Create Transaction Entry
              const newTxn = {
                id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                customer_id: generatedCustomerId,
                customer_name: data.customerName || 'Walk-in Customer',
                metal: data.metal || 'Gold',
                type: 'Cash',
                work_type: isBuy ? 'Buy' : 'Sell',
                amount: String(totalAmount),
                date: dateStr,
                iso_date: isoDateStr,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'Paid',
                details: depositToWallet
                  ? `${data.metal} ${isBuy ? 'Purchase (Buy)' : 'Sale (Sell)'} completed. Yield auto-deposited to customer wallet. Pure Weight: ${calculatedPure}g.`
                  : `${data.metal} ${isBuy ? 'Purchase (Buy)' : 'Sale (Sell)'} completed. Pure Weight: ${calculatedPure}g at ₹${cashRate}/g.`,
                created_by: user?.id || '',
                pure_weight: String(calculatedPure),
                impure_weight: String(data.impureWeight || 0),
                purity_percentage: data.purity || '',
                cash_rate_per_gram: cashRate,
                is_cash_exchange: true
              };

              const { error: txnError } = await supabase.from('transactions').insert([newTxn]);
              if (txnError) throw txnError;

              toast.success(`${data.metal} ${isBuy ? 'Purchase (Buy)' : 'Sale (Sell)'} registered successfully.`);
              window.dispatchEvent(new CustomEvent('databaseSync'));
              return;
            }

            // Rule 1: Marking & Shouldering Bypass tasks table, write directly to transactions
            if (data.workType === 'MARKING' || data.workType === 'SHOULDERING') {
              const newTxn = {
                id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                customer_id: generatedCustomerId,
                customer_name: data.customerName || 'Walk-in Customer',
                metal: data.metal || 'Gold',
                type: data.feePaymentMode || 'Cash',
                work_type: data.workType === 'MARKING' ? 'Marking' : 'Shouldering',
                amount: String(data.fee || '0'),
                date: dateStr,
                iso_date: isoDateStr,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: data.feeStatus || 'Paid',
                details: `${data.workType === 'MARKING' ? 'Marking' : 'Shouldering'} Completed. Pieces: ${data.pieces || '1'}. ${data.logoName ? 'Logo: ' + data.logoName + '.' : ''}`,
                created_by: user?.id || '',
                pending_pure_liability: !!data.pendingPureLiability,
                pending_cash_liability: !!data.pendingCashLiability
              };

              const { error: txnError } = await supabase.from('transactions').insert([newTxn]);
              if (txnError) throw txnError;

              toast.success(`${data.workType === 'MARKING' ? 'Marking' : 'Shouldering'} registered directly in Billings.`);
              window.dispatchEvent(new CustomEvent('databaseSync'));
              return;
            }

            // Rule 2: Tunch -> Pure Gold/Silver Bypass tasks table, write directly to exchange ledger entries
            if (data.workType === 'TUNCH' && (data.settlementCondition === 'Pure Gold' || data.settlementCondition === 'Pure Silver')) {
              const calculatedPure = Number(data.pureWeight || 0);

              // Stock Validation bypassed as per user request to directly execute without creating task or admin verification

              const entryId = `LGR-${Math.floor(1000 + Math.random() * 9000)}`;

              const ledgerEntry: any = {
                id: entryId,
                date: dateStr,
                iso_date: isoDateStr,
                customer_name: data.customerName || 'Walk-in Customer',
                transaction_type: 'Exchange',
                status: data.pendingPureLiability ? 'Pending Pure' : 'Completed',
                purity: data.purity || '',
                staff_id: user?.id || '',
                pure_gold_out: 0,
                pure_silver_out: 0,
                pending_pure_liability: !!data.pendingPureLiability,
                pending_cash_liability: !!data.pendingCashLiability
              };

              if (isSilver) {
                ledgerEntry.impure_silver_in = Number(data.impureWeight || 0);
                if (data.pendingPureLiability) {
                  ledgerEntry.pure_silver_due = calculatedPure;
                  ledgerEntry.pure_silver_out = 0;
                } else {
                  ledgerEntry.pure_silver_due = 0;
                  ledgerEntry.pure_silver_out = calculatedPure;
                }
                ledgerEntry.pure_gold_due = 0;
                ledgerEntry.impure_gold_in = 0;
              } else {
                ledgerEntry.impure_gold_in = Number(data.impureWeight || 0);
                if (data.pendingPureLiability) {
                  ledgerEntry.pure_gold_due = calculatedPure;
                  ledgerEntry.pure_gold_out = 0;
                } else {
                  ledgerEntry.pure_gold_due = 0;
                  ledgerEntry.pure_gold_out = calculatedPure;
                }
                ledgerEntry.pure_silver_due = 0;
                ledgerEntry.impure_silver_in = 0;
              }

              const { error: ledgerError } = await supabase.from('ledger_entries').insert([ledgerEntry]);
              if (ledgerError) throw ledgerError;

              // Insert fee transaction if provided
              if (data.fee) {
                const newTxn = {
                  id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                  customer_id: generatedCustomerId,
                  customer_name: data.customerName || 'Walk-in Customer',
                  metal: data.metal || 'Gold',
                  type: data.feePaymentMode || 'Cash',
                  work_type: 'Tunch',
                  amount: String(data.fee),
                  date: dateStr,
                  iso_date: isoDateStr,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: data.feeStatus || 'Paid',
                  details: 'Service Fee (Pure Metal Exchange)',
                  created_by: user?.id || ''
                };
                await supabase.from('transactions').insert([newTxn]);
              }

              toast.success('Pure metal exchange registered directly in Ledger.');
              window.dispatchEvent(new CustomEvent('databaseSync'));
              return;
            }

            // Rule 3: Tunch -> Only Tunch Insert task with status = 'Settlement' + create ledger entry
            if (data.workType === 'TUNCH' && data.settlementCondition === 'Only Tunch') {
              const newTask = {
                id: taskIdGenerated,
                customer_name: data.customerName || 'Walk-in Customer',
                customer_id: generatedCustomerId,
                metal: data.metal || 'Gold',
                customer_address: data.address,
                customer_phone: data.phone,
                impure_weight: data.impureWeight,
                purity: data.purity,
                pure_weight: data.pureWeight,
                settlement_condition: data.settlementCondition,
                product_type: data.productType,
                pieces: data.pieces,
                brought_by: isCollection ? 'Collection Staff' : data.broughtBy,
                work_type: 'Tunch',
                date_given: data.date,
                status: 'Settlement',
                progress_percentage: 100,
                assigned_to: user?.id || 'Staff',
                source: isCollection ? 'Collection Staff' : 'Staff',
                created_by: user?.id || '',
                created_at: new Date().toISOString(),
                iso_date: isoDateStr,
                estimated_completion: 'Today, 06:00 PM',
                notes: data.notes || 'Created Tunch Only task',
                images: data.images,
                pending_pure_liability: !!data.pendingPureLiability,
                pending_cash_liability: !!data.pendingCashLiability,
                was_settlement_category: true
              };

              const { error: taskError } = await supabase.from('tasks').insert([newTask]);
              if (taskError) throw taskError;

              // Create Ledger Entry
              const entryId = `LGR-${Math.floor(1000 + Math.random() * 9000)}`;
              const ledgerEntry: any = {
                id: entryId,
                date: dateStr,
                iso_date: isoDateStr,
                customer_name: data.customerName || 'Walk-in Customer',
                transaction_type: 'Tunch Only',
                status: 'No Settlement',
                purity: data.purity || '',
                staff_id: user?.id || '',
                pure_gold_out: 0,
                pure_silver_out: 0,
                pure_gold_due: 0,
                pure_silver_due: 0,
                pending_pure_liability: !!data.pendingPureLiability,
                pending_cash_liability: !!data.pendingCashLiability
              };

              if (isSilver) {
                ledgerEntry.impure_silver_in = 0;
                ledgerEntry.impure_gold_in = 0;
              } else {
                ledgerEntry.impure_gold_in = 0;
                ledgerEntry.impure_silver_in = 0;
              }

              const { error: ledgerError } = await supabase.from('ledger_entries').insert([ledgerEntry]);
              if (ledgerError) throw ledgerError;

              // Insert fee transaction if provided
              if (data.fee) {
                const newTxn = {
                  id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                  customer_id: generatedCustomerId,
                  customer_name: data.customerName || 'Walk-in Customer',
                  metal: data.metal || 'Gold',
                  type: data.feePaymentMode || 'Cash',
                  work_type: 'Tunch',
                  amount: String(data.fee),
                  date: dateStr,
                  iso_date: isoDateStr,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: data.feeStatus || 'Paid',
                  details: 'Service Fee (Tunch Only)',
                  created_by: user?.id || ''
                };
                await supabase.from('transactions').insert([newTxn]);
              }

              toast.success('Tunch Only task created and ready for Settlement.');
              window.dispatchEvent(new CustomEvent('databaseSync'));
              return;
            }

            // Rule 4: Tunch -> Cash Insert task with status = 'Pending' and progress 0%
            if (data.workType === 'TUNCH' && data.settlementCondition === 'Cash') {
              const condStr = data.fee ? `Cash - Fee Suggested ₹${data.fee} (${data.feePaymentMode})` : 'Cash';
              const handlingMode = data.cashHandlingMode || 'Front';

              const newTask = {
                id: taskIdGenerated,
                customer_name: data.customerName || 'Walk-in Customer',
                customer_id: generatedCustomerId,
                metal: data.metal || 'Gold',
                customer_address: data.address,
                customer_phone: data.phone,
                impure_weight: data.impureWeight,
                purity: data.purity,
                pure_weight: data.pureWeight,
                settlement_condition: condStr,
                product_type: data.productType,
                pieces: data.pieces,
                brought_by: isCollection ? 'Collection Staff' : data.broughtBy,
                work_type: 'Tunch',
                date_given: data.date,
                status: isCollection ? 'Pending' : 'In Progress',
                progress_percentage: isCollection ? 0 : 50,
                assigned_to: user?.id || 'Staff',
                source: isCollection ? 'Collection Staff' : 'Staff',
                created_by: user?.id || '',
                created_at: new Date().toISOString(),
                iso_date: isoDateStr,
                estimated_completion: isCollection ? 'Awaiting Audit' : 'Today, 06:00 PM',
                notes: data.notes || (isCollection ? 'Created Tunch Cash task. Awaiting Admin verification.' : 'Created Tunch Cash task. In Progress.'),
                images: data.images,
                pending_pure_liability: !!data.pendingPureLiability,
                pending_cash_liability: !!data.pendingCashLiability,
                cash_handling_mode: handlingMode
              };

              const { error: taskError } = await supabase.from('tasks').insert([newTask]);
              if (taskError) throw taskError;

              // Insert Staff's initial ledger entry
              const entryId = `LGR-S-${Math.floor(1000 + Math.random() * 9000)}`;
              const serviceFeeAmount = Number(data.fee || 0);
              const serviceFeeCash = data.feePaymentMode === 'Cash' ? serviceFeeAmount : 0;

              const staffLedgerEntry: any = {
                id: entryId,
                date: 'Today',
                iso_date: isoDateStr,
                customer_name: data.customerName || 'Walk-in Customer',
                transaction_type: 'Exchange',
                purity: data.purity || '',
                staff_id: user?.id || '',
                created_at: new Date().toISOString()
              };

              if (handlingMode === 'Front') {
                staffLedgerEntry.status = 'Pending Cash';
                staffLedgerEntry.pending_cash_liability = true;
                staffLedgerEntry.cash_received = serviceFeeCash;
                staffLedgerEntry.cash_paid = 0;
                staffLedgerEntry.cash_amount = 0;
                staffLedgerEntry.cash_rate_per_gram = 0;
                if (data.metal === 'Silver') {
                  staffLedgerEntry.impure_silver_in = Number(data.impureWeight || 0);
                  staffLedgerEntry.pure_silver_in = 0;
                  staffLedgerEntry.pure_gold_in = 0;
                  staffLedgerEntry.impure_gold_in = 0;
                } else {
                  staffLedgerEntry.impure_gold_in = Number(data.impureWeight || 0);
                  staffLedgerEntry.pure_gold_in = 0;
                  staffLedgerEntry.pure_silver_in = 0;
                  staffLedgerEntry.impure_silver_in = 0;
                }
              } else {
                // Back mode
                staffLedgerEntry.status = 'Completed';
                staffLedgerEntry.pending_cash_liability = false;
                staffLedgerEntry.cash_received = serviceFeeCash;
                staffLedgerEntry.cash_paid = 0;
                staffLedgerEntry.cash_amount = 0;
                staffLedgerEntry.cash_rate_per_gram = 0;
                staffLedgerEntry.pure_gold_in = 0; staffLedgerEntry.impure_gold_in = 0;
                staffLedgerEntry.pure_silver_in = 0; staffLedgerEntry.impure_silver_in = 0;
              }

              const { error: ledgerError } = await supabase.from('ledger_entries').insert([staffLedgerEntry]);
              if (ledgerError) throw ledgerError;

              // Insert fee transaction if provided
              if (serviceFeeAmount > 0) {
                const newTxn = {
                  id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                  customer_id: generatedCustomerId,
                  customer_name: data.customerName || 'Walk-in Customer',
                  metal: data.metal || 'Gold',
                  type: data.feePaymentMode || 'Cash',
                  work_type: 'Tunch',
                  amount: String(data.fee),
                  date: 'Today',
                  iso_date: isoDateStr,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: data.feeStatus || 'Paid',
                  details: 'Service Fee (Tunch Cash)',
                  created_by: user?.id || ''
                };
                await supabase.from('transactions').insert([newTxn]);
              }

              toast.success('Tunch Cash task created. Awaiting Admin verification.');
              window.dispatchEvent(new CustomEvent('databaseSync'));
              return;
            }

            // Rule 5: Wallet Transaction
            if (data.workType === 'WALLET_TXN') {
              const customerId = data.customerId;
              const type = data.walletType;
              const asset = data.walletAsset;
              const amount = parseFloat(data.walletAmount) || 0;
              const remarks = data.notes || '';

              if (!customerId) throw new Error('Customer ID is required for wallet transactions.');

              const { data: custData, error: custErr } = await supabase
                .from('customers')
                .select('name, advance_cash, advance_pure_gold, advance_pure_silver')
                .eq('id', customerId)
                .maybeSingle();

              if (custErr) throw custErr;
              if (!custData) throw new Error('Customer details not found.');

              const curCash = Number(custData.advance_cash || 0);
              const curGold = Number(custData.advance_pure_gold || 0);
              const curSilver = Number(custData.advance_pure_silver || 0);

              let newCash = curCash;
              let newGold = curGold;
              let newSilver = curSilver;

              if (type === 'Deposit') {
                if (asset === 'Cash') newCash += amount;
                else if (asset === 'Pure Gold') newGold += amount;
                else if (asset === 'Pure Silver') newSilver += amount;
              } else {
                if (asset === 'Cash') {
                  if (amount > curCash) throw new Error('Insufficient cash balance in wallet.');
                  newCash -= amount;
                } else if (asset === 'Pure Gold') {
                  if (amount > curGold) throw new Error('Insufficient gold balance in wallet.');
                  newGold -= amount;
                } else if (asset === 'Pure Silver') {
                  if (amount > curSilver) throw new Error('Insufficient silver balance in wallet.');
                  newSilver -= amount;
                }
              }

              const { error: updErr } = await supabase
                .from('customers')
                .update({
                  advance_cash: newCash,
                  advance_pure_gold: newGold,
                  advance_pure_silver: newSilver
                })
                .eq('id', customerId);

              if (updErr) throw updErr;

              const advId = `ADV-FAB-${Math.floor(1000 + Math.random() * 9000)}`;
              const { error: advErr } = await supabase
                .from('customer_advances')
                .insert([{
                  id: advId,
                  customer_id: customerId,
                  customer_name: custData.name,
                  type: type,
                  asset_type: asset,
                  amount: amount,
                  details: remarks || `${type} of ${asset === 'Cash' ? '₹' + amount : amount + 'g'} from Plus menu.`,
                  created_by: user?.id
                }]);

              if (advErr) throw advErr;

              const ledgerId = `LGR-W-${Math.floor(1000 + Math.random() * 9000)}`;
              const ledgerEntry: any = {
                id: ledgerId,
                date: 'Today',
                iso_date: isoDateStr,
                customer_name: custData.name,
                transaction_type: type === 'Deposit' ? 'Deposit' : 'Withdrawal',
                status: 'Completed',
                purity: '',
                staff_id: user?.id || '',
                pure_gold_out: 0, pure_silver_out: 0, pure_gold_in: 0, pure_silver_in: 0,
                impure_gold_in: 0, impure_silver_in: 0,
                cash_paid: 0, cash_received: 0, cash_rate_per_gram: 0, cash_amount: 0,
                pending_pure_liability: false,
                pending_cash_liability: false
              };

              if (asset === 'Cash') {
                if (type === 'Deposit') {
                  ledgerEntry.cash_received = amount;
                  ledgerEntry.cash_amount = amount;
                } else {
                  ledgerEntry.cash_paid = amount;
                  ledgerEntry.cash_amount = amount;
                }
              } else if (asset === 'Pure Gold') {
                if (type === 'Deposit') ledgerEntry.pure_gold_in = amount;
                else ledgerEntry.pure_gold_out = amount;
              } else if (asset === 'Pure Silver') {
                if (type === 'Deposit') ledgerEntry.pure_silver_in = amount;
                else ledgerEntry.pure_silver_out = amount;
              }

              const { error: lgrErr } = await supabase.from('ledger_entries').insert([ledgerEntry]);
              if (lgrErr) throw lgrErr;

              toast.success(`Wallet ${type} of ${asset === 'Cash' ? '₹' + amount.toLocaleString('en-IN') : amount.toFixed(3) + 'g ' + asset} logged successfully.`);
              window.dispatchEvent(new CustomEvent('databaseSync'));
              return;
            }

          } catch (e: any) {
            console.error('Failed to create task', e);
            alert('An error occurred: ' + e.message);
          }
        }}
      />
    </>
  );
};
