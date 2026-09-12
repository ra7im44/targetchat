import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/router';
import Head from 'next/head';
import io from 'socket.io-client';
import PreChatForm from '../../components/PreChatForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function EmbedPage() {
    const router = useRouter();
    const { slug } = router.query;
    const [config, setConfig] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [socket, setSocket] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [showPreChat, setShowPreChat] = useState(false);
    const [leadId, setLeadId] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!slug) return;

        // Load config
        fetch(`${API_URL}/widget/public/${slug}/config`)
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                if (data.sessionToken) {
                    localStorage.setItem(`tc_session_token_${slug}`, data.sessionToken);
                }

                // Initialize cryptographically secure, unguessable session identifier
                let storedSession = localStorage.getItem(`tc_session_${slug}`);
                if (!storedSession) {
                    const cryptoObj = typeof window !== 'undefined' ? (window.crypto || window.msCrypto) : null;
                    if (cryptoObj && cryptoObj.getRandomValues) {
                        const buf = new Uint8Array(16);
                        cryptoObj.getRandomValues(buf);
                        storedSession = 'sess_' + Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
                    } else {
                        storedSession = 'sess_' + (Date.now().toString(16) + Math.abs(Date.now() * 31).toString(16)).padStart(32, '0');
                    }
                    localStorage.setItem(`tc_session_${slug}`, storedSession);
                }
                setSessionId(storedSession);

                // Check for existing lead
                const storedLead = localStorage.getItem(`tc_lead_${slug}`);
                if (storedLead) {
                    setLeadId(JSON.parse(storedLead).id);
                    setShowPreChat(false);
                } else if (data.settings?.preChatEnabled) { // Check config for pre-chat
                    setShowPreChat(true);
                }
            })
            .catch(err => console.error('Failed to load widget config', err));
    }, [slug]);

    const handleLeadSubmit = (lead) => {
        localStorage.setItem(`tc_lead_${slug}`, JSON.stringify(lead));
        setLeadId(lead.id);
        setShowPreChat(false);
    };

    useEffect(() => {
        const sessionCapability = localStorage.getItem(`tc_session_token_${slug}`) || config?.sessionToken;

        // Connect to Socket.io with server-issued capability token
        const newSocket = io(API_URL, {
            auth: {
                token: 'anonymous',
                sessionToken: sessionCapability,
                widgetSlug: slug,
                sessionId: sessionId
            }
        });

        newSocket.on('connect', () => {
            console.log('Connected to widget socket');
        });

        newSocket.on('message', (msg) => {
            // Ignore own messages (we added them optimistically)
            if (msg.sender === 'user') return;

            setMessages(prev => [...prev, { ...msg, sender: 'ai' }]);
        });

        setSocket(newSocket);

        return () => newSocket.disconnect();
    }, [slug, sessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Send to backend via API (or socket)
        try {
            await fetch(`${API_URL}/widget/public/${slug}/event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'message',
                    payload: {
                        text: userMsg.text,
                        leadId: leadId // Pass leadId
                    },
                    sessionId
                })
            });
        } catch (err) {
            console.error('Failed to send message', err);
        }
    };

    if (!config) return <div className="flex items-center justify-center h-screen">Loading...</div>;

    if (showPreChat) {
        return (
            <div className="flex flex-col h-screen bg-gray-50 p-4 justify-center">
                <Head>
                    <title>{config.name}</title>
                </Head>
                <PreChatForm
                    widgetId={config.id}
                    formFields={config.formFields}
                    welcomeMessage={config.settings?.preChatMessage}
                    onSubmit={handleLeadSubmit}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Head>
                <title>{config.name}</title>
            </Head>

            {/* Header */}
            <div className="p-4 text-white shadow-md shrink-0" style={{ backgroundColor: config.theme.primaryColor }}>
                <div className="flex items-center gap-3">
                    {config.theme.launcherIcon && (
                        <img src={config.theme.launcherIcon} className="w-10 h-10 rounded-full bg-white/20 object-cover" />
                    )}
                    <div>
                        <h1 className="font-bold text-lg">{config.name}</h1>
                        <div className="flex items-center gap-1.5 opacity-90">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span className="text-xs">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${msg.sender === 'user'
                                ? 'text-white rounded-tr-none'
                                : 'bg-white text-gray-800 rounded-tl-none'
                                }`}
                            style={msg.sender === 'user' ? { backgroundColor: config.theme.primaryColor } : {}}
                        >
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown components={{
                                    p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                                    a: ({ node, ...props }) => <a className="underline" target="_blank" {...props} style={{ color: 'inherit' }} />
                                }}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 shrink-0">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={config.settings.placeholder || "Type a message..."}
                        className="flex-1 px-4 py-2 bg-gray-50 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="p-2 rounded-full text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
                        style={{ backgroundColor: config.theme.primaryColor }}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                    </button>
                </div>
                {config.settings.showBranding && (
                    <div className="text-center mt-2">
                        <a href="https://targetchat.ai" target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
                            Powered by TargetChat
                        </a>
                    </div>
                )}
            </form>
        </div>
    );
}
