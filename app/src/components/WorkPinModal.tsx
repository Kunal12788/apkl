import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, X, KeyRound } from 'lucide-react';
import { supabase } from '../supabaseClient';

export type PinWorkType = 'cash_payout' | 'bullion_transfer' | 'deletion_clear';

interface WorkPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workType: PinWorkType;
  actionDescription: string;
}

export const WorkPinModal: React.FC<WorkPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  workType,
  actionDescription
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  if (!isOpen) return null;

  const getTitleAndLabel = () => {
    switch (workType) {
      case 'cash_payout':
        return {
          title: 'High-Value Cash Payout Authorization',
          badge: 'Cash Payout PIN Required',
          field: 'cash_payout_pin'
        };
      case 'bullion_transfer':
        return {
          title: 'Bullion Movement Authorization',
          badge: 'Bullion Transfer PIN Required',
          field: 'bullion_transfer_pin'
        };
      case 'deletion_clear':
        return {
          title: 'Security Clearance Required',
          badge: 'Deletion & Clear PIN Required',
          field: 'deletion_clear_pin'
        };
    }
  };

  const { title, badge, field } = getTitleAndLabel();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('Please enter the 6-digit authorization PIN.');
      return;
    }

    setIsValidating(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'security_pins')
        .maybeSingle();

      if (error) throw error;

      const configuredPins = data?.value || {};
      const expectedPin = configuredPins[field] || (
        workType === 'cash_payout' ? '556677' :
        workType === 'bullion_transfer' ? '889900' : '991122'
      );

      if (pin.trim() === String(expectedPin).trim()) {
        setPin('');
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Invalid Security PIN. Authorization rejected.');
      }
    } catch (err: any) {
      console.error('PIN verification error:', err);
      setErrorMsg('Security vault communication error. Try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-surface rounded-3xl border border-outline-variant/20 shadow-2xl animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-outline hover:text-on-surface rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3.5 mb-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20">
            <Lock className="w-7 h-7" />
          </div>
          <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full mb-2">
            {badge}
          </span>
          <h3 className="text-lg font-bold text-on-surface">{title}</h3>
          <p className="text-xs text-outline mt-1 max-w-xs">{actionDescription}</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
              Enter 6-Digit Master Security PIN
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg('');
                }}
                autoFocus
                placeholder="••••••"
                className="w-full px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono font-black bg-surface-container-highest/40 border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary transition-all"
              />
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline/40" />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-outline-variant/30 text-outline text-xs font-bold hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating || !pin.trim()}
              className="flex-1 py-3 px-4 rounded-xl button-gradient text-white text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isValidating ? (
                'Verifying...'
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Authorize
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
