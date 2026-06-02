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
        <div className={`luxury-card p-6 sm:p-8 rounded-[2rem] border relative overflow-hidden animate-fade-in ${activeMetal === 'Gold' ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-amber-500/20' : 'bg-gradient-to-br from-slate-400/10 via-slate-400/5 to-white border-slate-400/20'}`}>
          <span className={`material-symbols-outlined absolute -right-8 -bottom-8 text-9xl opacity-5 ${activeMetal === 'Gold' ? 'text-amber-600' : 'text-slate-500'} pointer-events-none`}>inventory_2</span>
          
          <h2 className="font-headline font-bold text-xl text-primary mb-6">Current {activeMetal} Vault Status</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden">
              <span className={`material-symbols-outlined absolute -right-2 -bottom-2 text-4xl opacity-[0.03] ${activeMetal === 'Gold' ? 'text-amber-600' : 'text-slate-600'}`}>diamond</span>
              <p className="text-[10px] uppercase tracking-widest font-bold text-outline mb-1">Total Pure {activeMetal}</p>
              <p className={`font-headline font-black text-2xl md:text-3xl ${activeMetal === 'Gold' ? 'text-[#755b00]' : 'text-slate-700'}`}>
                {(activeMetal === 'Gold' ? totals.pureGold : totals.pureSilver).toFixed(3)}g
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-sm relative overflow-hidden">
              <span className={`material-symbols-outlined absolute -right-2 -bottom-2 text-4xl opacity-[0.03] ${activeMetal === 'Gold' ? 'text-amber-600' : 'text-slate-600'}`}>local_fire_department</span>
              <p className="text-[10px] uppercase tracking-widest font-bold text-outline mb-1">Total Impure {activeMetal}</p>
              <p className={`font-headline font-black text-2xl md:text-3xl ${activeMetal === 'Gold' ? 'text-amber-600' : 'text-slate-500'}`}>
                {(activeMetal === 'Gold' ? totals.impureGold : totals.impureSilver).toFixed(3)}g
              </p>
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
            <div className="luxury-card p-10 bg-white border border-outline-variant/10 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#003366]/5 flex items-center justify-center text-outline mb-4">
                <span className="material-symbols-outlined text-4xl">inventory_2</span>
              </div>
              <h3 className="font-headline font-bold text-lg text-primary">No History Found</h3>
              <p className="text-xs text-outline mt-2">There are no vault transactions recorded for {activeMetal} yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentEntries.map((entry, idx) => {
                const pureChange = activeMetal === 'Gold' ? entry.pureGoldChange : entry.pureSilverChange;
                const impureChange = activeMetal === 'Gold' ? entry.impureGoldChange : entry.impureSilverChange;
                
                return (
                  <div key={idx} className="luxury-card bg-white p-5 rounded-2xl border border-outline-variant/20 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-[#003366]/5 text-[#003366] font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                            {entry.type}
                          </span>
                          <span className="text-[10px] text-outline font-bold">{new Date(entry.createdAt).toLocaleDateString('en-GB')} {new Date(entry.createdAt).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <h4 className="font-headline font-bold text-primary text-base">{entry.branchName || 'Corporate Head Office'}</h4>
                        <p className="text-xs text-outline mt-1 line-clamp-2">{entry.details}</p>
                      </div>

                      <div className="flex gap-4 md:text-right shrink-0">
                        {Math.abs(pureChange) > 0 && (
                          <div className="bg-[#003366]/5 p-3 rounded-xl min-w-[100px]">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-outline mb-0.5">Pure</p>
                            <p className={`font-black font-headline ${pureChange > 0 ? 'text-emerald-600' : pureChange < 0 ? 'text-error' : 'text-primary'}`}>
                              {pureChange > 0 ? '+' : ''}{pureChange.toFixed(3)}g
                            </p>
                          </div>
                        )}
                        {Math.abs(impureChange) > 0 && (
                          <div className="bg-[#003366]/5 p-3 rounded-xl min-w-[100px]">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-outline mb-0.5">Impure</p>
                            <p className={`font-black font-headline ${impureChange > 0 ? 'text-emerald-600' : impureChange < 0 ? 'text-error' : 'text-primary'}`}>
                              {impureChange > 0 ? '+' : ''}{impureChange.toFixed(3)}g
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
