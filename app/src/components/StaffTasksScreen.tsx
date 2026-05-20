import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TaskReconciliationModal } from './TaskReconciliationModal';
import { supabase } from '../supabaseClient';

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
  isAdminOrSuper?: boolean;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, task, onUpdateStatus, onDeleteTask, isAdminOrSuper = false }) => {
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
              {task.status === 'In Progress' ? 'Complete' : (isAdminOrSuper ? 'Start' : 'Verify')}
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

  const currentUser = localStorage.getItem('user_id') || 'STAFF-001';
  const isAdminOrSuper = currentUser.startsWith('ADMIN-') || currentUser.startsWith('SUPER-');

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
    const loadTasks = async () => {
      try {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        if (data && data.length > 0) {
          let filtered = data;
          if (isAdminOrSuper) {
            filtered = data.filter((t: any) => !t.created_by?.startsWith('COLL-') && t.status !== 'Pending Verification');
          }
          setTasks(filtered.map((t: any) => ({
            id: t.id, customerName: t.customer_name, customerId: t.customer_id, workType: t.work_type, assignedTo: t.assigned_to, status: t.status, progressPercentage: t.progress_percentage,
            impureWeight: t.impure_weight, pureWeight: t.pure_weight, dateGiven: t.date_given, isoDate: t.iso_date, estimatedCompletion: t.estimated_completion, notes: t.notes,
            broughtBy: t.brought_by, source: t.source, pieces: t.pieces, weight: t.weight, purity: t.purity, category: t.category, customerPhone: t.customer_phone, customerAddress: t.customer_address,
            settlementCondition: t.settlement_condition, productType: t.product_type, logoName: t.logo_name, carat: t.carat, pointSuggestion: t.point_suggestion, createdBy: t.created_by
          })));
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };

    loadTasks();
  }, [isAdminOrSuper]);

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

  const handleDeleteTask = async (id: string) => {
    if(window.confirm('Are you sure you want to permanently delete this task?')) {
      try {
        await supabase.from('tasks').delete().eq('id', id);
        setTasks(tasks.filter(t => t.id !== id));
        showToast('Task successfully deleted');
        handleCloseModal();
      } catch(e) {
        console.error(e);
        showToast('Error deleting task');
      }
    }
  };

  const handleVerifySuccess = async (verifiedTask: any) => {
     try {
       await supabase.from('tasks').update({ status: 'Completed', progress_percentage: 100 }).eq('id', verifiedTask.id);
       setTasks(prev => prev.map(t => t.id === verifiedTask.id ? { ...t, status: 'Completed', progressPercentage: 100 } : t));
       setVerificationOpen(false);

       const newTxn = {
         id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
         customer_id: verifiedTask.customerId || 'CUST-COL',
         customer_name: verifiedTask.customerName,
         customer_phone: verifiedTask.customerPhone || '',
         customer_address: verifiedTask.customerAddress || '',
         type: verifiedTask.settlementCondition || 'Cash',
         work_type: verifiedTask.workType || 'Tunch',
         amount: verifiedTask.workType === 'Tunch' ? '45000' : verifiedTask.workType === 'Marking' ? '12000' : '85500',
         date: 'Today',
         iso_date: new Date().toISOString().split('T')[0],
         timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
         status: 'Unpaid',
         details: verifiedTask.notes || 'Collection intake verified and completed.',
         pieces: verifiedTask.pieces || '1',
         product_type: verifiedTask.productType,
         impure_weight: verifiedTask.impureWeight,
         settlement_condition: verifiedTask.settlementCondition,
         logo_name: verifiedTask.logoName,
         carat: verifiedTask.carat,
         point_suggestion: verifiedTask.pointSuggestion,
         created_by: verifiedTask.createdBy || 'COLL-001'
       };

       await supabase.from('transactions').insert([newTxn]);

       showToast('Audit matched! Task verified, completed and billed.');
       handleCloseModal();
     } catch(e) {
       console.error(e);
       showToast('Error verifying task');
     }
  };

  const handleUpdateStatus = async (task: Task) => {
     try {
       if (task.status === 'Pending' || task.status === 'Pending Verification') {
          if (isAdminOrSuper) {
            await supabase.from('tasks').update({ status: 'In Progress', progress_percentage: 40 }).eq('id', task.id);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'In Progress', progressPercentage: 40 } : t));
            showToast('Task started successfully.');
            handleCloseModal();
          } else {
            setCurrentVerificationTask(task);
            setVerificationOpen(true);
          }
       } else if (task.status === 'In Progress') {
          await supabase.from('tasks').update({ status: 'Completed', progress_percentage: 100 }).eq('id', task.id);
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Completed', progressPercentage: 100 } : t));

          const newTxn = {
            id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
            customer_id: task.customerId || 'CUST-COL',
            customer_name: task.customerName,
            customer_phone: task.customerPhone || '',
            customer_address: task.customerAddress || '',
            type: task.settlementCondition || 'Cash',
            work_type: task.workType || 'Tunch',
            amount: task.workType === 'Tunch' ? '45000' : task.workType === 'Marking' ? '12000' : '85500',
            date: 'Today',
            iso_date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'Unpaid',
            details: task.notes || 'Collection intake verified and completed.',
            pieces: task.pieces || '1',
            product_type: task.productType,
            impure_weight: task.impureWeight,
            settlement_condition: task.settlementCondition,
            logo_name: task.logoName,
            carat: task.carat,
            point_suggestion: task.pointSuggestion,
            created_by: task.createdBy || 'COLL-001'
          };

          await supabase.from('transactions').insert([newTxn]);

          showToast('Task marked as Completed! Billing ledger updated.');
          handleCloseModal();
       }
     } catch(e) {
       console.error(e);
       showToast('Error updating task');
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
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (isAdminOrSuper) {
                            handleUpdateStatus(task);
                          } else {
                            setCurrentVerificationTask(task); 
                            setVerificationOpen(true); 
                          }
                        }}
                        className="w-full py-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-secondary/20 transition-colors"
                      >
                         <span className="material-symbols-outlined text-sm">{isAdminOrSuper ? 'play_arrow' : 'rule'}</span>
                         {isAdminOrSuper ? 'START TASK WORK' : 'VERIFY INTAKE DATA'}
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
        isAdminOrSuper={isAdminOrSuper}
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
