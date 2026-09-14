import { TriangleAlert, User } from 'lucide-react';

export default function DeleteUserModal({ user, onDelete, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="glass-panel w-full max-w-md rounded-card shadow-lg overflow-hidden animate-scaleIn border border-red-500/30">
                {/* Header */}
                <div className="p-6 border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 backdrop-blur-md">
                    <h2 className="text-2xl font-bold text-danger dark:text-danger flex items-center gap-2">
                        <TriangleAlert size={18} /> Delete User?
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <p className="text-gray-700 dark:text-secondary text-lg leading-relaxed">
                        Are you sure you want to delete this user? This action will permanently remove their account and all associated data.
                    </p>

                    {/* User Info Card */}
                    <div className="p-4 bg-white/60 dark:bg-surface/60 border border-gray-200 dark:border-border rounded-xl flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
                            <User size={22} className="text-danger" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-foreground text-lg leading-none mb-1">
                                {user.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-muted font-mono">
                                {user.email}
                            </p>
                        </div>
                    </div>

                    {/* Impact Warning */}
                    {user.stats && (
                        <div className="p-4 bg-orange-50/80 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                            <p className="text-sm font-bold text-warning dark:text-warning mb-2 uppercase tracking-wide">
                                Data Impact
                            </p>
                            <div className="flex gap-4">
                                <div className="text-sm text-warning dark:text-warning flex items-center gap-1.5">
                                    <span className="font-bold">{user.stats.chats || 0}</span> Chats
                                </div>
                                <div className="text-sm text-warning dark:text-warning flex items-center gap-1.5">
                                    <span className="font-bold">{user.stats.messages || 0}</span> Messages
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-100 dark:border-border/50 flex gap-3 bg-gray-50/50 dark:bg-black/20">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-border text-gray-700 dark:text-secondary hover:bg-white dark:hover:bg-surface-hover transition-all font-medium shadow-sm hover:shadow"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onDelete(user.id)}
                        className="flex-1 px-4 py-3 rounded-xl bg-danger text-white font-bold hover:bg-danger-hover active:scale-[0.98] transition-all"
                    >
                        Delete User
                    </button>
                </div>
            </div>
        </div>
    );
}
