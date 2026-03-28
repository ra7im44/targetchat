import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Users</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {workflow.icon} {workflow.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {/* Assigned Users */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <span>✅</span>
                                    <span>Assigned Users ({assignedUsers.length})</span>
                                </h3>
                                {assignedUsers.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                        No users assigned yet
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {assignedUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                                                </div>
                                                <button
                                                    onClick={() => unassignUser(user.id)}
                                                    disabled={saving}
                                                    className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
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
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <span>👥</span>
                                    <span>Available Users ({unassignedUsers.length})</span>
                                </h3>
                                {unassignedUsers.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                        All users are assigned
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {unassignedUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                                                </div>
                                                <button
                                                    onClick={() => assignUser(user.id)}
                                                    disabled={saving}
                                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
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
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
