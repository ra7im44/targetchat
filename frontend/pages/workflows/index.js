import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import {
    Zap,
    Bot,
    MessageSquare,
    Workflow as WorkflowIcon,
    Webhook,
    Cpu,
    GitBranch,
    Sparkles,
    Layers,
    Terminal,
    Plus,
    Search,
    LayoutGrid,
    List,
    Pencil,
    Trash2,
    X
} from 'lucide-react';
import { API_URL as API } from '../../utils/apiConfig';

// Curated icon registry for workflows - SVG Lucide icons instead of unicode emojis
const ICON_OPTIONS = [
    { id: 'bot', label: 'Assistant', icon: Bot, matches: ['bot', '🤖', 'assistant'] },
    { id: 'zap', label: 'Automation', icon: Zap, matches: ['zap', '⚡', 'trigger'] },
    { id: 'chat', label: 'Chat', icon: MessageSquare, matches: ['chat', '💬', 'message'] },
    { id: 'workflow', label: 'Pipeline', icon: WorkflowIcon, matches: ['workflow', 'flow'] },
    { id: 'webhook', label: 'Webhook', icon: Webhook, matches: ['webhook', 'api'] },
    { id: 'cpu', label: 'Intelligence', icon: Cpu, matches: ['cpu', '💡', 'ai'] },
    { id: 'branch', label: 'Router', icon: GitBranch, matches: ['branch', '🎯', 'router'] },
    { id: 'sparkles', label: 'Generator', icon: Sparkles, matches: ['sparkles', '🚀', '🔥', '⭐'] },
    { id: 'layers', label: 'Composite', icon: Layers, matches: ['layers', '🎨', '🔧'] },
    { id: 'terminal', label: 'Script', icon: Terminal, matches: ['terminal', 'code'] },
];

function getWorkflowIconComponent(iconId) {
    if (!iconId) return WorkflowIcon;
    const found = ICON_OPTIONS.find(opt =>
        opt.id === iconId || opt.matches.includes(iconId)
    );
    return found ? found.icon : WorkflowIcon;
}

function formatWebhookUrl(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        const path = parsed.pathname.length > 24 ? '...' + parsed.pathname.slice(-20) : parsed.pathname;
        return `${parsed.host}${path}`;
    } catch (e) {
        return url.length > 32 ? url.slice(0, 30) + '...' : url;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return 'Recently';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Recently';
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    } catch (e) {
        return 'Recently';
    }
}

