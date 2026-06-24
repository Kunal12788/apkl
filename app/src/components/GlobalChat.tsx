import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';

interface UserContact {
  id: string;
  name: string;
  role: string;
  branch_id?: string;
}

interface Message {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  content: string;
  type: 'chat' | 'notification';
  is_read: boolean;
  created_at: string;
}

export const GlobalChat: React.FC = () => {
  const { user } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'notifications'>('chats');
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const [notifications, setNotifications] = useState<Message[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen to open event and bind global window hooks
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    
    window.addEventListener('openChat', handleOpen);
    document.addEventListener('openChat', handleOpen);
    
    // Bind global methods
    (window as any).openGlobalChat = () => {
      setIsOpen(true);
    };
    (window as any).closeGlobalChat = () => {
      setIsOpen(false);
      setSelectedContact(null);
    };
    (window as any).toggleGlobalChat = () => {
      setIsOpen(prev => !prev);
    };

    return () => {
      window.removeEventListener('openChat', handleOpen);
      document.removeEventListener('openChat', handleOpen);
      
      delete (window as any).openGlobalChat;
      delete (window as any).closeGlobalChat;
      delete (window as any).toggleGlobalChat;
    };
  }, []);

  // Fetch contacts list
  useEffect(() => {
    if (!isOpen || !user) return;
    
    const fetchContacts = async () => {
      setIsLoadingContacts(true);
      try {
        const { data: allUsers, error } = await supabase
          .from('users')
          .select('id, name, role, branch_id')
          .order('name');
        
        if (error) throw error;

        if (allUsers) {
          // Filter according to rules
          const filtered = allUsers.filter((u: any) => {
            if (u.id === user.id) return false; // Exclude self
            
            if (user.role === 'Super Admin') {
              return true; // Super Admin can chat with anyone
            }
            
            // To contact the super admin anyone can
            if (u.role === 'Super Admin') return true;

            if (user.role === 'Admin') {
              // Admin can chat with staff/collection staff of their branch
              return u.branch_id === user.branch_id && 
                     (u.role === 'Staff' || u.role === 'Collection Staff');
            }

            if (user.role === 'Staff' || user.role === 'Collection Staff') {
              // Staff/Collection Staff can only chat with the admin of their branch
              return u.branch_id === user.branch_id && u.role === 'Admin';
            }

            return false;
          });
          setContacts(filtered);
        }
      } catch (err) {
        console.error('Error fetching contacts:', err);
      } finally {
        setIsLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [isOpen, user]);

  // Fetch unread chat counts per contact & fetch system notifications
  const fetchUnreadAndNotifications = async () => {
    if (!user) return;
    try {
      // 1. Fetch Chat counts
      const { data: unreadData } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('type', 'chat')
        .eq('is_read', false);

      const counts: Record<string, number> = {};
      unreadData?.forEach((m: any) => {
        if (m.sender_id) {
          counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
        }
      });
      setUnreadCounts(counts);

      // 2. Fetch Notifications
      const { data: notifData } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('type', 'notification')
        .order('created_at', { ascending: false });

      if (notifData) {
        setNotifications(notifData);
      }
    } catch (err) {
      console.error('Error loading notification and unread states:', err);
    }
  };

  useEffect(() => {
    if (!isOpen || !user) return;
    fetchUnreadAndNotifications();

    const channel = supabase.channel('global_unread_notif_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchUnreadAndNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user]);

  // Fetch messages between user and selectedContact
  const fetchThreadMessages = async () => {
    if (!user || !selectedContact) return;
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('type', 'chat')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark unread messages from this contact as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', selectedContact.id)
        .eq('receiver_id', user.id)
        .eq('type', 'chat')
        .eq('is_read', false);

      // Instantly clear unread count for this contact locally
      setUnreadCounts(prev => ({ ...prev, [selectedContact.id]: 0 }));

    } catch (err) {
      console.error('Error fetching chat thread:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedContact) {
      fetchThreadMessages();

      // Subscribe to real-time chat updates
      const channel = supabase.channel(`thread_${selectedContact.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.type === 'chat') {
            const isMatch = (newMsg.sender_id === user?.id && newMsg.receiver_id === selectedContact.id) ||
                            (newMsg.sender_id === selectedContact.id && newMsg.receiver_id === user?.id);
            if (isMatch) {
              setMessages(prev => [...prev, newMsg]);
              // Mark as read if received while thread is open
              if (newMsg.receiver_id === user?.id) {
                supabase
                  .from('messages')
                  .update({ is_read: true })
                  .eq('id', newMsg.id)
                  .then(() => {
                    fetchUnreadAndNotifications();
                  });
              }
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setMessages([]);
    }
  }, [selectedContact]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedContact) return;

    const mid = `MSG-${Math.floor(100000 + Math.random() * 900000)}`;
    const msgObj = {
      id: mid,
      sender_id: user.id,
      receiver_id: selectedContact.id,
      content: newMessage.trim(),
      type: 'chat',
      is_read: false
    };

    setNewMessage('');
    try {
      await supabase.from('messages').insert([msgObj]);
      // Local optimism insertion is not required since the supabase realtime insert subscription captures it
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('type', 'notification')
        .eq('is_read', false);
      
      fetchUnreadAndNotifications();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      {/* Backdrop blur overlay */}
      <div 
        className="absolute inset-0 bg-[#001e40]/30 backdrop-blur-sm animate-fade-in" 
        onClick={() => { setIsOpen(false); setSelectedContact(null); }} 
      />
      
      {/* Sidebar drawer content */}
      <div className="relative w-full max-w-md h-full bg-background border-l border-outline-variant/10 shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in-right z-10">
        
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-br from-[#001e40] to-[#003366] px-5 pt-6 pb-4 relative overflow-hidden text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedContact ? (
              <button 
                onClick={() => setSelectedContact(null)} 
                className="w-8 h-8 rounded-full border border-white/20 bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              </button>
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">forum</span>
              </div>
            )}
            <div>
              <h3 className="font-headline font-bold text-base leading-tight">
                {selectedContact ? selectedContact.name : 'Communications'}
              </h3>
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-0.5">
                {selectedContact ? `${selectedContact.role} Thread` : 'Chats & Notifications'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { setIsOpen(false); setSelectedContact(null); }} 
            className="w-8 h-8 rounded-full border border-white/20 bg-white/10 flex items-center justify-center hover:bg-red-500/30 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Tab selection (only show if not inside a thread) */}
        {!selectedContact && (
          <div className="shrink-0 bg-white border-b border-outline-variant/10 flex px-4">
            <button 
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-3.5 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'chats' 
                  ? 'border-primary text-primary font-extrabold' 
                  : 'border-transparent text-outline hover:text-primary'
              }`}
            >
              Chats
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-3.5 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all relative ${
                activeTab === 'notifications' 
                  ? 'border-primary text-primary font-extrabold' 
                  : 'border-transparent text-outline hover:text-primary'
              }`}
            >
              Notifications
              {notifications.some(n => !n.is_read) && (
                <span className="absolute top-3.5 right-12 w-2.5 h-2.5 bg-error rounded-full border-2 border-white shadow-sm"></span>
              )}
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-grow overflow-y-auto hide-scrollbar bg-slate-50/50 p-4">
          
          {/* Thread Chat View */}
          {selectedContact ? (
            <div className="flex flex-col gap-3 h-full">
              {isLoadingMessages ? (
                <div className="flex-grow flex items-center justify-center">
                  <span className="w-7 h-7 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center opacity-60 px-6 space-y-3">
                  <span className="material-symbols-outlined text-4xl text-outline-variant">chat_bubble_outline</span>
                  <p className="text-xs font-bold text-outline">No messages here yet. Start chatting!</p>
                </div>
              ) : (
                <div className="space-y-3 pb-2 flex-grow">
                  {messages.map(m => {
                    const isSelf = m.sender_id === user?.id;
                    return (
                      <div 
                        key={m.id} 
                        className={`flex flex-col max-w-[80%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <div className={`p-3 rounded-2xl text-[13px] font-medium leading-relaxed ${
                          isSelf 
                            ? 'bg-primary text-white rounded-tr-none shadow-sm' 
                            : 'bg-white border border-outline-variant/15 text-primary rounded-tl-none shadow-xs'
                        }`}>
                          {m.content}
                        </div>
                        <span className="text-[8px] font-extrabold text-outline/65 uppercase tracking-wider mt-1 px-1">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          ) : (
            // Tabs views
            activeTab === 'chats' ? (
              // Contacts List
              isLoadingContacts ? (
                <div className="flex items-center justify-center py-20">
                  <span className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></span>
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-14 px-6 space-y-3 opacity-60">
                  <span className="material-symbols-outlined text-4xl text-outline-variant">people</span>
                  <p className="text-xs font-bold text-outline">No eligible contacts available for communication.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map(c => {
                    const unread = unreadCounts[c.id] || 0;
                    return (
                      <button 
                        key={c.id} 
                        onClick={() => setSelectedContact(c)}
                        className="w-full bg-white p-4 rounded-2xl border border-outline-variant/15 flex items-center justify-between hover:bg-white/80 active:scale-[0.99] transition-all shadow-xs group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-headline text-sm font-bold group-hover:scale-105 transition-transform shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <div className="text-left min-w-0">
                            <p className="font-bold text-primary text-sm truncate">{c.name}</p>
                            <p className="text-[10px] text-outline uppercase tracking-wider font-extrabold mt-0.5">
                              {c.role} {c.branch_id ? `• ${c.branch_id.replace('BR-', '')}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {unread > 0 && (
                            <span className="bg-error text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                              {unread}
                            </span>
                          )}
                          <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">chevron_right</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              // System Notifications Tab
              <div className="space-y-3">
                {notifications.length > 0 && (
                  <div className="flex justify-end pr-1">
                    <button 
                      onClick={handleMarkAllNotificationsAsRead}
                      className="text-[9px] font-black text-secondary uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">done_all</span>
                      Clear Notifications
                    </button>
                  </div>
                )}
                {notifications.length === 0 ? (
                  <div className="text-center py-14 px-6 space-y-3 opacity-60">
                    <span className="material-symbols-outlined text-4xl text-outline-variant">notifications</span>
                    <p className="text-xs font-bold text-outline">You are all caught up. No notifications!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`bg-white p-4 rounded-2xl border ${
                          n.is_read ? 'border-outline-variant/15' : 'border-secondary/30 bg-[#003366]/[0.01]'
                        } flex items-start gap-3 shadow-xs relative overflow-hidden`}
                      >
                        {!n.is_read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
                        )}
                        <span className={`material-symbols-outlined text-base mt-0.5 shrink-0 ${
                          n.is_read ? 'text-outline/70' : 'text-secondary'
                        }`}>
                          info
                        </span>
                        <div className="flex-grow min-w-0">
                          <p className={`text-[12px] font-medium leading-relaxed ${
                            n.is_read ? 'text-primary/70' : 'text-primary'
                          }`}>
                            {n.content}
                          </p>
                          <span className="text-[8px] font-extrabold text-outline/65 uppercase tracking-wider block mt-1.5">
                            {new Date(n.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })} • {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Input box inside selected thread */}
        {selectedContact && (
          <form 
            onSubmit={handleSendMessage}
            className="shrink-0 p-4 bg-white border-t border-outline-variant/10 flex gap-2 items-center"
          >
            <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow h-11 bg-slate-50 border border-outline-variant/40 rounded-full px-4 text-xs font-medium placeholder-outline focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="w-11 h-11 rounded-full button-gradient text-white flex items-center justify-center disabled:opacity-50 disabled:scale-100 shadow-md active:scale-95 transition-transform shrink-0"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
