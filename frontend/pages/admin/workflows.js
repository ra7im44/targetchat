import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import WorkflowModal from '../../components/admin/WorkflowModal';
import ManageUsersModal from '../../components/admin/ManageUsersModal';
import {
    Zap, Search, Filter, Globe, Lock, User, Bot,
    Copy, Trash2, Edit, Pause, Play, Plus, X
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

export default function WorkflowsPage() {
    const router = useRouter();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingWorkflow, setEditingWorkflow] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [managingUsersWorkflow, setManagingUsersWorkflow] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [visibilityFilter, setVisibilityFilter] = useState('all');

    useEffect(() => {
        checkAdminAndLoadWorkflows();
    }, []);

    async function checkAdminAndLoadWorkflows() {
        const token = localStorage.getItem('tc_token');
        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            const userRes = await fetch(`${API}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                setCurrentUser(userData);
            }

            const res = await fetch(`${API}/api/admin/workflows`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 403 || res.status === 401) {
                alert('Access denied. Admin privileges required.');
                router.replace('/chat');
                return;
            }

            if (res.ok) {
                const data = await res.json();
                setWorkflows(data);
            }

            setLoading(false);
        } catch (err) {
            console.error('Error loading workflows:', err);
            setLoading(false);
        }
    }

    async function createWorkflow(workflowData) {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/workflows`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(workflowData)
            });

            if (res.ok) {
                await checkAdminAndLoadWorkflows();
                setShowCreateModal(false);
            } else {
                alert('Failed to create workflow');
            }
        } catch (err) {
            console.error('Error creating workflow:', err);
            alert('Error creating workflow');
        }
    }

    async function updateWorkflow(id, updates) {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/workflows/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                await checkAdminAndLoadWorkflows();
                setEditingWorkflow(null);
            } else {
                alert('Failed to update workflow');
            }
        } catch (err) {
            console.error('Error updating workflow:', err);
            alert('Error updating workflow');
        }
    }

    async function deleteWorkflow(id, name) {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/workflows/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                await checkAdminAndLoadWorkflows();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to delete workflow');
            }
        } catch (err) {
            console.error('Error deleting workflow:', err);
            alert('Error deleting workflow');
        }
    }

    async function toggleActive(workflow) {
        await updateWorkflow(workflow.id, { isActive: !workflow.isActive });
    }

    const filteredWorkflows = workflows.filter(workflow => {
        const matchesSearch = !searchQuery ||
            workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            workflow.owner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            workflow.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && workflow.isActive) ||
            (statusFilter === 'inactive' && !workflow.isActive);

        const matchesVisibility = visibilityFilter === 'all' ||
            (visibilityFilter === 'public' && workflow.isPublic) ||
            (visibilityFilter === 'private' && !workflow.isPublic);

        return matchesSearch && matchesStatus && matchesVisibility;
    });

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Workflows">
            <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Zap size={18} />
                            Workflow Management
                        </h1>
                        <p className="text-muted mt-1">
                            Orchestrate your AI agents and chatbot flows.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover active:bg-primary-active transition-colors flex items-center gap-2 font-medium"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="hidden sm:inline">New Workflow</span>
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="bg-surface p-4 rounded-card flex flex-col sm:flex-row gap-4 shadow-sm border border-border">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} />
                        <input
                            type="text"
                            placeholder="Search workflows..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 pl-11 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-transparent transition-all text-foreground"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-hover dark:hover:bg-surface-hover rounded-full transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>

                        <select
                            value={visibilityFilter}
                            onChange={(e) => setVisibilityFilter(e.target.value)}
                            className="px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                        >
                            <option value="all">All Visibility</option>
                            <option value="public">Public Only</option>
                            <option value="private">Private Only</option>
                        </select>
                    </div>
                </div>

                {/* Results Count */}
                {(searchQuery || statusFilter !== 'all' || visibilityFilter !== 'all') && (
                    <div className="text-sm text-muted">
                        Showing <span className="font-semibold text-foreground">{filteredWorkflows.length}</span> results
                    </div>
                )}

                {/* Workflows Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
                    {filteredWorkflows.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-surface rounded-card border border-dashed border-border">
                            <Search className="w-12 h-12 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No workflows found</h3>
                            <p className="text-muted">
                                Try adjusting your filters or create a new one.
                            </p>
                        </div>
                    ) : (
                        filteredWorkflows.map((workflow, index) => (
                            <div
                                key={workflow.id}
                                className="bg-surface p-6 rounded-card shadow-sm border border-border flex flex-col relative group hover:-translate-y-1 transition-all duration-300 animate-fadeIn"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500 pointer-events-none"></div>

                                {/* Header */}
                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-card bg-surface flex items-center justify-center text-3xl shadow-inner border border-border">
                                            {/* Ideally this would be a dynamic icon component, but assuming string for now or passed element */}
                                            {workflow.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground leading-tight">{workflow.name}</h3>
                                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full border ${workflow.isActive
                                                    ? 'bg-success-soft text-success-ink border-success/25'
                                                    : 'bg-surface-elevated text-muted border-border'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${workflow.isActive ? 'bg-success' : 'bg-border-strong'}`}></div>
                                                    {workflow.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${workflow.isPublic
                                                    ? 'bg-info-soft text-info-ink border-info/25'
                                                    : 'bg-warning-soft text-warning-ink border-warning/25'
                                                    }`}>
                                                    {workflow.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                                                    {workflow.isPublic ? 'Public' : 'Private'}
                                                </span>
                                                {workflow.owner && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border bg-accent-soft text-accent-ink border-accent/25">
                                                        <User size={10} />
                                                        {workflow.owner.name || 'User'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-muted mb-6 line-clamp-2 min-h-[2.5em] relative z-10">
                                    {workflow.description || 'No description provided.'}
                                </p>

                                {/* Webhook URL */}
                                <div className="mb-6 relative z-10">
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Webhook Endpoint</p>
                                    <div className="bg-surface-elevated rounded-lg border border-border p-2 flex items-center gap-2 group/copy transition-colors hover:border-primary/40">
                                        <code className="text-xs font-mono text-secondary truncate flex-1">
                                            {workflow.webhookUrl}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(workflow.webhookUrl);
                                                // toast success?
                                            }}
                                            className="text-muted hover:text-primary transition-colors p-1 rounded"
                                            title="Copy URL"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-auto relative z-10 pt-4 border-t border-border">
                                    <button
                                        onClick={() => toggleActive(workflow)}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${workflow.isActive
                                            ? 'border-border text-secondary hover:bg-surface-hover'
                                            : 'border-success/30 text-success-ink hover:bg-success-soft'
                                            }`}
                                    >
                                        {workflow.isActive ? <Pause size={16} /> : <Play size={16} />}
                                        {workflow.isActive ? 'Pause' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => setEditingWorkflow(workflow)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-info-soft text-info-ink hover:bg-info/15 transition-all border border-transparent"
                                    >
                                        <Edit size={16} /> Edit
                                    </button>
                                    {!workflow.isPublic && (
                                        <button
                                            onClick={() => setManagingUsersWorkflow(workflow)}
                                            className="px-3 py-2 text-sm font-medium rounded-lg bg-warning-soft text-warning-ink hover:bg-warning/15 transition-all border border-transparent"
                                            title="Manage Users"
                                        >
                                            <User size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteWorkflow(workflow.id, workflow.name)}
                                        className="px-3 py-2 text-sm font-medium rounded-lg text-danger hover:bg-danger-soft transition-all border border-transparent"
                                        title="Delete Workflow"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Modals */}
                {showCreateModal && (
                    <WorkflowModal
                        onSave={createWorkflow}
                        onClose={() => setShowCreateModal(false)}
                    />
                )}

                {editingWorkflow && (
                    <WorkflowModal
                        workflow={editingWorkflow}
                        onSave={(updates) => updateWorkflow(editingWorkflow.id, updates)}
                        onClose={() => setEditingWorkflow(null)}
                    />
                )}

                {managingUsersWorkflow && (
                    <ManageUsersModal
                        workflow={managingUsersWorkflow}
                        onClose={() => setManagingUsersWorkflow(null)}
                        onUpdate={checkAdminAndLoadWorkflows}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
