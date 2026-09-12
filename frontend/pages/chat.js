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

// Dynamic import for emoji picker (client-side only)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PERSONAS = [
  { id: 'default', name: 'Assistant', icon: '🤖', desc: 'Helpful and generic AI assistant.' },
  { id: 'professional', name: 'Professional', icon: '💼', desc: 'Formal, concise, and business-oriented.' },
  { id: 'coder', name: 'Coder', icon: '💻', desc: 'Expert in programming, debugging, and architecture.' },
  { id: 'creative', name: 'Creative', icon: '🎨', desc: 'Imaginative, artistic, and brainstorming partner.' },
];

// Helper function to group messages by date
function groupMessagesByDate(messages) {
  const groups = [];
  let currentGroup = null;

  messages.forEach((msg) => {
    const msgDate = msg.createdAt ? new Date(msg.createdAt) : new Date();
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
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
      const token = localStorage.getItem('tc_token');
      if (!token) return;

      const url = workspaceId
        ? `${API}/api/workflows?workspace_id=${workspaceId}`
        : `${API}/api/workflows`;

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        const data = await resp.json();
        console.log('✅ Loaded workflows:', data.length, 'workflows', data);
        setWorkflows(data);
        // Set first workflow as default if none selected
        if (data.length > 0 && !selectedWorkflow) {
          setSelectedWorkflow(data[0].id);
          console.log('✅ Selected default workflow:', data[0].name);
        }
      } else {
        console.error('❌ Failed to load workflows. Status:', resp.status);
      }
    } catch (err) {
      console.error('loadWorkflows error', err);
    } finally {
      setWorkflowsLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('tc_token');
    if (!token) {
      router.replace('/login');
      return; // Early return, no cleanup needed
    }

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
    // load chats from server for this user
    async function loadChats(workspaceId) {
      try {
        const url = workspaceId
          ? `${API}/api/chat/list?workspace_id=${workspaceId}`
          : `${API}/api/chat/list`; // Will return personal chats (null workspace_id)

        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (resp.status === 401 || resp.status === 403) return handleAuthError();
        const data = await resp.json();
        // initialize chats with empty messages; messages will be fetched when selecting
        const initialized = (data || []).map((c) => ({ ...c, messages: [] }));
        setChats(initialized);

        // Only restore active chat if it belongs to the loaded list
        const savedActive = localStorage.getItem('tc_active_chat');
        if (savedActive && initialized.find((c) => c.id === parseInt(savedActive))) {
          setActiveChatId(parseInt(savedActive));
        } else {
          setActiveChatId(null);
        }
      } catch (err) {
        console.error('loadChats error', err);
        setChats([]);
      }
    }

    // Load initial chats based on saved workspace or default
    const savedWorkspaceId = localStorage.getItem('current_workspace_id');
    loadChats(savedWorkspaceId);

    loadWorkflows(); // Load personal workflows first, workspace workflows will load when workspace changes

    // No cleanup needed for this effect
  }, [router]);

  // Reload chats when workspace changes
  useEffect(() => {
    async function reloadChats() {
      const token = localStorage.getItem('tc_token');
      if (!token) return;

      try {
        const workspaceId = currentWorkspace?.id;
        const url = workspaceId
          ? `${API}/api/chat/list?workspace_id=${workspaceId}`
          : `${API}/api/chat/list`;

        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (resp.ok) {
          const data = await resp.json();
          const initialized = (data || []).map((c) => ({ ...c, messages: [] }));
          setChats(initialized);

          // Clear active chat if it's not in the new list
          if (activeChatId && !initialized.find(c => c.id === activeChatId)) {
            setActiveChatId(null);
          }
        }
      } catch (err) {
        console.error('Reload chats error:', err);
      }
    }

    if (currentWorkspace !== undefined) { // Only run after initial load
      reloadChats();
    }
  }, [currentWorkspace]);

  // Reload workflows when workspace changes
  useEffect(() => {
    // Don't run on initial mount - workflows are already loaded in main useEffect
    if (currentWorkspace === undefined) return;

    async function reloadWorkflows() {
      const token = localStorage.getItem('tc_token');
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
          console.log('🔄 Reloaded workflows for workspace:', workspaceId, '- Count:', data.length);

          // If workspace has no workflows, fallback to personal workflows
          if (data.length === 0 && workspaceId) {
            console.log('⚠️ No workflows in workspace, loading personal workflows...');
            const personalResp = await fetch(`${API}/api/workflows`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (personalResp.ok) {
              const personalData = await personalResp.json();
              setWorkflows(personalData);
              if (personalData.length > 0) {
                setSelectedWorkflow(personalData[0].id);
              }
              setWorkflowsLoading(false);
              return;
            }
          }

          setWorkflows(data);

          // Reset selected workflow if it's not in the new list
          if (selectedWorkflow && !data.find(w => w.id === selectedWorkflow)) {
            setSelectedWorkflow(data.length > 0 ? data[0].id : null);
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

  // Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem('tc_token');
    if (!token) return;

    // Initialize socket
    const socket = io(API.replace('/api', ''), { // Remove /api if present to get base URL
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('message', (data) => {
      const { chatId, message } = data;
      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === parseInt(chatId)) {
            const msgs = c.messages || [];
            const lastMsg = msgs[msgs.length - 1];

            // If it's a user message and the last message was an optimistic user message with same text
            // We assume optimistic messages have 'u-' prefix in ID
            if (message.sender === 'user' && lastMsg && lastMsg.sender === 'user' && lastMsg.text === message.text && String(lastMsg.id).startsWith('u-')) {
              // Replace optimistic with real
              return { ...c, messages: [...msgs.slice(0, -1), { ...message, time: new Date(message.createdAt).toLocaleTimeString() }] };
            }

            // Deduplicate by ID
            if (msgs.find(m => m.id === message.id)) return c;

            return { ...c, messages: [...msgs, { ...message, time: new Date(message.createdAt).toLocaleTimeString() }] };
          }
          return c;
        });
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chats, activeChatId]);

  function saveChats(nextChats, nextActive) {
    try {
      if (nextActive) localStorage.setItem('tc_active_chat', nextActive);
      else localStorage.removeItem('tc_active_chat');
    } catch (e) { }
  }

  async function createNewChat() {
    const token = localStorage.getItem('tc_token');
    if (!token) return router.replace('/login');
    try {
      const resp = await fetch(`${API}/api/chat/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `Chat ${chats.length + 1}`,
          persona: selectedPersona,
          workflowId: selectedWorkflow,
          workspaceId: currentWorkspace?.id
        })
      });
      if (resp.status === 401 || resp.status === 403) return handleAuthError();
      const chat = await resp.json();
      const newChat = { ...chat, messages: [] };
      const next = [newChat, ...chats];
      setChats(next);
      setActiveChatId(newChat.id);
      saveChats(next, newChat.id);
      setShowSidebar(false);
      return newChat.id;
    } catch (err) {
      console.error('createNewChat error', err);
      return null;
    }
  }

  function selectChat(id) {
    setActiveChatId(id);
    try {
      localStorage.setItem('tc_active_chat', id);
    } catch (e) { }
    setShowSidebar(false);
    // fetch messages for this chat
    (async () => {
      const token = localStorage.getItem('tc_token');
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
          time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ''
        }));
        const next = chats.map((c) => (c.id === id ? { ...c, messages: msgs } : c));
        setChats(next);
      } catch (err) {
        console.error('selectChat load messages error', err);
      }
    })();
  }

  function deleteChat(id) {
    (async () => {
      const token = localStorage.getItem('tc_token');
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
        } else {
          saveChats(next, activeChatId);
        }
      } catch (err) {
        console.error('deleteChat error', err);
      }
    })();
  }

  async function sendMessage(e) {
    e && e.preventDefault();
    if (loading) return; // prevent double-sends
    const trimmed = text.trim();
    if (!trimmed) return;
    const token = localStorage.getItem('tc_token');
    if (!token) return router.replace('/login');

    let chatId = activeChatId;
    if (!chatId) {
      chatId = await createNewChat();
      if (!chatId) return; // failed to create
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
      const data = await resp.json();
      const replyText = (data && data.reply) || (data && data.message && data.message.text) || 'No reply';

      // Auto-generate chat title if still default-like
      try {
        setChats((currentChats) => {
          const chatObj = currentChats.find((c) => c.id === chatId);
          const titleLooksDefault = !chatObj?.title || /^\s*(New Chat|Chat\s*\d+|Untitled)/i.test(chatObj.title);

          if (titleLooksDefault) {
            const sourceText = trimmed || replyText || '';
            const generateTitle = (txt) => {
              if (!txt) return 'Chat';
              const cleaned = txt.replace(/\s+/g, ' ').trim();
              const words = cleaned.split(/\s+/).slice(0, 6);
              const t = words.join(' ');
              return t.charAt(0).toUpperCase() + t.slice(1).replace(/[\.!?]$/, '');
            };
            const newTitle = generateTitle(sourceText).slice(0, 60);

            // update on server
            fetch(`${API}/api/chat/${chatId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: newTitle }) }).catch((e) => console.error('title update failed', e));

            return currentChats.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c));
          }
          return currentChats;
        });
      } catch (err) {
        console.error('auto-title error', err);
      }
    } catch (err) {
      console.error('sendMessage error', err);
      const errMsg = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        type: 'text',
        text: 'Failed to send. Try again.',
        audio: null, image: null, video: null, file: null,
        time: new Date().toLocaleTimeString()
      };
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, messages: [...(c.messages || []), errMsg] } : c)));
    } finally {
      setLoading(false);
      setIsTyping(false); // Hide typing indicator
      // reload messages for the active chat to get canonical state from server
      try {
        const token2 = localStorage.getItem('tc_token');
        if (token2) {
          const r = await fetch(`${API}/api/chat/history?chat_id=${chatId}`, { headers: { Authorization: `Bearer ${token2}` } });
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
              time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ''
            }));

            setChats((currentChats) => {
              return currentChats.map((c) => (c.id === chatId ? { ...c, messages: msgs } : c));
            });
          }
        }
      } catch (err) {
        console.error('reload after send error', err);
      }
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
          const token = localStorage.getItem('tc_token');
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
              time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ''
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
        const token = localStorage.getItem('tc_token');
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
          onNew={async () => {
            await createNewChat();
            setShowSidebar(false);
          }}
          onDelete={deleteChat}
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
        <header className="h-16 shrink-0 glass-header flex items-center justify-between px-4 sm:px-6 z-10 relative border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
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
            <div className="flex flex-col">
              {!editingTitle ? (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { const t = chats.find((c) => c.id === activeChatId)?.title || ''; setTitleValue(t); setEditingTitle(true); }}>
                  <h1 className="font-bold text-lg text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                    {(chats.find((c) => c.id === activeChatId)?.title) || 'New Chat'}
                  </h1>
                  <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
              ) : (
                <form onSubmit={async (e) => { e.preventDefault(); try { const token = localStorage.getItem('tc_token'); if (!token) return router.replace('/login'); await fetch(`${API}/api/chat/${activeChatId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: titleValue }) }); setChats((prev) => prev.map((c) => c.id === activeChatId ? { ...c, title: titleValue } : c)); } catch (err) { console.error('title save', err); } finally { setEditingTitle(false); } }} className="flex items-center gap-2">
                  <input autoFocus value={titleValue} onChange={(e) => setTitleValue(e.target.value)} className="px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button type="submit" className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></button>
                  <button type="button" className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" onClick={() => setEditingTitle(false)}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </form>
              )}
            </div>
          </div>


          <div className="flex items-center gap-3">
            {/* Upgrade Button - Premium Design */}
            <button
              onClick={() => setShowPricing(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-500 hover:via-yellow-600 hover:to-amber-600 text-gray-900 text-sm font-bold rounded-full shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/50 hover:scale-105 transition-all duration-200"
            >
              <span className="text-base">💎</span>
              <span>Upgrade</span>
            </button>

            {/* Theme Toggle - Redesigned */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1 shadow-inner">
              <button
                onClick={() => setThemePreset('light')}
                aria-label="Light mode"
                aria-pressed={!themeDark}
                className={`p-2 rounded-full transition-all duration-200 ${!themeDark ? 'bg-white shadow-md text-yellow-500 scale-110' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Light Mode"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </button>
              <button
                onClick={() => setThemePreset('dark')}
                aria-label="Dark mode"
                aria-pressed={themeDark}
                className={`p-2 rounded-full transition-all duration-200 ${themeDark ? 'bg-gray-700 shadow-md text-blue-400 scale-110' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Dark Mode"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              </button>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-500/30 hover:scale-110 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200"
              >
                U
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-scaleIn">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 transition-colors rounded-xl mx-1"
                  >
                    <span className="text-lg">📊</span>
                    <span className="font-medium">Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 transition-colors rounded-xl mx-1"
                  >
                    <span className="text-lg">👤</span>
                    <span className="font-medium">Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 transition-colors rounded-xl mx-1"
                  >
                    <span className="text-lg">⚙️</span>
                    <span className="font-medium">Settings</span>
                  </button>
                  <hr className="my-2 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => {
                      localStorage.removeItem('tc_token');
                      router.replace('/login');
                    }}
                    className="w-full px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors rounded-xl mx-1 font-medium"
                  >
                    <span className="text-lg">🚪</span>
                    <span>Sign Out</span>
                  </button>
                </div>
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
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20 animate-pulse-slow">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Welcome to TargetChat</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">Select a persona to start your conversation.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                    {PERSONAS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPersona(p.id)}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-md ${selectedPersona === p.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-700'
                          }`}
                      >
                        <div className="text-2xl mb-2">{p.icon}</div>
                        <div className="font-semibold text-gray-900 dark:text-white">{p.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(activeChatId && chats.find((c) => c.id === activeChatId) ? chats.find((c) => c.id === activeChatId).messages : []).map((m) => (
                <ChatBubble key={m.id} sender={m.sender} message={m} />
              ))}

              {loading && (
                <div className="flex justify-start animate-fade-in-up">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-gray-700 flex gap-2 items-center">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Typing Indicator - ChatGPT Style */}
              {isTyping && !loading && (
                <div className="flex w-full justify-start group animate-fade-in-up">
                  <div className="flex max-w-[85%] md:max-w-[75%] flex-row items-start gap-3">
                    {/* AI Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                      ✨
                    </div>

                    {/* Typing Bubble */}
                    <div className="relative px-5 py-4 shadow-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-3xl rounded-tl-md">
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
              <form onSubmit={sendMessage} className="glass-panel relative flex items-end gap-2 p-3 rounded-3xl shadow-lg transition-all hover:shadow-xl focus-within:ring-2 focus-within:ring-primary-500/50">

                {/* File Upload */}
                <button
                  type="button"
                  onClick={() => document.getElementById('file-upload').click()}
                  className="p-3 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"
                  title="Upload File"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ppt,.pptx,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp3,.wav,.ogg,.m4a,.mp4,.webm,.avi,.mov"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const chatId = activeChatId;
                    if (!chatId) {
                      alert("Please start a chat with a text message first before uploading.");
                      e.target.value = ''; // Reset input
                      return;
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
                      uploading: true // Mark as uploading
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
                      const token = localStorage.getItem('tc_token');

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
                          filename: m.text, // Store filename for URL refresh
                          time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ''
                        }));

                        setChats((currentChats) =>
                          currentChats.map((c) =>
                            c.id === chatId ? { ...c, messages: msgs } : c
                          )
                        );
                      }

                      // Clean up local URL
                      URL.revokeObjectURL(localUrl);

                    } catch (err) {
                      console.error(err);
                      alert('Upload failed');

                      // Remove optimistic message on error
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
                      e.target.value = ''; // Reset file input so same file can be uploaded again
                    }
                  }}
                />

                {/* Emoji Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-3 text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"
                    title="Add Emoji"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                  placeholder={activeChatId ? "Type a message..." : "Select a persona and type to start..."}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none py-3 max-h-32 min-h-[44px]"
                  rows="1"
                  style={{ height: 'auto', minHeight: '44px' }}
                />

                {/* Voice Record */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-3 transition-colors rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                  title={isRecording ? "Stop Recording" : "Voice Message"}
                >
                  {isRecording ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={!text.trim() || loading}
                  className={`
                    p-3 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center
                    ${!text.trim() || loading
                      ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary-600 to-purple-600 text-white hover:scale-105 hover:shadow-primary-500/30'
                    }
                  `}
                >
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  )}
                </button>
              </form>
              <div className="text-center mt-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  TargetChat AI can make mistakes. Consider checking important information.
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
