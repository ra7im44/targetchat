import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import {
    Sliders, Palette, Zap, MessageSquare, Code2,
    Save, Trash2, ExternalLink, Copy, Check, Plus,
    ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Clock,
    User, Smartphone, Laptop, Loader2, Sparkles, X,
    ChevronRight, HelpCircle
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

export default function WidgetEditor() {
    const router = useRouter();
    const { id } = router.query;
    const [widget, setWidget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [isPreviewOpen, setIsPreviewOpen] = useState(true);
    const [previewDevice, setPreviewDevice] = useState('mobile'); // 'mobile' | 'desktop'
    const [workflows, setWorkflows] = useState([]);
    const [copiedCode, setCopiedCode] = useState(false);

    // State for Workflow & Leads
    const [workflowStatus, setWorkflowStatus] = useState(true);
    const [preChatEnabled, setPreChatEnabled] = useState(true);
    const [assignees, setAssignees] = useState([]);
    const [workspaceMembers, setWorkspaceMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState('');

    const presetColors = [
        { name: 'Indigo', color: '#5B5BD6' },
        { name: 'Meta Blue', color: '#1877F2' },
        { name: 'Emerald', color: '#10B981' },
        { name: 'Rose', color: '#E11D48' },
        { name: 'Amber', color: '#F59E0B' },
        { name: 'Dark Slate', color: '#1E293B' }
    ];

    useEffect(() => {
        if (id) {
            fetchWidget();
            fetchWorkflows();
        }
    }, [id]);

    useEffect(() => {
        if (widget) {
            setWorkflowStatus(widget.workflowStatus ?? true);
            setPreChatEnabled(widget.settings?.preChatEnabled ?? true);
            fetchAssignees();
            if (widget.workspaceId) {
                fetchWorkspaceMembers(widget.workspaceId);
            }
        }
    }, [widget?.id]);

    async function fetchWorkflows() {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/workflows`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWorkflows(Array.isArray(data) ? data : (data.workflows || []));
            }
        } catch (err) {
            console.error('Failed to fetch workflows:', err);
        }
    }

    async function fetchWidget() {
        try {
            const token = localStorage.getItem('tc_token');
            if (!token) {
                toast.error('Please log in first');
                router.push('/login');
                return;
            }

            const res = await fetch(`${API}/api/widgets/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // Ensure defaults for nested theme and settings
                const w = data.widget;
                w.theme = {
                    primaryColor: '#5B5BD6',
                    headerTextColor: '#FFFFFF',
                    position: 'bottom-right',
                    borderRadius: 12,
                    launcherSize: 60,
                    launcherIcon: '',
                    ...(w.theme || {})
                };
                w.settings = {
                    preChatEnabled: true,
                    welcomeMessage: 'Hello! How can we assist you today?',
                    placeholder: 'Type your message...',
                    showBranding: true,
                    ...(w.settings || {})
                };
                setWidget(w);
            } else if (res.status === 401) {
                toast.error('Session expired. Please log in again.');
                localStorage.removeItem('tc_token');
                router.push('/login');
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.message || 'Failed to load widget');
                router.push('/widgets');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Network error loading widget');
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteWidget() {
        if (!confirm(`Are you sure you want to delete "${widget?.name || 'this widget'}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('Widget deleted successfully');
                router.push('/widgets');
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || 'Failed to delete widget');
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Error deleting widget');
        }
    }

    async function fetchAssignees() {
        if (!id) return;
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets/${id}/assignees`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAssignees(data.assignees || []);
            }
        } catch (err) {
            console.error('Error fetching assignees:', err);
        }
    }

    async function fetchWorkspaceMembers(workspaceId) {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/workspaces/${workspaceId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWorkspaceMembers(data.members || []);
            }
        } catch (err) {
            console.error('Error fetching workspace members:', err);
        }
    }

    async function addAssignee() {
        if (!selectedMember) return;
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets/${id}/assignees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: selectedMember })
            });

            if (res.ok) {
                toast.success('Assignee added');
                setSelectedMember('');
                fetchAssignees();
            } else {
                toast.error('Failed to add assignee');
            }
        } catch (err) {
            console.error('Error adding assignee:', err);
            toast.error('Failed to add assignee');
        }
    }

    async function removeAssignee(userId) {
        if (!confirm('Are you sure you want to remove this agent?')) return;
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets/${id}/assignees/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('Assignee removed');
                fetchAssignees();
            } else {
                toast.error('Failed to remove assignee');
            }
        } catch (err) {
            console.error('Error removing assignee:', err);
            toast.error('Failed to remove assignee');
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: widget.name,
                    theme: widget.theme,
                    triggers: widget.triggers,
                    settings: {
                        ...widget.settings,
                        preChatEnabled: preChatEnabled
                    },
                    status: widget.status,
                    workflowId: widget.workflowId,
                    preChatEnabled: preChatEnabled,
                    preChatMessage: widget.preChatMessage
                })
            });

            if (res.ok) {
                toast.success('Widget configuration saved!');
                fetchWidget();
            } else {
                toast.error('Failed to save widget');
            }
        } catch (err) {
            console.error('Save error:', err);
            toast.error('Failed to save widget');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <DashboardLayout title="Widget Editor">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="animate-spin text-primary" />
                        <p className="text-xs font-semibold text-muted">Loading widget editor...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!widget) {
        return (
            <DashboardLayout title="Widget Not Found">
                <div className="text-center py-20">
                    <p className="text-muted">Widget not found or removed.</p>
                    <Link href="/widgets" className="mt-4 inline-block text-primary font-semibold text-sm">
                        ← Back to My Widgets
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://api.u-axis.com';
    const embedCode = `<!-- TargetChat Widget Code -->
<script>
  (function(){
    var w=window,d=document;
    var s='${origin}/widget.js';
    var x=d.createElement('script');
    x.type='text/javascript';
    x.async=true;
    x.src=s;
    var h=d.getElementsByTagName('head')[0];
    h.appendChild(x);
    x.onload=function(){
      TargetChatWidget.init({ widget: "${widget.slug}" });
    };
  })();
</script>`;

    const tabs = [
        { id: 'general', label: 'General', icon: <Sliders size={15} /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette size={15} /> },
        { id: 'workflow', label: 'Workflow & Leads', icon: <Zap size={15} /> },
        { id: 'content', label: 'Content', icon: <MessageSquare size={15} /> },
        { id: 'install', label: 'Install', icon: <Code2 size={15} /> }
    ];

    const primaryColor = widget.theme?.primaryColor || '#5B5BD6';
    const headerTextColor = widget.theme?.headerTextColor || '#FFFFFF';
    const borderRadius = parseInt(widget.theme?.borderRadius) || 12;
    const isBottomLeft = widget.theme?.position === 'bottom-left';

    return (
        <DashboardLayout title={`Edit ${widget.name}`}>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
                {/* Breadcrumbs & Header Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-muted mb-1 font-medium">
                            <Link href="/widgets" className="hover:text-primary transition-colors flex items-center gap-1">
                                <ArrowLeft size={13} />
                                <span>Widgets</span>
                            </Link>
                            <ChevronRight size={12} />
                            <span className="text-foreground font-semibold truncate max-w-[200px]">{widget.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                widget.status === 'active'
                                    ? 'bg-success-soft text-success border-success/20'
                                    : 'bg-surface-elevated text-muted border-border'
                            }`}>
                                {widget.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Widget Editor
                        </h1>
                        <p className="text-xs text-muted mt-0.5">
                            Customize widget visual styling, automated conversational bot routing, and lead collection.
                        </p>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleDeleteWidget}
                            className="px-3.5 py-2 bg-surface hover:bg-danger-soft text-muted hover:text-danger border border-border hover:border-danger/30 rounded-button text-xs font-semibold transition-all flex items-center gap-1.5"
                            title="Delete Widget"
                        >
                            <Trash2 size={14} />
                            <span>Delete</span>
                        </button>
                        <a
                            href={`/embed/${widget.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-surface hover:bg-surface-hover text-secondary hover:text-foreground border border-border rounded-button text-xs font-semibold transition-all flex items-center gap-1.5"
                            title="Open standalone preview in new window"
                        >
                            <ExternalLink size={14} />
                            <span>Preview</span>
                        </a>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="group inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-button text-xs font-semibold shadow-xs transition-all disabled:opacity-60"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </div>

                {/* Main 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Editor Tabs & Configuration (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Tab Segmented Control */}
                        <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-xl shadow-2xs overflow-x-auto custom-scrollbar">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                            isActive
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'text-muted hover:text-foreground hover:bg-surface-hover'
                                        }`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Panels Container */}
                        <div className="bg-surface rounded-xl border border-border shadow-xs p-6">
                            {/* 1. GENERAL TAB */}
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                                            Widget Name
                                        </label>
                                        <input
                                            type="text"
                                            value={widget.name}
                                            onChange={(e) => setWidget({ ...widget, name: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-surface-elevated border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="e.g. Sales Website Chat"
                                        />
                                        <p className="text-[11px] text-muted mt-1">Used for internal identification and title bar header.</p>
                                    </div>

                                    {/* Status Card Selector */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                                            Live Deployment Status
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setWidget({ ...widget, status: 'active' })}
                                                className={`p-3.5 rounded-xl border text-left transition-all ${
                                                    widget.status === 'active'
                                                        ? 'border-success bg-success-soft/30 ring-1 ring-success/30 text-foreground'
                                                        : 'border-border bg-surface-elevated/40 hover:bg-surface-hover text-muted'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-success mb-0.5">
                                                    <CheckCircle2 size={14} />
                                                    <span>Active</span>
                                                </div>
                                                <p className="text-[11px] text-muted leading-tight">
                                                    Chat bubble is visible and accepts visitor messages
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setWidget({ ...widget, status: 'inactive' })}
                                                className={`p-3.5 rounded-xl border text-left transition-all ${
                                                    widget.status === 'inactive'
                                                        ? 'border-border-strong bg-surface-elevated ring-1 ring-border-strong text-foreground'
                                                        : 'border-border bg-surface-elevated/40 hover:bg-surface-hover text-muted'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-muted mb-0.5">
                                                    <Clock size={14} />
                                                    <span>Inactive</span>
                                                </div>
                                                <p className="text-[11px] text-muted leading-tight">
                                                    Snippet is disabled; widget will not render on websites
                                                </p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Connected Bot / Workflow */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                                            Connected Conversational Bot (Workflow)
                                        </label>
                                        <select
                                            value={widget.workflowId || ''}
                                            onChange={(e) => setWidget({ ...widget, workflowId: e.target.value || null })}
                                            className="w-full px-3.5 py-2.5 bg-surface-elevated border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            <option value="">-- No Bot (Human Agent Mode Only) --</option>
                                            {workflows.map((wf) => (
                                                <option key={wf.id} value={wf.id}>
                                                    {wf.icon || '🤖'} {wf.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-muted mt-1">
                                            Automated responses will be driven by the selected workflow's AI logic.
                                        </p>
                                    </div>

                                    {/* Assigned Agents */}
                                    {workspaceMembers.length > 0 && (
                                        <div className="pt-4 border-t border-border/80">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                                                        Assigned Human Agents
                                                    </h3>
                                                    <p className="text-[11px] text-muted">
                                                        Team members who receive notifications and can reply from Inbox.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-3">
                                                <select
                                                    value={selectedMember}
                                                    onChange={(e) => setSelectedMember(e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="">Select a workspace member...</option>
                                                    {workspaceMembers.map((m) => (
                                                        <option key={m.userId || m.id} value={m.userId || m.id}>
                                                            {m.name || m.email} ({m.role || 'Member'})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={addAssignee}
                                                    disabled={!selectedMember}
                                                    className="px-3 py-2 bg-primary-soft hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    <Plus size={13} />
                                                    <span>Assign</span>
                                                </button>
                                            </div>

                                            <div className="space-y-1.5">
                                                {assignees.map((a) => (
                                                    <div key={a.id || a.userId} className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated border border-border/60 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-primary-soft text-primary font-bold text-[10px] flex items-center justify-center">
                                                                {(a.name || a.email || 'U').substring(0, 1).toUpperCase()}
                                                            </div>
                                                            <span className="font-medium text-foreground">{a.name || a.email}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAssignee(a.userId || a.id)}
                                                            className="text-muted hover:text-danger p-1"
                                                            title="Remove assignee"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 2. APPEARANCE TAB */}
                            {activeTab === 'appearance' && (
                                <div className="space-y-6">
                                    {/* Preset Color Swatches */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                                            Theme Primary Color
                                        </label>
                                        <div className="flex flex-wrap items-center gap-2.5 mb-3">
                                            {presetColors.map((p) => (
                                                <button
                                                    key={p.color}
                                                    type="button"
                                                    onClick={() => setWidget({
                                                        ...widget,
                                                        theme: { ...widget.theme, primaryColor: p.color }
                                                    })}
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-2xs ${
                                                        widget.theme?.primaryColor?.toLowerCase() === p.color.toLowerCase()
                                                            ? 'ring-2 ring-offset-2 ring-primary scale-110'
                                                            : ''
                                                    }`}
                                                    style={{ backgroundColor: p.color }}
                                                    title={p.name}
                                                >
                                                    {widget.theme?.primaryColor?.toLowerCase() === p.color.toLowerCase() && (
                                                        <Check size={13} className="text-white drop-shadow" strokeWidth={3} />
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-muted mb-1">Custom Hex Code</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={widget.theme.primaryColor || '#5B5BD6'}
                                                        onChange={(e) => setWidget({
                                                            ...widget,
                                                            theme: { ...widget.theme, primaryColor: e.target.value }
                                                        })}
                                                        className="w-9 h-9 rounded-lg cursor-pointer border border-border p-0.5 bg-surface shrink-0"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={widget.theme.primaryColor || '#5B5BD6'}
                                                        onChange={(e) => setWidget({
                                                            ...widget,
                                                            theme: { ...widget.theme, primaryColor: e.target.value }
                                                        })}
                                                        className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs font-mono text-foreground uppercase"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-muted mb-1">Header Text Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={widget.theme.headerTextColor || '#FFFFFF'}
                                                        onChange={(e) => setWidget({
                                                            ...widget,
                                                            theme: { ...widget.theme, headerTextColor: e.target.value }
                                                        })}
                                                        className="w-9 h-9 rounded-lg cursor-pointer border border-border p-0.5 bg-surface shrink-0"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={widget.theme.headerTextColor || '#FFFFFF'}
                                                        onChange={(e) => setWidget({
                                                            ...widget,
                                                            theme: { ...widget.theme, headerTextColor: e.target.value }
                                                        })}
                                                        className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-xs font-mono text-foreground uppercase"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Position on screen */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                                            Screen Position
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setWidget({
                                                    ...widget,
                                                    theme: { ...widget.theme, position: 'bottom-right' }
                                                })}
                                                className={`p-3.5 rounded-xl border text-left transition-all ${
                                                    widget.theme.position !== 'bottom-left'
                                                        ? 'border-primary bg-primary-soft/30 ring-1 ring-primary/30 text-foreground'
                                                        : 'border-border bg-surface-elevated/40 hover:bg-surface-hover text-muted'
                                                }`}
                                            >
                                                <div className="h-10 w-full bg-surface rounded border border-border/80 relative mb-2 flex items-end justify-end p-1">
                                                    <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                                                </div>
                                                <div className="text-xs font-bold text-foreground">Bottom Right</div>
                                                <p className="text-[11px] text-muted">Standard position for web widgets</p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setWidget({
                                                    ...widget,
                                                    theme: { ...widget.theme, position: 'bottom-left' }
                                                })}
                                                className={`p-3.5 rounded-xl border text-left transition-all ${
                                                    widget.theme.position === 'bottom-left'
                                                        ? 'border-primary bg-primary-soft/30 ring-1 ring-primary/30 text-foreground'
                                                        : 'border-border bg-surface-elevated/40 hover:bg-surface-hover text-muted'
                                                }`}
                                            >
                                                <div className="h-10 w-full bg-surface rounded border border-border/80 relative mb-2 flex items-end justify-start p-1">
                                                    <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                                                </div>
                                                <div className="text-xs font-bold text-foreground">Bottom Left</div>
                                                <p className="text-[11px] text-muted">Ideal if right corner hosts other tools</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sliders: Border Radius & Launcher Size */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                    Corner Radius
                                                </label>
                                                <span className="text-xs font-mono font-bold text-foreground bg-surface-elevated px-2 py-0.5 rounded border border-border">
                                                    {widget.theme.borderRadius || 12}px
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="24"
                                                value={parseInt(widget.theme.borderRadius) || 12}
                                                onChange={(e) => setWidget({
                                                    ...widget,
                                                    theme: { ...widget.theme, borderRadius: e.target.value }
                                                })}
                                                className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                    Launcher Size
                                                </label>
                                                <span className="text-xs font-mono font-bold text-foreground bg-surface-elevated px-2 py-0.5 rounded border border-border">
                                                    {widget.theme.launcherSize || 60}px
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="44"
                                                max="72"
                                                value={parseInt(widget.theme.launcherSize) || 60}
                                                onChange={(e) => setWidget({
                                                    ...widget,
                                                    theme: { ...widget.theme, launcherSize: e.target.value }
                                                })}
                                                className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                    </div>

                                    {/* Custom Launcher Icon URL */}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                                            Custom Launcher Icon (Optional Image URL)
                                        </label>
                                        <input
                                            type="url"
                                            value={widget.theme.launcherIcon || ''}
                                            onChange={(e) => setWidget({
                                                ...widget,
                                                theme: { ...widget.theme, launcherIcon: e.target.value }
                                            })}
                                            placeholder="https://yourdomain.com/avatar.png"
                                            className="w-full px-3.5 py-2.5 bg-surface-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                        />
                                        <p className="text-[11px] text-muted mt-1">If blank, the default conversational chat bubble icon is used.</p>
                                    </div>
                                </div>
                            )}

                            {/* 3. WORKFLOW & LEADS TAB */}
                            {activeTab === 'workflow' && (
                                <div className="space-y-6">
                                    {/* Pre-Chat Form Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-surface-elevated/40 border border-border rounded-xl">
                                        <div>
                                            <div className="text-xs font-bold text-foreground">
                                                Enable Pre-Chat Lead Capture Form
                                            </div>
                                            <div className="text-[11px] text-muted mt-0.5">
                                                Require visitors to supply their contact details before a conversation begins
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPreChatEnabled(!preChatEnabled)}
                                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                                                preChatEnabled ? 'bg-primary' : 'bg-surface-elevated border border-border'
                                            }`}
                                            aria-label="Toggle Pre-Chat Form"
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
                                                    preChatEnabled ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {preChatEnabled && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                                                    Form Intro Message
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    value={widget.preChatMessage || ''}
                                                    onChange={(e) => setWidget({
                                                        ...widget,
                                                        preChatMessage: e.target.value
                                                    })}
                                                    className="w-full px-3.5 py-2.5 bg-surface-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    placeholder="Hello! Please introduce yourself to start chatting with our team."
                                                />
                                            </div>

                                            {/* Fields Builder */}
                                            <div className="pt-2">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                                                            Lead Form Fields
                                                        </h4>
                                                        <p className="text-[11px] text-muted">
                                                            Fields displayed inside the pre-chat card.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const defaultFields = [
                                                                { id: 'name', label: 'Full Name', type: 'text', required: true },
                                                                { id: 'email', label: 'Work Email', type: 'email', required: true },
                                                                { id: 'phone', label: 'Phone Number', type: 'phone', required: false }
                                                            ];
                                                            const current = (widget.formFields && widget.formFields.length > 0)
                                                                ? widget.formFields
                                                                : defaultFields;
                                                            const newField = { id: `f_${Date.now()}`, label: 'Company Name', type: 'text', required: false };
                                                            setWidget({ ...widget, formFields: [...current, newField] });
                                                        }}
                                                        className="px-3 py-1.5 bg-primary-soft hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                                    >
                                                        <Plus size={13} />
                                                        <span>Add Field</span>
                                                    </button>
                                                </div>

                                                <div className="space-y-2.5">
                                                    {(!widget.formFields || widget.formFields.length === 0) ? (
                                                        <div className="text-center py-6 bg-surface-elevated/40 border border-dashed border-border rounded-xl text-xs text-muted">
                                                            Default fields applied: Name (Required), Email (Required), Message.
                                                        </div>
                                                    ) : (
                                                        widget.formFields.map((field, idx) => (
                                                            <div key={field.id || idx} className="flex items-center gap-2 p-3 bg-surface-elevated/60 border border-border/80 rounded-xl">
                                                                <div className="flex-1 grid grid-cols-12 gap-2">
                                                                    <div className="col-span-6">
                                                                        <input
                                                                            type="text"
                                                                            value={field.label}
                                                                            onChange={(e) => {
                                                                                const updated = [...widget.formFields];
                                                                                updated[idx].label = e.target.value;
                                                                                setWidget({ ...widget, formFields: updated });
                                                                            }}
                                                                            className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-md text-xs text-foreground"
                                                                            placeholder="Field Label"
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-4">
                                                                        <select
                                                                            value={field.type}
                                                                            onChange={(e) => {
                                                                                const updated = [...widget.formFields];
                                                                                updated[idx].type = e.target.value;
                                                                                setWidget({ ...widget, formFields: updated });
                                                                            }}
                                                                            className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-md text-xs text-foreground"
                                                                        >
                                                                            <option value="text">Text</option>
                                                                            <option value="email">Email</option>
                                                                            <option value="phone">Phone</option>
                                                                            <option value="textarea">Textarea</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="col-span-2 flex items-center justify-center">
                                                                        <label className="inline-flex items-center gap-1 text-[11px] text-muted cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Boolean(field.required)}
                                                                                onChange={(e) => {
                                                                                    const updated = [...widget.formFields];
                                                                                    updated[idx].required = e.target.checked;
                                                                                    setWidget({ ...widget, formFields: updated });
                                                                                }}
                                                                                className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5"
                                                                            />
                                                                            <span>Req</span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = widget.formFields.filter((_, i) => i !== idx);
                                                                        setWidget({ ...widget, formFields: updated });
                                                                    }}
                                                                    className="p-1 text-muted hover:text-danger rounded"
                                                                    title="Remove field"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 4. CONTENT TAB */}
                            {activeTab === 'content' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                                            Default Welcome Message
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={widget.settings?.welcomeMessage || ''}
                                            onChange={(e) => setWidget({
                                                ...widget,
                                                settings: { ...widget.settings, welcomeMessage: e.target.value }
                                            })}
                                            className="w-full px-3.5 py-2.5 bg-surface-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="Hello! How can we assist you today?"
                                        />
                                        <p className="text-[11px] text-muted mt-1">First bubble shown when a visitor opens the live chat.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                                            Input Placeholder
                                        </label>
                                        <input
                                            type="text"
                                            value={widget.settings?.placeholder || ''}
                                            onChange={(e) => setWidget({
                                                ...widget,
                                                settings: { ...widget.settings, placeholder: e.target.value }
                                            })}
                                            className="w-full px-3.5 py-2.5 bg-surface-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            placeholder="Type your message..."
                                        />
                                    </div>

                                    {/* Branding toggle */}
                                    <div className="flex items-center justify-between p-4 bg-surface-elevated/40 border border-border rounded-xl">
                                        <div>
                                            <div className="text-xs font-bold text-foreground">
                                                Show "Powered by TargetChat" Branding
                                            </div>
                                            <div className="text-[11px] text-muted mt-0.5">
                                                Displays subtle product attribution footer in chat window
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setWidget({
                                                ...widget,
                                                settings: { ...widget.settings, showBranding: !widget.settings?.showBranding }
                                            })}
                                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                                                widget.settings?.showBranding ? 'bg-primary' : 'bg-surface-elevated border border-border'
                                            }`}
                                            aria-label="Toggle Branding"
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
                                                    widget.settings?.showBranding ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 5. INSTALL TAB */}
                            {activeTab === 'install' && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-primary-soft/40 border border-primary/20 rounded-xl flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0 border border-primary/20 mt-0.5">
                                            <Code2 size={16} />
                                        </div>
                                        <div className="text-xs text-secondary leading-relaxed">
                                            <span className="font-bold text-foreground">One-line Embed Installation: </span>
                                            Copy the script snippet below and paste it into the HTML of any web page right before the closing <code className="px-1 py-0.5 bg-surface rounded border border-border font-mono text-primary">&lt;/body&gt;</code> tag.
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                HTML Embed Script
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(embedCode);
                                                    setCopiedCode(true);
                                                    toast.success('Embed snippet copied to clipboard!');
                                                    setTimeout(() => setCopiedCode(false), 2000);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-elevated hover:bg-surface-hover text-foreground border border-border rounded-md text-xs font-semibold transition-colors"
                                            >
                                                {copiedCode ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                                                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inset leading-relaxed">
                                                {embedCode}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex items-center gap-3">
                                        <a
                                            href={`/embed/${widget.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                                        >
                                            <ExternalLink size={13} />
                                            <span>Open Standalone Webpage Demo</span>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Live Interactive Device Preview (5 cols) */}
                    <div className="lg:col-span-5 sticky top-6">
                        <div className="bg-surface rounded-xl border border-border shadow-xs p-5 space-y-4">
                            {/* Preview Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        Live Interactive Preview
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                                        className="text-[11px] font-semibold text-primary hover:underline"
                                    >
                                        {isPreviewOpen ? 'Minimize' : 'Open Bubble'}
                                    </button>
                                </div>
                            </div>

                            {/* Simulated Device Frame */}
                            <div className="relative mx-auto rounded-[2rem] border-[8px] border-slate-800 bg-slate-900 shadow-modal overflow-hidden h-[540px] max-w-[290px] w-full flex flex-col justify-between">
                                {/* Top Camera Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-28 bg-slate-800 rounded-b-xl z-30 flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
                                </div>

                                {/* Screen Content */}
                                <div className="relative w-full h-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col justify-between text-left">
                                    {/* Mock Website Page */}
                                    <div className="p-3 pt-6 space-y-2.5 select-none opacity-85">
                                        <div className="h-6 bg-white dark:bg-slate-900 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-800 flex items-center justify-between px-2.5">
                                            <div className="w-12 h-2 rounded bg-primary/40" />
                                            <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        </div>
                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200 dark:border-slate-800 space-y-1.5">
                                            <div className="w-3/4 h-3 rounded bg-slate-800 dark:bg-slate-200 font-bold" />
                                            <div className="w-full h-2 rounded bg-slate-300 dark:bg-slate-700" />
                                            <div className="w-2/3 h-2 rounded bg-slate-200 dark:bg-slate-800" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="h-16 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs p-2" />
                                            <div className="h-16 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs p-2" />
                                        </div>
                                    </div>

                                    {/* Floating Chat Widget Overlay */}
                                    <div className={`p-3 flex flex-col ${isBottomLeft ? 'items-start' : 'items-end'} relative z-20`}>
                                        {/* Chat Window Popup */}
                                        <div
                                            className={`w-full max-w-[245px] bg-white dark:bg-slate-900 shadow-modal border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 origin-bottom mb-2.5 ${
                                                isPreviewOpen
                                                    ? 'opacity-100 scale-100 translate-y-0 max-h-[350px]'
                                                    : 'opacity-0 scale-90 translate-y-8 max-h-0 pointer-events-none'
                                            }`}
                                            style={{ borderRadius: `${borderRadius}px` }}
                                        >
                                            {/* Widget Header */}
                                            <div
                                                className="p-3 flex items-center justify-between shrink-0 shadow-xs"
                                                style={{ backgroundColor: primaryColor, color: headerTextColor }}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                                        <MessageSquare size={13} style={{ color: headerTextColor }} />
                                                    </div>
                                                    <div className="truncate">
                                                        <h3 className="font-bold text-xs truncate max-w-[130px]" style={{ color: headerTextColor }}>
                                                            {widget.name || 'Chat Widget'}
                                                        </h3>
                                                        <p className="text-[10px] opacity-90 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                                            <span>Online</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPreviewOpen(false)}
                                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                                    aria-label="Close Preview Window"
                                                >
                                                    <X size={13} style={{ color: headerTextColor }} />
                                                </button>
                                            </div>

                                            {/* Widget Body */}
                                            {preChatEnabled ? (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-950 flex flex-col justify-center space-y-2 text-xs overflow-y-auto max-h-[260px]">
                                                    {widget.preChatMessage && (
                                                        <p className="text-[11px] text-muted text-center leading-relaxed">
                                                            {widget.preChatMessage}
                                                        </p>
                                                    )}
                                                    <div className="space-y-1.5">
                                                        {(widget.formFields && widget.formFields.length > 0
                                                            ? widget.formFields
                                                            : [
                                                                { id: 'name', label: 'Full Name', type: 'text' },
                                                                { id: 'email', label: 'Email', type: 'email' }
                                                            ]
                                                        ).map((f, i) => (
                                                            <input
                                                                key={i}
                                                                type={f.type === 'email' ? 'email' : 'text'}
                                                                placeholder={f.label}
                                                                readOnly
                                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-foreground placeholder:text-muted"
                                                            />
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => toast('Preview only mode', { icon: '👁️' })}
                                                            className="w-full py-2 rounded-lg font-bold text-[11px] text-white shadow-xs transition-opacity hover:opacity-95"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            Start Conversation
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col h-[240px] justify-between bg-slate-50 dark:bg-slate-950">
                                                    {/* Messages Flow */}
                                                    <div className="p-2.5 space-y-2 overflow-y-auto">
                                                        {widget.settings?.welcomeMessage && (
                                                            <div className="flex justify-start">
                                                                <div className="p-2 bg-white dark:bg-slate-900 text-foreground border border-slate-200 dark:border-slate-800 rounded-xl rounded-tl-none text-[11px] max-w-[85%] shadow-2xs">
                                                                    {widget.settings.welcomeMessage}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-end">
                                                            <div
                                                                className="p-2 text-white rounded-xl rounded-tr-none text-[11px] max-w-[85%] shadow-2xs"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                Hi, I have a quick question!
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Input row */}
                                                    <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                placeholder={widget.settings?.placeholder || 'Type your message...'}
                                                                className="flex-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] text-foreground border border-slate-200 dark:border-slate-700 outline-none"
                                                            />
                                                            <div
                                                                className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <Zap size={11} />
                                                            </div>
                                                        </div>
                                                        {widget.settings?.showBranding && (
                                                            <p className="text-[9px] text-center text-muted mt-1">
                                                                Powered by TargetChat
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Launcher Circle Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                                            className="rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 text-white"
                                            style={{
                                                backgroundColor: primaryColor,
                                                width: `${Math.min(parseInt(widget.theme.launcherSize) || 54, 52)}px`,
                                                height: `${Math.min(parseInt(widget.theme.launcherSize) || 54, 52)}px`
                                            }}
                                            aria-label="Toggle Widget Preview"
                                        >
                                            {widget.theme.launcherIcon ? (
                                                <img src={widget.theme.launcherIcon} className="w-full h-full rounded-full object-cover" alt="Launcher" />
                                            ) : (
                                                <div className={`transition-transform duration-200 ${isPreviewOpen ? 'rotate-90' : 'rotate-0'}`}>
                                                    {isPreviewOpen ? <X size={20} /> : <MessageSquare size={20} />}
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
