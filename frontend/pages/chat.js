import { toast } from 'react-hot-toast';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import dynamic from 'next/dynamic';
import ChatBubble from '../components/ChatBubble';
import Sidebar from '../components/Sidebar';
import ProfileModal from '../components/ProfileModal';
import SettingsPanel from '../components/SettingsPanel';
import PricingModal from '../components/PricingModal';
import WorkflowDropdown from '../components/WorkflowDropdown';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import MembersModal from '../components/MembersModal';
import { LocaleContext } from './_app';
import { useTheme } from '../contexts/ThemeContext';
import { API_URL as API, SOCKET_URL, getToken } from '../utils/apiConfig';
import { Bot, Briefcase, Code, Palette, Gem, Sparkles } from 'lucide-react';

// Dynamic import for emoji picker (client-side only)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const PERSONAS = [
  { id: 'default', name: 'Assistant', Icon: Bot, desc: 'Helpful and generic AI assistant.' },
  { id: 'professional', name: 'Professional', Icon: Briefcase, desc: 'Formal, concise, and business-oriented.' },
  { id: 'coder', name: 'Coder', Icon: Code, desc: 'Expert in programming, debugging, and architecture.' },
  { id: 'creative', name: 'Creative', Icon: Palette, desc: 'Imaginative, artistic, and brainstorming partner.' },
];

// Helper function to group messages by date
function groupMessagesByDate(messages) {
  const groups = [];
  let currentGroup = null;

  messages.forEach((msg) => {
    const msgDate = (msg.created_at || msg.createdAt) ? new Date(msg.created_at || msg.createdAt) : new Date();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label = '';
    if (msgDate.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, messages: [] };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  });

  return groups;
}