export default function MyWorkflowsPage() {
    const router = useRouter();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        webhookUrl: '',
        icon: 'bot'
    });

    useEffect(() => {
        loadWorkflows();
    }, []);

    async function loadWorkflows() {
        try {
            const token = localStorage.getItem('tc_token');
            if (!token) {
                router.push('/login');
                return;
            }

            const resp = await fetch(`${API}/api/workflows/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (resp.status === 401) {
                router.push('/login');
                return;
            }

            if (resp.ok) {
                const data = await resp.json();
                setWorkflows(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error loading workflows:', err);
            toast.error('Failed to load workflows');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            const token = localStorage.getItem('tc_token');
            const url = editingWorkflow
                ? `${API}/api/workflows/${editingWorkflow.id}`
                : `${API}/api/workflows`;

            const method = editingWorkflow ? 'PUT' : 'POST';

            const resp = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (resp.ok) {
                toast.success(editingWorkflow ? 'Workflow updated' : 'Workflow created');
                setShowModal(false);
                setEditingWorkflow(null);
                setFormData({ name: '', description: '', webhookUrl: '', icon: 'bot' });
                loadWorkflows();
            } else {
                const error = await resp.json();
                toast.error(error.message || 'Failed to save workflow');
            }
        } catch (err) {
            console.error('Error saving workflow:', err);
            toast.error('Failed to save workflow');
        }
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this workflow?')) return;

        try {
            const token = localStorage.getItem('tc_token');
            const resp = await fetch(`${API}/api/workflows/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (resp.ok) {
                toast.success('Workflow deleted');
                loadWorkflows();
            } else {
                toast.error('Failed to delete workflow');
            }
        } catch (err) {
            console.error('Error deleting workflow:', err);
            toast.error('Failed to delete workflow');
        }
    }

    function openCreateModal() {
        setEditingWorkflow(null);
        setFormData({ name: '', description: '', webhookUrl: '', icon: 'bot' });
        setShowModal(true);
    }

    function openEditModal(workflow) {
        setEditingWorkflow(workflow);
        // Map legacy emoji or icon string to known option
        const matched = ICON_OPTIONS.find(opt =>
            opt.id === workflow.icon || opt.matches.includes(workflow.icon)
        );
        setFormData({
            name: workflow.name,
            description: workflow.description || '',
            webhookUrl: workflow.webhookUrl,
            icon: matched ? matched.id : 'bot'
        });
        setShowModal(true);
    }

    // Filter & search calculations
    const filteredWorkflows = useMemo(() => {
        return workflows.filter((w) => {
            const matchesSearch =
                (w.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (w.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (w.webhookUrl || '').toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter === 'active') return w.isActive !== false;
            if (statusFilter === 'inactive') return w.isActive === false;
            return true;
        });
    }, [workflows, searchQuery, statusFilter]);

    const activeCount = useMemo(() => workflows.filter(w => w.isActive !== false).length, [workflows]);
    const inactiveCount = useMemo(() => workflows.filter(w => w.isActive === false).length, [workflows]);

    return (
        <DashboardLayout title="Workflows">
            {/* Page Header: Clear hierarchy, title + concise description, single primary action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-border">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-text-primary tracking-tight">
                        Workflows
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-text-muted mt-1 max-w-2xl leading-relaxed">
                        Automate conversations with AI orchestration and webhooks connected to your services.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm shrink-0 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                    <Plus size={15} />
                    <span>New workflow</span>
                </button>
            </div>

            {/* Toolbar: Search, Status Filters, View Mode Toggle */}
            {!loading && workflows.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 pb-4">
                    {/* Search Field */}
                    <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search workflows..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md bg-white dark:bg-surface border border-gray-200 dark:border-border text-gray-900 dark:text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                                aria-label="Clear search"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Status Tabs & View Mode */}
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                        {/* Status Filter Segmented Control */}
                        <div className="inline-flex p-0.5 rounded-md bg-gray-100 dark:bg-surface border border-gray-200 dark:border-border text-xs select-none">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-white dark:bg-surface-elevated text-gray-900 dark:text-text-primary shadow-2xs'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                All <span className="opacity-60 text-[10px] ml-0.5">({workflows.length})</span>
                            </button>
                            <button
                                onClick={() => setStatusFilter('active')}
                                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                                    statusFilter === 'active'
                                        ? 'bg-white dark:bg-surface-elevated text-gray-900 dark:text-text-primary shadow-2xs'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                Active <span className="opacity-60 text-[10px] ml-0.5">({activeCount})</span>
                            </button>
                            <button
                                onClick={() => setStatusFilter('inactive')}
                                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                                    statusFilter === 'inactive'
                                        ? 'bg-white dark:bg-surface-elevated text-gray-900 dark:text-text-primary shadow-2xs'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                Inactive <span className="opacity-60 text-[10px] ml-0.5">({inactiveCount})</span>
                            </button>
                        </div>

                        {/* View Switcher */}
                        <div className="inline-flex p-0.5 rounded-md bg-gray-100 dark:bg-surface border border-gray-200 dark:border-border">
                            <button
                                onClick={() => setViewMode('grid')}
                                aria-label="Grid layout"
                                title="Grid layout"
                                className={`p-1 rounded-[4px] transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-white dark:bg-surface-elevated text-gray-900 dark:text-text-primary shadow-2xs'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                aria-label="Table layout"
                                title="Table layout"
                                className={`p-1 rounded-[4px] transition-colors ${
                                    viewMode === 'table'
                                        ? 'bg-white dark:bg-surface-elevated text-gray-900 dark:text-text-primary shadow-2xs'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                <List size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            {loading ? (
                /* Skeleton Loader */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-44 bg-gray-100 dark:bg-surface rounded-lg border border-gray-200 dark:border-border animate-pulse p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-surface-elevated"></div>
                                <div className="w-32 h-4 bg-gray-200 dark:bg-surface-elevated rounded"></div>
                            </div>
                            <div className="w-full h-8 bg-gray-200 dark:bg-surface-elevated rounded mb-4"></div>
                            <div className="w-20 h-3 bg-gray-200 dark:bg-surface-elevated rounded"></div>
                        </div>
                    ))}
                </div>
            ) : workflows.length === 0 ? (
                /* Intentional Empty State: Only shown when zero workflows exist */
                <div className="my-12 text-center py-14 px-6 bg-white dark:bg-surface rounded-lg border border-gray-200 dark:border-border max-w-lg mx-auto">
                    <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-surface-elevated border border-gray-200 dark:border-border flex items-center justify-center mx-auto mb-3 text-text-muted">
                        <WorkflowIcon size={20} />
                    </div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-text-primary mb-1">
                        No workflows yet
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-text-muted mb-5 max-w-sm mx-auto leading-relaxed">
                        Create your first workflow to automate conversations and connect your integrations.
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-semibold rounded-md transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                        <Plus size={14} />
                        <span>Create workflow</span>
                    </button>
                </div>
            ) : filteredWorkflows.length === 0 ? (
                /* No search/filter match */
                <div className="text-center py-12 bg-white dark:bg-surface rounded-lg border border-gray-200 dark:border-border my-6">
                    <p className="text-xs text-text-muted">No workflows match your search criteria.</p>
                    <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                        className="mt-2 text-xs text-accent hover:underline"
                    >
                        Reset filters
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                /* Compact, Structured Grid Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
                    {filteredWorkflows.map((workflow) => {
                        const IconComponent = getWorkflowIconComponent(workflow.icon);
                        return (
                            <div
                                key={workflow.id}
                                className="group bg-white dark:bg-surface rounded-lg border border-gray-200 dark:border-border hover:border-gray-300 dark:hover:border-border-strong p-4 transition-colors flex flex-col justify-between"
                            >
                                <div>
                                    {/* Header Row: Icon + Name + Status + Action buttons */}
                                    <div className="flex items-start justify-between gap-3 mb-2.5">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-surface-elevated border border-gray-200 dark:border-border flex items-center justify-center text-text-secondary group-hover:text-accent transition-colors shrink-0">
                                                <IconComponent size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-text-primary truncate" title={workflow.name}>
                                                    {workflow.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${workflow.isActive !== false ? 'bg-success' : 'bg-gray-400'}`}></span>
                                                    <span className="text-[11px] text-text-muted font-medium">
                                                        {workflow.isActive !== false ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Icon Buttons */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                                onClick={() => openEditModal(workflow)}
                                                className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-gray-100 dark:hover:bg-surface-hover transition-colors"
                                                title="Edit workflow"
                                                aria-label={`Edit ${workflow.name}`}
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(workflow.id)}
                                                className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                                title="Delete workflow"
                                                aria-label={`Delete ${workflow.name}`}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-gray-600 dark:text-text-secondary line-clamp-2 min-h-[32px] mb-3 leading-relaxed">
                                        {workflow.description || 'No description provided.'}
                                    </p>
                                </div>

                                {/* Footer Row: Webhook URL info + Date */}
                                <div className="pt-2.5 border-t border-gray-100 dark:border-border/60 flex items-center justify-between text-[11px] text-text-muted">
                                    <div className="flex items-center gap-1.5 truncate max-w-[65%]" title={workflow.webhookUrl}>
                                        <Webhook size={12} className="shrink-0 text-text-muted" />
                                        <span className="truncate font-mono text-[10.5px]">
                                            {workflow.webhookUrl ? formatWebhookUrl(workflow.webhookUrl) : 'n8n webhook'}
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-[10.5px]">
                                        {formatDate(workflow.updatedAt || workflow.createdAt)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* High-Density Table / List View */
                <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-lg overflow-hidden mt-2">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-border bg-gray-50/50 dark:bg-surface-elevated/40 text-text-muted uppercase tracking-wider text-[10px] font-semibold">
                                    <th className="py-2.5 px-4">Workflow</th>
                                    <th className="py-2.5 px-4">Status</th>
                                    <th className="py-2.5 px-4">Webhook Endpoint</th>
                                    <th className="py-2.5 px-4">Activity</th>
                                    <th className="py-2.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-border/60">
                                {filteredWorkflows.map((workflow) => {
                                    const IconComponent = getWorkflowIconComponent(workflow.icon);
                                    return (
                                        <tr key={workflow.id} className="hover:bg-gray-50/70 dark:hover:bg-surface-hover/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-surface-elevated border border-gray-200 dark:border-border flex items-center justify-center text-text-secondary shrink-0">
                                                        <IconComponent size={15} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-gray-900 dark:text-text-primary truncate max-w-xs">{workflow.name}</div>
                                                        <div className="text-[11px] text-text-muted truncate max-w-sm">{workflow.description || 'No description'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${workflow.isActive !== false ? 'bg-success' : 'bg-gray-400'}`}></span>
                                                    <span className="text-[11px] text-text-secondary font-medium">
                                                        {workflow.isActive !== false ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[11px] text-text-muted truncate max-w-xs whitespace-nowrap" title={workflow.webhookUrl}>
                                                {workflow.webhookUrl || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-text-muted text-[11px] whitespace-nowrap">
                                                {formatDate(workflow.updatedAt || workflow.createdAt)}
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEditModal(workflow)}
                                                        className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-gray-100 dark:hover:bg-surface-hover transition-colors"
                                                        title="Edit"
                                                        aria-label={`Edit ${workflow.name}`}
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(workflow.id)}
                                                        className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                                        title="Delete"
                                                        aria-label={`Delete ${workflow.name}`}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create / Edit Workflow Dialog */}
            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-surface rounded-lg max-w-lg w-full p-6 shadow-xl border border-gray-200 dark:border-border animate-scaleIn">
                        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100 dark:border-border">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-text-primary">
                                    {editingWorkflow ? 'Edit workflow' : 'Create new workflow'}
                                </h2>
                                <p className="text-xs text-text-muted mt-0.5">
                                    Connect your n8n automation webhook to TargetChat
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-gray-100 dark:hover:bg-surface-hover transition-colors"
                                aria-label="Close dialog"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-text-primary mb-1.5">
                                    Workflow Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 text-xs rounded-md border border-gray-200 dark:border-border bg-white dark:bg-background text-gray-900 dark:text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors"
                                    placeholder="e.g., Support Ticket Auto-Reply"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-text-primary mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 text-xs rounded-md border border-gray-200 dark:border-border bg-white dark:bg-background text-gray-900 dark:text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors resize-y min-h-[60px]"
                                    rows="2"
                                    placeholder="Brief summary of what triggers this workflow..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-text-primary mb-1.5">
                                    n8n Webhook URL <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="url"
                                    required
                                    value={formData.webhookUrl}
                                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                                    className="w-full px-3 py-2 text-xs font-mono rounded-md border border-gray-200 dark:border-border bg-white dark:bg-background text-gray-900 dark:text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors"
                                    placeholder="https://n8n.u-axis.com/webhook/..."
                                />
                                <p className="mt-1 text-[11px] text-text-muted">
                                    Enter the production webhook URL from your n8n workflow.
                                </p>
                            </div>

                            {/* SVG Icon Selection */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-text-primary mb-1.5">
                                    Icon
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {ICON_OPTIONS.map((opt) => {
                                        const OptionIcon = opt.icon;
                                        const isSelected = formData.icon === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, icon: opt.id })}
                                                className={`h-9 flex flex-col items-center justify-center rounded-md border transition-colors ${
                                                    isSelected
                                                        ? 'bg-accent/10 border-accent text-accent'
                                                        : 'bg-white dark:bg-surface-elevated border-gray-200 dark:border-border text-text-muted hover:text-text-primary hover:border-gray-300 dark:hover:border-border-strong'
                                                }`}
                                                title={opt.label}
                                            >
                                                <OptionIcon size={16} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-border mt-5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingWorkflow(null);
                                    }}
                                    className="px-3.5 py-1.5 border border-gray-200 dark:border-border text-gray-700 dark:text-text-secondary rounded-md text-xs font-medium hover:bg-gray-100 dark:hover:bg-surface-hover hover:text-text-primary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-md text-xs font-semibold transition-colors shadow-sm"
                                >
                                    {editingWorkflow ? 'Save changes' : 'Create workflow'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
