import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';

export const SuperAdminAlertsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [alerts, setAlerts] = useState<any[]>([]);
  
  const fetchAlerts = async () => {
    const { data, error } = await supabase.from('deletion_requests').select(`*, users (name)`).order('created_at', { ascending: false });
    if (!error && data) {
       const formattedAlerts = data.map(req => ({
          id: req.id,
          status: req.status === 'Pending' ? 'unresolved' : 'resolved',
          severity: 'critical',
          type: 'system',
          timestamp: req.created_at,
          title: `Deletion Request: ${req.item_type} ${req.item_id}`,
          description: `Requested by ${req.users?.name || req.requested_by}. Reason: ${req.reason || 'None provided.'}`,
          originalReq: req
       }));
       setAlerts(formattedAlerts);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    const handleSync = (e: any) => {
       const detail = e.detail;
       if (detail && detail.table === 'deletion_requests' && detail.payload) {
          const payload = detail.payload;
          if (payload.eventType === 'INSERT') {
              const newReq = payload.new;
              setAlerts(prev => {
                  if (prev.some(a => a.id === newReq.id)) return prev;
                  const newAlert = {
                      id: newReq.id,
                      status: newReq.status === 'Pending' ? 'unresolved' : 'resolved',
                      severity: 'critical',
                      type: 'system',
                      timestamp: newReq.created_at,
                      title: `Deletion Request: ${newReq.item_type} ${newReq.item_id}`,
                      description: `Requested by ${newReq.requested_by}. Reason: ${newReq.reason || 'None provided.'}`,
                      originalReq: newReq
                  };
                  return [newAlert, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              });
          } else if (payload.eventType === 'UPDATE') {
              const updatedReq = payload.new;
              setAlerts(prev => prev.map(a => a.id === updatedReq.id ? { 
                 ...a, 
                 status: updatedReq.status === 'Pending' ? 'unresolved' : 'resolved' 
              } : a));
          } else if (payload.eventType === 'DELETE') {
              setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
          }
       } else {
          fetchAlerts();
       }
    };

    window.addEventListener('databaseSync', handleSync);
    return () => {
      window.removeEventListener('databaseSync', handleSync);
    };
  }, []);

  // Filter alerts based on selection
  const filteredAlerts = alerts.filter(alert => 
    activeFilter === 'all' ? true : alert.status === activeFilter
  );

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-error/10 text-error border-error/20 ring-error/20';
      case 'high':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20 ring-amber-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20 ring-blue-500/20';
      case 'low':
      default:
        return 'bg-slate-500/10 text-slate-700 border-slate-500/20 ring-slate-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return 'shield_error';
      case 'inventory': return 'inventory_2';
      case 'system': return 'delete_forever';
      case 'staff': return 'badge';
      default: return 'notifications';
    }
  };

  const handleApproveDeletion = async (alert: any) => {
     if (!window.confirm("Approve deletion? This action is irreversible.")) return;
     try {
       const req = alert.originalReq;
       const tableName = req.item_type === 'Transaction' ? 'transactions' : 'tasks';
       
       // Instant UI update
       setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status: 'resolved', title: a.title + ' (Approved)' } : a));
       
       // Instant Cache Update so if Super Admin switches tabs immediately, the data is already gone
       if (tableName === 'tasks') {
          const cachedTasks = getCachedData('tasks_data');
          if (cachedTasks) {
             setCachedData('tasks_data', cachedTasks.filter((t: any) => t.id !== req.item_id));
          }
       } else if (tableName === 'transactions') {
          const cachedTx = getCachedData('tx_data');
          if (cachedTx) {
             setCachedData('tx_data', cachedTx.filter((t: any) => t.id !== req.item_id));
          }
       }
       
       await supabase.from(tableName).delete().eq('id', req.item_id);
       await supabase.from('deletion_requests').update({ status: 'Approved' }).eq('id', req.id);
       
       window.alert("Deletion Approved and executed successfully.");
     } catch(e) {
       console.error(e);
       window.alert("Failed to process deletion.");
     }
  };

  const handleRejectDeletion = async (alert: any) => {
     if (!window.confirm("Reject deletion?")) return;
     try {
       await supabase.from('deletion_requests').update({ status: 'Rejected' }).eq('id', alert.originalReq.id);
       setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status: 'resolved', title: a.title + ' (Rejected)' } : a));
       window.alert("Deletion Rejected.");
     } catch(e) {
       console.error(e);
     }
  };

  return (
    <div className="bg-surface text-on-surface font-body w-full min-h-[100svh] relative overflow-y-auto hide-scrollbar">
      
      {/* App Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary active:scale-95 transition-transform hover:bg-outline-variant/20">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-xl font-bold text-primary leading-tight">System Alerts</h1>
            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Command Center Notifications</p>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 pt-6 pb-24 max-w-5xl mx-auto space-y-6">
        
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border animate-fade-in bg-white border-error/20">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 blur-3xl opacity-10 bg-error"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none"></div>
          
          <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-[12rem] opacity-[0.03] pointer-events-none rotate-[-15deg] text-error">
            campaign
          </span>

          <div className="relative z-10 flex justify-between items-start gap-4 mb-8 border-b border-outline-variant/10 pb-6">
            <div className="flex flex-col">
              <p className="font-label text-[10px] uppercase tracking-[0.2em] font-extrabold mb-1.5 text-error">
                Security Protocol
              </p>
              <h2 className="font-headline font-black text-2xl md:text-3xl text-primary tracking-wide">
                Active Notifications
              </h2>
            </div>
            
            <div className="w-14 h-14 rounded-full flex items-center justify-center border shadow-sm shrink-0 bg-error/10 border-error/20 text-error">
              <span className="material-symbols-outlined text-3xl">
                warning
              </span>
            </div>
          </div>
          
          <div className="relative z-10 w-full">
            <div className="bg-slate-50/50 hover:bg-slate-50 backdrop-blur-md p-4 md:p-6 rounded-2xl border border-outline-variant/20 shadow-sm transition-colors relative overflow-hidden flex items-center justify-between gap-4">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-error opacity-50 transition-opacity"></div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white border border-error/20 shadow-sm shrink-0 text-error">
                  <span className="material-symbols-outlined text-2xl">error</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-outline mb-0.5">Unresolved Alerts</p>
                  <p className="text-xs text-outline/70 font-medium">Require immediate attention</p>
                </div>
              </div>
              
              <div className="flex items-baseline gap-2">
                <p className="font-headline font-black text-4xl tracking-tighter text-error">
                  {alerts.filter(a => a.status === 'unresolved').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-1.5 bg-white rounded-full border border-outline-variant/20 shadow-sm overflow-x-auto hide-scrollbar">
          {['all', 'unresolved', 'resolved'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as any)}
              className={`flex-1 py-2 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeFilter === filter
                  ? 'bg-[#003366] text-white shadow-md'
                  : 'text-outline hover:bg-surface-container'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Alert List */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in bg-white rounded-3xl border border-outline-variant/20">
              <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner relative z-10 border-2 border-white bg-slate-50 text-slate-400 mb-4">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <h3 className="font-headline font-bold text-xl text-primary mb-2">All Clear</h3>
              <p className="text-xs text-outline text-center">No alerts matching this filter.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="luxury-card bg-white rounded-3xl border border-outline-variant/20 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.status === 'resolved' ? 'bg-emerald-500' : 'bg-error'}`}></div>
                
                <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-5 relative z-10">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`font-black text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm border ${getSeverityStyles(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] font-bold text-outline/80 tracking-wider bg-slate-50 px-2 py-1 rounded-full border border-outline-variant/20">
                        {alert.type}
                      </span>
                      <div className="flex items-center gap-1.5 text-outline/80 ml-auto">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span className="text-[10px] font-bold tracking-wider">{new Date(alert.timestamp).toLocaleDateString('en-GB')} {new Date(alert.timestamp).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                    
                    <h4 className="font-headline font-black text-primary text-lg tracking-wide flex items-center gap-2">
                      <span className={`material-symbols-outlined text-xl ${alert.status === 'resolved' ? 'text-emerald-500' : 'text-error'}`}>
                        {getTypeIcon(alert.type)}
                      </span>
                      {alert.title}
                    </h4>
                    <p className="text-sm text-outline/80 font-medium mt-1.5 leading-relaxed">{alert.description}</p>
                  </div>

                  <div className="flex items-center justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/10">
                    {alert.status === 'unresolved' ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleRejectDeletion(alert)}
                          className="bg-surface-container hover:bg-surface-variant text-primary font-bold text-[10px] uppercase tracking-widest py-2 px-4 rounded-xl shadow-sm transition-all active:scale-95">
                          Reject
                        </button>
                        <button 
                          onClick={() => handleApproveDeletion(alert)}
                          className="bg-error hover:bg-error/90 text-white font-bold text-[10px] uppercase tracking-widest py-2 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5">
                          <span>Approve Delete</span>
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-outline bg-surface-container/50 px-3 py-1.5 rounded-lg border border-outline-variant/20">
                        <span className="material-symbols-outlined text-sm">history</span>
                        <span className="font-bold text-[10px] uppercase tracking-widest">Resolved</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
