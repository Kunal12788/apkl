import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import { getCachedData, setCachedData } from '../cache';
import { NotificationBell } from './NotificationBell';

type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

interface Task {
  metal: 'Gold' | 'Silver';
  id: string;
  customerName: string;
  customerId: string;
  customerPhone?: string;
  customerAddress?: string;
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  assignedTo: string;
  status: TaskStatus;
  progressPercentage: number;
  dateGiven: string;
  isoDate: string;
  estimatedCompletion: string;
  notes: string;
  broughtBy?: string;
  pieces?: string;
  productType?: string;
  impureWeight?: string;
  pureWeight?: string;
  settlementCondition?: string;
  logoName?: string;
  carat?: string;
  pointSuggestion?: 'Gold' | 'Silver';
  createdBy?: string;
  images?: string[];
  auditImages?: string[];
  createdAt?: string;
  purity?: string;
  wasSettlementCategory?: boolean;
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

const getStatusColor = (status: TaskStatus) => {
  switch(status) {
    case 'Completed': return 'bg-tertiary-container/10 text-tertiary-container border-tertiary-container/20';
    case 'In Progress': return 'bg-secondary-container/10 text-secondary-container border-secondary-container/20';
    case 'Pending': return 'bg-error-container/50 text-error border-error/20';
    default: return 'bg-surface-container text-outline border-outline/20';
  }
};

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onDeleteTask?: (id: string) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, task, onDeleteTask }) => {
  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  };

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
                  <p className={val}>{task.impureWeight}g</p>
                </div>
              )}
              {task.pieces && (
                <div>
                  <span className={lbl}>Pieces</span>
                  <p className={val}>{task.pieces}</p>
                </div>
              )}
              {task.logoName && task.workType === 'Marking' && (
                <div>
                  <span className={lbl}>Logo Markings</span>
                  <p className={val}>{task.logoName}</p>
                </div>
              )}
              {task.carat && task.workType === 'Marking' && (
                <div>
                  <span className={lbl}>Carat</span>
                  <p className={val}>{task.carat.toUpperCase()}</p>
                </div>
              )}
              {task.pointSuggestion && task.workType === 'Shouldering' && (
                <div className="col-span-2">
                  <span className={lbl}>Solder Points</span>
                  <p className={val}>{task.pointSuggestion} Gold/Silver suggested</p>
                </div>
              )}
            </div>
          </div>

          {/* Section: Media/Images */}
          {task.images && task.images.length > 0 && (
            <div className="rounded-2xl border border-outline-variant/15 p-3.5 bg-surface-container-lowest space-y-2">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary mb-1">Attached Media</p>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {task.images.map((imgUrl, i) => (
                  <a key={i} href={imgUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    <div className="w-16 h-16 rounded-xl border border-outline-variant/20 overflow-hidden bg-surface-container">
                      <img src={imgUrl} alt={`Task attachment ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {task.auditImages && task.auditImages.length > 0 && (
            <div className="rounded-2xl border border-secondary/20 p-3.5 bg-secondary/5 space-y-2">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-secondary mb-1">Staff Audit Images ({task.auditImages.length})</p>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {task.auditImages.map((imgUrl, i) => (
                  <a key={i} href={imgUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    <div className="w-16 h-16 rounded-xl border border-secondary/30 overflow-hidden bg-surface-container">
                      <img src={imgUrl} alt={`Audit attachment ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Schedule Card */}
          <div className="rounded-2xl p-4 relative overflow-hidden shadow-md" style={{ background: 'linear-gradient(135deg, #001e40 0%, #003366 100%)', color: '#ffffff' }}>
            <div className="absolute right-0 bottom-0 w-16 h-16 rounded-full blur-lg -mr-4 -mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Intake Date</p>
                {task.dateGiven && task.dateGiven !== 'Just Now' && (
                  <p className="font-headline text-xs font-bold mt-0.5" style={{ color: '#ffffff' }}>{task.dateGiven}</p>
                )}
                {task.createdAt && (
                  <p className="text-[9px] mt-1.5 opacity-85 font-medium flex items-center gap-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span className="material-symbols-outlined text-[10px]">schedule</span>
                    {formatTimestamp(task.createdAt)}
                  </p>
                )}
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#C9A646' }}>Est. Completion</p>
                {task.estimatedCompletion && task.estimatedCompletion !== 'Awaiting Audit' && (
                  <p className="text-xs mt-0.5 font-bold mb-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{task.estimatedCompletion}</p>
                )}
                <p className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 ${
                  task.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' :
                  task.status === 'In Progress' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {task.status}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5 shrink-0 items-center">
          {onDeleteTask && (
            <button 
              onClick={() => onDeleteTask(task.id)}
              className="w-12 h-12 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-2xl transition-all duration-300 active:scale-[0.95] flex items-center justify-center shrink-0 shadow-sm"
              title="Request Deletion"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          )}
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/50 font-black text-xs uppercase tracking-[0.15em] rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-sm"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
};

export const CollectionStaffTasksScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, isFullyAuthenticated } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const activeTab = (searchParams.get('tab') as TaskStatus) || 'Pending';

  // Load tasks from cache synchronously on mount for 0ms delay
  const cachedTasks = getCachedData('tasks_data');
  const currentUser = user?.id || '';
  const initialTasks = cachedTasks
    ? cachedTasks.filter((t: any) => t.created_by === currentUser && !t.staff_submitted_at).map((t: any) => ({
        id: t.id, customerName: t.customer_name, customerId: t.customer_id, customerPhone: t.customer_phone, customerAddress: t.customer_address,
        workType: t.work_type, assignedTo: t.assigned_to, status: t.status, progressPercentage: t.progress_percentage, metal: t.metal || 'Gold',
        dateGiven: t.date_given, isoDate: t.iso_date, estimatedCompletion: t.estimated_completion, notes: t.notes, broughtBy: t.brought_by,
        pieces: t.pieces, productType: t.product_type, impureWeight: t.impure_weight, pureWeight: t.pure_weight, settlementCondition: t.settlement_condition,
        logoName: t.logo_name, carat: t.carat, pointSuggestion: t.point_suggestion, createdBy: t.created_by, images: t.images || [], auditImages: t.audit_images || [],
        createdAt: t.created_at, purity: t.purity
      }))
    : [];

  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleCloseModal = () => setSelectedTask(null);

  useEffect(() => {
    const loadTasks = async () => {
      if (!isFullyAuthenticated) return;
      try {
        const { data, error } = await supabase.from('tasks').select('*').or(`created_by.eq.${currentUser},assigned_to.eq.${currentUser}`).order('created_at', { ascending: false });
        if (error) throw error;
        
        if (data) {
          // Merge tasks back into in-memory cache
          const allTasks = getCachedData('tasks_data') || [];
          const otherTasks = allTasks.filter((t: any) => t.created_by !== currentUser && t.assigned_to !== currentUser);
          setCachedData('tasks_data', [...otherTasks, ...data]);

          const activeTasks = data.filter((t: any) => !t.staff_submitted_at);
          setTasks(activeTasks.map(t => ({
              id: t.id, customerName: t.customer_name, customerId: t.customer_id, customerPhone: t.customer_phone, customerAddress: t.customer_address,
              workType: t.work_type, assignedTo: t.assigned_to, status: t.status, progressPercentage: t.progress_percentage, metal: t.metal || 'Gold',
              dateGiven: t.date_given, isoDate: t.iso_date, estimatedCompletion: t.estimated_completion, notes: t.notes, broughtBy: t.brought_by,
              pieces: t.pieces, productType: t.product_type, impureWeight: t.impure_weight, pureWeight: t.pure_weight, settlementCondition: t.settlement_condition,
              logoName: t.logo_name, carat: t.carat, pointSuggestion: t.point_suggestion, createdBy: t.created_by, images: t.images || [], auditImages: t.audit_images || [],
              createdAt: t.created_at, purity: t.purity, wasSettlementCategory: t.was_settlement_category
          })));
        } else {
          setTasks([]);
        }

      } catch (err) {
        console.error('Error fetching collection tasks:', err);
      }
    };

    loadTasks();

    // Listen for newly created tasks to instantly update the UI without waiting for a database reload
    const handleTaskCreated = (e: any) => {
      const newTask = e.detail;
      if (newTask && newTask.created_by === currentUser) {
        setTasks(prev => {
          const mappedTask = {
              id: newTask.id, customerName: newTask.customer_name, customerId: newTask.customer_id, customerPhone: newTask.customer_phone, customerAddress: newTask.customer_address,
              workType: newTask.work_type, assignedTo: newTask.assigned_to, status: newTask.status, progressPercentage: newTask.progress_percentage, metal: newTask.metal || 'Gold',
              dateGiven: newTask.date_given, isoDate: newTask.iso_date, estimatedCompletion: newTask.estimated_completion, notes: newTask.notes, broughtBy: newTask.brought_by,
              pieces: newTask.pieces, productType: newTask.product_type, impureWeight: newTask.impure_weight, pureWeight: newTask.pure_weight, settlementCondition: newTask.settlement_condition,
              logoName: newTask.logo_name, carat: newTask.carat, pointSuggestion: newTask.point_suggestion, createdBy: newTask.created_by, images: newTask.images || [], auditImages: newTask.audit_images || [],
              createdAt: newTask.created_at, purity: newTask.purity, wasSettlementCategory: newTask.was_settlement_category
          };
          // Avoid duplicates if already fetched
          if (prev.some(t => t.id === mappedTask.id)) return prev;
          return [mappedTask, ...prev];
        });
      }
    };
    
    const handleSync = (e: any) => {
      const detail = e.detail;
      if (detail && detail.payload && detail.table === 'tasks') {
         const payload = detail.payload;
         if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
         } else if (payload.eventType === 'INSERT') {
            loadTasks();
         } else if (payload.eventType === 'UPDATE') {
             const t = payload.new;
             if (t.staff_submitted_at) {
                setTasks(prev => prev.filter(old => old.id !== t.id));
             } else {
                setTasks(prev => prev.map(old => old.id === t.id ? {
                  id: t.id, customerName: t.customer_name, customerId: t.customer_id, customerPhone: t.customer_phone, customerAddress: t.customer_address,
                  workType: t.work_type, assignedTo: t.assigned_to, status: t.status, progressPercentage: t.progress_percentage, metal: t.metal || 'Gold',
                  dateGiven: t.date_given, isoDate: t.iso_date, estimatedCompletion: t.estimated_completion, notes: t.notes, broughtBy: t.brought_by,
                  pieces: t.pieces, productType: t.product_type, impureWeight: t.impure_weight, pureWeight: t.pure_weight, settlementCondition: t.settlement_condition,
                  logoName: t.logo_name, carat: t.carat, pointSuggestion: t.point_suggestion, createdBy: t.created_by, images: t.images || [], auditImages: t.audit_images || [],
                  createdAt: t.created_at, purity: t.purity
                } : old));
             }
          }
      } else {
         loadTasks();
      }
    };
    
    window.addEventListener('taskCreated', handleTaskCreated);
    window.addEventListener('databaseSync', handleSync);
    return () => {
       window.removeEventListener('taskCreated', handleTaskCreated);
       window.removeEventListener('databaseSync', handleSync);
    };
  }, [isFullyAuthenticated, currentUser]);

  const matchesSearch = (t: Task) => t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase());
  
  const filteredTasks = tasks.filter(t => {
     if (activeTab === 'Completed') {
        const isTunch = t.workType === 'Tunch';
        const isOnlyTunch = t.settlementCondition?.toLowerCase().includes('only tunch') || false;
        return t.status === 'Completed' && isTunch && isOnlyTunch && matchesSearch(t);
     }
     return t.status === activeTab && matchesSearch(t);
  });

  const handleDeleteTask = async (id: string) => {
    const reason = window.prompt("Please provide a reason for deleting this task:");
    if (!reason) return;
    try {
      await supabase.from('deletion_requests').insert([{
         item_type: 'Task',
         item_id: id,
         requested_by: user?.id,
         reason: reason,
         status: 'Pending'
      }]);
      setTasks(prev => prev.filter(t => t.id !== id));
      
      // Update cache so switching tabs doesn't show it again before approval
      const cached = getCachedData('tasks_data');
      if (cached) {
         setCachedData('tasks_data', cached.filter((t: any) => t.id !== id));
      }
      
      alert("Deletion request sent to Super Admin.");
      handleCloseModal();
    } catch(e) {
      console.error(e);
      alert("Failed to submit request.");
    }
  };

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-40 relative">
        <header className="flex justify-between items-start mb-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">My Collections</h1>
            <p className="text-xs text-outline font-medium">Track your field assignments</p>
          </div>
          <NotificationBell />
        </header>

        {/* Tab Navigation */}
        <div className="relative flex bg-surface-container rounded-full p-1.5 shadow-inner mb-4 w-full justify-between items-center shrink-0 overflow-hidden">
          {/* Active Tab Highlight Indicator */}
          <div 
            className="absolute top-1.5 bottom-1.5 left-1.5 bg-white rounded-full premium-shadow transition-transform duration-300 ease-out z-0"
            style={{
              width: 'calc(33.333% - 4px)',
              transform: `translateX(${['Pending', 'In Progress', 'Completed'].indexOf(activeTab) * 100}%)`,
            }}
          />
          {[
            { id: 'Pending', label: 'Pending' },
            { id: 'In Progress', label: 'In Progress' },
            { id: 'Completed', label: 'Completed' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { 
                  setSearchQuery(''); 
                  setSearchParams({ tab: tab.id }); 
                }}
                className={`relative flex-1 rounded-full py-2.5 text-center text-[9px] min-[370px]:text-[10px] sm:text-xs font-black uppercase tracking-normal transition-all duration-300 whitespace-nowrap px-1 z-10 ${
                  isActive 
                    ? 'text-primary font-extrabold' 
                    : 'text-outline hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4 animate-fade-in">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by customer or ID..." className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary luxury-card focus:outline-none" />
            </div>

            <div className="space-y-4">
              {filteredTasks.map((task) => {
                return (
                <div key={task.id} onClick={() => setSelectedTask(task)} className={`p-4 relative overflow-hidden group border cursor-pointer active:scale-[0.99] transition-transform luxury-card border-outline-variant/10 bg-white bg-opacity-100`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${getWorkColor(task.workType)}`}>
                        <span className="material-symbols-outlined text-xl glow-icon">{getWorkIcon(task.workType)}</span>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-primary text-[15px]">{task.customerName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] text-outline font-bold tracking-widest uppercase">{task.id} • {task.pieces} Pcs</p>
                          <span className="w-1 h-1 rounded-full bg-outline-variant/40"></span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${task.metal === 'Silver' ? 'bg-slate-100 text-slate-500' : 'bg-orange-50 text-orange-500'}`}>{task.metal}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`whitespace-nowrap text-center px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${getStatusColor(task.status)}`}>
                      {task.status}
                    </div>
                  </div>

                  <div className="space-y-3">
                     <div className="px-1 pt-1">
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-outline mb-1.5">
                           <span>Progress</span>
                           <span className="text-primary">{task.progressPercentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${task.progressPercentage}%` }}></div>
                        </div>
                      </div>
                  </div>
                </div>
              );
              })}
              {filteredTasks.length === 0 && (
                <div className="p-8 text-center text-outline text-sm font-medium">No tasks found.</div>
              )}
            </div>
          </div>

      </main>

      {/* View: Detailed Task Modal */}
      <TaskDetailsModal 
        isOpen={selectedTask !== null} 
        onClose={handleCloseModal} 
        task={selectedTask}
        onDeleteTask={handleDeleteTask}
      />



      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Home</span>
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
        <a onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
