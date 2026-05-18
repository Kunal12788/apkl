import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TaskReconciliationModal } from './TaskReconciliationModal';

type TaskStatus = 'In Progress' | 'Pending' | 'Completed';

interface Task {
  id: string;
  customerName: string;
  customerId: string;
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  assignedTo: string;
  status: TaskStatus | 'Pending Verification';
  progressPercentage: number;
  impureWeight?: string;
  pureWeight?: string;
  dateGiven: string;
  isoDate: string;
  estimatedCompletion: string;
  notes: string;
  broughtBy: string;
  source?: string;
  pieces?: string;
  weight?: string;
  purity?: string;
  category?: string;
  customerPhone?: string;
  customerAddress?: string;
  settlementCondition?: string;
  productType?: string;
  logoName?: string;
  carat?: string;
  pointSuggestion?: string;
  createdBy?: string;
}

const getWorkIcon = (workType: string) => {
  switch(workType) {
    case 'Tunch': return 'science';
    case 'Marking': return 'verified';
    case 'Shouldering': return 'precision_manufacturing';
    default: return 'work';
  }
};

const getWorkColor = (workType: string) => {
  switch(workType) {
    case 'Tunch': return 'text-tertiary bg-tertiary-fixed/30';
    case 'Marking': return 'text-secondary bg-secondary-fixed/30';
    case 'Shouldering': return 'text-primary bg-primary-fixed/30';
    default: return 'text-outline bg-surface-container';
  }
};

const getStatusColor = (status: string) => {
  switch(status) {
    case 'Completed': return 'bg-tertiary-container/10 text-tertiary-container border-tertiary-container/20';
    case 'In Progress': return 'bg-secondary-container/10 text-secondary-container border-secondary-container/20';
    case 'Pending': return 'bg-error-container/50 text-error border-error/20';
    case 'Pending Verification': return 'bg-secondary/10 text-secondary border-secondary/20 animate-pulse';
    default: return 'bg-surface-container text-outline border-outline/20';
  }
};

