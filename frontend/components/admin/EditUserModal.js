import { useState } from 'react';
import { X, TriangleAlert, User, Crown } from 'lucide-react';

export default function EditUserModal({ user, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'user',
        isActive: user?.isActive !== undefined ? user.isActive : true
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name || !formData.email) {
            setError('Name and email are required');
            return;
        }

        setSaving(true);
        try {
            await onSave(formData);
        } catch (err) {
            setError(err.message || 'Failed to save user');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="glass-panel w-full max-w-md rounded-card shadow-lg border-gray-200/50 dark:border-border/50 overflow-hidden animate-scaleIn">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-border/50 flex items-center justify-between bg-white/50 dark:bg-surface/50">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
                        {user ? 'Edit User' : 'Create User'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-surface-hover text-gray-500 dark:text-muted hover:text-gray-600 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white/40 dark:bg-background/40">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-danger-ink dark:text-danger text-sm font-medium flex items-center gap-2">
                            <TriangleAlert size={18} /> {error}
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-secondary ml-1">
                            Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-border bg-white/70 dark:bg-surface/50 text-gray-900 dark:text-foreground focus:ring-2 focus:ring-accent/50 outline-none transition-all placeholder:text-gray-400"
                            placeholder="John Doe"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-secondary ml-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-border bg-white/70 dark:bg-surface/50 text-gray-900 dark:text-foreground focus:ring-2 focus:ring-accent/50 outline-none transition-all placeholder:text-gray-400"
                            placeholder="john@example.com"
                        />
                    </div>

                    {/* Role */}
                    <div className="space-y-3 p-4 bg-gray-50/50 dark:bg-surface/30 rounded-xl border border-gray-100 dark:border-border/50">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-secondary">
                            Role Assignment
                        </label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.role === 'user'
                                    ? 'bg-accent/10 border-accent text-primary-700 dark:bg-accent/10 dark:border-accent dark:text-accent shadow-sm'
                                    : 'border-transparent hover:bg-gray-100 dark:hover:bg-surface-hover/50 text-gray-500'
                                }`}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="user"
                                    checked={formData.role === 'user'}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="hidden"
                                />
                                <span className="flex items-center gap-1.5"><User size={16} /> User</span>
                            </label>

                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.role === 'admin'
                                    ? 'bg-accent/10 border-accent text-primary-700 dark:bg-accent/10 dark:border-accent dark:text-accent shadow-sm'
                                    : 'border-transparent hover:bg-gray-100 dark:hover:bg-surface-hover/50 text-gray-500'
                                }`}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="admin"
                                    checked={formData.role === 'admin'}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="hidden"
                                />
                                <span className="flex items-center gap-1.5"><Crown size={16} /> Admin</span>
                            </label>
                        </div>
                        {formData.role === 'admin' && (
                            <p className="text-xs text-center text-primary-700 dark:text-accent animate-fadeIn">
                                Granting full system access
                            </p>
                        )}
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3 ml-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-surface-elevated peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-border peer-checked:bg-success"></div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-secondary">Account Active</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-border text-gray-600 dark:text-secondary hover:bg-gray-50 dark:hover:bg-surface-hover transition-all font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-background font-medium hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {saving ? 'Saving...' : user ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
