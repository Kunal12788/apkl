import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

export const SuperAdminCalculatorScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'purity' | 'valuation'>('purity');
  
  // Purity Converter State
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [purityPercent, setPurityPercent] = useState<string>('');
  
  // Valuation Engine State
  const [basePrice24K, setBasePrice24K] = useState<string>('');
  
  // Calculations
  const calculatePureWeight = () => {
    const w = parseFloat(grossWeight);
    const p = parseFloat(purityPercent);
    if (isNaN(w) || isNaN(p) || w <= 0 || p <= 0) return 0;
    return (w * (p / 100)).toFixed(3);
  };

  const calculateKaratPrices = () => {
    const base = parseFloat(basePrice24K);
    if (isNaN(base) || base <= 0) return null;
    
    // Standard industry purity ratios
    return {
      '24K': base.toFixed(2),
      '22K': (base * (22 / 24)).toFixed(2),
      '18K': (base * (18 / 24)).toFixed(2),
      '14K': (base * (14 / 24)).toFixed(2),
      '9K': (base * (9 / 24)).toFixed(2),
    };
  };

  const pureWeightResult = calculatePureWeight();
  const karatPrices = calculateKaratPrices();

  return (
    <div className="bg-surface text-on-surface font-body w-full min-h-[100svh] relative overflow-y-auto hide-scrollbar">
      
      {/* App Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 px-4 sm:px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary active:scale-95 transition-transform hover:bg-outline-variant/20">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-xl font-bold text-primary leading-tight">Gold Calculator</h1>
            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Financial & Purity Tools</p>
          </div>
        </div>
        <NotificationBell />
      </header>

      <main className="px-4 sm:px-6 pt-6 pb-24 max-w-5xl mx-auto space-y-6">
        
        {/* Module Tabs */}
        <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-3xl border border-outline-variant/30 shadow-sm relative z-10 w-full max-w-lg mx-auto mb-8">
          <button
            onClick={() => setActiveTab('purity')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-300 font-bold text-sm tracking-wide ${
              activeTab === 'purity' 
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md transform scale-[1.02]' 
                : 'text-outline hover:bg-white/50 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-lg">science</span>
            Purity Converter
          </button>
          <button
            onClick={() => setActiveTab('valuation')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-300 font-bold text-sm tracking-wide ${
              activeTab === 'valuation' 
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md transform scale-[1.02]' 
                : 'text-outline hover:bg-white/50 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-lg">payments</span>
            Valuation Engine
          </button>
        </div>

        {/* Purity Converter View */}
        {activeTab === 'purity' && (
          <div className="animate-fade-in space-y-6 max-w-2xl mx-auto">
            <div className="luxury-card bg-white p-6 sm:p-8 rounded-[2rem] border border-amber-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 blur-2xl bg-amber-500 opacity-10"></div>
              
              <div className="flex items-center gap-4 mb-8 border-b border-outline-variant/10 pb-6 relative z-10">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-2xl">scale</span>
                </div>
                <div>
                  <h2 className="font-headline font-bold text-xl text-primary">Impure to Pure</h2>
                  <p className="text-xs text-outline font-medium">Calculate exact 24K yield from raw mass.</p>
                </div>
              </div>

              <div className="space-y-5 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-outline px-1">Gross Weight (Grams)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0.000"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(e.target.value)}
                      className="w-full bg-slate-50 border border-outline-variant/50 rounded-2xl px-5 py-4 font-headline text-xl text-primary font-bold placeholder:text-outline/30 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-outline/50 tracking-widest text-sm">g</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-outline px-1">Tested Purity (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="99.99"
                      value={purityPercent}
                      onChange={(e) => setPurityPercent(e.target.value)}
                      className="w-full bg-slate-50 border border-outline-variant/50 rounded-2xl px-5 py-4 font-headline text-xl text-primary font-bold placeholder:text-outline/30 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-outline/50 tracking-widest text-sm">%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Card */}
            <div className={`transition-all duration-500 ${Number(pureWeightResult) > 0 ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 pointer-events-none'}`}>
              <div className="bg-gradient-to-br from-[#755b00]/5 to-transparent p-6 sm:p-8 rounded-[2rem] border border-[#755b00]/10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#755b00] opacity-80"></div>
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-outline mb-2">Calculated Pure Yield</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="font-headline font-black text-5xl tracking-tighter text-[#755b00]">
                      {pureWeightResult || '0.000'}
                    </span>
                    <span className="font-bold text-outline text-lg tracking-widest">g</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Valuation Engine View */}
        {activeTab === 'valuation' && (
          <div className="animate-fade-in space-y-6 max-w-3xl mx-auto">
            <div className="luxury-card bg-white p-6 sm:p-8 rounded-[2rem] border border-indigo-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 blur-2xl bg-indigo-500 opacity-10"></div>
              
              <div className="flex items-center gap-4 mb-8 border-b border-outline-variant/10 pb-6 relative z-10">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200 shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-2xl">monitoring</span>
                </div>
                <div>
                  <h2 className="font-headline font-bold text-xl text-primary">Live Pricing Engine</h2>
                  <p className="text-xs text-outline font-medium">Calculate tiered karat values from 24K spot.</p>
                </div>
              </div>

              <div className="relative z-10 mb-8">
                <label className="text-[10px] uppercase tracking-widest font-bold text-outline px-1 mb-1.5 block">Base 24K Price (Per Gram)</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 font-headline font-bold text-primary text-xl">₹</div>
                  <input 
                    type="number" 
                    placeholder="7250.00"
                    value={basePrice24K}
                    onChange={(e) => setBasePrice24K(e.target.value)}
                    className="w-full bg-slate-50 border border-outline-variant/50 rounded-2xl pl-10 pr-5 py-4 font-headline text-2xl text-primary font-black placeholder:text-outline/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all shadow-inner"
                  />
                </div>
              </div>

              {karatPrices && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
                  <div className="bg-gradient-to-br from-[#755b00]/10 to-[#755b00]/5 p-4 rounded-2xl border border-[#755b00]/20 flex flex-col items-center justify-center text-center col-span-1 sm:col-span-2 lg:col-span-3">
                    <span className="font-bold text-xs tracking-widest text-[#755b00] uppercase mb-1">24K Pure Gold</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-[#755b00]/70">₹</span>
                      <span className="font-headline font-black text-2xl text-[#755b00]">{karatPrices['24K']}</span>
                      <span className="text-[10px] text-outline font-bold">/g</span>
                    </div>
                  </div>
                  
                  {[
                    { karat: '22K', purity: '91.6%', color: 'from-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-700' },
                    { karat: '18K', purity: '75.0%', color: 'from-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-700' },
                    { karat: '14K', purity: '58.3%', color: 'from-slate-400/10', border: 'border-slate-400/20', text: 'text-slate-700' },
                    { karat: '9K', purity: '37.5%', color: 'from-slate-300/10', border: 'border-slate-300/20', text: 'text-slate-600' },
                  ].map((tier) => (
                    <div key={tier.karat} className={`bg-gradient-to-br ${tier.color} to-transparent p-4 rounded-2xl border ${tier.border} flex flex-col justify-center items-center text-center hover:-translate-y-1 transition-transform`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-black text-sm tracking-widest ${tier.text}`}>{tier.karat}</span>
                        <span className="text-[9px] font-bold text-outline/60 px-1.5 py-0.5 rounded-sm bg-white/50 border border-white/80">{tier.purity}</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className={`font-bold opacity-70 ${tier.text}`}>₹</span>
                        <span className={`font-headline font-black text-xl ${tier.text}`}>{Number(karatPrices[tier.karat as keyof typeof karatPrices]).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
