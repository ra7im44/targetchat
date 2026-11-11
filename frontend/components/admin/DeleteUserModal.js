import { TriangleAlert, User } from 'lucide-react';

export default function DeleteUserModal({ user, onDelete, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-surface w-full max-w-md rounded-card shadow-lg overflow-hidden animate-scaleIn border border-border">
                {/* Header */}
                <div className="p-6 border-b border-danger/20 bg-danger-soft">
                    <h2 className="text-xl font-bold text-danger flex items-center gap-2">
                        <TriangleAlert size={20} /> Delete User?
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    <p className="text-secondary text-sm leading-relaxed">
                        Are you sure you want to delete this user? This action will permanently remove their account and all associated data.
                    </p>

                    {/* User Info Card */}
                    <div className="p-4 bg-surface-elevated border border-border rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-danger-soft flex items-center justify-center shrink-0">
                            <User size={22} className="text-danger" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-base leading-none mb-1 truncate">
                                {user.name}
                            </h3>
                            <p className="text-xs text-muted font-mono truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>

                    {/* Impact Warning */}
                    {user.stats && (
                        <div className="p-4 bg-warning-soft border border-warning/20 rounded-xl">
                            <p className="text-xs font-bold text-warning mb-2 uppercase tracking-wide">
                                Data Impact
                            </p>
                            <div className="flex gap-4">
                                <div className="text-xs text-warning flex items-center gap-1.5">
                                    <span className="font-bold">{user.stats.chats || 0}</span> Chats
                                </div>
                                <div className="text-xs text-warning flex items-center gap-1.5">
                                    <span className="font-bold">{user.stats.messages || 0}</span> Messages
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-border flex gap-3 bg-surface-elevated">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border text-secondary hover:bg-surface-hover hover:text-foreground transition-all font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onDelete(user.id)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white font-semibold hover:bg-danger-hover active:bg-danger-active transition-all"
                    >
                        Delete User
                    </button>
                </div>
            </div>
        </div>
    );
}
