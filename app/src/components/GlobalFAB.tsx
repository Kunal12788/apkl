import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AddTaskModal } from './AddTaskModal';

export const GlobalFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Define paths where the FAB should be hidden (e.g., login, splash)
  const hideOnPaths = ['/login', '/forgot', '/splash', '/'];
  if (hideOnPaths.includes(location.pathname)) return null;

  return (
    <>
      {/* Global FAB - Institutional Design */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 right-8 w-16 h-16 bg-[#003366] text-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,30,64,0.3)] backdrop-blur-md flex items-center justify-center active:scale-90 active:rotate-12 transition-all z-[60] border-2 border-white/20 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span className="material-symbols-outlined text-3xl relative z-10 transition-transform group-hover:scale-110">add</span>
        
        {/* Subtle Pulse Effect */}
        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
      </button>

      {/* Global Add Task Modal */}
      <AddTaskModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onSuccess={(data) => {
          console.log('Global Task Created:', data);
          // In a real app, this would dispatch to a global state or API
          // For now, it logs the data. The design improvement is the key.
        }}
      />
    </>
  );
};
