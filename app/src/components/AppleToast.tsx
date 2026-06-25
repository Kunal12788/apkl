import React from 'react';
import toast, { type Toast } from 'react-hot-toast';
import { LogOut, Bell, Key, Layers, CheckCircle2, TrendingUp, Coins } from 'lucide-react';
import { playNotificationSound } from '../utils/audio';

interface AppleToastProps {
  t: Toast;
  title: string;
  message: string;
  type: 'login' | 'logout' | 'info' | 'success' | 'task' | 'report' | 'allocation';
}

export const AppleToast: React.FC<AppleToastProps> = ({ t, title, message, type }) => {
  // Select icon based on type
  const getIcon = () => {
    switch (type) {
      case 'login':
        return <Key className="w-[21px] h-[21px] text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)]" />;
      case 'logout':
        return <LogOut className="w-[21px] h-[21px] text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)] translate-x-[1px]" />;
      case 'success':
        return <CheckCircle2 className="w-[21px] h-[21px] text-[#32d74b] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)]" />;
      case 'task':
        return <Layers className="w-[21px] h-[21px] text-[#38bdf8] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)]" />;
      case 'report':
        return <TrendingUp className="w-[21px] h-[21px] text-[#f59e0b] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)]" />;
      case 'allocation':
        return <Coins className="w-[21px] h-[21px] text-[#a855f7] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)]" />;
      case 'info':
      default:
        return <Bell className="w-[21px] h-[21px] text-[#38bdf8] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)]" />;
    }
  };

  return (
    <div
      className={`${
        t.visible ? 'ios-animate-enter' : 'ios-animate-leave'
      } w-[358px] sm:w-[360px] max-w-full bg-[#003366]/90 border border-white/15 rounded-[22px] pointer-events-auto flex flex-col overflow-hidden`}
      style={{
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        backdropFilter: 'saturate(180%) blur(24px)',
        boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.3), 0 4px 16px -2px rgba(0, 0, 0, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div className="flex items-start gap-3.5 p-4">
        {/* iOS Native App Icon Squircle */}
        <div className="flex-shrink-0 relative">
          <div
            className="w-[38px] h-[38px] rounded-[9px] flex items-center justify-center relative overflow-hidden border border-white/10 shadow-[0_2px_6px_rgba(0,0,0,0.3)] bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a]"
          >
            {/* Gloss overlay to simulate glass curve */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            {getIcon()}
          </div>
          
          {/* Ambient colored backdrop glow behind the icon */}
          <div className="absolute -inset-1 rounded-full blur-[8px] opacity-35 -z-10 bg-[#38bdf8]" />
        </div>

        {/* Text Metadata and Message Content */}
        <div className="flex-1 min-w-0 flex flex-col pt-0.5">
          {/* Top Row: App Label & Time */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase leading-none">
              AURORA
            </span>
            <span className="text-[11px] font-medium text-white/40 tracking-tight leading-none">
              now
            </span>
          </div>

          {/* Alert Title */}
          <h4 className="text-[14px] font-semibold text-white tracking-tight leading-snug mt-1.5">
            {title}
          </h4>

          {/* Detailed Message */}
          <p className="text-[13px] font-normal text-white/90 tracking-normal leading-relaxed mt-0.5">
            {message}
          </p>
        </div>
      </div>

      {/* Glossy sheen sweeping overlay to elevate aesthetic */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
        <div className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2 bg-gradient-to-tr from-transparent via-white/[0.1] to-transparent transform rotate-[25deg] -translate-x-[110%] animate-[ios-sheen_4.5s_ease-in-out_infinite]" />
      </div>
    </div>
  );
};

export const triggerAppleToast = (title: string, message: string, type: 'login' | 'logout') => {
  playNotificationSound();
  toast.custom(
    (t) => <AppleToast t={t} title={title} message={message} type={type} />,
    { duration: 2500 }
  );
};

export const triggerBlueToast = (
  message: string,
  title?: string,
  type: 'login' | 'logout' | 'info' | 'success' | 'task' | 'report' | 'allocation' = 'info'
) => {
  playNotificationSound();
  const defaultTitle = 
    type === 'success' ? 'Task Completed' : 
    type === 'task' ? 'Work Creation' : 
    type === 'allocation' ? 'Stock Allocation' : 
    type === 'report' ? 'Report Submission' : 
    'AURORA Alert';

  toast.custom(
    (t) => (
      <AppleToast 
        t={t} 
        title={title || defaultTitle} 
        message={message} 
        type={type} 
      />
    ),
    { duration: 4000, position: 'top-center' }
  );
};




