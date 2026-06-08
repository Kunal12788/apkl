import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AddTaskModal } from './AddTaskModal';
import { useSession } from '../context/SessionContext';
import { getCachedData, setCachedData } from '../cache';

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
            const newTask = {
              id: data.id,
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
              logo_name: data.logoName,
              carat: data.carat,
              pieces: data.pieces,
              brought_by: isCollection ? 'Collection Staff' : data.broughtBy,
              point_suggestion: data.pointSuggestion,
              work_type: data.workType === 'TUNCH' ? 'Tunch' : data.workType === 'MARKING' ? 'Marking' : 'Shouldering',
              date_given: data.date,
              status: isCollection ? 'In Progress' : data.status,
              progress_percentage: isCollection ? 0 : data.progressPercentage,
              assigned_to: isCollection ? 'Pending' : (data.assignedTo || 'Unassigned'),
              source: isCollection ? 'Collection Staff' : 'Staff',
              created_by: user?.id || '',
              iso_date: new Date().toISOString().split('T')[0],
              estimated_completion: isCollection ? 'Awaiting Audit' : 'Today, 06:00 PM',
              notes: isCollection ? 'Collection intake from field.' : 'Created from Global FAB',
              total_weight: data.totalWeight,
              piece_categories: data.pieceCategories,
              images: data.images
            };
            
            const { error: taskError } = await supabase.from('tasks').insert([newTask]);
            if (taskError) {
              console.error('Task Insert Error:', taskError);
              alert('Failed to save task: ' + taskError.message);
              return;
            }
            
            // If there's a fee, we can also insert a transaction
            if (data.fee) {
              const newTxn = {
                id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                customer_id: generatedCustomerId,
                customer_name: data.customerName || 'Walk-in Customer',
                metal: data.metal || 'Gold',
                type: 'Cash',
                work_type: data.workType === 'TUNCH' ? 'Tunch' : data.workType === 'MARKING' ? 'Marking' : 'Shouldering',
                amount: String(data.fee),
                date: 'Today',
                iso_date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: data.feeStatus || 'Paid',
                details: 'Service Fee'
              };
              const { error: txnError } = await supabase.from('transactions').insert([newTxn]);
              if (txnError) console.error('Transaction Insert Error:', txnError);
            }

            // Update local cache for instant UI refresh
            const currentCache = getCachedData('tasks_data') || [];
            setCachedData('tasks_data', [newTask, ...currentCache]);

            // Dispatch an event to notify other components to refresh their data without a full page reload
            window.dispatchEvent(new CustomEvent('taskCreated', { detail: newTask }));
            
          } catch(e) {
            console.error('Failed to create global task', e);
            alert('An unexpected error occurred.');
          }
        }}
      />
    </>
  );
};
