import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MembersModal({ isOpen, onClose, workspace }) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [inviting, setInviting] = useState(false);
    const [activeTab, setActiveTab] = useState('members'); // members, invite

    useEffect(() => {
        if (isOpen && workspace) {
            loadMembers();
        }
    }, [isOpen, workspace]);

    async function loadMembers() {
        try {
            const token = localStorage.getItem('tc_token');
            const resp = await fetch(`${API}/api/workspaces/${workspace.id}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (resp.ok) {
                const data = await resp.json();
                setMembers(data.members || []);
            }
        } catch (error) {
            console.error('Load members error:', error);
            toast.error('Failed to load members');
        } finally {
            setLoading(false);
        }
    }

    async function handleInvite(e) {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setInviting(true);
        try {
            const token = localStorage.getItem('tc_token');
            const resp = await fetch(`${API}/api/workspaces/${workspace.id}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: inviteEmail.trim(),
                    role: inviteRole
                })
            });

            if (resp.ok) {
                toast.success('Invitation sent!');
                setInviteEmail('');
                setActiveTab('members'); // Switch back to members list
            } else {
                const error = await resp.json();
                toast.error(error.message || 'Failed to invite');
            }
        } catch (error) {
            console.error('Invite error:', error);
            toast.error('Failed to send invitation');
        } finally {
            setInviting(false);
        }
    }

    async function handleRemoveMember(memberId) {
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            const token = localStorage.getItem('tc_token');
            const resp = await fetch(`${API}/api/workspaces/${workspace.id}/members/${memberId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (resp.ok) {
                toast.success('Member removed');
                loadMembers();
            } else {
                const error = await resp.json();
                toast.error(error.message || 'Failed to remove member');
            }
        } catch (error) {
            console.error('Remove error:', error);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Members</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{workspace?.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'members'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        Members ({members.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('invite')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'invite'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        Invite New Member
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'members' ? (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : members.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No members found.</p>
                            ) : (
                                members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                {member.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {member.user?.name || 'Unknown User'}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {member.user?.email}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${member.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                                                    member.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-200 text-gray-700'
                                                }`}>
                                                {member.role}
                                            </span>
                                            {member.role !== 'owner' && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.user_id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Remove member"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleInvite} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Role
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="member">Member</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={inviting}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/30"
                            >
                                {inviting ? 'Sending Invitation...' : 'Send Invitation'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
