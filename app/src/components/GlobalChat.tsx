import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../context/SessionContext';
import toast from 'react-hot-toast';

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
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  duration?: number | null;
}

// Custom Premium Audio Player component for voice messages
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
        ? 'bg-white/10 border-white/20 text-white' 
        : 'bg-slate-100 border-slate-200/50 text-primary'
    }`}>
      <button 
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 ${
          isSelf 
            ? 'bg-white text-primary hover:bg-slate-100' 
            : 'bg-[#003366] text-white hover:bg-[#001e40]'
        }`}
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
          className={`w-full h-1 rounded-lg appearance-none cursor-pointer range-sm ${
            isSelf ? 'bg-white/30 accent-white' : 'bg-slate-200 accent-primary'
          }`}
        />
        <div className={`flex justify-between text-[9px] font-black uppercase tracking-widest mt-1 ${
          isSelf ? 'text-white/70' : 'text-slate-500'
        }`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

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

  // Attachment and Voice states
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTypeRef = useRef<'image' | 'video' | 'document' | null>(null);
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

  // Attachment Triggers
  const triggerFileSelect = (type: 'image' | 'video' | 'document') => {
    fileTypeRef.current = type;
    setShowAttachmentMenu(false);
    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = 'image/*';
      else if (type === 'video') fileInputRef.current.accept = 'video/*';
      else fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedContact || !fileTypeRef.current) return;

    setIsUploading(true);
    const fileType = fileTypeRef.current;
    
    try {
      const ext = file.name.split('.').pop();
      const filePath = `chat_attachments/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      // Upload to the public 'task_images' bucket
      const { error: uploadError } = await supabase.storage
        .from('task_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task_images')
        .getPublicUrl(filePath);

      // Insert message with attachment info
      const mid = `MSG-${Math.floor(100000 + Math.random() * 900000)}`;
      const caption = `Sent a ${fileType}: ${file.name}`;
      
      const msgObj = {
        id: mid,
        sender_id: user.id,
        receiver_id: selectedContact.id,
        content: caption,
        type: 'chat',
        is_read: false,
        file_url: publicUrl,
        file_name: file.name,
        file_type: fileType
      };

      await supabase.from('messages').insert([msgObj]);
      toast.success(`${fileType} sent successfully!`);
    } catch (err: any) {
      console.error('File upload failed:', err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      fileTypeRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Audio Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Release all tracks
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) return;
        if (!user || !selectedContact) return;

        setIsUploading(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const filePath = `chat_attachments/audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;

          const { error: uploadError } = await supabase.storage
            .from('task_images')
            .upload(filePath, audioBlob);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('task_images')
            .getPublicUrl(filePath);

          const mid = `MSG-${Math.floor(100000 + Math.random() * 900000)}`;
          const msgObj = {
            id: mid,
            sender_id: user.id,
            receiver_id: selectedContact.id,
            content: 'Voice Message',
            type: 'chat',
            is_read: false,
            file_url: publicUrl,
            file_name: 'Voice Message.webm',
            file_type: 'audio',
            duration: recordingSeconds
          };

          await supabase.from('messages').insert([msgObj]);
          toast.success('Voice message sent!');
        } catch (err: any) {
          console.error('Audio upload failed:', err);
          toast.error('Failed to send voice message.');
        } finally {
          setIsUploading(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      toast.error('Please allow microphone permissions to record.');
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Temporarily overwrite onstop to avoid uploading
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      audioChunksRef.current = [];
      toast('Recording cancelled', { icon: '🗑️' });
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
                    const hasAttachment = !!m.file_url;
                    const fileType = m.file_type;
                    
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
                          {hasAttachment && (
                            <div className="mb-2">
                              {fileType === 'image' && (
                                <img 
                                  src={m.file_url!} 
                                  alt={m.file_name || 'image'} 
                                  onClick={() => setPreviewImageUrl(m.file_url!)}
                                  className="max-w-full max-h-48 rounded-xl cursor-zoom-in hover:brightness-95 transition-all"
                                />
                              )}
                              {fileType === 'video' && (
                                <video 
                                  src={m.file_url!} 
                                  controls 
                                  className="max-w-full max-h-48 rounded-xl bg-black"
                                />
                              )}
                              {fileType === 'document' && (
                                <a 
                                  href={m.file_url!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                                    isSelf 
                                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/15' 
                                      : 'bg-slate-50 border-outline-variant/20 text-primary hover:bg-slate-100'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-2xl shrink-0">description</span>
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
                                  isSelf={isSelf}
                                />
                              )}
                            </div>
                          )}
                          {/* Only show text caption/content if it's not voice message alone or standard caption */}
                          {(!hasAttachment || fileType !== 'audio') && (
                            <div>{m.content}</div>
                          )}
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
          <div className="shrink-0 p-4 bg-white border-t border-outline-variant/10 flex flex-col gap-2 relative">
            {isUploading && (
              <div className="flex items-center gap-2 pb-1 text-[10px] font-bold text-outline uppercase tracking-wider">
                <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></span>
                Sending Attachment...
              </div>
            )}
            
            {isRecording ? (
              <div className="flex items-center justify-between bg-error/5 border border-error/15 p-2 rounded-full w-full">
                <div className="flex items-center gap-2.5 px-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
                  <span className="text-xs font-bold text-error uppercase tracking-wider">
                    Recording ({formatRecordingTime(recordingSeconds)})
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="w-9 h-9 rounded-full bg-white border border-error/20 text-error flex items-center justify-center hover:bg-error/10 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopAndSendRecording}
                    className="w-9 h-9 rounded-full bg-error text-white flex items-center justify-center hover:bg-error/90 active:scale-95 transition-all shadow-md"
                  >
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center w-full">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachmentMenu(prev => !prev)}
                    className="w-11 h-11 rounded-full border border-outline-variant/40 bg-slate-50 text-outline hover:text-primary active:scale-95 transition-all flex items-center justify-center shrink-0"
                  >
                    <span className="material-symbols-outlined text-lg">attach_file</span>
                  </button>
                  
                  {showAttachmentMenu && (
                    <div className="absolute bottom-14 left-0 bg-white border border-outline-variant/15 rounded-2xl shadow-xl p-2 flex flex-col gap-1 z-50 min-w-[140px] animate-fade-in">
                      <button
                        type="button"
                        onClick={() => triggerFileSelect('image')}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-primary hover:bg-slate-50 rounded-xl text-left"
                      >
                        <span className="material-symbols-outlined text-base text-secondary">image</span>
                        Image
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerFileSelect('video')}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-primary hover:bg-slate-50 rounded-xl text-left"
                      >
                        <span className="material-symbols-outlined text-base text-tertiary">movie</span>
                        Video
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerFileSelect('document')}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-primary hover:bg-slate-50 rounded-xl text-left"
                      >
                        <span className="material-symbols-outlined text-base text-amber-600">description</span>
                        Document
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <input 
                  type="text" 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-grow h-11 bg-slate-50 border border-outline-variant/40 rounded-full px-4 text-xs font-medium placeholder-outline focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
                
                {newMessage.trim() ? (
                  <button 
                    type="submit"
                    className="w-11 h-11 rounded-full button-gradient text-white flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0"
                  >
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-11 h-11 rounded-full bg-[#003366] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0 hover:bg-[#001e40]"
                  >
                    <span className="material-symbols-outlined text-lg">mic</span>
                  </button>
                )}
              </form>
            )}
          </div>
        )}
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
