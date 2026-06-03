import React from 'react';
import toast, { type Toast } from 'react-hot-toast';
import { ShieldCheck, LogOut } from 'lucide-react';

interface AppleToastProps {
  t: Toast;
  title: string;
  message: string;
  type: 'login' | 'logout';
}

export const AppleToast: React.FC<AppleToastProps> = ({ t, title, message, type }) => {
  return (
    <div
      className={`${
        t.visible ? 'ios-animate-enter' : 'ios-animate-leave'
      } max-w-sm w-full bg-[#1c1c1e]/40 backdrop-blur-2xl shadow-2xl rounded-[24px] pointer-events-auto flex flex-col ring-1 ring-white/20 overflow-hidden`}
      style={{
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        backdropFilter: 'saturate(180%) blur(24px)',
      }}
    >
      {/* iOS Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#0f172a] flex items-center justify-center border border-amber-500/50">
            {type === 'login' ? (
              <ShieldCheck className="w-3 h-3 text-[#32d74b]" />
            ) : (
              <LogOut className="w-3 h-3 text-amber-500" />
            )}
          </div>
          <span className="text-[13px] font-medium tracking-wide text-white/60">AURORA</span>
        </div>
        <span className="text-[12px] text-white/40">now</span>
      </div>

      {/* iOS Content */}
      <div className="px-4 pb-4 pt-1">
        <p className="text-[15px] font-semibold text-white leading-tight mb-0.5">
          {title}
        </p>
        <p className="text-[14px] text-white/80 leading-snug">
          {message}
        </p>
      </div>
    </div>
  );
};

export const triggerAppleToast = (title: string, message: string, type: 'login' | 'logout') => {
  toast.custom(
    (t) => <AppleToast t={t} title={title} message={message} type={type} />,
    { duration: 1500 }
  );
};
