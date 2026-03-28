import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';
import { Facebook, Instagram, MessageCircle, Globe, Share2, User, Zap, Cpu } from 'lucide-react';

import { API_URL as API } from '../utils/apiConfig';

export default function InboxPage() {
    const router = useRouter();
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [assignees, setAssignees] = useState([]);
    const [showSidebar, setShowSidebar] = useState(true);
    const [activeTab, setActiveTab] = useState('details'); // details, notes
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const [typingChats, setTypingChats] = useState({}); // { chatId: true/false }
    const [deliveries, setDeliveries] = useState({}); // { chatId: watermark }
    const [reads, setReads] = useState({}); // { chatId: watermark }

    useEffect(() => {
        loadChats();
        loadStats();

        // Connect to Socket.io
        const token = localStorage.getItem('tc_token');
        if (token) {
            socketRef.current = io(API, {
                auth: { token }
            });

            socketRef.current.on('connect', () => {
                console.log('Connected to inbox socket');
            });

            socketRef.current.on('chat:updated', (updatedChat) => {
                setChats(prevChats => {
                    const exists = prevChats.find(c => c.id === updatedChat.id);
                    if (exists) {
                        return prevChats.map(c => c.id === updatedChat.id ? updatedChat : c);
                    }
                    return [updatedChat, ...prevChats];
                });
            });

            socketRef.current.on('message:new', ({ chatId, message }) => {
                setMessages(prev => {
                    // Use a functional update to check against current selectedChat if needed
                    // But we want to update the messages list only if it's the current chat
                    return prev; // This logic is handled better below by checking selectedChatRef
                });

                // Update chat list for snippet and timestamp
                setChats(prevChats => prevChats.map(c => {
                    if (Number(c.id) === Number(chatId)) {
                        return {
                            ...c,
                            messages: [message],
                            updatedAt: new Date().toISOString()
                        };
                    }
                    return c;
                }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
            });

            socketRef.current.on('chat:typing', ({ chatId, typing }) => {
                setTypingChats(prev => ({ ...prev, [chatId]: typing }));
            });

            socketRef.current.on('chat:read', ({ chatId, watermark }) => {
                setReads(prev => ({ ...prev, [chatId]: watermark }));
            });

            socketRef.current.on('chat:delivery', ({ chatId, watermark }) => {
                setDeliveries(prev => ({ ...prev, [chatId]: watermark }));
            });
        }

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []); // Only on mount

    // Separate effect for message handling to avoid socket re-init
    useEffect(() => {
        if (!socketRef.current) return;

        const handleNewMessage = ({ chatId, message }) => {
            if (selectedChat && Number(selectedChat.id) === Number(chatId)) {
                setMessages(prev => {
                    if (prev.find(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            }
        };

        socketRef.current.on('message:new', handleNewMessage);
        return () => socketRef.current.off('message:new', handleNewMessage);
    }, [selectedChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function loadChats() {
        const token = localStorage.getItem('tc_token');
        if (!token) {
            router.replace('/login');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API}/api/inbox/chats`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setChats(data.chats || []);
            }
        } catch (err) {
            console.error('Error loading chats:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadStats() {
        const token = localStorage.getItem('tc_token');
        if (!token) return;

        try {
            const res = await fetch(`${API}/api/inbox/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    }

    async function loadMessages(chatId) {
        const token = localStorage.getItem('tc_token');
        if (!token) return;

        try {
            const res = await fetch(`${API}/api/chat/${chatId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    }

    async function loadNotes(chatId) {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/inbox/chats/${chatId}/notes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotes(data.notes || []);
            }
        } catch (err) {
            console.error('Error loading notes:', err);
        }
    }

    async function addNote() {
        if (!newNote.trim() || !selectedChat) return;
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/inbox/chats/${selectedChat.id}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content: newNote })
            });

            if (res.ok) {
                setNewNote('');
                loadNotes(selectedChat.id);
            }
        } catch (err) {
            console.error('Error adding note:', err);
        }
    }

    async function loadAssignees(widgetId) {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/widgets/${widgetId}/assignees`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAssignees(data.assignees || []);
            }
        } catch (err) {
            console.error('Error loading assignees:', err);
        }
    }

    async function reassignChat(userId) {
        if (!selectedChat || !userId) return;
        if (!confirm('Reassign this chat? It will be removed from your inbox.')) return;

        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/inbox/chats/${selectedChat.id}/assign`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: userId })
            });

            if (res.ok) {
                // Remove from local list
                setChats(prev => prev.filter(c => c.id !== selectedChat.id));
                setSelectedChat(null);
            }
        } catch (err) {
            console.error('Error reassigning chat:', err);
        }
    }

    async function toggleAI() {
        if (!selectedChat) return;
        const newStatus = !selectedChat.aiPaused;
        const token = localStorage.getItem('tc_token');

        try {
            const res = await fetch(`${API}/api/inbox/chats/${selectedChat.id}/ai-status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ paused: newStatus })
            });

            if (res.ok) {
                const updatedChat = await res.json();
                setSelectedChat(prev => ({ ...prev, aiPaused: updatedChat.aiPaused }));
                setChats(prev => prev.map(c => c.id === updatedChat.id ? { ...c, aiPaused: updatedChat.aiPaused } : c));
                toast.success(newStatus ? 'AI Paused (You took over)' : 'AI Resumed');
            }
        } catch (err) {
            console.error('Error toggling AI:', err);
            toast.error('Failed to update AI status');
        }
    }

    async function sendMessage() {
        if (!newMessage.trim() || !selectedChat) return;

        const token = localStorage.getItem('tc_token');
        if (!token) return;

        try {
            const res = await fetch(`${API}/api/inbox/chats/${selectedChat.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content: newMessage })
            });

            if (res.ok) {
                const sentMessage = await res.json();
                setNewMessage('');

                // Optimistic update: Add message immediately
                setMessages(prev => {
                    if (prev.find(m => m.id === sentMessage.id)) return prev;
                    return [...prev, sentMessage];
                });

                // Update chat preview too
                setChats(prevChats => prevChats.map(c => {
                    if (c.id === selectedChat.id) {
                        return {
                            ...c,
                            messages: [sentMessage],
                            updatedAt: new Date().toISOString()
                        };
                    }
                    return c;
                }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));

            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to send message');
            }
        } catch (err) {
            console.error('Error sending message:', err);
            toast.error('Failed to send message: ' + err.message);
        }
    }

    function selectChat(chat) {
        setSelectedChat(chat);
        loadMessages(chat.id);
        loadNotes(chat.id);
        if (chat.widgetId) {
            loadAssignees(chat.widgetId);
        }

        // Notify backend that agent has seen the chat
        if (socketRef.current) {
            socketRef.current.emit('agent:seen', { chatId: chat.id });
        }
    }

    function getInitials(name) {
        return name ? name.substring(0, 2).toUpperCase() : '??';
    }

    function getGradient(name) {
        const gradients = [
            'from-blue-400 to-indigo-500',
            'from-purple-400 to-pink-500',
            'from-green-400 to-emerald-500',
            'from-orange-400 to-red-500'
        ];
        return gradients[name.charCodeAt(0) % gradients.length] || gradients[0];
    }

    const renderChannelIcon = (chat) => {
        if (chat.channel) {
            const isLive = chat.channel.last_active_at && (new Date() - new Date(chat.channel.last_active_at) < 5 * 60 * 1000); // 5 mins
            const isRecent = chat.channel.last_active_at && (new Date() - new Date(chat.channel.last_active_at) < 30 * 60 * 1000); // 30 mins

            let StatusDot = null;
            if (isLive) StatusDot = <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>;
            else if (isRecent) StatusDot = <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-800"></span>;
            else StatusDot = <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gray-300 rounded-full border-2 border-white dark:border-gray-800"></span>;

            switch (chat.channel.type) {
                case 'facebook': return <div className="relative"><Facebook className="text-blue-600" size={14} />{StatusDot}</div>;
                case 'instagram': return <div className="relative"><Instagram className="text-pink-600" size={14} />{StatusDot}</div>;
                case 'whatsapp': return <div className="relative"><MessageCircle className="text-green-600" size={14} />{StatusDot}</div>;
                default: return <div className="relative"><Share2 className="text-gray-400" size={14} />{StatusDot}</div>;
            }
        }
        return <Globe className="text-indigo-500" size={14} />;
    };

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-gray-900">
                {/* Top Header */}
                <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        </div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Inbox</h1>
                    </div>
                    {stats && (
                        <div className="flex gap-4">
                            <span className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold dark:bg-green-900/20 dark:text-green-400">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                {stats.activeChats} Active
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Chat Sidebar */}
                    <div className="w-80 border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : chats.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <p>No chats found.</p>
                            </div>
                        ) : (
                            chats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => selectChat(chat)}
                                    className={`group p-4 cursor-pointer transition-all border-l-4 ${selectedChat?.id === chat.id
                                        ? 'bg-white dark:bg-gray-800 border-indigo-500 shadow-sm'
                                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getGradient(chat.lead?.name || chat.title || 'A')} flex items-center justify-center text-white text-xs font-bold shadow-sm relative`}>
                                                {getInitials(chat.lead?.name || chat.title || 'A')}
                                                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-gray-100 dark:border-gray-700">
                                                    {renderChannelIcon(chat)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className={`text-sm font-bold ${selectedChat?.id === chat.id ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} flex items-center gap-2`}>
                                                    {chat.lead?.name || chat.title || 'Anonymous'}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate max-w-[140px] flex items-center gap-1">
                                                    {typingChats[chat.id] ? (
                                                        <span className="text-blue-500 font-bold animate-pulse flex items-center gap-1">
                                                            <Cpu size={10} className="animate-spin" /> typing...
                                                        </span>
                                                    ) : (
                                                        chat.messages?.[0]?.content || 'No messages'
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                            {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-w-0">
                        {selectedChat ? (
                            <>
                                {/* Chat Top Bar */}
                                <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getGradient(selectedChat.lead?.name || selectedChat.title || 'A')} flex items-center justify-center text-white font-bold shadow-md`}>
                                            {getInitials(selectedChat.lead?.name || selectedChat.title || 'A')}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                                                {selectedChat.lead?.name || selectedChat.title || 'Anonymous'}
                                                <span className="opacity-70">{renderChannelIcon(selectedChat)}</span>
                                            </div>
                                            <div className="text-xs">
                                                {typingChats[selectedChat.id] ? (
                                                    <span className="text-blue-500 font-bold animate-pulse">is typing...</span>
                                                ) : (
                                                    <span className="text-gray-500">{selectedChat.lead?.email || selectedChat.channel?.name || 'Visitor'}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={toggleAI}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${selectedChat.aiPaused
                                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${selectedChat.aiPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                                            {selectedChat.aiPaused ? 'AI Paused' : 'AI Active'}
                                        </button>
                                        <button
                                            onClick={() => setShowSidebar(!showSidebar)}
                                            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                        >
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-gray-900/50">
                                    {messages.map((msg, i) => {
                                        const isUser = msg.role === 'user' || msg.sender === 'user';
                                        return (
                                            <div key={msg.id || i} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`max-w-lg px-5 py-3 rounded-2xl shadow-sm ${isUser
                                                    ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-gray-700'
                                                    : 'bg-indigo-600 text-white rounded-tr-sm'
                                                    }`}>
                                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                                        <ReactMarkdown components={{
                                                            p: ({ node, ...props }) => <p className="mb-0" {...props} />,
                                                            a: ({ node, ...props }) => <a className="underline font-bold" {...props} />
                                                        }}>
                                                            {msg.content || msg.text}
                                                        </ReactMarkdown>
                                                    </div>
                                                    <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 opacity-70 ${isUser ? 'text-gray-400' : 'text-indigo-200'}`}>
                                                        {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {!isUser && (
                                                            <span className="flex">
                                                                {reads[selectedChat.id] >= new Date(msg.createdAt).getTime() ? (
                                                                    <svg className="w-3 h-3 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7M5 13l4 4L19 7" /></svg>
                                                                ) : deliveries[selectedChat.id] >= new Date(msg.createdAt).getTime() ? (
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7M5 13l4 4L19 7" /></svg>
                                                                ) : (
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => {
                                                setNewMessage(e.target.value);
                                                // Handle typing indicator
                                                if (socketRef.current && selectedChat) {
                                                    socketRef.current.emit('agent:typing', { chatId: selectedChat.id, typing: true });

                                                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                                    typingTimeoutRef.current = setTimeout(() => {
                                                        socketRef.current.emit('agent:typing', { chatId: selectedChat.id, typing: false });
                                                    }, 3000);
                                                }
                                            }}
                                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                            placeholder="Type your message..."
                                            className="w-full pl-5 pr-20 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 text-gray-900 dark:text-white"
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={!newMessage.trim()}
                                            className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 dark:shadow-none"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 dark:bg-gray-900/50">
                                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                                    <svg className="w-12 h-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Inbox is Empty</h3>
                                <p className="text-gray-500 max-w-sm">Select a chat from the sidebar to start messaging your leads and customers.</p>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar (Details) */}
                    {selectedChat && showSidebar && (
                        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 flex flex-col overflow-y-auto">
                            {/* Tabs */}
                            <div className="flex p-2 gap-2 border-b border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'details' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('notes')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'notes' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    Notes
                                </button>
                            </div>

                            <div className="p-6">
                                {activeTab === 'details' ? (
                                    <div className="space-y-8">
                                        <div className="text-center">
                                            <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${getGradient(selectedChat.lead?.name || 'A')} flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4`}>
                                                {getInitials(selectedChat.lead?.name || 'A')}
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedChat.lead?.name || 'Anonymous'}</h3>
                                            <p className="text-sm text-gray-500">{selectedChat.lead?.company || 'No Company'}</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Origin</h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                                            {renderChannelIcon(selectedChat)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                                                                {selectedChat.channel ? selectedChat.channel.type : 'Website Widget'}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 truncate max-w-[160px]">
                                                                {selectedChat.channel ? selectedChat.channel.external_id : selectedChat.widget?.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Contact</h4>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs text-gray-400 block mb-1">Email</label>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white break-all">{selectedChat.lead?.email || '-'}</div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-400 block mb-1">Phone</label>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedChat.lead?.phone || selectedChat.lead?.whatsapp_id || '-'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Assignment</h4>
                                                <select
                                                    onChange={(e) => reassignChat(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Reassign chat...</option>
                                                    {assignees.map(a => (
                                                        <option key={a.user.id} value={a.user.id}>{a.user.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
                                            <textarea
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Write an internal note..."
                                                rows={3}
                                                className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 text-gray-800 dark:text-gray-200 placeholder-yellow-700/50"
                                            />
                                            <div className="flex justify-end mt-2">
                                                <button
                                                    onClick={addNote}
                                                    disabled={!newNote.trim()}
                                                    className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                                                >
                                                    Add Note
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {notes.map(note => (
                                                <div key={note.id} className="p-4 bg-white dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                    <p className="text-sm text-gray-800 dark:text-gray-300 mb-2">{note.content}</p>
                                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                                        <span className="font-bold">{note.author?.name}</span>
                                                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {notes.length === 0 && (
                                                <p className="text-center text-sm text-gray-500 py-4">No notes yet.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
