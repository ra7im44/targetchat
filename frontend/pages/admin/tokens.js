import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import TokenModal from '../../components/admin/TokenModal';
import {
    Key, Search, Trash2, User,
    Calendar, Clock, AlertTriangle, Plus
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TokensPage() {
    const router = useRouter();
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadTokens();
    }, []);

    async function loadTokens() {
        const token = localStorage.getItem('tc_token');
        if (!token) return router.replace('/login');

        try {
            const res = await fetch(`${API}/api/admin/tokens`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) return router.replace('/admin');

            if (res.ok) {
                const data = await res.json();
                setTokens(data);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error loading tokens:', err);
            setLoading(false);
        }
    }

    async function revokeToken(id) {
        if (!confirm('Are you sure you want to revoke this token? Any application using it will stop working immediately.')) return;

        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/tokens/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                loadTokens();
            } else {
                alert('Failed to revoke token');
            }
        } catch (err) {
            console.error('Error revoking token:', err);
            alert('Error revoking token');
        }
    }

    const filteredTokens = tokens.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.user?.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="API Tokens">
            <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            <Key size={32} className="text-amber-500" />
                            API Tokens
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Securely access TargetChat via API integration.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2 font-medium active:scale-95 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        Generate Token
                    </button>
                </div>

                {/* Search */}
                <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl flex items-center shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="pl-4 pr-3 text-gray-400">
                        <Search size={24} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search tokens by name or user..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent border-none text-lg py-3 px-2 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-0"
                    />
                </div>

                {/* Tokens List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                    {filteredTokens.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No tokens found</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                                Generate an API token to allow external applications to securely interact with the TargetChat API.
                            </p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-medium"
                            >
                                Generate First Token
                            </button>
                        </div>
                    ) : (
                        filteredTokens.map((token, index) => (
                            <div
                                key={token.id}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col shadow-sm border border-gray-100 dark:border-gray-700 group hover:-translate-y-1 transition-all duration-300 animate-fadeIn"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                                        <Key size={24} />
                                    </div>
                                    <button
                                        onClick={() => revokeToken(token.id)}
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} /> Revoke
                                    </button>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{token.name}</h3>
                                <div className="mb-6">
                                    <code className="block w-full bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400 font-mono break-all border border-gray-200 dark:border-gray-700/50">
                                        {token.tokenPrefix || '••••••••'}
                                        <span className="text-gray-400 text-xs ml-2">(prefix)</span>
                                    </code>
                                </div>

                                <div className="mt-auto space-y-3 pt-4 border-t border-gray-50 dark:border-gray-700/50 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <User size={14} /> User
                                        </span>
                                        <span className="text-gray-900 dark:text-white font-medium">{token.user?.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <Calendar size={14} /> Created
                                        </span>
                                        <span className="text-gray-700 dark:text-gray-300">
                                            {new Date(token.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <Clock size={14} /> Last Used
                                        </span>
                                        <span className="text-gray-700 dark:text-gray-300">
                                            {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}
                                        </span>
                                    </div>
                                    {token.expiresAt && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                <AlertTriangle size={14} /> Expires
                                            </span>
                                            <span className={`font-medium px-2 py-0.5 rounded text-xs ${new Date(token.expiresAt) < new Date()
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-green-100 text-green-600'
                                                }`}>
                                                {new Date(token.expiresAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {showModal && (
                    <TokenModal
                        onClose={() => setShowModal(false)}
                        onSuccess={() => loadTokens()}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
