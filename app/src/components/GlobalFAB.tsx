import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { AddTaskModal } from './AddTaskModal';
import { useSession } from '../context/SessionContext';

export const GlobalFAB: React.FC = () => {
  const { user, isFullyAuthenticated } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Define paths where the FAB should be hidden (e.g., login, splash)
  const hideOnPaths = ['/login', '/forgot', '/splash', '/'];
  if (hideOnPaths.includes(location.pathname) || (user?.role === 'Super Admin' && location.pathname === '/ledger') || !isFullyAuthenticated) return null;

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
              const entryId = `LGR-${Math.floor(1000 + Math.random() * 9000)}`;
              const calculatedPure = Number(data.pureWeight || 0);

              const ledgerEntry: any = {
                id: entryId,
                date: dateStr,
                iso_date: isoDateStr,
                customer_name: data.customerName || 'Walk-in Customer',
                transaction_type: 'Exchange',
                status: 'Pending Pure',
                purity: data.purity || '',
                staff_id: user?.id || '',
                pure_gold_out: 0,
                pure_silver_out: 0,
                pending_pure_liability: !!data.pendingPureLiability,
                pending_cash_liability: !!data.pendingCashLiability
              };

              if (isSilver) {
                ledgerEntry.impure_silver_in = Number(data.impureWeight || 0);
                ledgerEntry.pure_silver_due = calculatedPure;
                ledgerEntry.pure_gold_due = 0;
                ledgerEntry.impure_gold_in = 0;
              } else {
                ledgerEntry.impure_gold_in = Number(data.impureWeight || 0);
                ledgerEntry.pure_gold_due = calculatedPure;
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
                pending_cash_liability: !!data.pendingCashLiability
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
                ledgerEntry.impure_silver_in = Number(data.impureWeight || 0);
                ledgerEntry.impure_gold_in = 0;
              } else {
                ledgerEntry.impure_gold_in = Number(data.impureWeight || 0);
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

            // Rule 4: Tunch -> Cash Insert task with status = 'In Progress' and progress 40%
            if (data.workType === 'TUNCH' && data.settlementCondition === 'Cash') {
              const condStr = data.fee ? `Cash - Fee Suggested ₹${data.fee} (${data.feePaymentMode})` : 'Cash';
              
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
                status: 'In Progress',
                progress_percentage: 40,
                assigned_to: user?.id || 'Staff',
                source: isCollection ? 'Collection Staff' : 'Staff',
                created_by: user?.id || '',
                created_at: new Date().toISOString(),
                iso_date: isoDateStr,
                estimated_completion: 'Today, 06:00 PM',
                notes: data.notes || 'Created Tunch Cash task. Awaiting pricing.',
                images: data.images,
                pending_pure_liability: !!data.pendingPureLiability,
                pending_cash_liability: !!data.pendingCashLiability
              };

              const { error: taskError } = await supabase.from('tasks').insert([newTask]);
              if (taskError) throw taskError;

              toast.success('Tunch Cash task created. Awaiting Admin pricing approval.');
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
