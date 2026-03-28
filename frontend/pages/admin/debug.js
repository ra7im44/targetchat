import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import {
    Terminal, RefreshCw, Trash2, Send,
    MessageSquare, AlertCircle, Info, Eye
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function DeveloperTools() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mockData, setMockData] = useState({
        platform: 'whatsapp',
        sender: '123456789',
        text: 'Hello from Dev Tools!'
    });

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/debug/webhooks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error('Failed to fetch debug logs', error);
        } finally {
            setLoading(false);
        }
    };

    const clearLogs = async () => {
        if (!confirm('Clear all debug logs?')) return;
        try {
            const token = localStorage.getItem('tc_token');
            await fetch(`${API}/api/admin/debug/webhooks`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs([]);
            toast.success('Logs cleared');
        } catch (error) {
            toast.error('Failed to clear logs');
        }
    };

    const sendMock = async () => {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/debug/mock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(mockData)
            });
            if (res.ok) {
                toast.success('Mock intent sent to logs');
                fetchLogs();
            }
        } catch (error) {
            toast.error('Failed to send mock event');
        }
    };

    return (
        <AdminLayout title="Developer Tools">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            <Terminal className="text-indigo-600" size={32} />
                            Developer Tools
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Debug incoming webhooks and simulate events for local testing.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Webhook Logs */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Info size={20} className="text-blue-500" />
                                Recent Webhook Payloads
                            </h2>
                            <button
                                onClick={clearLogs}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Clear Logs"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl min-h-[500px] flex flex-col">
                            {logs.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                                    <Terminal size={48} className="mb-4 opacity-20" />
                                    <p>No webhooks received yet.</p>
                                    <p className="text-sm">Trigger a real message or use the mock tool.</p>
                                </div>
                            ) : (
                                <div className="p-4 space-y-3 overflow-y-auto max-h-[600px]">
                                    {logs.map((log) => (
                                        <div key={log.id} className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 transition-all hover:border-gray-600">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.platform.includes('whatsapp') ? 'bg-green-900/30 text-green-400' :
                                                        log.platform.includes('meta') ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-700 text-gray-300'
                                                    }`}>
                                                    {log.platform}
                                                </span>
                                                <span className="text-[10px] text-gray-500 tabular-nums">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <pre className="text-[11px] text-indigo-300 overflow-x-auto p-2 bg-gray-900/50 rounded-lg">
                                                {JSON.stringify(log.body, null, 2)}
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mock Tools */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Send size={20} className="text-emerald-500" />
                                Mock Tester
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Platform</label>
                                    <select
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        value={mockData.platform}
                                        onChange={(e) => setMockData({ ...mockData, platform: e.target.value })}
                                    >
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="meta">Facebook / Instagram</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Sender ID / Phone</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                        value={mockData.sender}
                                        onChange={(e) => setMockData({ ...mockData, sender: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Message Text</label>
                                    <textarea
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        rows={3}
                                        value={mockData.text}
                                        onChange={(e) => setMockData({ ...mockData, text: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={sendMock}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2"
                                >
                                    <MessageSquare size={18} />
                                    Trigger Mock Event
                                </button>
                                <p className="text-[10px] text-gray-400 text-center italic">
                                    Mock events help you test the UI without needing real hardware or API credits.
                                </p>
                            </div>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2">
                                <AlertCircle size={18} />
                                Dev Tip
                            </h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-400">
                                Use <code>localtunnel</code> or <code>ngrok</code> to expose your local port 3001 to the internet for real Meta webhook testing.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
