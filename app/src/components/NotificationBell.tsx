import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';

export const NotificationBell: React.FC = () => {
  const { user } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);
        setUnreadCount(count || 0);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    fetchUnreadCount();

    // Subscribe to messages changes
    const channel = supabase.channel('messages_bell_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof (window as any).openGlobalChat === 'function') {
      (window as any).openGlobalChat();
    } else {
      const openEvent = new CustomEvent('openChat');
      window.dispatchEvent(openEvent);
      document.dispatchEvent(openEvent);
    }
  };

  return (
    <button 
      onClick={handleClick}
      type="button"
      className="w-10 h-10 rounded-full glass-effect flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container transition-colors border border-outline-variant/30 relative shrink-0"
    >
      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>notifications</span>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-error text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
          {unreadCount}
        </span>
      )}
    </button>
  );
};
