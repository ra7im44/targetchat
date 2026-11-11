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
            <div className="bg-surface w-full max-w-md rounded-card shadow-lg border border-border overflow-hidden animate-scaleIn">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface-elevated">
                    <h2 className="text-xl font-semibold text-foreground">
                        {user ? 'Edit User' : 'Create User'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-surface">
                    {error && (
                        <div className="p-3 bg-danger-soft border border-danger/20 rounded-xl text-danger text-sm font-medium flex items-center gap-2">
                            <TriangleAlert size={18} /> {error}
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-secondary ml-1">
                            Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted"
                            placeholder="John Doe"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-secondary ml-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted"
                            placeholder="john@example.com"
                        />
                    </div>

                    {/* Role */}
                    <div className="space-y-3 p-4 bg-surface-elevated rounded-xl border border-border">
                        <label className="block text-sm font-semibold text-secondary">
                            Role Assignment
                        </label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.role === 'user'
                                    ? 'bg-primary-soft border-primary text-primary font-semibold shadow-xs'
                                    : 'border-border hover:bg-surface-hover text-secondary'
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
                                    ? 'bg-primary-soft border-primary text-primary font-semibold shadow-xs'
                                    : 'border-border hover:bg-surface-hover text-secondary'
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
                            <p className="text-xs text-center text-primary animate-fadeIn">
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
                            <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                            <span className="ml-3 text-sm font-medium text-secondary">Account Active</span>
                        </label>
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
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {saving ? 'Saving...' : user ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
