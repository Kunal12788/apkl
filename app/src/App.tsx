// Build Trigger: Reverted OneSignal integration completely
import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { clearAllDataCaches } from './cache';
import { supabase } from './supabaseClient';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotKeyScreen } from './components/ForgotKeyScreen';
import { StaffDashboardScreen } from './components/StaffDashboardScreen';
import { StaffBillingScreen } from './components/StaffBillingScreen';
import { StaffTasksScreen } from './components/StaffTasksScreen';
import { StaffProfileScreen } from './components/StaffProfileScreen';
import { StaffLedgerScreen } from './components/StaffLedgerScreen';
import { SuperAdminLedgerScreen } from './components/SuperAdminLedgerScreen';
import { SuperAdminDashboardScreen } from './components/SuperAdminDashboardScreen';
import { CollectionStaffDashboardScreen } from './components/CollectionStaffDashboardScreen';
import { CollectionHistoryScreen } from './components/CollectionHistoryScreen';
import { CollectionStaffProfileScreen } from './components/CollectionStaffProfileScreen';
import { CollectionStaffBillingScreen } from './components/CollectionStaffBillingScreen';
import { CollectionStaffTasksScreen } from './components/CollectionStaffTasksScreen';
import { GlobalFAB } from './components/GlobalFAB';
import { GlobalChat } from './components/GlobalChat';
import { playNotificationSound } from './utils/audio';
import { triggerBlueToast } from './components/AppleToast';
import { SessionProvider, useSession } from './context/SessionContext';
import { SessionInitializationScreen } from './components/SessionInitializationScreen';
import { SuperAdminRefineryScreen } from './components/SuperAdminRefineryScreen';
import { SuperAdminStaffScreen } from './components/SuperAdminStaffScreen';
import { SuperAdminWorkScreen } from './components/SuperAdminWorkScreen';
import { SuperAdminStockScreen } from './components/SuperAdminStockScreen';
import { SuperAdminAlertsScreen } from './components/SuperAdminAlertsScreen';
import { SuperAdminCalculatorScreen } from './components/SuperAdminCalculatorScreen';
import { SuperAdminChatMonitorScreen } from './components/SuperAdminChatMonitorScreen';
import { ConfirmAccountScreen } from './components/ConfirmAccountScreen';

const LoginWrapper = () => {
  const navigate = useNavigate();
  return <LoginScreen onForgotKey={() => navigate('/forgot')} onLogin={() => navigate('/dashboard')} />;
};

const DashboardWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;
  
  if (user.role === 'Super Admin') {
    return <SuperAdminDashboardScreen />;
  }
  if (user.role === 'Collection Staff') {
    return <CollectionStaffDashboardScreen />;
  }
  return <StaffDashboardScreen />;
};

const BillingWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Collection Staff') {
    return <CollectionStaffBillingScreen />;
  }
  return <StaffBillingScreen />;
};

const TasksWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Collection Staff') {
    return <CollectionStaffTasksScreen />;
  }
  return <StaffTasksScreen />;
};

const ProfileWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Collection Staff') {
    return <CollectionStaffProfileScreen />;
  }
  return <StaffProfileScreen />;
};

const LedgerWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminLedgerScreen />;
  }
  return <StaffLedgerScreen />;
};

const RefineryWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminRefineryScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const StaffWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminStaffScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const WorkWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminWorkScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const StockWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminStockScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const AlertsWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin' || user.role === 'Admin') {
    return <SuperAdminAlertsScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const CalculatorWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminCalculatorScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const ChatMonitorWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;

  if (user.role === 'Super Admin') {
    return <SuperAdminChatMonitorScreen />;
  }
  return <Navigate to="/dashboard" replace />;
};

const CollectionHistoryWrapper = () => {
  const { user, isFullyAuthenticated } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyAuthenticated) return <SessionInitializationScreen />;
  return <CollectionHistoryScreen />;
};

const ForgotKeyWrapper = () => {
  const navigate = useNavigate();
  return <ForgotKeyScreen onBack={() => navigate(-1)} />;
};

