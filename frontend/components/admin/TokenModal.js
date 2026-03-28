import { useState, useEffect } from 'react';

// API base URL
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TokenModal({ onClose, onSuccess }) {
    const [step, setStep] = useState('create'); // create, success
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        userId: '',
        expiresInDays: 0, // 0 = never
        permissions: ['read']
    });
    const [createdToken, setCreatedToken] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/users?limit=100`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
                // Set default user if available
                if (data.users.length > 0) {
                    setFormData(prev => ({ ...prev, userId: data.users[0].id }));
                }
            }
        } catch (err) {
            console.error('Error loading users:', err);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const token = localStorage.getItem('tc_token');

        try {
            const res = await fetch(`${API}/api/admin/tokens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                setCreatedToken(data);
                setStep('success');
                onSuccess(); // Refresh list in parent
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to create token');
            }
        } catch (err) {
            console.error('Error creating token:', err);
            alert('Error creating token');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (createdToken?.token) {
            navigator.clipboard.writeText(createdToken.token);
            alert('Token copied to clipboard!');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn border border-white/20">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-md">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        {step === 'create' ? 'Create API Token' : 'Token Created 🎉'}
                    </h2>
                    {step === 'create' && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 transition-all"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {step === 'create' ? (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                Token Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-400"
                                placeholder="e.g. n8n Integration"
                            />
                        </div>

                        {/* User */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                User *
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none"
                                >
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                    ▼
                                </div>
                            </div>
                        </div>

                        {/* Expiration */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                Expiration
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.expiresInDays}
                                    onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none"
                                >
                                    <option value={0}>Never</option>
                                    <option value={7}>7 Days</option>
                                    <option value={30}>30 Days</option>
                                    <option value={90}>90 Days</option>
                                    <option value={365}>1 Year</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                    ▼
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'Generating...' : 'Generate Token'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-8 space-y-6">
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 items-start">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                                    Copy this token now!
                                </p>
                                <p className="text-sm text-yellow-600/90 dark:text-yellow-400/80">
                                    This is the only time you will see the full token. Make sure to copy it and store it safely.
                                </p>
                            </div>
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                readOnly
                                value={createdToken?.token}
                                className="w-full px-4 py-4 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 font-mono text-sm break-all pr-12 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-all font-medium"
                                title="Copy to clipboard"
                            >
                                📋
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full px-4 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Done, I've copied it
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
