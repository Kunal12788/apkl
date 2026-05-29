import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

interface CustomerHistory {
  tunchCount: number;
  markingCount: number;
  shoulderingCount: number;
  pureTaken: number;
  dues: number;
  cashTaken: number;
}

export const SuperAdminCustomerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isFullyAuthenticated } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [txData, setTxData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeMetal, setActiveMetal] = useState<'Gold' | 'Silver'>('Gold');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!isFullyAuthenticated) return;
      try {
        const [tasksRes, txRes] = await Promise.all([
          supabase.from('tasks').select('*'),
          supabase.from('transactions').select('*')
        ]);
        
        const tasks = tasksRes.data || [];
        const txs = txRes.data || [];
        
        setTasksData(tasks);
        setTxData(txs);
        
        // Extract unique customers based on ID and Name
        const uniqueCustomersMap = new Map<string, Customer>();
        
        tasks.forEach(t => {
          if (t.customer_name && t.customer_id) {
            if (!uniqueCustomersMap.has(t.customer_id)) {
              uniqueCustomersMap.set(t.customer_id, {
                id: t.customer_id,
                name: t.customer_name,
                phone: t.customer_phone || '',
                address: t.customer_address || ''
              });
            }
          }
        });
        
        // Also check transactions in case they exist there but not in tasks
        txs.forEach(tx => {
          if (tx.customer_name && tx.customer_id) {
            if (!uniqueCustomersMap.has(tx.customer_id)) {
              uniqueCustomersMap.set(tx.customer_id, {
                id: tx.customer_id,
                name: tx.customer_name,
                phone: '',
                address: ''
              });
            }
          }
        });
        
        setCustomers(Array.from(uniqueCustomersMap.values()));
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isFullyAuthenticated]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateHistory = (customerId: string, metal: 'Gold' | 'Silver'): CustomerHistory => {
    // Filter tasks and tx by customer AND metal
    const custTasks = tasksData.filter(t => t.customer_id === customerId && t.metal === metal);
    const custTx = txData.filter(tx => tx.customer_id === customerId && tx.metal === metal);

    const tunchCount = custTasks.filter(t => t.work_type === 'Tunch' || t.work_type === 'TUNCH').length;
    const markingCount = custTasks.filter(t => t.work_type === 'Marking' || t.work_type === 'MARKING').length;
    const shoulderingCount = custTasks.filter(t => t.work_type === 'Shouldering' || t.work_type === 'SHOULDERING').length;
    
    const pureTaken = custTasks.reduce((sum, t) => sum + (Number(t.pure_weight) || 0), 0);
    const dues = custTx.filter(tx => tx.status === 'Pending' || tx.status === 'Due').reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const cashTaken = custTx.filter(tx => tx.type === 'Cash').reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    return {
      tunchCount,
      markingCount,
      shoulderingCount,
      pureTaken,
      dues,
      cashTaken
    };
  };

  return (
    <div className="bg-background text-on-background font-body w-full h-[100svh] relative flex flex-col overflow-hidden">
      <header className="shrink-0 bg-gradient-to-br from-[#003366] to-[#001e40] px-6 pt-8 pb-6 relative shadow-lg z-20">
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md border border-white/10 active:scale-95 transition-transform">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-headline font-bold text-white tracking-wide">Client Directory</h1>
            <p className="text-[10px] font-bold text-[#F6C358] uppercase tracking-widest opacity-90">Corporate Profiles</p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative z-10">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">search</span>
          <input 
            type="text" 
            placeholder="Search by customer name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-primary shadow-lg border-2 border-transparent focus:border-[#F6C358]/50 focus:outline-none transition-all placeholder:text-outline/50"
          />
        </div>
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
      </header>

      <main className="flex-grow overflow-y-auto hide-scrollbar px-4 py-6 pb-32 z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-outline">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-3"></div>
            <p className="text-xs font-bold uppercase tracking-widest">Loading Records...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-40 text-outline opacity-60">
             <span className="material-symbols-outlined text-4xl mb-2">person_search</span>
             <p className="text-xs font-bold uppercase tracking-widest">No Clients Found</p>
           </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2 mb-4">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Directory List</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">{filteredCustomers.length} Found</span>
            </div>
            
            {filteredCustomers.map(customer => (
              <div key={customer.id} className="luxury-card bg-white border border-outline-variant/20 rounded-2xl overflow-hidden transition-all duration-300">
                {/* Header / Basic Info */}
                <div 
                  className={`p-4 flex items-center justify-between cursor-pointer hover:bg-surface-container-lowest transition-colors ${selectedCustomer?.id === customer.id ? 'bg-surface-container-lowest' : ''}`}
                  onClick={() => setSelectedCustomer(selectedCustomer?.id === customer.id ? null : customer)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-black text-lg border border-primary/10 shadow-sm">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold font-headline text-primary">{customer.name}</p>
                      <p className="text-[10px] font-bold text-outline uppercase tracking-wider">{customer.id}</p>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary shadow-sm active:scale-95 transition-transform">
                    <span className={`material-symbols-outlined transition-transform duration-300 ${selectedCustomer?.id === customer.id ? 'rotate-180 text-secondary' : ''}`}>expand_more</span>
                  </button>
                </div>

                {/* Expanded Details View */}
                <div className={`grid transition-all duration-500 ease-in-out ${selectedCustomer?.id === customer.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="p-4 pt-0 border-t border-outline-variant/10">
                      
                      {/* Contact Info */}
                      <div className="flex gap-4 mb-4 mt-4">
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-outline">
                            <span className="material-symbols-outlined text-sm">call</span>
                            <span className="text-xs font-medium">{customer.phone}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-outline">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            <span className="text-xs font-medium truncate max-w-[200px]">{customer.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Premium Metal Selector */}
                      <div className="bg-surface-container-lowest rounded-2xl p-1.5 border border-outline-variant/20 flex gap-1 w-full mb-5">
                        {[
                          { metal: 'Gold', activeClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md' },
                          { metal: 'Silver', activeClass: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-md' }
                        ].map(({ metal, activeClass }) => {
                          const isActive = activeMetal === metal;
                          return (
                            <button
                              key={metal}
                              onClick={(e) => { e.stopPropagation(); setActiveMetal(metal as 'Gold' | 'Silver'); }}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                                isActive ? activeClass : 'bg-transparent text-outline hover:bg-white'
                              }`}
                            >
                              {metal}
                            </button>
                          );
                        })}
                      </div>

                      {/* History Metrics Grid */}
                      {(() => {
                        const history = calculateHistory(customer.id, activeMetal);
                        return (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-1 h-3 rounded-full bg-secondary"></span>
                              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Work History ({activeMetal})</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10 flex flex-col items-center justify-center gap-1">
                                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Tunch</span>
                                <span className="text-lg font-headline font-extrabold text-primary">{history.tunchCount}</span>
                              </div>
                              <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10 flex flex-col items-center justify-center gap-1">
                                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Marking</span>
                                <span className="text-lg font-headline font-extrabold text-primary">{history.markingCount}</span>
                              </div>
                              <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10 flex flex-col items-center justify-center gap-1">
                                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Shoulder</span>
                                <span className="text-lg font-headline font-extrabold text-primary">{history.shoulderingCount}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 mb-2">
                              <span className="w-1 h-3 rounded-full bg-tertiary"></span>
                              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Financials & Stock ({activeMetal})</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                               <div className="luxury-card bg-gradient-to-br from-error/5 to-transparent border border-error/10 rounded-xl p-3 flex justify-between items-center">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-error uppercase tracking-widest mb-1">Pending Dues</span>
                                    <span className="font-headline font-bold text-primary">₹{history.dues.toLocaleString('en-IN')}</span>
                                  </div>
                                  <span className="material-symbols-outlined text-error/40 text-2xl">account_balance_wallet</span>
                               </div>
                               <div className="luxury-card bg-gradient-to-br from-secondary/5 to-transparent border border-secondary/10 rounded-xl p-3 flex justify-between items-center">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-1">Cash Taken</span>
                                    <span className="font-headline font-bold text-primary">₹{history.cashTaken.toLocaleString('en-IN')}</span>
                                  </div>
                                  <span className="material-symbols-outlined text-secondary/40 text-2xl">payments</span>
                               </div>
                               <div className="col-span-2 luxury-card bg-gradient-to-br from-[#003366]/5 to-transparent border border-[#003366]/10 rounded-xl p-3 flex justify-between items-center">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Total Pure Taken</span>
                                    <div className="flex items-baseline gap-1">
                                      <span className="font-headline font-extrabold text-primary text-xl">{history.pureTaken.toFixed(2)}</span>
                                      <span className="text-[10px] font-bold text-outline">gram</span>
                                    </div>
                                  </div>
                                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-outline-variant/20">
                                    <span className={`material-symbols-outlined ${activeMetal === 'Gold' ? 'text-amber-500' : 'text-slate-400'}`}>workspace_premium</span>
                                  </div>
                               </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
