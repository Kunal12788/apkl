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
      } w-[358px] sm:w-[360px] max-w-full bg-[#fbfbfd]/70 border border-white/60 rounded-[22px] pointer-events-auto flex flex-col overflow-hidden`}
      style={{
        WebkitBackdropFilter: 'saturate(200%) blur(24px)',
        backdropFilter: 'saturate(200%) blur(24px)',
        boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.12), 0 4px 16px -2px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div className="flex items-start gap-3.5 p-4">
        {/* iOS Native App Icon Squircle */}
        <div className="flex-shrink-0 relative">
          <div
            className={`w-[38px] h-[38px] rounded-[9px] flex items-center justify-center relative overflow-hidden border border-white/30 shadow-[0_2px_6px_rgba(0,0,0,0.12)] ${
              type === 'login'
                ? 'bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857]'
                : 'bg-gradient-to-br from-[#f43f5e] via-[#e11d48] to-[#be123c]'
            }`}
          >
            {/* Gloss overlay to simulate glass curve */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
            
            {type === 'login' ? (
              <ShieldCheck className="w-[21px] h-[21px] text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)]" />
            ) : (
              <LogOut className="w-[21px] h-[21px] text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)] translate-x-[1px]" />
            )}
          </div>
          
          {/* Ambient colored backdrop glow behind the icon */}
          <div
            className={`absolute -inset-1 rounded-full blur-[8px] opacity-25 -z-10 ${
              type === 'login' ? 'bg-[#10b981]' : 'bg-[#f43f5e]'
            }`}
          />
        </div>

        {/* Text Metadata and Message Content */}
        <div className="flex-1 min-w-0 flex flex-col pt-0.5">
          {/* Top Row: App Label & Time */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.08em] text-[#1c1c1e]/50 uppercase leading-none">
              AURORA
            </span>
            <span className="text-[11px] font-medium text-[#1c1c1e]/40 tracking-tight leading-none">
              now
            </span>
          </div>

          {/* Alert Title */}
          <h4 className="text-[14px] font-semibold text-[#1c1c1e] tracking-tight leading-snug mt-1.5">
            {title}
          </h4>

          {/* Detailed Message */}
          <p className="text-[13px] font-normal text-[#3a3a3c] tracking-normal leading-relaxed mt-0.5">
            {message}
          </p>
        </div>
      </div>

      {/* Glossy sheen sweeping overlay to elevate aesthetic */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
        <div className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2 bg-gradient-to-tr from-transparent via-white/[0.2] to-transparent transform rotate-[25deg] -translate-x-[110%] animate-[ios-sheen_4.5s_ease-in-out_infinite]" />
      </div>
    </div>
  );
};

export const triggerAppleToast = (title: string, message: string, type: 'login' | 'logout') => {
  toast.custom(
    (t) => <AppleToast t={t} title={title} message={message} type={type} />,
    { duration: 2000 }
  );
};



