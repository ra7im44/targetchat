import { useState } from 'react';

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
            <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate-scaleIn">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-slate-800/50">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                        {user ? 'Edit User' : 'Create User'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-700/50 text-gray-400 hover:text-gray-600 transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white/40 dark:bg-slate-900/40">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                            Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-slate-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-400"
                            placeholder="John Doe"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-slate-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-400"
                            placeholder="john@example.com"
                        />
                    </div>

                    {/* Role */}
                    <div className="space-y-3 p-4 bg-gray-50/50 dark:bg-slate-800/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Role Assignment
                        </label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.role === 'user'
                                    ? 'bg-blue-50/80 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 shadow-sm'
                                    : 'border-transparent hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-500'
                                }`}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="user"
                                    checked={formData.role === 'user'}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="hidden"
                                />
                                <span>👤 User</span>
                            </label>

                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.role === 'admin'
                                    ? 'bg-purple-50/80 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400 shadow-sm'
                                    : 'border-transparent hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-500'
                                }`}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="admin"
                                    checked={formData.role === 'admin'}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="hidden"
                                />
                                <span>👑 Admin</span>
                            </label>
                        </div>
                        {formData.role === 'admin' && (
                            <p className="text-xs text-center text-purple-600 dark:text-purple-400 animate-fadeIn">
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
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Account Active</span>
                        </label>
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
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {saving ? 'Saving...' : user ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
