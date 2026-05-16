import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type TaskStatus = 'In Progress' | 'Pending' | 'Completed';

interface Task {
  id: string;
  customerName: string;
  customerId: string;
  workType: 'Tunch' | 'Marking' | 'Shouldering';
  assignedTo: string;
  status: TaskStatus;
  progressPercentage: number;
  dateGiven: string;
  isoDate: string;
  estimatedCompletion: string;
  notes: string;
  broughtBy: string;
  pieces: string;
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

export const CollectionStaffTasksScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  const activeTab = (searchParams.get('tab') as TaskStatus) || 'In Progress';

  // These tasks are ONLY the ones created by the Collection Staff
  const [tasks] = useState<Task[]>([
    { id: 'COL-8921', customerName: 'Ramesh Jewelers', customerId: 'CUST-001', workType: 'Tunch', assignedTo: 'Vault-A', status: 'Completed', progressPercentage: 100, dateGiven: 'Today, 09:00 AM', isoDate: '2026-05-15', estimatedCompletion: 'Today, 02:00 PM', broughtBy: 'Collection (Self)', notes: 'Field collection of 12 sample pieces.', pieces: '12' },
    { id: 'COL-8922', customerName: 'Mehta Gold Traders', customerId: 'CUST-002', workType: 'Marking', assignedTo: 'Vault-B', status: 'Pending', progressPercentage: 10, dateGiven: 'Today, 10:30 AM', isoDate: '2026-05-15', estimatedCompletion: 'Tomorrow, 11:00 AM', broughtBy: 'Collection (Self)', notes: '45 necklaces for hallmarking.', pieces: '45' },
    { id: 'COL-8923', customerName: 'Sunrise Ornaments', customerId: 'CUST-003', workType: 'Shouldering', assignedTo: 'Vault-C', status: 'In Progress', progressPercentage: 45, dateGiven: 'Yesterday', isoDate: '2026-05-14', estimatedCompletion: 'Today, 06:00 PM', broughtBy: 'Collection (Self)', notes: '8 broken chains for repair.', pieces: '8' }
  ]);

  const filteredTasks = tasks.filter(t => (activeTab === t.status) && (t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-40 relative">
        <header className="flex justify-between items-start mb-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">My Collections</h1>
            <p className="text-xs text-outline font-medium">Track your field assignments</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary premium-shadow">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
        </header>

        <div className="flex bg-surface-container rounded-full p-1.5 shadow-inner">
          {['In Progress', 'Pending', 'Completed'].map((tab) => (
            <button key={tab} onClick={() => setSearchParams({ tab })} className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white premium-shadow text-primary' : 'text-outline'}`}>{tab}</button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by customer or ID..." className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary luxury-card focus:outline-none" />
          </div>

          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="luxury-card p-4 relative overflow-hidden group border border-outline-variant/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center ${getWorkColor(task.workType)}`}>
                      <span className="material-symbols-outlined text-xl glow-icon">{getWorkIcon(task.workType)}</span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-primary text-[15px]">{task.customerName}</p>
                      <p className="text-[10px] text-outline font-bold tracking-widest uppercase mt-0.5">{task.id} • {task.pieces} Pcs</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${getStatusColor(task.status)}`}>
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
            ))}
            {filteredTasks.length === 0 && (
              <div className="p-8 text-center text-outline text-sm font-medium">No tasks found.</div>
            )}
          </div>
        </div>
      </main>

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
