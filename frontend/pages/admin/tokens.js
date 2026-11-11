import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import TokenModal from '../../components/admin/TokenModal';
import {
    Key, Search, Trash2, User,
    Calendar, Clock, AlertTriangle, Plus
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

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
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Key size={18} />
                            API Tokens
                        </h1>
                        <p className="text-muted mt-1">
                            Securely access TargetChat via API integration.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover active:bg-primary-active transition-colors flex items-center gap-2 font-medium"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        Generate Token
                    </button>
                </div>

                {/* Search */}
                <div className="bg-surface p-2 rounded-card flex items-center shadow-sm border border-border">
                    <div className="pl-4 pr-3 text-muted">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search tokens by name or user..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent border-none text-lg py-3 px-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
                    />
                </div>

                {/* Tokens List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                    {filteredTokens.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-surface rounded-card border border-dashed border-border">
                            <Key className="w-12 h-12 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-foreground mb-2">No tokens found</h3>
                            <p className="text-muted max-w-md mx-auto mb-8">
                                Generate an API token to allow external applications to securely interact with the TargetChat API.
                            </p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover active:bg-primary-active transition-colors font-medium"
                            >
                                Generate First Token
                            </button>
                        </div>
                    ) : (
                        filteredTokens.map((token, index) => (
                            <div
                                key={token.id}
                                className="bg-surface rounded-card p-6 flex flex-col shadow-sm border border-border group hover:-translate-y-1 transition-all duration-300 animate-fadeIn"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-warning/10 rounded-xl text-warning">
                                        <Key size={18} />
                                    </div>
                                    <button
                                        onClick={() => revokeToken(token.id)}
                                        className="text-muted hover:text-danger hover:bg-danger-soft px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} /> Revoke
                                    </button>
                                </div>

                                <h3 className="text-xl font-bold text-foreground mb-2">{token.name}</h3>
                                <div className="mb-6">
                                    <code className="block w-full bg-surface-elevated dark:bg-black/20 p-3 rounded-lg text-sm text-muted font-mono break-all border border-border">
                                        {token.tokenPrefix || '••••••••'}
                                        <span className="text-muted text-xs ml-2">(prefix)</span>
                                    </code>
                                </div>

                                <div className="mt-auto space-y-3 pt-4 border-t border-border text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted flex items-center gap-2">
                                            <User size={16} /> User
                                        </span>
                                        <span className="text-foreground font-medium">{token.user?.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted flex items-center gap-2">
                                            <Calendar size={16} /> Created
                                        </span>
                                        <span className="text-secondary">
                                            {new Date(token.created_at || token.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted flex items-center gap-2">
                                            <Clock size={16} /> Last Used
                                        </span>
                                        <span className="text-secondary">
                                            {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}
                                        </span>
                                    </div>
                                    {token.expiresAt && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted flex items-center gap-2">
                                                <AlertTriangle size={16} /> Expires
                                            </span>
                                            <span className={`font-medium px-2 py-0.5 rounded text-xs ${new Date(token.expiresAt) < new Date()
                                                ? 'bg-danger-soft text-danger'
                                                : 'bg-success-soft text-success'
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
