import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { deleteStorageImagesByUrls } from '../utils/storageUtils';
import toast from 'react-hot-toast';

interface UserDetail {
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
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  duration?: number | null;
}

interface ChatThread {
  key: string;
  user1: UserDetail | null;
  user2: UserDetail | null;
  lastMessage: Message;
  messageCount: number;
}

// Custom Premium Audio Player component for voice messages (Read-Only)
const AudioPlayer: React.FC<{ url: string; duration?: number | null; isSelf?: boolean }> = ({ url, duration, isSelf }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error("Audio playback failed:", err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-2xl w-56 border ${
      isSelf 
        ? 'bg-slate-100 border-slate-200/50 text-primary' 
        : 'bg-[#003366]/5 border-[#003366]/10 text-primary'
    }`}>
      <button 
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-[#003366] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 hover:bg-[#001e40]"
      >
        <span className="material-symbols-outlined text-xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
      </button>
      <div className="flex-grow min-w-0">
        <input 
          type="range"
          min="0"
          max={totalDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 rounded-lg appearance-none cursor-pointer range-sm bg-slate-200 accent-[#003366]"
        />
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mt-1 text-slate-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export const SuperAdminChatMonitorScreen: React.FC = () => {
  const navigate = useNavigate();
  const [, setUsers] = useState<Record<string, UserDetail>>({});
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreadsAndUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch all users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, role, branch_id');
      
      if (userError) throw userError;

      const userMap: Record<string, UserDetail> = {};
      userData?.forEach(u => {
        userMap[u.id] = u;
      });
      setUsers(userMap);

      // 2. Fetch all messages of type 'chat'
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('type', 'chat')
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // 3. Aggregate threads
      const threadMap: Record<string, ChatThread> = {};
      msgData?.forEach((m: Message) => {
        if (!m.sender_id || !m.receiver_id) return;
        
        const sortedIds = [m.sender_id, m.receiver_id].sort();
        const key = sortedIds.join('_');
        
        if (!threadMap[key]) {
          threadMap[key] = {
            key,
            user1: userMap[sortedIds[0]] || { id: sortedIds[0], name: 'Unknown User', role: 'Staff' },
            user2: userMap[sortedIds[1]] || { id: sortedIds[1], name: 'Unknown User', role: 'Staff' },
            lastMessage: m,
            messageCount: 1
          };
        } else {
          threadMap[key].messageCount += 1;
        }
      });

      const threadList = Object.values(threadMap).sort(
        (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      );
      setThreads(threadList);

    } catch (err) {
      console.error('Failed to load chat monitor data:', err);
      toast.error('Failed to retrieve chat history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreadsAndUsers();
  }, []);

  // Fetch individual thread messages
  const fetchThreadMessages = async () => {
    if (!selectedThread || !selectedThread.user1 || !selectedThread.user2) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('type', 'chat')
        .or(`and(sender_id.eq.${selectedThread.user1.id},receiver_id.eq.${selectedThread.user2.id}),and(sender_id.eq.${selectedThread.user2.id},receiver_id.eq.${selectedThread.user1.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to fetch messages for thread:', err);
      toast.error('Failed to load thread details.');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedThread) {
      fetchThreadMessages();

      // Realtime subscription for this thread
      const channel = supabase.channel(`monitor_thread_${selectedThread.key}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          fetchThreadMessages();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setMessages([]);
    }
  }, [selectedThread]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Delete Individual Message
  const handleDeleteMessage = async (msg: Message) => {
    if (!window.confirm("Are you sure you want to delete this message permanently? This cannot be undone.")) return;
    
    try {
      if (msg.file_url) {
        // Delete attachment from Storage
        await deleteStorageImagesByUrls([msg.file_url]);
      }
      
      // Delete message from database
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', msg.id);

      if (error) throw error;
      
      toast.success('Message deleted permanently.');
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      
      // Refresh thread preview metadata
      fetchThreadsAndUsers();
    } catch (err: any) {
      console.error('Failed to delete message:', err);
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  // Delete Complete Conversation Thread
  const handleDeleteConversation = async () => {
    if (!selectedThread || !selectedThread.user1 || !selectedThread.user2) return;
    
    const u1Name = selectedThread.user1.name;
    const u2Name = selectedThread.user2.name;
    
    if (!window.confirm(`WARNING: Are you sure you want to delete the ENTIRE conversation thread between ${u1Name} and ${u2Name}? All messages and media files will be permanently deleted from the database and storage.`)) return;

    try {
      // 1. Fetch thread messages to get file URLs
      const { data: threadMsgs, error: fetchErr } = await supabase
        .from('messages')
        .select('*')
        .eq('type', 'chat')
        .or(`and(sender_id.eq.${selectedThread.user1.id},receiver_id.eq.${selectedThread.user2.id}),and(sender_id.eq.${selectedThread.user2.id},receiver_id.eq.${selectedThread.user1.id})`);
      
      if (fetchErr) throw fetchErr;

      if (threadMsgs && threadMsgs.length > 0) {
        const fileUrls = threadMsgs
          .map((m: any) => m.file_url)
          .filter((url): url is string => !!url);
        
        // 2. Delete files from Storage
        if (fileUrls.length > 0) {
          await deleteStorageImagesByUrls(fileUrls);
        }

        // 3. Delete messages from database
        const { error: deleteErr } = await supabase
          .from('messages')
          .delete()
          .eq('type', 'chat')
          .or(`and(sender_id.eq.${selectedThread.user1.id},receiver_id.eq.${selectedThread.user2.id}),and(sender_id.eq.${selectedThread.user2.id},receiver_id.eq.${selectedThread.user1.id})`);
        
        if (deleteErr) throw deleteErr;
      }

      toast.success('Entire conversation thread and assets deleted.');
      setSelectedThread(null);
      setMessages([]);
      fetchThreadsAndUsers();
    } catch (err: any) {
      console.error('Failed to delete complete conversation:', err);
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  // Filter threads by search term
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const query = searchQuery.toLowerCase();
    return threads.filter(t => {
      const name1 = t.user1?.name.toLowerCase() || '';
      const name2 = t.user2?.name.toLowerCase() || '';
      const role1 = t.user1?.role.toLowerCase() || '';
      const role2 = t.user2?.role.toLowerCase() || '';
      return name1.includes(query) || name2.includes(query) || role1.includes(query) || role2.includes(query);
    });
  }, [threads, searchQuery]);

  return (
    <div className="bg-background text-on-background font-body min-h-[100svh] flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <header className="px-6 pt-6 pb-4 flex justify-between items-center bg-white border-b border-outline-variant/20 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 flex items-center justify-center text-primary shadow-sm hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-xl font-bold text-primary leading-tight">Chat Monitor</h1>
            <p className="text-[10px] text-error font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] animate-pulse">security</span>
              Super Admin Surveillance Center
            </p>
          </div>
        </div>
      </header>

      {/* Main Split Pane Layout */}
      <div className="flex-grow flex overflow-hidden min-h-0 bg-slate-50/50">
        
        {/* Left Side: Threads List */}
        <div className="w-full md:w-80 border-r border-outline-variant/10 flex flex-col shrink-0 bg-white">
          <div className="p-4 border-b border-outline-variant/10 shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline/70 text-base">search</span>
              <input 
                type="text" 
                placeholder="Search staff chats..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-outline-variant/30 rounded-full py-2.5 pl-10 pr-4 text-xs font-medium text-primary focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto hide-scrollbar p-3 space-y-2">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <span className="w-7 h-7 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></span>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-12 opacity-60">
                <p className="text-xs font-bold text-outline">No active chats found.</p>
              </div>
            ) : (
              filteredThreads.map(t => {
                const isSelected = selectedThread?.key === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setSelectedThread(t)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                      isSelected 
                        ? 'bg-[#003366]/5 border-[#003366]/20' 
                        : 'bg-white border-outline-variant/15 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-grow pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-primary text-xs truncate max-w-[90px]">{t.user1?.name || 'User'}</span>
                        <span className="text-[9px] text-outline font-extrabold uppercase">‹›</span>
                        <span className="font-bold text-primary text-xs truncate max-w-[90px]">{t.user2?.name || 'User'}</span>
                      </div>
                      <p className="text-[8px] text-outline uppercase tracking-wider font-extrabold mt-0.5">
                        {t.user1?.role} & {t.user2?.role}
                      </p>
                      <p className="text-[10px] text-outline-variant truncate mt-1.5 font-medium italic">
                        {t.lastMessage.content}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1.5">
                      <span className="text-[8px] font-extrabold text-outline/60 uppercase">
                        {new Date(t.lastMessage.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="bg-slate-100 text-primary font-black text-[9px] px-2 py-0.5 rounded-full border border-outline-variant/20">
                        {t.messageCount}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Chat Detail Viewer */}
        <div className="hidden md:flex flex-grow flex-col overflow-hidden min-h-0 relative">
          {selectedThread ? (
            <div className="h-full flex flex-col justify-between overflow-hidden">
              
              {/* Monitoring Thread Header */}
              <div className="shrink-0 bg-[#001e40] px-5 py-4 text-white flex items-center justify-between border-b border-white/5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                    <span className="material-symbols-outlined text-white text-lg">shield</span>
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-sm leading-tight flex items-center gap-2">
                      Monitoring: {selectedThread.user1?.name} & {selectedThread.user2?.name}
                    </h3>
                    <p className="text-[9px] font-black text-[#F6C358] uppercase tracking-widest mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F6C358] animate-ping"></span>
                      Read-Only Audit Mode • {messages.length} messages
                    </p>
                  </div>
                </div>
                
                {/* Delete Entire Conversation */}
                <button
                  onClick={handleDeleteConversation}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-xs">delete_sweep</span>
                  Delete Thread
                </button>
              </div>

              {/* Chat timeline messages list */}
              <div className="flex-grow overflow-y-auto hide-scrollbar p-6 space-y-4 bg-slate-50/50 relative z-0">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="w-8 h-8 border-3 border-[#003366]/20 border-t-[#003366] rounded-full animate-spin"></span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-60">
                    <span className="material-symbols-outlined text-4xl mb-2 text-outline-variant">folder_open</span>
                    <p className="text-xs font-bold text-outline">Empty thread.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(m => {
                      const isLeftUser = m.sender_id === selectedThread.user1?.id;
                      const senderName = isLeftUser ? selectedThread.user1?.name : selectedThread.user2?.name;
                      const senderRole = isLeftUser ? selectedThread.user1?.role : selectedThread.user2?.role;
                      
                      const hasAttachment = !!m.file_url;
                      const fileType = m.file_type;
                      
                      return (
                        <div 
                          key={m.id} 
                          className={`flex flex-col max-w-[70%] group/msg relative ${isLeftUser ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                        >
                          <span className="text-[8px] font-black text-outline/70 uppercase tracking-widest px-1 mb-1">
                            {senderName} ({senderRole})
                          </span>
                          
                          <div className="flex gap-2 items-center w-full justify-end group-hover/msg:flex-row-reverse">
                            
                            {/* Message Bubble */}
                            <div className={`p-3.5 rounded-2xl text-[13px] font-medium leading-relaxed relative ${
                              isLeftUser 
                                ? 'bg-white border border-outline-variant/15 text-primary rounded-tl-none shadow-xs' 
                                : 'bg-[#003366]/5 border border-[#003366]/10 text-primary rounded-tr-none shadow-xs'
                            }`}>
                              {hasAttachment && (
                                <div className="mb-2">
                                  {fileType === 'image' && (
                                    <img 
                                      src={m.file_url!} 
                                      alt={m.file_name || 'image'} 
                                      onClick={() => setPreviewImageUrl(m.file_url!)}
                                      className="max-w-full max-h-44 rounded-xl cursor-zoom-in hover:brightness-95 transition-all"
                                    />
                                  )}
                                  {fileType === 'video' && (
                                    <video 
                                      src={m.file_url!} 
                                      controls 
                                      className="max-w-full max-h-44 rounded-xl bg-black"
                                    />
                                  )}
                                  {fileType === 'document' && (
                                    <a 
                                      href={m.file_url!} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2 rounded-xl border border-[#003366]/10 bg-white hover:bg-slate-50 transition-all text-primary"
                                    >
                                      <span className="material-symbols-outlined text-2xl text-[#003366]/70 shrink-0">description</span>
                                      <div className="text-left min-w-0">
                                        <p className="font-bold text-xs truncate">{m.file_name || 'Document'}</p>
                                        <p className="text-[9px] opacity-75 uppercase tracking-wider font-extrabold mt-0.5">Click to Open</p>
                                      </div>
                                    </a>
                                  )}
                                  {fileType === 'audio' && (
                                    <AudioPlayer 
                                      url={m.file_url!} 
                                      duration={m.duration}
                                      isSelf={isLeftUser}
                                    />
                                  )}
                                </div>
                              )}
                              {(!hasAttachment || fileType !== 'audio') && (
                                <div>{m.content}</div>
                              )}
                            </div>

                            {/* Delete single message trash button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(m)}
                              className="w-8 h-8 rounded-full border border-red-200 text-red-500 bg-white flex items-center justify-center shadow-xs opacity-0 group-hover/msg:opacity-100 hover:bg-red-50 hover:text-red-700 transition-all shrink-0 active:scale-90"
                              title="Delete Message"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                          
                          <span className="text-[8px] font-extrabold text-outline/50 uppercase mt-1 px-1">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

            </div>
          ) : (
            // Placeholder detail view
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-8">
              <span className="material-symbols-outlined text-6xl mb-4 text-[#003366]/20">policy</span>
              <h3 className="font-headline font-bold text-primary text-base">Select a conversation</h3>
              <p className="text-xs text-outline font-medium max-w-xs mt-1.5">Choose any staff dialogue thread on the left pane to view, audit, and moderate its contents.</p>
            </div>
          )}
        </div>

      </div>

      {/* Image Preview Overlay Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <img 
            src={previewImageUrl} 
            alt="Preview" 
            className="max-w-[90%] max-h-[85%] rounded-xl shadow-2xl object-contain" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
