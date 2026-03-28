import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import WorkflowModal from '../../components/admin/WorkflowModal';
import ManageUsersModal from '../../components/admin/ManageUsersModal';
import {
    Zap, Search, Filter, Globe, Lock, User, Bot,
    Copy, Trash2, Edit, Pause, Play, Plus, X
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            <Zap size={32} className="text-amber-500" />
                            Workflow Management
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Orchestrate your AI agents and chatbot flows.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2 font-medium active:scale-95 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="hidden sm:inline">New Workflow</span>
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search workflows..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 pl-11 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X size={16} className="text-gray-500" />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>

                        <select
                            value={visibilityFilter}
                            onChange={(e) => setVisibilityFilter(e.target.value)}
                            className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            <option value="all">All Visibility</option>
                            <option value="public">Public Only</option>
                            <option value="private">Private Only</option>
                        </select>
                    </div>
                </div>

                {/* Results Count */}
                {(searchQuery || statusFilter !== 'all' || visibilityFilter !== 'all') && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredWorkflows.length}</span> results
                    </div>
                )}

                {/* Workflows Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
                    {filteredWorkflows.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No workflows found</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Try adjusting your filters or create a new one.
                            </p>
                        </div>
                    ) : (
                        filteredWorkflows.map((workflow, index) => (
                            <div
                                key={workflow.id}
                                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative group hover:-translate-y-1 transition-all duration-300 animate-fadeIn"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-500 pointer-events-none"></div>

                                {/* Header */}
                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center text-3xl shadow-inner border border-blue-100 dark:border-blue-800/30">
                                            {/* Ideally this would be a dynamic icon component, but assuming string for now or passed element */}
                                            {workflow.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{workflow.name}</h3>
                                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full border ${workflow.isActive
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                                    : 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${workflow.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                                                    {workflow.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${workflow.isPublic
                                                    ? 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-400'
                                                    : 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400'
                                                    }`}>
                                                    {workflow.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                                                    {workflow.isPublic ? 'Public' : 'Private'}
                                                </span>
                                                {workflow.owner && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400">
                                                        <User size={10} />
                                                        {workflow.owner.name || 'User'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 min-h-[2.5em] relative z-10">
                                    {workflow.description || 'No description provided.'}
                                </p>

                                {/* Webhook URL */}
                                <div className="mb-6 relative z-10">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Webhook Endpoint</p>
                                    <div className="bg-gray-50 dark:bg-black/30 rounded-lg border border-gray-100 dark:border-gray-700/50 p-2 flex items-center gap-2 group/copy transition-colors hover:border-blue-200 dark:hover:border-blue-800/50">
                                        <code className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate flex-1">
                                            {workflow.webhookUrl}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(workflow.webhookUrl);
                                                // toast success?
                                            }}
                                            className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded"
                                            title="Copy URL"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-auto relative z-10 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                    <button
                                        onClick={() => toggleActive(workflow)}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${workflow.isActive
                                            ? 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                            : 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                            }`}
                                    >
                                        {workflow.isActive ? <Pause size={14} /> : <Play size={14} />}
                                        {workflow.isActive ? 'Pause' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => setEditingWorkflow(workflow)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all border border-transparent"
                                    >
                                        <Edit size={14} /> Edit
                                    </button>
                                    {!workflow.isPublic && (
                                        <button
                                            onClick={() => setManagingUsersWorkflow(workflow)}
                                            className="px-3 py-2 text-sm font-medium rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all border border-transparent"
                                            title="Manage Users"
                                        >
                                            <User size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteWorkflow(workflow.id, workflow.name)}
                                        className="px-3 py-2 text-sm font-medium rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent"
                                        title="Delete Workflow"
                                    >
                                        <Trash2 size={14} />
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