function AppContent() {
  const { user, loading } = useSession();
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!user) return;

    const realtimeChannel = supabase.channel('system_realtime_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload: any) => {
         const newRecord = payload.new;
         const oldRecord = payload.old;
         
         // Invalidate any local screen caches and trigger live re-fetch
         window.dispatchEvent(new CustomEvent('databaseSync'));

         if (newRecord && newRecord.status === 'Approved' && (!oldRecord || oldRecord.status !== 'Approved')) {
            if ((user.role === 'Collection Staff' || user.role === 'Staff') && (newRecord.created_by === user.id || user.role === 'Collection Staff')) {
               triggerBlueToast(`Customer ${newRecord.name} approved! You can now create tasks for them.`, 'Customer Approved', 'success');
            }
         }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload: any) => {
         clearAllDataCaches();
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'transactions', payload } }));
         
         const newRecord = payload.new;
         const oldRecord = payload.old;

         if (payload.eventType === 'INSERT' && newRecord) {
            const creatorText = newRecord.created_by === user.id ? 'You' : `User (${newRecord.created_by})`;
            triggerBlueToast(
              `${creatorText} registered a new ${newRecord.work_type} transaction for ${newRecord.customer_name}.`,
              'Work Creation',
              'task'
            );
         } else if (payload.eventType === 'UPDATE' && newRecord && oldRecord) {
            const wasUnpaid = oldRecord.status === 'Unpaid';
            const isPaid = newRecord.status === 'Paid' || newRecord.status === 'Fully Paid';
            const staffPaidJustNow = newRecord.staff_paid && !oldRecord.staff_paid;
            const colStaffPaidJustNow = newRecord.col_staff_paid && !oldRecord.col_staff_paid;

            if ((wasUnpaid && isPaid) || staffPaidJustNow || colStaffPaidJustNow) {
               let msg = `Payment cleared for ${newRecord.customer_name}: ${newRecord.amount}`;
               if (newRecord.status === 'Fully Paid' || (newRecord.staff_paid && newRecord.col_staff_paid)) {
                 msg = `Payment Fully Cleared: ${newRecord.customer_name} (₹${newRecord.amount})`;
               } else if (staffPaidJustNow) {
                 msg = `Payment approved by Staff: ${newRecord.customer_name} (₹${newRecord.amount})`;
               } else if (colStaffPaidJustNow) {
                 msg = `Payment collected by Field Staff: ${newRecord.customer_name} (₹${newRecord.amount})`;
               }
               triggerBlueToast(msg, 'Payment Received', 'success');
            }
         }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: any) => {
         clearAllDataCaches();
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'tasks', payload } }));

         const newRecord = payload.new;
         const oldRecord = payload.old;

         if (payload.eventType === 'INSERT' && newRecord) {
            const creatorText = newRecord.created_by === user.id ? 'You' : `User (${newRecord.created_by})`;
            triggerBlueToast(
              `${creatorText} created a new ${newRecord.work_type} task for ${newRecord.customer_name}.`,
              'Task Registered',
              'task'
            );
         } else if (payload.eventType === 'UPDATE' && newRecord && oldRecord) {
            const verifiedJustNow = oldRecord.status === 'Pending' && newRecord.status === 'In Progress';
            const processedJustNow = oldRecord.status === 'In Progress' && (newRecord.status === 'Settlement' || newRecord.status === 'Pending');
            const completedJustNow = oldRecord.status !== 'Completed' && newRecord.status === 'Completed';
            const staffPaidJustNow = newRecord.staff_paid && !oldRecord.staff_paid;
            const colStaffPaidJustNow = newRecord.col_staff_paid && !oldRecord.col_staff_paid;

            if (verifiedJustNow) {
               const verifier = newRecord.assigned_to === user.id ? 'You' : 'Staff';
               triggerBlueToast(`Task ${newRecord.id} for ${newRecord.customer_name} has been verified by ${verifier}.`, 'Task Verified', 'success');
            } else if (processedJustNow) {
               triggerBlueToast(`Task ${newRecord.id} for ${newRecord.customer_name} is processed and ready for pricing/settlement.`, 'Task Processed', 'info');
            } else if (completedJustNow) {
               triggerBlueToast(`Task ${newRecord.id} for ${newRecord.customer_name} has been completed successfully.`, 'Task Completed', 'success');
            } else if (staffPaidJustNow || colStaffPaidJustNow) {
               let msg = `Task payment updated for ${newRecord.customer_name}`;
               if (newRecord.staff_paid && newRecord.col_staff_paid) {
                 msg = `Task payment Fully Cleared for ${newRecord.customer_name}`;
               } else if (staffPaidJustNow) {
                 msg = `Task payment approved by Staff: ${newRecord.customer_name}`;
               } else if (colStaffPaidJustNow) {
                 msg = `Task payment collected by Field Staff: ${newRecord.customer_name}`;
               }
               triggerBlueToast(msg, 'Payment Received', 'success');
            }
         }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_allocations' }, (payload: any) => {
         clearAllDataCaches();
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'stock_allocations', payload } }));

         const newRecord = payload.new;
         if (payload.eventType === 'INSERT' && newRecord) {
            const isSelfAllocated = newRecord.allocated_by === user.id;
            const isAllocatedToMe = newRecord.staff_id === user.id;
            const myBranch = user.branch_id && newRecord.branch_id === user.branch_id;
            
            let detailsText = '';
            if (Number(newRecord.pure_weight || 0) > 0) detailsText += `${newRecord.pure_weight}g Pure Metal `;
            if (Number(newRecord.cash_amount || 0) > 0) detailsText += `₹${newRecord.cash_amount} Cash`;

            if (isSelfAllocated) {
               triggerBlueToast(`You successfully allocated stock: ${detailsText}`, 'Stock Allocated', 'allocation');
            } else if (isAllocatedToMe) {
               triggerBlueToast(`You have been allocated stock: ${detailsText}`, 'Stock Allocation Received', 'allocation');
            } else if (myBranch && !newRecord.staff_id) {
               triggerBlueToast(`Your branch received a stock allocation: ${detailsText}`, 'Branch Stock Allocation', 'allocation');
            }
         }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, (payload: any) => {
         clearAllDataCaches();
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'ledger_entries', payload } }));

          const newRecord = payload.new;
          if (payload.eventType === 'INSERT' && newRecord) {
             if (['Exchange', 'Tunch Only', 'Buy', 'Sell'].includes(newRecord.transaction_type)) {
                const isSelf = newRecord.staff_id === user.id;
                const actor = isSelf ? 'You' : `Staff (${newRecord.staff_id})`;
                const actionLabel = newRecord.transaction_type === 'Exchange' ? 'pure metal exchange' : newRecord.transaction_type.toLowerCase();
                triggerBlueToast(
                  `${actor} registered a new ${actionLabel} ledger entry for ${newRecord.customer_name}.`,
                  `${newRecord.transaction_type} Registered`,
                  'task'
                );
             }
          }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deletion_requests' }, (payload: any) => {
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'deletion_requests', payload } }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
         const newMsg = payload.new;
         if (newMsg && newMsg.receiver_id === user.id && !newMsg.is_read) {
            playNotificationSound();
            if (newMsg.type === 'notification') {
               triggerBlueToast(newMsg.content, 'New Notification', 'info');
            } else {
               triggerBlueToast(`New message from user!`, 'Chat Message', 'info');
            }
         }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branch_daily_reports' }, (payload: any) => {
         window.dispatchEvent(new CustomEvent('databaseSync', { detail: { table: 'branch_daily_reports', payload } }));
         
         const newRecord = payload.new;
         if (payload.eventType === 'INSERT' && newRecord) {
            const isSelfSubmitted = newRecord.staff_id === user.id;
            const submitter = isSelfSubmitted ? 'You' : `Staff member (${newRecord.staff_id})`;
            triggerBlueToast(
              `${submitter} submitted the daily report for branch ${newRecord.branch_name}.`,
              'Daily Report Submitted',
              'report'
            );
         }
      })
      .subscribe();

    return () => {
       supabase.removeChannel(realtimeChannel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const checkUnreadOnLogin = async () => {
      try {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);
        
        if (count && count > 0) {
          setTimeout(() => {
            playNotificationSound();
          }, 1500);
        }
      } catch (err) {
        console.error('Error checking unread messages on login:', err);
      }
    };
    
    checkUnreadOnLogin();
  }, [user]);

  const handleComplete = () => {
    setFadeOut(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 500); 
  };

  return (
    <div className="w-full min-h-screen relative bg-background overflow-hidden">
      {showSplash && (
        <div className={`absolute inset-0 z-[100] transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
          <SplashScreen onComplete={handleComplete} />
        </div>
      )}

      {loading ? (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-background text-primary font-body-md">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
          <p className="font-label-caps text-[10px] tracking-widest text-outline">SECURING CONNECTION...</p>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 overflow-y-auto hide-scrollbar">
        <Toaster 
          position="top-center" 
          toastOptions={{
            duration: 1500, // Exactly 1.5 seconds
            style: {
              background: 'rgba(30, 30, 30, 0.65)', // More transparent for better glass effect
              backdropFilter: 'saturate(180%) blur(24px)', // Authentic Apple frosted glass
              WebkitBackdropFilter: 'saturate(180%) blur(24px)',
              color: '#ffffff',
              border: '0.5px solid rgba(255, 255, 255, 0.15)', // Extremely thin, subtle Apple border
              padding: '12px 24px', // Sleeker, more horizontal pill shape
              borderRadius: '9999px',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
              fontSize: '14.5px',
              fontWeight: 600, // Slightly bolder text
              letterSpacing: '-0.3px',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)', // Deep, soft Apple shadow
            },
            success: {
              iconTheme: {
                primary: '#32d74b', // Apple iOS 16 Success Green
                secondary: '#ffffff',
              },
            },
          }}
        />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginWrapper />} />
            <Route path="/forgot" element={<ForgotKeyWrapper />} />
            <Route path="/confirm" element={<ConfirmAccountScreen />} />
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/billing" element={<BillingWrapper />} />
            <Route path="/tasks" element={<TasksWrapper />} />
            <Route path="/collections" element={<CollectionHistoryWrapper />} />
            <Route path="/profile" element={<ProfileWrapper />} />
            <Route path="/ledger" element={<LedgerWrapper />} />
            <Route path="/refinery" element={<RefineryWrapper />} />
            <Route path="/staff" element={<StaffWrapper />} />
            <Route path="/work" element={<WorkWrapper />} />
            <Route path="/stock" element={<StockWrapper />} />
            <Route path="/alerts" element={<AlertsWrapper />} />
            <Route path="/calculator" element={<CalculatorWrapper />} />
            <Route path="/chat-monitor" element={<ChatMonitorWrapper />} />
          </Routes>
          {user && <GlobalFAB />}
          {user && <GlobalChat />}
        </HashRouter>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;
