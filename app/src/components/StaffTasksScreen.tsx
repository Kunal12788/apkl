import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Delivered';

interface Task {
  id: string;
  customerName: string;
  customerId: string;
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  assignedTo: string;
  status: TaskStatus;
  progressPercentage: number;
  impureWeight: string;
  pureWeight: string;
  dateGiven: string;
  estimatedCompletion: string;
  notes: string;
}

export const StaffTasksScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');

  const mockTasks: Task[] = [
    { id: 'TSK-1042', customerName: 'Rajesh Jewelers', customerId: 'CUST-001', workType: 'Tunch', assignedTo: 'Marcus', status: 'In Progress', progressPercentage: 65, impureWeight: '12.45g', pureWeight: '11.20g', dateGiven: 'Today, 09:00 AM', estimatedCompletion: 'Today, 02:00 PM', notes: 'Tunch testing for 5 gold biscuits. Customer requires digital report and physical hallmark.' },
    { id: 'TSK-1043', customerName: 'Mehta Gold Traders', customerId: 'CUST-002', workType: 'Marking', assignedTo: 'Elena', status: 'Pending', progressPercentage: 10, impureWeight: '45.00g', pureWeight: '45.00g', dateGiven: 'Today, 10:30 AM', estimatedCompletion: 'Tomorrow, 11:00 AM', notes: 'Standard hallmarking for 12 necklaces.' },
    { id: 'TSK-1039', customerName: 'Sunrise Ornaments', customerId: 'CUST-003', workType: 'Shouldering', assignedTo: 'Julian', status: 'Completed', progressPercentage: 100, impureWeight: '22.30g', pureWeight: '20.10g', dateGiven: 'Yesterday, 02:00 PM', estimatedCompletion: 'Today, 10:00 AM', notes: 'Chain link repairing. Precision shoulder required on 4 areas.' },
    { id: 'TSK-1038', customerName: 'Kalyan Traders', customerId: 'CUST-004', workType: 'Tunch', assignedTo: 'Marcus', status: 'Delivered', progressPercentage: 100, impureWeight: '500.00g', pureWeight: '462.50g', dateGiven: 'Oct 12, 09:00 AM', estimatedCompletion: 'Oct 12, 05:00 PM', notes: 'Bulk testing of incoming scrap gold.' }
  ];

  const selectedTask = mockTasks.find(t => t.id === taskId) || null;

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
      case 'Delivered': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-surface-container text-outline border-outline/20';
    }
  };

  return (
    <div className="bg-background text-on-background font-body w-full h-[100dvh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-32 relative">
        {/* Header */}
        {!selectedTask && (
          <header className="flex justify-between items-end mb-4">
            <div>
              <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Operational Tasks</h1>
              <p className="text-xs text-outline font-medium">Track workflows and assignments</p>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow relative">
                <span className="material-symbols-outlined text-xl">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse border border-white"></span>
              </button>
            </div>
          </header>
        )}

        {/* View: All Tasks */}
        {!selectedTask && (
          <div className="space-y-4 animate-fade-in">
            {/* Unified Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input type="text" placeholder="Search tasks, customers, or staff..." className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary placeholder-outline focus:outline-none input-sapphire-focus luxury-card transition-all" />
            </div>
            
            {/* Task List */}
            <div className="space-y-4">
              {mockTasks.map((task) => (
                <div key={task.id} onClick={() => setSearchParams({ taskId: task.id })} className="luxury-card p-4 relative overflow-hidden group cursor-pointer hover:bg-surface-bright transition-colors">
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

                    <div className="px-1">
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
            </div>
          </div>
        )}

        {/* View: Detailed Task Modal */}
        {selectedTask && (
          <div className="animate-fade-in space-y-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Tasks
            </button>
            
            <div className="luxury-card overflow-hidden">
              <div className="bg-gradient-to-br from-[#003366] to-[#001e40] p-6 text-white relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-widest ${getStatusColor(selectedTask.status)}`}>
                        {selectedTask.status}
                      </span>
                    </div>
                    <h2 className="font-headline text-3xl font-extrabold text-white">{selectedTask.workType} Work</h2>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mt-1">ID: {selectedTask.id}</p>
                  </div>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20`}>
                    <span className="material-symbols-outlined text-3xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{getWorkIcon(selectedTask.workType)}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
                    <span>Task Progress</span>
                    <span className="text-primary">{selectedTask.progressPercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-secondary rounded-full shadow-[0_0_10px_rgba(0,89,187,0.4)]" 
                      style={{ width: `${selectedTask.progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-t border-b border-outline-variant/20 py-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Source Client</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedTask.customerName}</p>
                    <p className="text-[10px] text-outline mt-0.5">{selectedTask.customerId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Assigned Staff</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center text-[9px] font-bold text-primary">
                        {selectedTask.assignedTo.charAt(0)}
                      </div>
                      <p className="font-headline text-sm font-bold text-primary">{selectedTask.assignedTo}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Given At</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedTask.dateGiven}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Est. Completion</p>
                    <p className="font-headline text-sm font-bold text-primary">{selectedTask.estimatedCompletion}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Impure Gold In</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-headline text-lg font-bold text-[#755b00]">{selectedTask.impureWeight}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-1">Pure Gold Out</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-headline text-lg font-bold text-primary">{selectedTask.pureWeight}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-2">Task Notes / Instructions</p>
                  <div className="bg-surface-container/30 rounded-xl p-4 border border-outline-variant/20">
                    <p className="text-xs text-primary leading-relaxed font-medium">{selectedTask.notes}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="py-4 rounded-2xl bg-white border border-outline-variant/30 text-primary font-bold text-sm tracking-wide premium-shadow active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">edit</span> Edit Task
              </button>
              <button className="py-4 rounded-2xl bg-primary text-white font-bold text-sm tracking-wide premium-shadow active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                Update Status <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FAB - Global Plus Icon */}
      <button className="fixed bottom-28 right-8 w-16 h-16 bg-primary text-on-primary rounded-full shadow-[0_8px_30px_rgb(0,30,64,0.4)] backdrop-blur-sm flex items-center justify-center active:scale-95 transition-all z-50 border-2 border-white/10">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

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
        <a className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
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