export default function ChatPage() {
  const { t, locale, setLocale } = useContext(LocaleContext);
  const { theme, setTheme } = useTheme();
  const themeDark = theme !== 'light';
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('default');
  // NOTE: static defaults on purpose — persisted values hydrate in the mount
  // effect below. Reading localStorage here breaks SSR hydration.
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const router = useRouter();
  const listRef = useRef(null);
  const socketRef = useRef(null);

  function handleAuthError() {
    localStorage.removeItem('tc_token');
    router.replace('/login');
  }

  // Load workflows function (outside useEffect so it can be reused)
  async function loadWorkflows(workspaceId = null) {
    try {
      const token = getToken();
      if (!token) return;

      const url = workspaceId
        ? `${API}/api/workflows?workspace_id=${workspaceId}`
        : `${API}/api/workflows`;

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        const data = await resp.json();
        const list = Array.isArray(data) ? data : [];
        setWorkflows(list);
        if (list.length > 0) {
          const savedWf = localStorage.getItem('tc_selected_workflow');
          const matched = list.find(w => w.id === savedWf);
          setSelectedWorkflow(prev => {
            if (prev && list.some(w => w.id === prev)) return prev;
            return matched ? matched.id : list[0].id;
          });
        }
      } else {
        console.error('Failed to load workflows. Status:', resp.status);
      }
    } catch (err) {
      console.error('loadWorkflows error', err);
    } finally {
      setWorkflowsLoading(false);
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return; // Early return, no cleanup needed
    }

    // Hydrate persisted UI state after mount (SSR-safe: server renders defaults,
    // client converges here — reading storage during render breaks hydration).
    try {
      setSelectedWorkflow(localStorage.getItem('tc_selected_workflow') || null);
      setSidebarCollapsed(localStorage.getItem('sidebar_collapsed') === 'true');
    } catch (e) {}

    // compact mode (denser UI)
    try {
      const compact = localStorage.getItem('tc_compact');
      if (compact === 'true') {
        document.documentElement.classList.add('compact');
      } else {
        document.documentElement.classList.remove('compact');
      }
    } catch (e) { }

    // load chats from server for this user
    async function loadChats(workspaceId) {
      try {
        const validWs = (workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null') ? workspaceId : null;
        const url = validWs
          ? `${API}/api/chat/list?workspace_id=${validWs}`
          : `${API}/api/chat/list`;

        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (resp.status === 401 || resp.status === 403) return handleAuthError();
        const data = await resp.json();
        const chatList = Array.isArray(data) ? data : [];

        // Determine active chat
        const savedActive = localStorage.getItem('tc_active_chat');
        const parsedSaved = savedActive ? parseInt(savedActive, 10) : null;
        const activeTarget = (parsedSaved && chatList.some((c) => c.id === parsedSaved))
          ? parsedSaved
          : (chatList.length > 0 ? chatList[0].id : null);

        // Fetch active chat messages eagerly so refresh is instant and seamless
        let initialMessages = [];
        if (activeTarget) {
          try {
            const histResp = await fetch(`${API}/api/chat/history?chat_id=${activeTarget}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (histResp.ok) {
              const histData = await histResp.json();
              initialMessages = (histData.messages || []).map((m) => ({
                id: m.id,
                sender: m.sender,
                type: m.type,
                text: m.type === 'text' ? m.text : null,
                image: m.type === 'image' ? m.text : null,
                audio: m.type === 'audio' ? m.text : null,
                video: m.type === 'video' ? m.text : null,
                file: m.type === 'file' ? { url: m.text, name: m.metadata?.name || 'File' } : null,
                time: (m.created_at || m.createdAt) ? new Date(m.created_at || m.createdAt).toLocaleTimeString() : ''
              }));
              if (histData.chat) {
                if (histData.chat.workflowId) setSelectedWorkflow(histData.chat.workflowId);
                if (histData.chat.persona) setSelectedPersona(histData.chat.persona);
              }
            }
          } catch (e) {
            console.error('initial messages fetch error', e);
          }
        }

        setChats(chatList.map((c) => ({
          ...c,
          messages: c.id === activeTarget ? initialMessages : []
        })));

        if (activeTarget) {
          setActiveChatId(activeTarget);
          try { localStorage.setItem('tc_active_chat', activeTarget); } catch (e) {}
          if (socketRef.current) socketRef.current.emit('chat:join', activeTarget);
        } else {
          setActiveChatId(null);
        }
      } catch (err) {
        console.error('loadChats error', err);
        setChats([]);
      }
    }

    // Load initial chats based on saved workspace or default
    const rawWorkspaceId = localStorage.getItem('current_workspace_id');
    const savedWorkspaceId = (rawWorkspaceId && rawWorkspaceId !== 'undefined' && rawWorkspaceId !== 'null') ? rawWorkspaceId : null;
    loadChats(savedWorkspaceId);
    loadWorkflows(savedWorkspaceId);

    // No cleanup needed for this effect
  }, [router]);

  // Reload chats when workspace changes
  useEffect(() => {
    // Only run if currentWorkspace has been explicitly set/changed
    if (currentWorkspace === undefined || currentWorkspace === null) return;

    async function reloadChats() {
      const token = getToken();
      if (!token) return;

      try {
        const validWs = (currentWorkspace?.id && currentWorkspace.id !== 'undefined' && currentWorkspace.id !== 'null') ? currentWorkspace.id : null;
        const url = validWs
          ? `${API}/api/chat/list?workspace_id=${validWs}`
          : `${API}/api/chat/list`;

        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (resp.ok) {
          const data = await resp.json();
          const chatList = Array.isArray(data) ? data : [];
          setChats((prevChats) => {
            return chatList.map((c) => {
              const existing = prevChats.find((p) => p.id === c.id);
              return {
                ...c,
                messages: existing?.messages?.length ? existing.messages : []
              };
            });
          });

          if (activeChatId && !chatList.some((c) => c.id === activeChatId)) {
            if (chatList.length > 0) {
              selectChat(chatList[0].id);
            } else {
              setActiveChatId(null);
            }
          }
        }
      } catch (err) {
        console.error('Reload chats error:', err);
      }
    }

    reloadChats();
  }, [currentWorkspace]);

  // Reload workflows when workspace changes
  useEffect(() => {
    if (currentWorkspace === undefined || currentWorkspace === null) return;

    async function reloadWorkflows() {
      const token = getToken();
      if (!token) return;

      try {
        setWorkflowsLoading(true);
        const workspaceId = currentWorkspace?.id;
        const url = workspaceId
          ? `${API}/api/workflows?workspace_id=${workspaceId}`
          : `${API}/api/workflows`;

        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (resp.ok) {
          const data = await resp.json();
          const list = Array.isArray(data) ? data : [];
          setWorkflows(list);

          if (list.length > 0) {
            setSelectedWorkflow((prev) => {
              if (prev && list.some((w) => w.id === prev)) return prev;
              return list[0].id;
            });
          }
        }
      } catch (err) {
        console.error('Reload workflows error:', err);
      } finally {
        setWorkflowsLoading(false);
      }
    }

    reloadWorkflows();
  }, [currentWorkspace]);

  // Socket.io connection & event handling — connect ONCE per session.
  // Personal-chat contract (backend src/routes/chat.js): `message`, `ai:thinking`.
  // Joining a different chat only emits `chat:join`, never reconnects.
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (activeChatId) {
        socket.emit('chat:join', activeChatId);
      }
    });

    socket.on('message', (data) => {
      const { chatId, message } = data;
      const targetId = parseInt(chatId, 10);
      setIsTyping(false);
      setLoading(false);

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === targetId) {
            const msgs = c.messages || [];
            if (msgs.some((m) => m.id === message.id)) return c;

            if (message.sender === 'user') {
              const optIndex = msgs.findIndex((m) => String(m.id).startsWith('u-') && m.text === message.text);
              if (optIndex !== -1) {
                const updated = [...msgs];
                updated[optIndex] = { ...message, time: new Date(message.created_at || message.createdAt || Date.now()).toLocaleTimeString() };
                return { ...c, messages: updated };
              }
            }

            return {
              ...c,
              messages: [...msgs, { ...message, time: new Date(message.created_at || message.createdAt || Date.now()).toLocaleTimeString() }]
            };
          }
          return c;
        });
      });
    });

    socket.on('ai:thinking', (data) => {
      if (data && (parseInt(data.chatId, 10) === activeChatId || !data.chatId)) {
        setIsTyping(!!data.isThinking);
      }
    });

    socket.on('ai:error', (data) => {
      setIsTyping(false);
      setLoading(false);
      if (data?.message) toast.error(data.message);
    });

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, []);

  // Join the active personal-chat room without reconnecting the socket.
  useEffect(() => {
    if (socketRef.current && activeChatId) {
      socketRef.current.emit('chat:join', activeChatId);
    }
  }, [activeChatId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chats, activeChatId]);

  function saveChats(nextChats, nextActive) {
    try {
      if (nextActive) localStorage.setItem('tc_active_chat', nextActive);
      else localStorage.removeItem('tc_active_chat');
    } catch (e) { }
  }

  function handleStartNewChat() {
    setActiveChatId(null);
    try {
      localStorage.removeItem('tc_active_chat');
    } catch (e) { }
    setShowSidebar(false);
  }

  async function createNewChat(firstMessageText = null) {
    const token = getToken();
    if (!token) return router.replace('/login');
    try {
      let initialTitle = 'New Chat';
      if (firstMessageText) {
        const cleaned = firstMessageText.replace(/\s+/g, ' ').trim();
        const words = cleaned.split(/\s+/).slice(0, 6).join(' ');
        initialTitle = words.charAt(0).toUpperCase() + words.slice(1);
      }

      const resp = await fetch(`${API}/api/chat/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: initialTitle,
          persona: selectedPersona,
          workflowId: selectedWorkflow,
          workspaceId: currentWorkspace?.id
        })
      });
      if (resp.status === 401 || resp.status === 403) return handleAuthError();
      const chat = await resp.json();
      const newChat = { ...chat, messages: [] };
      const next = [newChat, ...chats.filter(c => c.id !== newChat.id)];
      setChats(next);
      setActiveChatId(newChat.id);
      saveChats(next, newChat.id);
      setShowSidebar(false);

      if (socketRef.current) {
        socketRef.current.emit('chat:join', newChat.id);
      }

      return newChat.id;
    } catch (err) {
      console.error('createNewChat error', err);
      return null;
    }
  }

  function selectChat(id, availableChats = null) {
    if (!id) return;
    setActiveChatId(id);
    try {
      localStorage.setItem('tc_active_chat', id);
    } catch (e) { }
    setShowSidebar(false);

    // Sync selected workflow and persona from active chat
    const sourceList = availableChats || chats;
    const currentChat = sourceList.find((c) => c.id === id);
    if (currentChat) {
      if (currentChat.workflowId) setSelectedWorkflow(currentChat.workflowId);
      if (currentChat.persona) setSelectedPersona(currentChat.persona);
    }

    if (socketRef.current) {
      socketRef.current.emit('chat:join', id);
    }

    // fetch messages for this chat
    (async () => {
      const token = getToken();
      if (!token) return router.replace('/login');
      try {
        const resp = await fetch(`${API}/api/chat/history?chat_id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (resp.status === 401 || resp.status === 403) return handleAuthError();
        if (!resp.ok) return;
        const data = await resp.json();
        const msgs = (data.messages || []).map((m) => ({
          id: m.id,
          sender: m.sender,
          type: m.type,
          text: m.type === 'text' ? m.text : null,
          image: m.type === 'image' ? m.text : null,
          audio: m.type === 'audio' ? m.text : null,
          video: m.type === 'video' ? m.text : null,
          file: m.type === 'file' ? { url: m.text, name: m.metadata?.name || 'File' } : null,
          time: (m.created_at || m.createdAt) ? new Date(m.created_at || m.createdAt).toLocaleTimeString() : ''
        }));
        if (data.chat) {
          if (data.chat.workflowId) setSelectedWorkflow(data.chat.workflowId);
          if (data.chat.persona) setSelectedPersona(data.chat.persona);
        }
        setChats((prev) => prev.map((c) => (c.id === id ? { ...c, messages: msgs } : c)));
      } catch (err) {
        console.error('selectChat load messages error', err);
      }
    })();
  }

  function deleteChat(id) {
    (async () => {
      const token = getToken();
      if (!token) return router.replace('/login');
      try {
        const resp = await fetch(`${API}/api/chat/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (resp.status === 401 || resp.status === 403) return handleAuthError();
        if (!resp.ok) throw new Error('Failed to delete');
        const next = chats.filter((c) => c.id !== id);
        setChats(next);
        if (activeChatId === id) {
          const nextActive = next.length ? next[0].id : null;
          setActiveChatId(nextActive);
          saveChats(next, nextActive);
          if (nextActive) selectChat(nextActive);
        } else {
          saveChats(next, activeChatId);
        }
      } catch (err) {
        console.error('deleteChat error', err);
      }
    })();
  }

  async function renameChat(id, newTitle) {
    if (!newTitle || !newTitle.trim()) return;
    try {
      const token = getToken();
      if (!token) return router.replace('/login');
      const resp = await fetch(`${API}/api/chat/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      if (resp.status === 401 || resp.status === 403) return handleAuthError();
      if (!resp.ok) throw new Error('Failed to rename chat');
      const updatedTitle = newTitle.trim();
      setChats((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, title: updatedTitle } : c));
        saveChats(next, activeChatId);
        return next;
      });
      toast.success(isRtl ? 'تمت إعادة تسمية المحادثة' : 'Chat renamed');
    } catch (err) {
      console.error('renameChat error', err);
      toast.error(isRtl ? 'فشل تعديل الاسم' : 'Failed to rename chat');
    }
  }

  async function togglePinChat(id, isPinned) {
    try {
      const token = getToken();
      if (!token) return router.replace('/login');
      const resp = await fetch(`${API}/api/chat/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pinned: isPinned })
      });
      if (resp.status === 401 || resp.status === 403) return handleAuthError();
      if (!resp.ok) throw new Error('Failed to update pin status');
      setChats((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, pinned: isPinned } : c));
        saveChats(next, activeChatId);
        return next;
      });
      toast.success(isPinned ? (isRtl ? 'تم تثبيت المحادثة' : 'Chat pinned') : (isRtl ? 'تم إلغاء التثبيت' : 'Chat unpinned'));
    } catch (err) {
      console.error('togglePinChat error', err);
      toast.error(isRtl ? 'فشل تحديث التثبيت' : 'Failed to update pin');
    }
  }

  async function sendMessage(e) {
    e && e.preventDefault();
    if (loading) return; // prevent double-sends
    const trimmed = text.trim();
    if (!trimmed) return;
    const token = localStorage.getItem('tc_token');
    if (!token) return router.replace('/login');

    let chatId = activeChatId;
    let isNewChat = false;
    if (!chatId) {
      chatId = await createNewChat(trimmed);
      if (!chatId) return;
      isNewChat = true;
    }

    const unifiedMsg = {
      type: 'text',
      text: trimmed,
      audio: null,
      image: null,
      video: null,
      file: null
    };

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      ...unifiedMsg,
      time: new Date().toLocaleTimeString()
    };

    // Optimistic update using functional state
    setChats((currentChats) => {
      return currentChats.map((c) => (c.id === chatId ? { ...c, messages: [...(c.messages || []), userMsg] } : c));
    });

    setText('');
    setLoading(true);
    setIsTyping(true); // Show typing indicator

    try {
      const resp = await fetch(`${API}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          chat_id: chatId,
          message: unifiedMsg
        }),
      });

      if (resp.status === 429) {
        const data = await resp.json();
        toast.error(data.message || 'Daily limit reached. Upgrade to Pro.');
        setLoading(false);
        setIsTyping(false);
        return;
      }

      if (resp.status === 401 || resp.status === 403) return handleAuthError();

      if (resp.ok) {
        try {
          const respData = await resp.json();
          if (respData.reply) {
            const aiMsg = {
              id: respData.reply.id || `ai-${Date.now()}`,
              sender: 'ai',
              type: respData.reply.type || 'text',
              text: respData.reply.text,
              time: new Date(respData.reply.created_at || respData.reply.createdAt || Date.now()).toLocaleTimeString()
            };
            setChats((currentChats) =>
              currentChats.map((c) => {
                if (c.id === chatId) {
                  const msgs = c.messages || [];
                  if (msgs.some((m) => m.id === aiMsg.id)) return c;
                  return { ...c, messages: [...msgs, aiMsg] };
                }
                return c;
              })
            );
            setIsTyping(false);
            setLoading(false);
          }
        } catch (e) {}
      }

      if (socketRef.current) {
        socketRef.current.emit('chat:join', chatId);
      }

      // Title update for first message in new chats
      if (isNewChat) {
        const generateTitle = (txt) => {
          const cleaned = (txt || 'Chat').replace(/\s+/g, ' ').trim();
          const words = cleaned.split(/\s+/).slice(0, 6).join(' ');
          return words.charAt(0).toUpperCase() + words.slice(1).replace(/[.!?]$/, '');
        };
        const newTitle = generateTitle(trimmed).slice(0, 60);
        fetch(`${API}/api/chat/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: newTitle })
        }).catch((err) => console.error('title update error', err));

        setChats((currentChats) => currentChats.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c)));
      }

      // Resilient background poll after 4 seconds to catch AI reply if socket missed
      setTimeout(async () => {
        try {
          const tokenCheck = localStorage.getItem('tc_token');
          if (!tokenCheck) return;
          const r = await fetch(`${API}/api/chat/history?chat_id=${chatId}`, { headers: { Authorization: `Bearer ${tokenCheck}` } });
          if (r.ok) {
            const d = await r.json();
            const msgs = (d.messages || []).map((m) => ({
              id: m.id,
              sender: m.sender,
              type: m.type,
              text: m.type === 'text' ? m.text : null,
              image: m.type === 'image' ? m.text : null,
              audio: m.type === 'audio' ? m.text : null,
              video: m.type === 'video' ? m.text : null,
              file: m.type === 'file' ? { url: m.text, name: m.metadata?.name || 'File' } : null,
              time: (m.created_at || m.createdAt) ? new Date(m.created_at || m.createdAt).toLocaleTimeString() : ''
            }));
            setChats((currentChats) => currentChats.map((c) => (c.id === chatId ? { ...c, messages: msgs } : c)));
            if (msgs.some((m) => m.sender === 'ai')) {
              setIsTyping(false);
            }
          }
        } catch (pollErr) {
          console.error('poll error', pollErr);
        }
      }, 4000);

    } catch (err) {
      console.error('sendMessage error', err);
      toast.error('Failed to send message');
      setIsTyping(false);
    } finally {
      setLoading(false);
    }
  }


  const isRtl = locale === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  function setThemePreset(preset) {
    setTheme(preset);
  }

  function handleWorkflowChange(workflowId) {
    setSelectedWorkflow(workflowId);
    try {
      localStorage.setItem('tc_selected_workflow', workflowId);
    } catch (e) { }
  }

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice-message.webm');

        try {
          setLoading(true);
          const token = getToken();
          const res = await fetch(`${API}/api/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();

          const fileUrl = `${API}${data.url}`;

          if (!activeChatId) {
            alert("Please start a chat with a text message first before sending voice.");
            setLoading(false);
            return;
          }

          const unifiedMsg = {
            type: 'audio',
            text: null,
            audio: fileUrl,
            image: null,
            video: null,
            file: null
          };

          // Send message with file URL
          const token2 = localStorage.getItem('tc_token');
          await fetch(`${API}/api/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
            body: JSON.stringify({ chat_id: activeChatId, message: unifiedMsg })
          });

          // Reload messages
          const r = await fetch(`${API}/api/chat/history?chat_id=${activeChatId}`, { headers: { Authorization: `Bearer ${token2}` } });
          if (r.ok) {
            const d = await r.json();
            const msgs = (d.messages || []).map((m) => ({
              id: m.id,
              sender: m.sender,
              type: m.type,
              text: m.type === 'text' ? m.text : null,
              image: m.type === 'image' ? m.text : null,
              audio: m.type === 'audio' ? m.text : null,
              video: m.type === 'video' ? m.text : null,
              file: m.type === 'file' ? { url: m.text, name: m.metadata?.name || 'File' } : null,
              time: (m.created_at || m.createdAt) ? new Date(m.created_at || m.createdAt).toLocaleTimeString() : ''
            }));
            setChats((currentChats) => currentChats.map((c) => (c.id === activeChatId ? { ...c, messages: msgs } : c)));
          }

        } catch (err) {
          console.error(err);
          alert('Voice upload failed');
        } finally {
          setLoading(false);
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please ensure you have granted permission.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function handleFileUpload(file) {
    if (!file) return;

    let chatId = activeChatId;
    if (!chatId) {
      chatId = await createNewChat(file.name || 'Attachment');
      if (!chatId) return;
    }

    // Determine type based on file MIME type
    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('audio/')) type = 'audio';
    else if (file.type.startsWith('video/')) type = 'video';

    // Create optimistic message with local file preview
    const tempId = `temp-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);

    const optimisticMsg = {
      id: tempId,
      sender: 'user',
      type,
      text: null,
      image: type === 'image' ? localUrl : null,
      audio: type === 'audio' ? localUrl : null,
      video: type === 'video' ? localUrl : null,
      file: type === 'file' ? { url: localUrl, name: file.name } : null,
      filename: file.name,
      time: new Date().toLocaleTimeString(),
      uploading: true
    };

    // Show immediately (optimistic UI)
    setChats((currentChats) => {
      return currentChats.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...(c.messages || []), optimisticMsg] }
          : c
      );
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const token = getToken();

      // Upload file
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      // Send file URL as message
      const fileUrl = `${API}${data.url}`;

      const unifiedMsg = {
        type,
        text: null,
        audio: type === 'audio' ? fileUrl : null,
        image: type === 'image' ? fileUrl : null,
        video: type === 'video' ? fileUrl : null,
        file: type === 'file' ? { url: fileUrl, name: file.name } : null
      };

      // Send message with file URL and type
      await fetch(`${API}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chat_id: chatId, message: unifiedMsg })
      });

      // Reload messages to get server version
      const r = await fetch(`${API}/api/chat/history?chat_id=${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (r.ok) {
        const d = await r.json();
        const msgs = (d.messages || []).map((m) => ({
          id: m.id,
          sender: m.sender,
          type: m.type,
          text: m.type === 'text' ? m.text : null,
          image: m.type === 'image' ? `${API}${m.text}` : null,
          audio: m.type === 'audio' ? `${API}${m.text}` : null,
          video: m.type === 'video' ? `${API}${m.text}` : null,
          file: m.type === 'file' ? { url: `${API}${m.text}`, name: m.metadata?.name || 'File' } : null,
          filename: m.text,
          time: (m.created_at || m.createdAt) ? new Date(m.created_at || m.createdAt).toLocaleTimeString() : ''
        }));

        setChats((currentChats) =>
          currentChats.map((c) =>
            c.id === chatId ? { ...c, messages: msgs } : c
          )
        );
      }

      URL.revokeObjectURL(localUrl);

    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'فشل رفع الملف' : 'Upload failed');

      setChats((currentChats) => {
        return currentChats.map((c) =>
          c.id === chatId
            ? { ...c, messages: c.messages.filter(m => m.id !== tempId) }
            : c
        );
      });

      URL.revokeObjectURL(localUrl);
    } finally {
      setLoading(false);
    }
  }

  function toggleCompact() {
    try {
      const isCompact = document.documentElement.classList.toggle('compact');
      localStorage.setItem('tc_compact', isCompact ? 'true' : 'false');
    } catch (e) { }
  }

  async function handleWorkflowChange(workflowId) {
    setSelectedWorkflow(workflowId);

    // If we have an active chat, update its workflow immediately
    if (activeChatId) {
      try {
        const token = getToken();
        if (!token) return;

        await fetch(`${API}/api/chat/${activeChatId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ workflowId })
        });

        // Update local chat state
        setChats(prev => prev.map(c =>
          c.id === activeChatId
            ? { ...c, workflowId, workflow: workflows.find(w => w.id === workflowId) }
            : c
        ));
      } catch (err) {
        console.error('Failed to update chat workflow:', err);
      }
    }
  }

  return (
    <div dir={dir} className="h-screen w-full overflow-hidden relative flex font-sans">
      {/* Animated Gradient Background */}
      <div className="mesh-bg"></div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${showSidebar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowSidebar(false)}
      />

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 h-full transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar
          chats={chats}
          activeId={activeChatId}
          onSelect={selectChat}
          onNew={handleStartNewChat}
          onDelete={deleteChat}
          onRename={renameChat}
          onTogglePin={togglePinChat}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => {
            const newState = !sidebarCollapsed;
            setSidebarCollapsed(newState);
            localStorage.setItem('sidebar_collapsed', newState);
          }}
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={(workspace) => {
            setCurrentWorkspace(workspace);
            setActiveChatId(null); // Clear active chat when switching workspace
          }}
          onCreateWorkspace={() => setShowCreateWorkspace(true)}
          onManageMembers={() => setShowMembersModal(true)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative w-full">

        {/* Header */}
        <header className="h-16 shrink-0 glass-header flex items-center justify-between px-4 sm:px-6 z-10 relative border-b border-gray-200/50 dark:border-border">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 -ml-2 text-gray-600 dark:text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover rounded-xl transition-all"
              onClick={() => setShowSidebar(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {/* Workflow Dropdown */}
            <WorkflowDropdown
              workflows={workflows}
              selected={selectedWorkflow}
              onSelect={handleWorkflowChange}
              loading={workflowsLoading}
            />

            {/* Chat Title */}
            <div className="flex items-center gap-2">
              {!editingTitle ? (
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-1.5 cursor-pointer"
                    onClick={() => { const t = chats.find((c) => c.id === activeChatId)?.title || ''; setTitleValue(t); setEditingTitle(true); }}
                    title="Rename chat"
                  >
                    <h1 className="font-bold text-lg text-gray-900 dark:text-foreground truncate max-w-[180px] sm:max-w-md">
                      {(chats.find((c) => c.id === activeChatId)?.title) || 'New Chat'}
                    </h1>
                    <svg className="w-4 h-4 text-gray-400 hover:text-accent transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>

                  {activeChatId && (
                    <button
                      type="button"
                      onClick={() => {
                        const activeChat = chats.find((c) => c.id === activeChatId);
                        if (activeChat) togglePinChat(activeChat.id, !activeChat.pinned);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        chats.find((c) => c.id === activeChatId)?.pinned
                          ? 'text-warning hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          : 'text-gray-400 hover:text-warning hover:bg-gray-100 dark:hover:bg-surface-hover'
                      }`}
                      title={chats.find((c) => c.id === activeChatId)?.pinned ? "Unpin" : "Pin"}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={chats.find((c) => c.id === activeChatId)?.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="17" x2="12" y2="22" />
                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={async (e) => { e.preventDefault(); try { const token = localStorage.getItem('tc_token'); if (!token) return router.replace('/login'); await fetch(`${API}/api/chat/${activeChatId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: titleValue }) }); setChats((prev) => prev.map((c) => c.id === activeChatId ? { ...c, title: titleValue } : c)); } catch (err) { console.error('title save', err); } finally { setEditingTitle(false); } }} className="flex items-center gap-2">
                  <input autoFocus value={titleValue} onChange={(e) => setTitleValue(e.target.value)} className="px-3 py-1.5 rounded-lg border border-accent dark:border-accent bg-white dark:bg-surface text-sm focus:ring-2 focus:ring-accent outline-none" />
                  <button type="submit" className="p-1.5 text-success hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></button>
                  <button type="button" className="p-1.5 text-danger hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" onClick={() => setEditingTitle(false)}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </form>
              )}
            </div>
          </div>


          <div className="flex items-center gap-3">
            {/* Upgrade Button - Premium Design */}
            <button
              onClick={() => setShowPricing(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-background text-sm font-bold rounded-full shadow-lg transition-all duration-200"
            >
              <Gem size={18} />
              <span>Upgrade</span>
            </button>

            {/* Theme Toggle - Redesigned */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-surface rounded-full p-1 shadow-inner">
              <button
                onClick={() => setThemePreset('light')}
                aria-label="Light mode"
                aria-pressed={!themeDark}
                className={`p-2 rounded-full transition-all duration-200 ${!themeDark ? 'bg-white shadow-md text-warning scale-110' : 'text-gray-400 hover:text-gray-600 dark:hover:text-secondary'}`}
                title="Light Mode"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </button>
              <button
                onClick={() => setThemePreset('dark')}
                aria-label="Dark mode"
                aria-pressed={themeDark}
                className={`p-2 rounded-full transition-all duration-200 ${themeDark ? 'bg-gray-700 shadow-md text-info scale-110' : 'text-gray-400 hover:text-gray-600 dark:hover:text-secondary'}`}
                title="Dark Mode"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              </button>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
                aria-label="Account menu"
                className="w-10 h-10 rounded-full bg-accent text-background flex items-center justify-center font-bold hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                U
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div role="menu" className="absolute right-0 mt-2 w-60 bg-white dark:bg-surface shadow-lg shadow-black/10 dark:shadow-black/40 border border-gray-200 dark:border-border rounded-lg py-1.5 z-50 animate-scaleIn">
                    <button
                      role="menuitem"
                      onClick={() => router.push('/dashboard')}
                      className="w-full px-4 py-2.5 text-left text-[14px] font-semibold text-gray-700 dark:text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-surface-hover"
                    >
                      <svg className="w-[18px] h-[18px] text-gray-400 dark:text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.75" d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" /></svg>
                      <span>Dashboard</span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setShowProfile(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[14px] font-semibold text-gray-700 dark:text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-surface-hover"
                    >
                      <svg className="w-[18px] h-[18px] text-gray-400 dark:text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.75" d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg>
                      <span>Profile</span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setShowSettings(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[14px] font-semibold text-gray-700 dark:text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-surface-hover"
                    >
                      <svg className="w-[18px] h-[18px] text-gray-400 dark:text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.75" d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 01-.1 1.2l2 1.6-2 3.4-2.4-1a7 7 0 01-2 1.2L14 20h-4l-.5-2.6a7 7 0 01-2-1.2l-2.4 1-2-3.4 2-1.6A7 7 0 015 12a7 7 0 01.1-1.2l-2-1.6 2-3.4 2.4 1a7 7 0 012-1.2L10 4h4l.5 2.6a7 7 0 012 1.2l2.4-1 2 3.4-2 1.6c.06.4.1.8.1 1.2z" /></svg>
                      <span>Settings</span>
                    </button>
                    <hr className="my-1.5 border-gray-200 dark:border-border" />
                    <button
                      role="menuitem"
                      onClick={async () => {
                        setShowProfileMenu(false);
                        try {
                          const token = getToken();
                          if (token) {
                            await fetch(`${API}/api/auth/logout`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                          }
                        } catch (e) {}
                        try {
                          localStorage.removeItem('tc_token');
                          localStorage.removeItem('tc_user');
                        } catch (e) {}
                        router.replace('/login');
                      }}
                      className="w-full px-4 py-2.5 text-left text-[14px] font-semibold text-danger dark:text-danger hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:bg-red-50 dark:focus-visible:bg-red-500/10"
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.75" d="M14 4H6v16h8M10 12h11M18 8l3 4-3 4" /></svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        {showSettings && <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />}
        {showPricing && (
          <PricingModal
            isOpen={showPricing}
            onClose={() => setShowPricing(false)}
            currentWorkspace={currentWorkspace}
            onUpgrade={() => {
              // Refresh workspace data
              if (currentWorkspace) {
                // We might need a way to reload the current workspace or just reload the page
                window.location.reload();
              }
            }}
          />
        )}
        {showCreateWorkspace && (
          <CreateWorkspaceModal
            isOpen={showCreateWorkspace}
            onClose={() => setShowCreateWorkspace(false)}
            onCreated={(workspace) => {
              setCurrentWorkspace(workspace);
              toast.success('Workspace created! Switch to it from the sidebar.');
            }}
          />
        )}
        {showMembersModal && currentWorkspace && (
          <MembersModal
            isOpen={showMembersModal}
            onClose={() => setShowMembersModal(false)}
            workspace={currentWorkspace}
          />
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
            <div className="max-w-3xl mx-auto space-y-6">
              {!activeChatId && (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 py-10">
                  <div className="w-20 h-20 bg-accent rounded-card flex items-center justify-center mb-6 shadow-lg ring-1 ring-white/20">
                    <svg className="w-10 h-10 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">
                    {isRtl ? 'شخصيات الذكاء الاصطناعي' : 'AI Personas'}
                  </p>
                  <h3 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-foreground mb-2">
                    {isRtl ? 'مرحباً بك في TargetChat' : 'Welcome to TargetChat'}
                  </h3>
                  <p className="text-[15px] text-gray-500 dark:text-muted max-w-md mb-8">
                    {isRtl ? 'اختر شخصية الذكاء الاصطناعي المناسبة للبدء.' : 'Select a persona to start your conversation.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl">
                    {PERSONAS.map((p) => {
                      const selected = selectedPersona === p.id;
                      return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPersona(p.id)}
                        aria-pressed={selected}
                        className={`group relative p-4 rounded-card border text-start cursor-pointer transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${selected
                          ? 'border-accent bg-accent/10 dark:bg-accent/10 shadow-md ring-1 ring-accent/40'
                          : 'border-gray-200 dark:border-border bg-white/80 dark:bg-surface hover:border-accent dark:hover:border-accent hover:shadow-md'
                          }`}
                      >
                        {selected && (
                          <span className="absolute top-3 end-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                            <svg className="w-3 h-3 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${selected ? 'bg-accent/15 dark:bg-accent/15' : 'bg-gray-100 dark:bg-surface-elevated group-hover:bg-accent/10'}`}><p.Icon size={20} /></div>
                        <div className="font-semibold text-[15px] text-gray-900 dark:text-foreground tracking-tight">{p.name}</div>
                        <div className="text-[13px] leading-relaxed text-gray-500 dark:text-muted mt-1 pe-6">{p.desc}</div>
                      </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(activeChatId && chats.find((c) => c.id === activeChatId) ? chats.find((c) => c.id === activeChatId).messages : []).map((m) => (
                <ChatBubble key={m.id} sender={m.sender} message={m} />
              ))}

              {loading && (
                <div className="flex justify-start animate-fade-in-up">
                  <div className="bg-white dark:bg-surface p-4 rounded-card rounded-tl-sm shadow-sm border border-gray-100 dark:border-border flex gap-2 items-center">
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Typing Indicator - ChatGPT Style */}
              {isTyping && !loading && (
                <div className="flex w-full justify-start group animate-fade-in-up">
                  <div className="flex max-w-[85%] md:max-w-[75%] flex-row items-start gap-3">
                    {/* AI Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md bg-accent text-background">
                      <Sparkles size={18} />
                    </div>

                    {/* Typing Bubble */}
                    <div className="relative px-5 py-4 shadow-md bg-white dark:bg-surface text-gray-800 dark:text-foreground border border-gray-200 dark:border-border rounded-card rounded-tl-md">
                      <div className="flex gap-1.5 items-center">
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area - Floating Capsule Design */}
          <div className="p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={sendMessage} className="relative flex items-end gap-2 p-2.5 sm:p-3 rounded-card sm:rounded-modal bg-white dark:bg-surface border-2 border-gray-200 dark:border-border transition-all duration-300 focus-within:border-accent dark:focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/40">

                {/* Hidden File Inputs for Categories */}
                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file);
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  className="hidden"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file);
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  ref={docInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.rar,.tar,.gz"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file);
                    e.target.value = '';
                  }}
                />

                {/* File Upload / Attach Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl border active:scale-95 transition-all duration-200 shrink-0 shadow-xs ${
                      showAttachMenu
                        ? 'text-accent bg-accent/10 dark:bg-accent/10 border-accent dark:border-accent ring-2 ring-accent/40'
                        : 'bg-gray-100/90 dark:bg-surface text-gray-600 dark:text-secondary hover:text-accent dark:hover:text-accent hover:bg-indigo-50 dark:hover:bg-surface-hover border-gray-200 dark:border-border'
                    }`}
                    title={isRtl ? "إرفاق وسائط أو ملفات" : "Attach media or files"}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

                  {/* Attach Popover Menu */}
                  {showAttachMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowAttachMenu(false)}
                      />
                      <div className={`absolute bottom-full ${isRtl ? 'right-0' : 'left-0'} mb-3 z-50 w-48 sm:w-52 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-card shadow-lg p-1.5 flex flex-col gap-1 animate-scaleIn backdrop-blur-xl ring-1 ring-black/5`}>
                        {/* Option 1: Image / صورة */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            imageInputRef.current?.click();
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-start text-sm font-medium text-gray-700 dark:text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover transition-colors group"
                        >
                          <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-surface-elevated text-gray-500 dark:text-secondary flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-[13px] leading-tight text-gray-800 dark:text-foreground">
                              {isRtl ? "إرفاق صورة" : "Attach Image"}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-muted">JPG, PNG, WebP</span>
                          </div>
                        </button>

                        {/* Option 2: Video / فيديو */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            videoInputRef.current?.click();
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-start text-sm font-medium text-gray-700 dark:text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover transition-colors group"
                        >
                          <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-surface-elevated text-gray-500 dark:text-secondary flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-[13px] leading-tight text-gray-800 dark:text-foreground">
                              {isRtl ? "إرفاق فيديو" : "Attach Video"}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-muted">MP4, WebM, MOV</span>
                          </div>
                        </button>

                        {/* Option 3: Document / File / ملف */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            docInputRef.current?.click();
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-start text-sm font-medium text-gray-700 dark:text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover transition-colors group"
                        >
                          <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-surface-elevated text-gray-500 dark:text-secondary flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-[13px] leading-tight text-gray-800 dark:text-foreground">
                              {isRtl ? "إرفاق ملف" : "Attach File"}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-muted">PDF, DOC, XLS, ZIP</span>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Emoji Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl border active:scale-95 transition-all duration-200 shrink-0 shadow-xs ${
                      showEmojiPicker
                        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700'
                        : 'bg-gray-100/90 dark:bg-surface text-gray-600 dark:text-secondary hover:text-warning dark:hover:text-warning hover:bg-amber-50/80 dark:hover:bg-surface-hover border-gray-200 dark:border-border'
                    }`}
                    title="Add Emoji"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                      <EmojiPicker
                        onEmojiClick={(emojiData) => {
                          setText(text + emojiData.emoji);
                          setShowEmojiPicker(false);
                        }}
                        theme={themeDark ? 'dark' : 'light'}
                        width={350}
                        height={400}
                      />
                    </div>
                  )}
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    isRtl
                      ? (activeChatId ? "اكتب رسالتك هنا..." : "اختر النموذج المناسب واكتب رسالتك لبدء المحادثة...")
                      : (activeChatId ? "Type a message..." : "Select a model & type a message to start...")
                  }
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-foreground placeholder-gray-400 dark:placeholder-muted text-[15px] sm:text-base font-medium leading-relaxed resize-none py-2 px-1 max-h-32 min-h-[44px]"
                  rows="1"
                  style={{ height: 'auto', minHeight: '44px' }}
                />

                {/* Voice Record */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition-all duration-200 shrink-0 shadow-xs ${
                    isRecording
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 ring-4 ring-rose-500/20 animate-pulse border border-rose-600'
                      : 'bg-gray-100/90 dark:bg-surface text-gray-600 dark:text-secondary hover:text-danger dark:hover:text-danger hover:bg-rose-50/80 dark:hover:bg-surface-hover border border-gray-200 dark:border-border'
                  }`}
                  title={isRecording ? "Stop Recording" : "Voice Message"}
                >
                  {isRecording ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  )}
                </button>

                <span aria-hidden="true" className="w-px h-7 bg-gray-200 dark:bg-border mx-1 self-center rounded-full shrink-0" />

                <button
                  type="submit"
                  disabled={!text.trim() || loading}
                  className={`
                    w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-card flex items-center justify-center transition-all duration-200 shrink-0
                    ${!text.trim() || loading
                      ? 'bg-gray-100 dark:bg-surface-elevated text-gray-400 dark:text-muted border border-gray-200 dark:border-border cursor-not-allowed'
                      : 'bg-accent hover:bg-accent-hover text-background shadow-lg active:scale-[0.98] ring-1 ring-white/20'
                    }
                  `}
                  title="Send Message"
                >
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  )}
                </button>
              </form>
              <div className="flex items-center justify-center mt-2.5 text-center">
                <p className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-400 dark:text-muted">
                  <svg className="w-3.5 h-3.5 opacity-60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>TargetChat AI can make mistakes. Consider checking important information.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div >
  );
}
