import { useState, useEffect } from 'react';
import { X, UserCheck, Users } from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

export default function ManageUsersModal({ workflow, onClose, onUpdate }) {
    const [allUsers, setAllUsers] = useState([]);
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const token = localStorage.getItem('tc_token');
        if (!token) return;

        try {
            // Load all users
            const usersRes = await fetch(`${API}/api/admin/users?limit=1000`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Load assigned users for this workflow
            const assignedRes = await fetch(`${API}/api/admin/workflows/${workflow.id}/assigned-users`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setAllUsers(usersData.users || []);
            }

            if (assignedRes.ok) {
                const assigned = await assignedRes.json();
                setAssignedUsers(assigned);
            }

            setLoading(false);
        } catch (err) {
            console.error('Error loading data:', err);
            setLoading(false);
        }
    }

    async function assignUser(userId) {
        setSaving(true);
        const token = localStorage.getItem('tc_token');

        try {
            const res = await fetch(`${API}/api/admin/workflows/${workflow.id}/assign-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userIds: [userId] })
            });

            if (res.ok) {
                await loadData();
                if (onUpdate) onUpdate();
            }
        } catch (err) {
            console.error('Error assigning user:', err);
        } finally {
            setSaving(false);
        }
    }

    async function unassignUser(userId) {
        setSaving(true);
        const token = localStorage.getItem('tc_token');

        try {
            const res = await fetch(`${API}/api/admin/workflows/${workflow.id}/unassign-user/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                await loadData();
                if (onUpdate) onUpdate();
            }
        } catch (err) {
            console.error('Error unassigning user:', err);
        } finally {
            setSaving(false);
        }
    }

    const assignedUserIds = assignedUsers.map(u => u.id);
    const unassignedUsers = allUsers.filter(u => !assignedUserIds.includes(u.id));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-card w-full max-w-2xl shadow-lg max-h-[90vh] overflow-hidden flex flex-col border border-border">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface-elevated">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Manage Users</h2>
                        <p className="text-sm text-secondary mt-1">
                            {workflow.icon} {workflow.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {/* Assigned Users */}
                            <div>
                                <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <UserCheck size={18} className="text-success" />
                                    <span>Assigned Users ({assignedUsers.length})</span>
                                </h3>
                                {assignedUsers.length === 0 ? (
                                    <div className="text-center py-6 text-muted bg-surface-elevated rounded-xl border border-border text-sm">
                                        No users assigned yet
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {assignedUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3 bg-success-soft border border-success/20 rounded-xl"
                                            >
                                                <div>
                                                    <div className="font-medium text-foreground text-sm">{user.name}</div>
                                                    <div className="text-xs text-secondary">{user.email}</div>
                                                </div>
                                                <button
                                                    onClick={() => unassignUser(user.id)}
                                                    disabled={saving}
                                                    className="px-3 py-1.5 text-xs font-semibold text-danger bg-danger-soft hover:bg-danger/20 border border-danger/20 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Available Users */}
                            <div>
                                <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <Users size={18} className="text-primary" />
                                    <span>Available Users ({unassignedUsers.length})</span>
                                </h3>
                                {unassignedUsers.length === 0 ? (
                                    <div className="text-center py-6 text-muted bg-surface-elevated rounded-xl border border-border text-sm">
                                        All users are assigned
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {unassignedUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3 bg-surface-elevated border border-border rounded-xl hover:bg-surface-hover transition-colors"
                                            >
                                                <div>
                                                    <div className="font-medium text-foreground text-sm">{user.name}</div>
                                                    <div className="text-xs text-secondary">{user.email}</div>
                                                </div>
                                                <button
                                                    onClick={() => assignUser(user.id)}
                                                    disabled={saving}
                                                    className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary-soft hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    Assign
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-end bg-surface-elevated">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover active:bg-primary-active transition-colors font-semibold text-sm shadow-xs"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
