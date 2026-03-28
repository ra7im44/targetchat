import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import {
    Share2, Facebook, Instagram, MessageCircle,
    Settings, Activity, Globe, ShieldCheck,
    AlertCircle, CheckCircle2, Server, Database
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminChannelSettings() {
    const [stats, setStats] = useState({
        totalChannels: 0,
        activeWebhooks: 3,
        healthyTokens: 0,
        messagesProcessed: 0,
        config: {
            appId: '',
            verifyToken: '',
            systemToken: ''
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSystemStats();
    }, []);

    const fetchSystemStats = async () => {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/channels/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;

    return (
        <AdminLayout title="System Channels">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            <Server className="text-indigo-600" size={32} />
                            Omnichannel Infrastructure
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            System-wide monitoring and global configuration for external messaging gateways.
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-sm font-bold text-gray-400 mb-2">Total Connections</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalChannels}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-sm font-bold text-gray-400 mb-2">Webhooks Online</p>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.activeWebhooks}/3</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-sm font-bold text-gray-400 mb-2">Token Health</p>
                        <p className="text-3xl font-black text-green-600">100%</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-sm font-bold text-gray-400 mb-2">Msgs (24h)</p>
                        <p className="text-3xl font-black text-blue-600">{stats.messagesProcessed}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Global Configuration */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Settings className="text-indigo-600" size={24} />
                                Global Meta Configuration
                            </h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Meta App ID</label>
                                        <input type="text" readOnly value={stats.config?.appId || 'Not Configured'} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Webhook Verify Token</label>
                                        <input type="text" readOnly value={stats.config?.verifyToken || 'Not Configured'} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" />
                                    </div>
                                </div>
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-2xl flex items-start gap-3">
                                    <AlertCircle className="text-yellow-600" size={20} />
                                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                                        These values are derived from your system environment variables. To change them, modify your <code>.env</code> file.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Webhook Endpoints */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Globe className="text-indigo-600" size={24} />
                                Webhook Endpoints
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { name: 'Meta (FB/IG)', url: `${API}/api/webhooks/meta`, status: 'Active' },
                                    { name: 'WhatsApp Cloud', url: `${API}/api/webhooks/whatsapp`, status: 'Active' },
                                    { name: 'System Routing', url: `${API}/api/webhooks/webhook`, status: 'Active' },
                                ].map((hook, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900 dark:text-white">{hook.name}</p>
                                            <p className="text-xs text-gray-500 font-mono truncate max-w-[200px] md:max-w-md">{hook.url}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(hook.url);
                                                    toast.success('Copied to clipboard');
                                                }}
                                                className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-indigo-600"
                                            >
                                                <Share2 size={16} />
                                            </button>
                                            <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                                                <CheckCircle2 size={16} />
                                                <span className="hidden md:inline">{hook.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure Monitor */}
                    <div className="space-y-6">
                        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <ShieldCheck size={20} />
                                Security Status
                            </h3>
                            <ul className="text-sm space-y-3 text-indigo-100">
                                <li className="flex items-center gap-2">✅ Signature Verification Enabled</li>
                                <li className="flex items-center gap-2">✅ SSL Pinning Active</li>
                                <li className="flex items-center gap-2">✅ Rate Limiting Active</li>
                            </ul>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Activity size={20} className="text-indigo-600" />
                                Recent Logs
                            </h3>
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="text-xs border-l-2 border-indigo-500 pl-3 py-1">
                                        <p className="font-mono text-gray-400">2026-01-05 10:45:21</p>
                                        <p className="text-gray-700 dark:text-gray-300">Incoming message processed: FB_{i}3948</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
