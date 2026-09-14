import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';

import { API_URL as API } from '../../utils/apiConfig';

export default function WorkspaceMembersPage() {
    const router = useRouter();
    const [workspace, setWorkspace] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        loadWorkspaceAndMembers();
    }, []);

    async function loadWorkspaceAndMembers() {
        try {
            const token = localStorage.getItem('tc_token');
            if (!token) {
                router.replace('/login');
                return;
            }

            // Get current workspace from localStorage or URL
            const workspaceId = router.query.id || localStorage.getItem('current_workspace_id');

            if (!workspaceId) {
                toast.error('No workspace selected');
                router.replace('/chat');
                return;
            }

            // Load workspace details
            const workspaceResp = await fetch(`${API}/api/workspaces/${workspaceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (workspaceResp.ok) {
                const workspaceData = await workspaceResp.json();
                setWorkspace(workspaceData.workspace);
            }

            // Load members
            const membersResp = await fetch(`${API}/api/workspaces/${workspaceId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (membersResp.ok) {
                const membersData = await membersResp.json();
                setMembers(membersData.members || []);
            }
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Failed to load workspace');
        } finally {
            setLoading(false);
        }
    }

    async function handleInvite(e) {
        e.preventDefault();

        if (!inviteEmail.trim()) {
            toast.error('Email is required');
            return;
        }

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
                toast.success('Invitation sent successfully!');
                setShowInviteModal(false);
                setInviteEmail('');
                setInviteRole('member');
            } else {
                const error = await resp.json();
                toast.error(error.message || 'Failed to send invitation');
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
                loadWorkspaceAndMembers();
            } else {
                const error = await resp.json();
                toast.error(error.message || 'Failed to remove member');
            }
        } catch (error) {
            console.error('Remove error:', error);
            toast.error('Failed to remove member');
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background">
            {/* Header */}
            <header className="bg-white dark:bg-surface border-b border-gray-200 dark:border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <button
                                onClick={() => router.back()}
                                className="text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-foreground mb-2 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to Chat
                            </button>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground">
                                {workspace?.name} - Team Members
                            </h1>
                            <p className="text-gray-600 dark:text-muted mt-1">
                                Manage your workspace members and permissions
                            </p>
                        </div>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-6 py-3 bg-accent text-white rounded-xl font-medium transition-all shadow-lg"
                        >
                            + Invite Member
                        </button>
                    </div>
                </div>
            </header>

            {/* Members List */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-surface rounded-card shadow-lg overflow-hidden">
                    <div className="divide-y divide-gray-200 dark:divide-border">
                        {members.map((member) => (
                            <div key={member.id} className="p-6 hover:bg-gray-50 dark:hover:bg-surface-hover/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-bold text-lg">
                                            {member.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-foreground">
                                                {member.user?.name || 'Unknown'}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-muted">
                                                {member.user?.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Role Badge */}
                                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${member.role === 'owner'
                                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                                : member.role === 'manager'
                                                    ? 'bg-accent/10 dark:bg-accent/20 text-info dark:text-info'
                                                    : 'bg-gray-100 dark:bg-surface-elevated text-gray-700 dark:text-secondary'
                                            }`}>
                                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                        </span>

                                        {/* Remove Button */}
                                        {member.role !== 'owner' && (
                                            <button
                                                onClick={() => handleRemoveMember(member.user_id)}
                                                className="p-2 text-danger dark:text-danger hover:bg-danger/10 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Remove member"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface rounded-card shadow-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-6">
                            Invite Team Member
                        </h2>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-strong bg-white dark:bg-surface-elevated text-gray-900 dark:text-foreground focus:ring-2 focus:ring-accent/60 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">
                                    Role
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-strong bg-white dark:bg-surface-elevated text-gray-900 dark:text-foreground focus:ring-2 focus:ring-accent/60 focus:border-transparent"
                                >
                                    <option value="member">Member</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-strong text-gray-700 dark:text-secondary font-medium hover:bg-gray-50 dark:hover:bg-surface-hover"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting}
                                    className="flex-1 px-4 py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50 shadow-lg"
                                >
                                    {inviting ? 'Sending...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
