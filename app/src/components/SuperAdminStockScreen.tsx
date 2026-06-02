import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../cache';

interface StockEntry {
  id: string;
  date: string;
  isoDate: string;
  type: string;
  branchName?: string;
  pureGoldChange: number;
  impureGoldChange: number;
  pureSilverChange: number;
  impureSilverChange: number;
  details: string;
  createdAt: string;
}

const mapDbToSaEntry = (db: any): StockEntry => ({
  id: db.id,
  date: db.date,
  isoDate: db.iso_date,
  type: db.type,
  branchName: db.branch_name,
  pureGoldChange: Number(db.pure_gold_change || 0),
  impureGoldChange: Number(db.impure_gold_change || 0),
  pureSilverChange: Number(db.pure_silver_change || 0),
  impureSilverChange: Number(db.impure_silver_change || 0),
  details: db.details,
  createdAt: db.created_at
});

export const SuperAdminStockScreen: React.FC = () => {
  const navigate = useNavigate();

  const cachedSaLedger = getCachedData('super_admin_ledger_all');
  const initialLedger = cachedSaLedger ? cachedSaLedger.map(mapDbToSaEntry) : [];

  const [ledger, setLedger] = useState<StockEntry[]>(initialLedger);
  const [loading, setLoading] = useState<boolean>(cachedSaLedger === null);
  const [activeMetal, setActiveMetal] = useState<'Gold' | 'Silver'>('Gold');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('super_admin_ledger')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setCachedData('super_admin_ledger_all', data);
          setLedger(data.map(mapDbToSaEntry));
        }
      } catch (err) {
        console.error('Error fetching stock data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getFilteredEntries = () => {
    return ledger.filter(entry => {
      if (activeMetal === 'Gold') {
        return Math.abs(entry.pureGoldChange) > 0 || Math.abs(entry.impureGoldChange) > 0;
      } else {
        return Math.abs(entry.pureSilverChange) > 0 || Math.abs(entry.impureSilverChange) > 0;
      }
    });
  };

  const getStockTotals = () => {
    const pureGold = ledger.reduce((sum, e) => sum + e.pureGoldChange, 0);
    const impureGold = ledger.reduce((sum, e) => sum + e.impureGoldChange, 0);
    const pureSilver = ledger.reduce((sum, e) => sum + e.pureSilverChange, 0);
    const impureSilver = ledger.reduce((sum, e) => sum + e.impureSilverChange, 0);
    return { pureGold, impureGold, pureSilver, impureSilver };
  };

  const totals = getStockTotals();
  const currentEntries = getFilteredEntries();

  if (loading) {
    return (
      <div className="bg-background text-on-background font-body-md min-h-[100svh] flex flex-col items-center justify-center ambient-bg relative z-10 w-full overflow-hidden">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
        <p className="font-label-caps text-[10px] tracking-widest text-outline">Retrieving Vault Inventory...</p>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body w-full min-h-[100svh] relative overflow-y-auto hide-scrollbar ambient-bg">
      <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-outline-variant/20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary active:scale-95 transition-transform hover:bg-outline-variant/20">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-xl font-bold text-primary leading-tight">Vault Inventory</h1>
            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Detailed Stock History</p>
          </div>
        </div>
      </header>

      <main className="px-6 pt-6 pb-24 max-w-5xl mx-auto space-y-6">
        
        {/* Metal Tabs */}
        <div className="bg-white rounded-3xl p-2 border border-outline-variant/20 shadow-md flex flex-col sm:flex-row gap-2 w-full animate-fade-in relative z-10 overflow-hidden">
          {[
            {
              metal: 'Gold',
              icon: 'workspace_premium',
              symbol: 'Au',
              sub: '24K / 22K',
              activeClass: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
            },
            {
              metal: 'Silver',
              icon: 'workspace_premium',
              symbol: 'Ag',
              sub: '99.9% fine',
              activeClass: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/20'
            }
          ].map(({ metal, icon, symbol, sub, activeClass }) => {
            const isActive = activeMetal === metal;
            return (
              <button
                key={metal}
                onClick={() => setActiveMetal(metal as 'Gold' | 'Silver')}
                className={`flex-1 flex items-center justify-between p-3 rounded-2xl transition-all duration-300 overflow-hidden ${
                  isActive 
                    ? `${activeClass} font-bold scale-[1.02] z-10 ring-2 ring-offset-2 ${metal === 'Gold' ? 'ring-amber-500' : 'ring-slate-400'}`
                    : 'bg-[#003366]/5 text-outline hover:bg-[#003366]/10 hover:text-primary z-0'
                }`}
              >
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20' : 'bg-white border border-outline-variant/20 shadow-sm'}`}>
                    <span className={`material-symbols-outlined text-xl ${isActive ? 'text-white' : metal === 'Gold' ? 'text-amber-500' : 'text-slate-400'}`}>
                      {icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[9px] font-black uppercase tracking-wider truncate ${isActive ? 'text-white/80' : 'text-outline'}`}>{sub}</p>
                    <p className={`text-sm md:text-base font-bold font-headline tracking-wide truncate ${isActive ? 'text-white' : 'text-on-background'}`}>{metal} Stock</p>
                  </div>
                </div>
                <div className={`text-3xl font-headline font-extrabold opacity-20 hidden sm:block ${isActive ? 'text-white' : 'text-outline-variant'}`}>
                  {symbol}
                </div>
              </button>
            );
          })}
        </div>

        {/* Totals Hero Card */}
        <div className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border animate-fade-in bg-white ${activeMetal === 'Gold' ? 'border-amber-500/20' : 'border-slate-400/20'}`}>
          {/* Background Effects */}
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full -mr-16 -mt-16 blur-2xl opacity-10 ${activeMetal === 'Gold' ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none"></div>
          
          {/* Decorative Icon */}
          <span className={`material-symbols-outlined absolute -right-4 -bottom-4 text-[8rem] opacity-[0.03] pointer-events-none rotate-[-15deg] ${activeMetal === 'Gold' ? 'text-amber-500' : 'text-slate-500'}`}>
            account_balance
          </span>

          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-outline-variant/10 pb-4">
            <div>
              <p className={`font-label text-[9px] uppercase tracking-[0.2em] font-extrabold mb-1 ${activeMetal === 'Gold' ? 'text-amber-600' : 'text-slate-500'}`}>
                Corporate Treasury
              </p>
              <h2 className="font-headline font-black text-xl md:text-2xl text-primary tracking-wide">
                {activeMetal} Vault Status
              </h2>
            </div>
            
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm backdrop-blur-md ${activeMetal === 'Gold' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-slate-400/10 border-slate-400/20 text-slate-500'}`}>
              <span className="material-symbols-outlined text-2xl">
                inventory_2
              </span>
            </div>
          </div>
          
          <div className="relative z-10 w-full">
            {/* Pure Metal Card Only */}
            <div className="bg-slate-50/50 hover:bg-slate-50 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-outline-variant/20 shadow-sm transition-colors relative overflow-hidden group w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${activeMetal === 'Gold' ? 'bg-amber-500' : 'bg-slate-400'} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
              
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white border border-outline-variant/20 shadow-sm shrink-0 ${activeMetal === 'Gold' ? 'text-amber-500' : 'text-slate-500'}`}>
                  <span className="material-symbols-outlined text-2xl">diamond</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-outline mb-0.5">Total Pure {activeMetal}</p>
                  <p className="text-xs text-outline/70 font-medium">{activeMetal === 'Gold' ? '24K Standard Vault Weight' : '99.9% Fine Vault Weight'}</p>
                </div>
              </div>
              
              <div className="flex items-baseline gap-2 sm:text-right">
                <p className={`font-headline font-black text-3xl md:text-4xl tracking-tighter ${activeMetal === 'Gold' ? 'text-[#755b00]' : 'text-slate-700'}`}>
                  {(activeMetal === 'Gold' ? totals.pureGold : totals.pureSilver).toFixed(3)}
                </p>
                <span className="text-outline font-black text-sm md:text-base tracking-widest">GRAMS</span>
              </div>
            </div>
          </div>
        </div>

        {/* History List */}
        <div>
          <h3 className="font-headline font-bold text-lg text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-outline">history</span>
            Transaction History
          </h3>
          
          {currentEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="relative mb-6 group">
                <div className={`absolute inset-0 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 ${activeMetal === 'Gold' ? 'bg-amber-500/10' : 'bg-slate-400/10'}`}></div>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-inner relative z-10 border-2 border-white ${activeMetal === 'Gold' ? 'bg-gradient-to-br from-amber-500/5 to-amber-500/10 text-amber-600' : 'bg-gradient-to-br from-slate-400/5 to-slate-400/10 text-slate-500'}`}>
                  <span className="material-symbols-outlined text-4xl">inventory_2</span>
                </div>
              </div>
              <h3 className="font-headline font-bold text-xl text-primary mb-2">No History Found</h3>
              <p className="text-xs text-outline text-center">There are no vault transactions recorded for {activeMetal} yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentEntries.map((entry, idx) => {
                const pureChange = activeMetal === 'Gold' ? entry.pureGoldChange : entry.pureSilverChange;
                const impureChange = activeMetal === 'Gold' ? entry.impureGoldChange : entry.impureSilverChange;
                
                return (
                  <div key={idx} className="luxury-card bg-white rounded-3xl border border-outline-variant/20 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 pointer-events-none ${activeMetal === 'Gold' ? 'bg-gradient-to-bl from-amber-500/[0.05] to-transparent' : 'bg-gradient-to-bl from-slate-500/[0.05] to-transparent'}`}></div>
                    
                    <div className="p-5 sm:p-6 flex flex-col md:flex-row justify-between md:items-center gap-5 relative z-10">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`font-black text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-sm border ${activeMetal === 'Gold' ? 'bg-amber-50 text-amber-700 border-amber-200/50' : 'bg-slate-50 text-slate-700 border-slate-200/50'}`}>
                            {entry.type}
                          </span>
                          <div className="flex items-center gap-1.5 text-outline/80">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            <span className="text-[10px] font-bold tracking-wider">{new Date(entry.createdAt).toLocaleDateString('en-GB')} {new Date(entry.createdAt).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>
                        <h4 className="font-headline font-black text-primary text-lg tracking-wide">{entry.branchName || 'Corporate Head Office'}</h4>
                        <p className="text-xs text-outline/80 font-medium mt-1.5 leading-relaxed">{entry.details}</p>
                      </div>

                      <div className="flex gap-3 md:text-right shrink-0">
                        {Math.abs(pureChange) > 0 && (
                          <div className={`bg-white border p-3.5 rounded-2xl min-w-[110px] relative overflow-hidden transition-colors ${pureChange > 0 ? 'border-emerald-500/20 group-hover:border-emerald-500/40 shadow-[0_2px_10px_rgba(16,185,129,0.05)]' : pureChange < 0 ? 'border-error/20 group-hover:border-error/40 shadow-[0_2px_10px_rgba(239,68,68,0.05)]' : 'border-outline-variant/20'}`}>
                            <span className={`material-symbols-outlined absolute -right-2 -bottom-2 text-4xl opacity-[0.03] ${pureChange > 0 ? 'text-emerald-500' : 'text-error'}`}>diamond</span>
                            <p className="text-[9px] uppercase tracking-[0.2em] font-black text-outline mb-1 relative z-10">Pure</p>
                            <p className={`font-black font-headline text-lg tracking-tight relative z-10 ${pureChange > 0 ? 'text-emerald-600' : pureChange < 0 ? 'text-error' : 'text-primary'}`}>
                              {pureChange > 0 ? '+' : ''}{pureChange.toFixed(3)}<span className="text-xs ml-0.5">g</span>
                            </p>
                          </div>
                        )}
                        {Math.abs(impureChange) > 0 && (
                          <div className={`bg-white border p-3.5 rounded-2xl min-w-[110px] relative overflow-hidden transition-colors ${impureChange > 0 ? 'border-emerald-500/20 group-hover:border-emerald-500/40 shadow-[0_2px_10px_rgba(16,185,129,0.05)]' : impureChange < 0 ? 'border-error/20 group-hover:border-error/40 shadow-[0_2px_10px_rgba(239,68,68,0.05)]' : 'border-outline-variant/20'}`}>
                            <span className={`material-symbols-outlined absolute -right-2 -bottom-2 text-4xl opacity-[0.03] ${impureChange > 0 ? 'text-emerald-500' : 'text-error'}`}>local_fire_department</span>
                            <p className="text-[9px] uppercase tracking-[0.2em] font-black text-outline mb-1 relative z-10">Impure</p>
                            <p className={`font-black font-headline text-lg tracking-tight relative z-10 ${impureChange > 0 ? 'text-emerald-600' : impureChange < 0 ? 'text-error' : 'text-primary'}`}>
                              {impureChange > 0 ? '+' : ''}{impureChange.toFixed(3)}<span className="text-xs ml-0.5">g</span>
                            </p>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </main>
    </div>
  );
};
