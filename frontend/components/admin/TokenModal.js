import { useState, useEffect } from 'react';
import { X, TriangleAlert, Copy, PartyPopper } from 'lucide-react';

// API base URL
import { API_URL as API } from '../../utils/apiConfig';

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
            <div className="bg-surface w-full max-w-md rounded-card shadow-lg overflow-hidden animate-scaleIn border border-border">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface-elevated">
                    <h2 className="text-xl font-semibold text-foreground">
                        {step === 'create' ? 'Create API Token' : (<span className="flex items-center gap-2"><PartyPopper size={18} /> Token Created</span>)}
                    </h2>
                    {step === 'create' && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-all"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {step === 'create' ? (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-surface">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-secondary ml-1">
                                Token Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted"
                                placeholder="e.g. n8n Integration"
                            />
                        </div>

                        {/* User */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-secondary ml-1">
                                User *
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                                >
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-xs">
                                    ▼
                                </div>
                            </div>
                        </div>

                        {/* Expiration */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-secondary ml-1">
                                Expiration
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.expiresInDays}
                                    onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                                >
                                    <option value={0}>Never</option>
                                    <option value={7}>7 Days</option>
                                    <option value={30}>30 Days</option>
                                    <option value={90}>90 Days</option>
                                    <option value={365}>1 Year</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-xs">
                                    ▼
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-secondary hover:bg-surface-hover hover:text-foreground transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'Generating...' : 'Generate Token'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-6 space-y-5 bg-surface">
                        <div className="p-4 bg-warning-soft border border-warning/20 rounded-xl flex gap-3 items-start text-warning">
                            <span className="mt-0.5"><TriangleAlert size={18} /></span>
                            <div>
                                <p className="text-sm font-bold text-warning mb-1">
                                    Copy this token now!
                                </p>
                                <p className="text-xs opacity-90">
                                    This is the only time you will see the full token. Make sure to copy it and store it safely.
                                </p>
                            </div>
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                readOnly
                                value={createdToken?.token}
                                className="w-full px-4 py-3 rounded-xl border border-success/30 bg-success-soft text-success font-mono text-sm break-all pr-12 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center rounded-lg hover:bg-success/10 text-success transition-all font-medium"
                                title="Copy to clipboard"
                            >
                                <Copy size={16} />
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover active:bg-primary-active transition-all"
                        >
                            Done, I've copied it
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