const FilterChip = ({ label, icon, value, searchQuery, setSearchQuery }: { label: string, icon: string, value: string, searchQuery: string, setSearchQuery: (val: string) => void }) => {
  const isActive = searchQuery.toLowerCase() === value.toLowerCase();
  return (
    <div onClick={() => setSearchQuery(isActive ? '' : value)} className={`flex items-center gap-1.5 border rounded-full px-4 py-2 flex-shrink-0 premium-shadow cursor-pointer transition-colors ${isActive ? 'bg-primary border-primary text-white' : 'bg-white border-outline-variant/30 text-primary hover:bg-surface-bright'}`}>
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
};

const SearchAndFilterSection = ({ 
  placeholder = "Search...", 
  searchQuery, setSearchQuery,
  startDate, setStartDate,
  endDate, setEndDate
}: { 
  placeholder?: string,
  searchQuery: string, setSearchQuery: (v: string) => void,
  startDate: string, setStartDate: (v: string) => void,
  endDate: string, setEndDate: (v: string) => void
}) => (
  <div className="space-y-4 mb-4">
    <div className="relative">
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
      <input 
        type="text" 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-10 text-sm font-medium text-primary placeholder-outline focus:outline-none input-sapphire-focus luxury-card transition-all" 
      />
      {searchQuery && (
        <span onClick={() => setSearchQuery('')} className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline text-lg cursor-pointer hover:text-primary">close</span>
      )}
    </div>
    
    <div className="flex items-center gap-2">
      <div className="flex-1 relative mt-1 group">
        <span className="text-[8px] absolute -top-2 left-3 bg-background px-1.5 text-outline font-bold uppercase tracking-widest z-10 rounded-sm">From Date</span>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/50 text-[16px] pointer-events-none group-focus-within:text-primary transition-colors">calendar_month</span>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white border border-outline-variant/50 rounded-xl py-3 pl-9 pr-3 text-xs font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 premium-shadow transition-all" 
          />
        </div>
      </div>
      <div className="flex-1 relative mt-1 group">
        <span className="text-[8px] absolute -top-2 left-3 bg-background px-1.5 text-outline font-bold uppercase tracking-widest z-10 rounded-sm">To Date</span>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/50 text-[16px] pointer-events-none group-focus-within:text-primary transition-colors">calendar_month</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white border border-outline-variant/50 rounded-xl py-3 pl-9 pr-3 text-xs font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 premium-shadow transition-all" 
          />
        </div>
      </div>
      {(startDate || endDate) && (
        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="w-10 h-10 mt-1 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0 border border-error/20 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
    
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-2 px-2">
      <FilterChip label="Tunch" icon="science" value="Tunch" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="Marking" icon="verified" value="Marking" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="Shouldering" icon="precision_manufacturing" value="Shouldering" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="By Staff" icon="badge" value="Staff" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <FilterChip label="By Customer" icon="person" value="Customer" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
    </div>
  </div>
);

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdateStatus: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, task, onUpdateStatus, onDeleteTask }) => {
  if (!isOpen || !task) return null;

  const lbl = "text-[9px] font-bold uppercase tracking-wider text-outline mb-0.5 block";
  const val = "text-xs font-bold text-primary truncate";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001e40]/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,30,64,0.25)] relative z-10 border border-outline-variant/10 animate-modal-up flex flex-col justify-between overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-headline text-base font-extrabold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">assignment_turned_in</span>
              {task.id} Details
            </h3>
            <p className="text-[9px] text-outline font-bold uppercase tracking-widest mt-0.5">Assigned Facility: {task.assignedTo}</p>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
            task.status === 'Completed' ? 'bg-tertiary/10 text-tertiary border-tertiary/20' : 
            task.status === 'In Progress' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
            'bg-error/10 text-error border-error/20'
          }`}>
            {task.status}
          </span>
        </div>

        {/* Unified Clean Details Container */}
        <div className="space-y-3">
          
          {/* Section 1: Customer Profile */}
          <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#C9A646] mb-1">Entity Profile</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className={lbl}>Name</span>
                <p className={val}>{task.customerName}</p>
              </div>
              {task.customerPhone && (
                <div>
                  <span className={lbl}>Phone</span>
                  <p className={val}>{task.customerPhone}</p>
                </div>
              )}
              {task.customerAddress && (
                <div className="col-span-2">
                  <span className={lbl}>Address</span>
                  <p className={val}>{task.customerAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Work Specifications */}
          <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary mb-1">Work Specifications</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              <div>
                <span className={lbl}>Operation</span>
                <p className={`${val} uppercase text-secondary`}>{task.workType}</p>
              </div>
              
              {task.productType && (
                <div>
                  <span className={lbl}>Category</span>
                  <p className={val}>{task.productType}</p>
                </div>
              )}
              {task.impureWeight && (
                <div>
                  <span className={lbl}>Weight</span>
                  <p className={val}>{task.impureWeight}</p>
                </div>
              )}
              {task.pieces && (
                <div>
                  <span className={lbl}>Pieces</span>
                  <p className={val}>{task.pieces}</p>
                </div>
              )}
              {task.settlementCondition && (
                <div>
                  <span className={lbl}>Settlement Mode</span>
                  <p className={val}>{task.settlementCondition}</p>
                </div>
              )}
              {task.logoName && (
                <div>
                  <span className={lbl}>Logo Markings</span>
                  <p className={val}>{task.logoName}</p>
                </div>
              )}
              {task.carat && (
                <div>
                  <span className={lbl}>Carat</span>
                  <p className={val}>{task.carat.toUpperCase()}</p>
                </div>
              )}
              {task.pointSuggestion && (
                <div className="col-span-2">
                  <span className={lbl}>Solder Points</span>
                  <p className={val}>{task.pointSuggestion} Gold/Silver suggested</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Schedule Card */}
          <div className="rounded-2xl p-4 relative overflow-hidden shadow-md" style={{ background: 'linear-gradient(135deg, #001e40 0%, #003366 100%)', color: '#ffffff' }}>
            <div className="absolute right-0 bottom-0 w-16 h-16 rounded-full blur-lg -mr-4 -mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Intake Date</p>
                <p className="font-headline text-xs font-bold mt-0.5" style={{ color: '#ffffff' }}>{task.dateGiven}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#C9A646' }}>Est. Completion</p>
                <p className="text-xs mt-0.5 font-bold" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{task.estimatedCompletion}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 shrink-0">
          {task.status !== 'Completed' && (
            <button 
              onClick={() => onUpdateStatus(task)}
              className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {task.status === 'In Progress' ? 'Complete' : 'Verify'}
            </button>
          )}
          <button 
            onClick={() => onDeleteTask(task.id)}
            className="px-3 py-2.5 bg-error/10 hover:bg-error/25 text-error font-bold text-xs rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center"
            title="Delete Task"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-container hover:bg-surface-variant text-primary font-bold text-xs uppercase tracking-widest rounded-xl transition-colors active:scale-[0.98]"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
};

export const StaffTasksScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeTab = (searchParams.get('tab') as TaskStatus) || 'In Progress';
  const [toastMessage, setToastMessage] = useState('');
  
  const [isVerificationOpen, setVerificationOpen] = useState(false);
  const [currentVerificationTask, setCurrentVerificationTask] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadTasks = () => {
      const defaultTasks: Task[] = [
        { id: 'TSK-1042', customerName: 'Rajesh Jewelers', customerId: 'CUST-001', workType: 'Tunch', assignedTo: 'Marcus', status: 'In Progress', progressPercentage: 65, impureWeight: '12.45g', pureWeight: '11.20g', dateGiven: 'Today, 09:00 AM', isoDate: '2026-05-15', estimatedCompletion: 'Today, 02:00 PM', broughtBy: 'Staff (Elena)', notes: 'Tunch testing for 5 gold biscuits. Customer requires digital report and physical hallmark.' },
        { id: 'TSK-1043', customerName: 'Mehta Gold Traders', customerId: 'CUST-002', workType: 'Marking', assignedTo: 'Elena', status: 'Pending', progressPercentage: 10, impureWeight: '45.00g', pureWeight: '45.00g', dateGiven: 'Today, 10:30 AM', isoDate: '2026-05-15', estimatedCompletion: 'Tomorrow, 11:00 AM', broughtBy: 'Customer directly', notes: 'Standard hallmarking for 12 necklaces.' },
        { id: 'TSK-1039', customerName: 'Sunrise Ornaments', customerId: 'CUST-003', workType: 'Shouldering', assignedTo: 'Julian', status: 'Completed', progressPercentage: 100, impureWeight: '22.30g', pureWeight: '20.10g', dateGiven: 'Yesterday, 02:00 PM', isoDate: '2026-05-14', estimatedCompletion: 'Today, 10:00 AM', broughtBy: 'Staff (Marcus)', notes: 'Chain link repairing. Precision shoulder required on 4 areas.' },
        { id: 'TSK-1038', customerName: 'Kalyan Traders', customerId: 'CUST-004', workType: 'Tunch', assignedTo: 'Marcus', status: 'Completed', progressPercentage: 100, impureWeight: '500.00g', pureWeight: '462.50g', dateGiven: 'Oct 12, 09:00 AM', isoDate: '2025-10-12', estimatedCompletion: 'Oct 12, 05:00 PM', broughtBy: 'Customer directly', notes: 'Bulk testing of incoming scrap gold.' },
        { id: 'TSK-1044', customerName: 'Rajesh Jewelers', customerId: 'CUST-001', workType: 'Shouldering', assignedTo: 'Julian', status: 'In Progress', progressPercentage: 40, dateGiven: 'Today, 11:30 AM', isoDate: '2026-05-15', estimatedCompletion: 'Today, 06:00 PM', broughtBy: 'Staff (Elena)', notes: 'Soldering 14 joints on custom bracelet.' }
      ];

      const sharedRaw = localStorage.getItem('AURORA_SHARED_TASKS');
      let sharedTasks: Task[] = [];
      if (sharedRaw) {
        try {
          const parsed = JSON.parse(sharedRaw);
          sharedTasks = parsed.map((t: any) => ({
            id: t.id,
            customerName: t.customerName,
            customerId: t.logoName || 'CUST-COL',
            workType: (t.category ? t.category.charAt(0) + t.category.slice(1).toLowerCase() : 'Tunch') as any,
            assignedTo: t.assignedTo || 'Pending',
            status: t.status || 'Pending',
            progressPercentage: t.progressPercentage || 0,
            dateGiven: t.dateGiven || 'Just Now',
            isoDate: t.isoDate || new Date().toISOString().split('T')[0],
            estimatedCompletion: t.estimatedCompletion || 'Awaiting Audit',
            notes: t.notes || '',
            pieces: t.pieces || '1',
            productType: t.productType || 'Jewellery',
            impureWeight: t.impureWeight || '',
            settlementCondition: t.settlementCondition || '',
            createdBy: t.createdBy,
            pointSuggestion: t.pointSuggestion,
            logoName: t.logoName,
            carat: t.carat,
            customerPhone: t.customerPhone,
            customerAddress: t.customerAddress,
            broughtBy: t.broughtBy || 'Collection Staff'
          }));
        } catch (e) {}
      }

      // Merge: priority to shared tasks over default tasks if IDs overlap
      const merged = [...sharedTasks];
      defaultTasks.forEach(dt => {
        if (!merged.some(mt => mt.id === dt.id)) {
          merged.push(dt);
        }
      });

      setTasks(merged);
    };

    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedTask = tasks.find(t => t.id === taskId) || null;

  const handleCloseModal = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('taskId');
    setSearchParams(newParams);
  };

  const matchesSearch = (task: Task) => {
    let matchesText = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesText = Boolean(
        task.customerName.toLowerCase().includes(q) ||
        task.id.toLowerCase().includes(q) ||
        task.workType.toLowerCase().includes(q) ||
        task.assignedTo.toLowerCase().includes(q) ||
        task.broughtBy.toLowerCase().includes(q) ||
        task.notes.toLowerCase().includes(q)
      );
    }

    let matchesDate = true;
    if (startDate && task.isoDate < startDate) matchesDate = false;
    if (endDate && task.isoDate > endDate) matchesDate = false;

    return matchesText && matchesDate;
  };

  const filteredTasks = tasks.filter(t => {
     if (activeTab === 'Pending') {
        return (t.status === 'Pending' || t.status === 'Pending Verification') && matchesSearch(t);
     }
     return t.status === activeTab && matchesSearch(t);
  });

  const handleDeleteTask = (id: string) => {
    if(window.confirm('Are you sure you want to permanently delete this task?')) {
      // Delete from local tasks
      setTasks(tasks.filter(t => t.id !== id));
      
      // Delete from shared tasks
      const sharedRaw = localStorage.getItem('AURORA_SHARED_TASKS');
      if (sharedRaw) {
        try {
          const parsed = JSON.parse(sharedRaw);
          const filtered = parsed.filter((t: any) => t.id !== id);
          localStorage.setItem('AURORA_SHARED_TASKS', JSON.stringify(filtered));
          localStorage.setItem('AURORA_COLLECTIONS', JSON.stringify(filtered));
        } catch (e) {}
      }

      showToast('Task successfully deleted');
      handleCloseModal();
    }
  };

  const handleVerifySuccess = (verifiedTask: any) => {
     setTasks(prev => prev.map(t => t.id === verifiedTask.id ? { ...t, status: 'Completed', progressPercentage: 100 } : t));
     setVerificationOpen(false);

     // Update status in shared tasks database
     const sharedRaw = localStorage.getItem('AURORA_SHARED_TASKS');
     if (sharedRaw) {
       try {
         const parsed = JSON.parse(sharedRaw);
         const updated = parsed.map((t: any) => {
           if (t.id === verifiedTask.id) {
             return { ...t, status: 'Completed', progressPercentage: 100 };
           }
           return t;
         });
         localStorage.setItem('AURORA_SHARED_TASKS', JSON.stringify(updated));
         localStorage.setItem('AURORA_COLLECTIONS', JSON.stringify(updated));
       } catch (e) {}
     }

     const rawTxns = localStorage.getItem('AURORA_SHARED_TRANSACTIONS');
     let txns: any[] = [];
     if (rawTxns) {
       try {
         txns = JSON.parse(rawTxns);
       } catch (e) {}
     }

     const newTxn = {
       id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
       customerId: verifiedTask.customerId || 'CUST-COL',
       customerName: verifiedTask.customerName,
       customerPhone: verifiedTask.customerPhone || '',
       customerAddress: verifiedTask.customerAddress || '',
       type: verifiedTask.settlementCondition || 'Cash',
       workType: verifiedTask.workType || 'Tunch',
       amount: verifiedTask.workType === 'Tunch' ? '45,000' : verifiedTask.workType === 'Marking' ? '12,000' : '85,500',
       date: 'Today',
       isoDate: new Date().toISOString().split('T')[0],
       timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
       status: 'Unpaid',
       details: verifiedTask.notes || 'Collection intake verified and completed.',
       pieces: verifiedTask.pieces || '1',
       productType: verifiedTask.productType,
       impureWeight: verifiedTask.impureWeight,
       settlementCondition: verifiedTask.settlementCondition,
       logoName: verifiedTask.logoName,
       carat: verifiedTask.carat,
       pointSuggestion: verifiedTask.pointSuggestion,
       createdBy: verifiedTask.createdBy || 'COLL-001'
     };

     localStorage.setItem('AURORA_SHARED_TRANSACTIONS', JSON.stringify([newTxn, ...txns]));

     showToast('Audit matched! Task verified, completed and billed.');
     handleCloseModal();
  };

  const handleUpdateStatus = (task: Task) => {
     if (task.status === 'Pending' || task.status === 'Pending Verification') {
        setCurrentVerificationTask(task);
        setVerificationOpen(true);
     } else if (task.status === 'In Progress') {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Completed', progressPercentage: 100 } : t));
        
        const sharedRaw = localStorage.getItem('AURORA_SHARED_TASKS');
        if (sharedRaw) {
          try {
            const parsed = JSON.parse(sharedRaw);
            const updated = parsed.map((t: any) => {
              if (t.id === task.id) {
                return { ...t, status: 'Completed', progressPercentage: 100 };
              }
              return t;
            });
            localStorage.setItem('AURORA_SHARED_TASKS', JSON.stringify(updated));
            localStorage.setItem('AURORA_COLLECTIONS', JSON.stringify(updated));
          } catch (e) {}
        }

        const rawTxns = localStorage.getItem('AURORA_SHARED_TRANSACTIONS');
        let txns: any[] = [];
        if (rawTxns) {
          try {
            txns = JSON.parse(rawTxns);
          } catch (e) {}
        }

        const newTxn = {
          id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
          customerId: task.customerId || 'CUST-COL',
          customerName: task.customerName,
          customerPhone: task.customerPhone || '',
          customerAddress: task.customerAddress || '',
          type: task.settlementCondition || 'Cash',
          workType: task.workType || 'Tunch',
          amount: task.workType === 'Tunch' ? '45,000' : task.workType === 'Marking' ? '12,000' : '85,500',
          date: 'Today',
          isoDate: new Date().toISOString().split('T')[0],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Unpaid',
          details: task.notes || 'Collection intake verified and completed.',
          pieces: task.pieces || '1',
          productType: task.productType,
          impureWeight: task.impureWeight,
          settlementCondition: task.settlementCondition,
          logoName: task.logoName,
          carat: task.carat,
          pointSuggestion: task.pointSuggestion,
          createdBy: task.createdBy || 'COLL-001'
        };

        localStorage.setItem('AURORA_SHARED_TRANSACTIONS', JSON.stringify([newTxn, ...txns]));

        showToast('Task marked as Completed! Billing ledger updated.');
        handleCloseModal();
     }
  };

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-32 relative">
        {/* Header */}
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Operational Tasks</h1>
            <p className="text-xs text-outline font-medium">Track workflows and assignments</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative">
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse border border-white"></span>
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex bg-surface-container rounded-full p-1.5 shadow-inner mb-2">
          <button 
            onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setSearchParams({ tab: 'In Progress' }); }}
            className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'In Progress' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
          >
            In Progress
          </button>
          <button 
            onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setSearchParams({ tab: 'Pending' }); }}
            className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'Pending' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
          >
            Pending
          </button>
          <button 
            onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setSearchParams({ tab: 'Completed' }); }}
            className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'Completed' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
          >
            Completed
          </button>
        </div>

        {/* View: All Tasks */}
        <div className="space-y-4 animate-fade-in">
            <SearchAndFilterSection 
              placeholder="Search tasks, staff, customer..." 
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
            />
            
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div key={task.id} onClick={() => setSearchParams({ taskId: task.id, tab: activeTab })} className="luxury-card p-4 relative overflow-hidden group cursor-pointer hover:bg-surface-bright transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${getWorkColor(task.workType)}`}>
                        <span className="material-symbols-outlined text-xl glow-icon">{getWorkIcon(task.workType)}</span>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-primary text-[15px]">{task.workType} Work</p>
                        <p className="text-[10px] text-outline font-bold tracking-widest uppercase mt-0.5">{task.id}</p>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${getStatusColor(task.status)}`}>
                      {task.status}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-surface-container/50 rounded-xl p-3 border border-outline-variant/10">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-sm">groups</span>
                        <div>
                          <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Client</p>
                          <p className="text-xs font-bold text-primary truncate max-w-[120px]">{task.customerName}</p>
                        </div>
                      </div>
                      <div className="h-6 w-px bg-outline-variant/30"></div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-sm">badge</span>
                        <div>
                          <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Assigned</p>
                          <p className="text-xs font-bold text-primary">{task.assignedTo}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-1 text-[11px] font-medium text-outline">
                      <span className="material-symbols-outlined text-[14px]">directions_walk</span>
                      <span>Brought by: <strong className="text-primary">{task.broughtBy}</strong></span>
                    </div>

                    {(task.status === 'Pending' || task.status === 'Pending Verification') && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentVerificationTask(task); setVerificationOpen(true); }}
                        className="w-full py-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-secondary/20 transition-colors"
                      >
                         <span className="material-symbols-outlined text-sm">rule</span>
                         VERIFY INTAKE DATA
                      </button>
                    )}

                    <div className="px-1 pt-1">
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5">
                        <span>Progress</span>
                        <span className="text-primary">{task.progressPercentage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${task.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <div className="p-8 text-center text-outline text-sm font-medium">No tasks found.</div>
              )}
            </div>
          </div>

        <TaskReconciliationModal 
           isOpen={isVerificationOpen}
           onClose={() => setVerificationOpen(false)}
           collectionTask={currentVerificationTask}
           onVerified={handleVerifySuccess}
        />

      {/* View: Detailed Task Modal */}
      <TaskDetailsModal 
        isOpen={selectedTask !== null} 
        onClose={handleCloseModal} 
        task={selectedTask}
        onUpdateStatus={handleUpdateStatus}
        onDeleteTask={handleDeleteTask}
      />
        
        {/* Toast Notification System */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in w-11/12 max-w-sm">
            <div className="bg-[#003366] text-white py-3.5 px-5 rounded-2xl shadow-[0_10px_40px_rgba(0,51,102,0.3)] flex items-center gap-3 border border-white/10">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-sm">notifications_active</span>
              </div>
              <span className="font-bold text-[13px] tracking-wide flex-1">{toastMessage}</span>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
        </a>
        <a onClick={() => navigate('/billing')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
        </a>
        <a onClick={() => navigate('/tasks')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
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
