import React, { useState } from 'react';

type TabView = 'all' | 'customer';

interface Customer {
  id: string;
  name: string;
  initials: string;
  activeJobs: number;
  outstanding: string;
  paid: string;
}

export const StaffBillingScreen: React.FC<{ onNavigate: (view: 'dashboard' | 'billing') => void }> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabView>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const mockCustomers: Customer[] = [
    { id: 'CUST-001', name: 'Rajesh Jewelers', initials: 'RJ', activeJobs: 14, outstanding: '₹1,24,500', paid: '₹8,45,000' },
    { id: 'CUST-002', name: 'Mehta Gold Traders', initials: 'MG', activeJobs: 3, outstanding: '₹0', paid: '₹4,12,000' },
    { id: 'CUST-003', name: 'Sunrise Ornaments', initials: 'SO', activeJobs: 8, outstanding: '₹45,200', paid: '₹1,90,000' },
  ];

  return (
    <div className="bg-background text-on-background font-body w-full h-[100dvh] relative overflow-y-auto hide-scrollbar">
      <main className="px-6 space-y-6 max-w-5xl mx-auto pt-8 pb-32 relative">
        {/* Header */}
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary leading-tight">Billing & Transactions</h1>
            <p className="text-xs text-outline font-medium">Manage ledgers and payments</p>
          </div>
          <button className="w-10 h-10 rounded-full glass-effect flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container transition-colors border border-outline-variant/30">
            <span className="material-symbols-outlined text-2xl">search</span>
          </button>
        </header>

        {/* Tab Navigation */}
        {!selectedCustomer && (
          <div className="flex bg-surface-container rounded-full p-1.5 shadow-inner">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'all' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
            >
              All Transactions
            </button>
            <button 
              onClick={() => setActiveTab('customer')}
              className={`flex-1 rounded-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'customer' ? 'bg-white premium-shadow text-primary' : 'text-outline hover:text-primary'}`}
            >
              By Customer
            </button>
          </div>
        )}

        {/* View: All Transactions */}
        {activeTab === 'all' && !selectedCustomer && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold">Recent Activity</h3>
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider cursor-pointer">Filter</span>
            </div>
            
            <div className="space-y-3">
              {/* Transaction Item 1 */}
              <div className="luxury-card p-4 flex items-center justify-between relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
                <div className="flex items-center gap-4 pl-2">
                  <div className="w-10 h-10 rounded-full bg-secondary-fixed/50 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-xl glow-icon">qr_code_2</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-primary text-sm">Rajesh Jewelers</p>
                    <p className="text-[9px] text-outline font-medium">UPI • TXN-9824 • Today, 10:45 AM</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline text-base font-bold text-primary">+₹45,000</p>
                  <p className="text-[8px] text-secondary-container font-bold uppercase tracking-wider bg-secondary-container/10 px-2 py-0.5 rounded-full inline-block mt-1">Settled</p>
                </div>
              </div>

              {/* Transaction Item 2 */}
              <div className="luxury-card p-4 flex items-center justify-between relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F6C358]"></div>
                <div className="flex items-center gap-4 pl-2">
                  <div className="w-10 h-10 rounded-full bg-tertiary-fixed/50 flex items-center justify-center text-[#755b00]">
                    <span className="material-symbols-outlined text-xl glow-icon text-[#755b00]">payments</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-primary text-sm">Mehta Gold Traders</p>
                    <p className="text-[9px] text-outline font-medium">Cash • TXN-9823 • Today, 09:12 AM</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline text-base font-bold text-primary">+₹1,12,000</p>
                  <p className="text-[8px] text-secondary-container font-bold uppercase tracking-wider bg-secondary-container/10 px-2 py-0.5 rounded-full inline-block mt-1">Settled</p>
                </div>
              </div>

              {/* Transaction Item 3 */}
              <div className="luxury-card p-4 flex items-center justify-between relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-outline-variant"></div>
                <div className="flex items-center gap-4 pl-2">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-xl">account_balance</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-primary text-sm">Sunrise Ornaments</p>
                    <p className="text-[9px] text-outline font-medium">NEFT • TXN-9820 • Yesterday</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline text-base font-bold text-primary">+₹85,500</p>
                  <p className="text-[8px] text-outline font-bold uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-full inline-block mt-1">Processing</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View: By Customer (Customer List) */}
        {activeTab === 'customer' && !selectedCustomer && (
          <div className="space-y-5 animate-fade-in">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input type="text" placeholder="Search customer name or ID..." className="w-full bg-white border border-outline-variant/30 rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-primary placeholder-outline focus:outline-none input-sapphire-focus luxury-card transition-all" />
            </div>

            <div className="space-y-3">
              {mockCustomers.map(customer => (
                <div key={customer.id} onClick={() => setSelectedCustomer(customer)} className="luxury-card p-4 flex items-center justify-between cursor-pointer group hover:bg-surface-bright">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-fixed/60 to-primary-fixed/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/10 shadow-inner">
                      {customer.initials}
                    </div>
                    <div>
                      <p className="font-headline font-bold text-primary text-[15px]">{customer.name}</p>
                      <p className="text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">{customer.id} • {customer.activeJobs} Jobs</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-white transition-colors premium-shadow">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View: Particular Customer Detail */}
        {selectedCustomer && (
          <div className="animate-fade-in space-y-6">
            <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Directory
            </button>
            
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-white">
                {selectedCustomer.initials}
              </div>
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-primary leading-tight">{selectedCustomer.name}</h2>
                <p className="text-[10px] text-outline font-bold tracking-widest uppercase mt-1">ID: {selectedCustomer.id}</p>
              </div>
            </div>
            
            {/* Customer Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="luxury-card p-5 bg-gradient-to-br from-[#003366] to-[#001e40] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-xl"></div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/70 font-bold mb-1.5">Total Outstanding</p>
                <p className="font-headline text-2xl font-bold text-[#F6C358] drop-shadow-[0_0_8px_rgba(246,195,88,0.3)]">{selectedCustomer.outstanding}</p>
              </div>
              <div className="luxury-card p-5 relative overflow-hidden">
                <p className="text-[9px] uppercase tracking-[0.15em] text-outline font-bold mb-1.5">Total Paid</p>
                <p className="font-headline text-2xl font-bold text-primary">{selectedCustomer.paid}</p>
                <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl text-primary/[0.03] rotate-12">account_balance_wallet</span>
              </div>
            </div>

            {/* Customer Ledger */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-label text-[11px] uppercase tracking-[0.2em] text-outline font-bold">Ledger History</h3>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider cursor-pointer bg-primary-fixed/30 px-3 py-1 rounded-full">Download PDF</span>
              </div>
              
              <div className="luxury-card overflow-hidden divide-y divide-surface-container border border-outline-variant/20">
                <div className="p-4 flex items-center justify-between hover:bg-surface-bright transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed/50 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-sm">qr_code_2</span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-primary text-xs">Payment Received</p>
                      <p className="text-[9px] text-outline font-medium">UPI • TXN-9824</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-headline text-sm font-bold text-primary">+₹45,000</p>
                    <p className="text-[8px] text-outline font-bold uppercase">Today</p>
                  </div>
                </div>
                
                <div className="p-4 flex items-center justify-between hover:bg-surface-bright transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-tertiary-fixed/30 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-sm">engineering</span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-primary text-xs">Job Billed: Touch</p>
                      <p className="text-[9px] text-outline font-medium">INV-0092</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-headline text-sm font-bold text-error">-₹12,500</p>
                    <p className="text-[8px] text-outline font-bold uppercase">Yesterday</p>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-surface-bright transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F6C358]/20 flex items-center justify-center text-[#755b00]">
                      <span className="material-symbols-outlined text-sm">payments</span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-primary text-xs">Payment Received</p>
                      <p className="text-[9px] text-outline font-medium">Cash • Receipt-22</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-headline text-sm font-bold text-primary">+₹25,000</p>
                    <p className="text-[8px] text-outline font-bold uppercase">Oct 12</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FAB - Create Invoice */}
      <button className="fixed bottom-28 right-8 w-16 h-16 bg-primary text-on-primary rounded-full shadow-[0_8px_30px_rgb(0,30,64,0.4)] backdrop-blur-sm flex items-center justify-center active:scale-95 transition-all z-50 border-2 border-white/10">
        <span className="material-symbols-outlined text-3xl">post_add</span>
      </button>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-white border-t border-outline-variant/20 flex justify-around items-center px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,30,64,0.05)]">
        <a onClick={() => onNavigate('dashboard')} className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">dashboard</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Dashboard</span>
        </a>
        <a onClick={() => onNavigate('billing')} className="flex flex-col items-center gap-1 text-primary font-bold relative cursor-pointer">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>payments</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Billing</span>
          <div className="absolute -bottom-2 w-1.5 h-1.5 bg-tertiary rounded-full"></div>
        </a>
        <a className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">assignment</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Tasks</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">inventory_2</span>
          <span className="font-label text-[10px] uppercase tracking-widest">LEDGER</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="font-label text-[10px] uppercase tracking-widest">Profile</span>
        </a>
      </nav>
    </div>
  );
};
