import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function WidgetEditor() {
    const router = useRouter();
    const { id } = router.query;
    const [widget, setWidget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [isPreviewOpen, setIsPreviewOpen] = useState(true);
    const [workflows, setWorkflows] = useState([]);

    // New state for Workflow & Leads
    const [workflowStatus, setWorkflowStatus] = useState(true);
    const [preChatEnabled, setPreChatEnabled] = useState(true);
    const [assignees, setAssignees] = useState([]);
    const [workspaceMembers, setWorkspaceMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState('');

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
    }, [widget]);

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
                setWidget(data.widget);
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

    async function toggleWorkflow(status) {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets/${id}/workflow-status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setWorkflowStatus(status);
                toast.success(`Workflow ${status ? 'Enabled' : 'Disabled'}`);
            }
        } catch (err) {
            toast.error('Failed to toggle workflow');
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
                    settings: widget.settings,
                    status: widget.status,
                    workflowId: widget.workflowId,
                    // New fields
                    preChatEnabled: preChatEnabled,
                    preChatMessage: widget.preChatMessage
                })
            });

            if (res.ok) {
                toast.success('Widget saved successfully');
                fetchWidget(); // Reload to get any server-side updates
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

    if (loading) return <DashboardLayout>Loading...</DashboardLayout>;
    if (!widget) return <DashboardLayout>Widget not found</DashboardLayout>;

    const embedCode = `<script>
  (function(){ 
    var w=window;
    var d=document;
    var s='${window.location.origin}/widget.js'; 
    var x=d.createElement('script'); 
    x.type='text/javascript'; 
    x.async=true; 
    x.src=s; 
    var h=d.getElementsByTagName('head')[0]; 
    h.appendChild(x); 
    x.onload = function(){ 
      TargetChatWidget.init({ widget: "${widget.slug}" }); 
    };
  })();
</script>`;

    return (
        <DashboardLayout title={`Edit ${widget.name}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Widget Editor</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Customize your chat widget appearance and behavior.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleDeleteWidget}
                            className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1.5"
                            title="Delete Widget"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                        <a
                            href={`/embed/${widget.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Preview
                        </a>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Settings */}
                    <div className="lg:col-span-2">
                        {/* Tabs */}
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit">
                            {['general', 'appearance', 'workflow', 'content', 'install'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">

                            {/* General Tab */}
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Widget Name</label>
                                        <input
                                            type="text"
                                            value={widget.name}
                                            onChange={(e) => setWidget({ ...widget, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                                        <select
                                            value={widget.status}
                                            onChange={(e) => setWidget({ ...widget, status: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connected Bot (Workflow)</label>
                                        <select
                                            value={widget.workflowId || ''}
                                            onChange={(e) => setWidget({ ...widget, workflowId: e.target.value || null })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">-- Select a Bot --</option>
                                            {workflows.map(wf => (
                                                <option key={wf.id} value={wf.id}>
                                                    {wf.icon} {wf.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Appearance Tab */}
                            {activeTab === 'appearance' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={widget.theme.primaryColor}
                                                    onChange={(e) => setWidget({ ...widget, theme: { ...widget.theme, primaryColor: e.target.value } })}
                                                    className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={widget.theme.primaryColor}
                                                    onChange={(e) => setWidget({ ...widget, theme: { ...widget.theme, primaryColor: e.target.value } })}
                                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Header Text Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={widget.theme.headerTextColor || '#ffffff'}
                                                    onChange={(e) => setWidget({ ...widget, theme: { ...widget.theme, headerTextColor: e.target.value } })}
                                                    className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={widget.theme.headerTextColor || '#ffffff'}
                                                    onChange={(e) => setWidget({ ...widget, theme: { ...widget.theme, headerTextColor: e.target.value } })}
                                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setWidget({ ...widget, theme: { ...widget.theme, position: 'bottom-right' } })}
                                                className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${widget.theme.position === 'bottom-right'
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                                    }`}
                                            >
                                                <div className="w-16 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg relative">
                                                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-blue-500 rounded-full"></div>
                                                </div>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">Bottom Right</span>
                                            </button>
                                            <button
                                                onClick={() => setWidget({ ...widget, theme: { ...widget.theme, position: 'bottom-left' } })}
                                                className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${widget.theme.position === 'bottom-left'
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                                    }`}
                                            >
                                                <div className="w-16 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg relative">
                                                    <div className="absolute bottom-1 left-1 w-6 h-6 bg-blue-500 rounded-full"></div>
                                                </div>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">Bottom Left</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Border Radius</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="0"
                                                max="24"
                                                value={parseInt(widget.theme.borderRadius) || 12}
                                                onChange={(e) => setWidget({ ...widget, theme: { ...widget.theme, borderRadius: e.target.value } })}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                            />
                                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-12 text-right">
                                                {widget.theme.borderRadius || 12}px
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Launcher Size</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="40"
                                                max="80"
                                                value={parseInt(widget.theme.launcherSize) || 60}
                                                onChange={(e) => setWidget({ ...widget, theme: { ...widget.theme, launcherSize: e.target.value } })}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                            />
                                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-12 text-right">
                                                {widget.theme.launcherSize || 60}px
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Launcher Icon (URL)</label>
                                        <input
                                            type="text"
                                            value={widget.theme.launcherIcon || ''}
                                            onChange={(e) => setWidget({ ...widget, theme: { ...widget.theme, launcherIcon: e.target.value } })}
                                            placeholder="https://example.com/icon.png"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Workflow & Leads Tab */}
                            {activeTab === 'workflow' && (
                                <div className="space-y-8">
                                    {/* Pre-Chat Form Settings */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📋 Pre-Chat Form</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">Enable Pre-Chat Form</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">Collect visitor info before starting chat</div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={preChatEnabled}
                                                        onChange={(e) => {
                                                            setPreChatEnabled(e.target.checked);
                                                            setWidget({
                                                                ...widget,
                                                                settings: { ...widget.settings, preChatEnabled: e.target.checked }
                                                            });
                                                        }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>

                                            {preChatEnabled && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Welcome Message</label>
                                                    <textarea
                                                        value={widget.preChatMessage || ''}
                                                        onChange={(e) => setWidget({
                                                            ...widget,
                                                            settings: { ...widget.settings, preChatMessage: e.target.value }
                                                        })}
                                                        rows={3}
                                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Hello! Please fill out this form to start chatting."
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Form Fields Section */}
                                </div>
                            )}

                            {/* Form Fields Tab (New) */}
                            {activeTab === 'workflow' && (
                                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pre-Chat Form Fields</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Customize the fields shown to visitors before the chat starts.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const defaultFields = [
                                                    { id: 'name', label: 'Name', type: 'text', required: true },
                                                    { id: 'email', label: 'Email', type: 'email', required: false },
                                                    { id: 'phone', label: 'Phone', type: 'phone', required: false },
                                                    { id: 'company', label: 'Company', type: 'text', required: false },
                                                    { id: 'message', label: 'Message', type: 'textarea', required: true }
                                                ];

                                                const currentFields = (widget.formFields && widget.formFields.length > 0)
                                                    ? widget.formFields
                                                    : defaultFields;

                                                const newField = { id: Date.now(), label: 'New Field', type: 'text', required: false };

                                                setWidget({
                                                    ...widget,
                                                    formFields: [...currentFields, newField]
                                                });
                                            }}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            + Add Field
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(!widget.formFields || widget.formFields.length === 0) && (
                                            <div className="text-center py-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-500">
                                                Using default fields (Name, Email, Phone, Company, Message)
                                            </div>
                                        )}
                                        {widget.formFields?.map((field, index) => (
                                            <div key={field.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                                                <div className="flex-1 grid grid-cols-12 gap-3">
                                                    <div className="col-span-5">
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                                                        <input
                                                            type="text"
                                                            value={field.label}
                                                            onChange={(e) => {
                                                                const newFields = [...widget.formFields];
                                                                newFields[index].label = e.target.value;
                                                                setWidget({ ...widget, formFields: newFields });
                                                            }}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                                                        />
                                                    </div>
                                                    <div className="col-span-4">
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                                        <select
                                                            value={field.type}
                                                            onChange={(e) => {
                                                                const newFields = [...widget.formFields];
                                                                newFields[index].type = e.target.value;
                                                                setWidget({ ...widget, formFields: newFields });
                                                            }}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                                                        >
                                                            <option value="text">Text</option>
                                                            <option value="email">Email</option>
                                                            <option value="phone">Phone</option>
                                                            <option value="number">Number</option>
                                                            <option value="textarea">Text Area</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-3 flex items-center h-full pt-5">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={field.required}
                                                                onChange={(e) => {
                                                                    const newFields = [...widget.formFields];
                                                                    newFields[index].required = e.target.checked;
                                                                    setWidget({ ...widget, formFields: newFields });
                                                                }}
                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newFields = widget.formFields.filter((_, i) => i !== index);
                                                        setWidget({ ...widget, formFields: newFields });
                                                    }}
                                                    className="mt-6 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Content Tab */}
                            {activeTab === 'content' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Welcome Message</label>
                                        <textarea
                                            value={widget.settings.welcomeMessage}
                                            onChange={(e) => setWidget({ ...widget, settings: { ...widget.settings, welcomeMessage: e.target.value } })}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Input Placeholder</label>
                                        <input
                                            type="text"
                                            value={widget.settings.placeholder}
                                            onChange={(e) => setWidget({ ...widget, settings: { ...widget.settings, placeholder: e.target.value } })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="branding"
                                            checked={widget.settings.showBranding}
                                            onChange={(e) => setWidget({ ...widget, settings: { ...widget.settings, showBranding: e.target.checked } })}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="branding" className="text-sm font-medium text-gray-700 dark:text-gray-300">Show "Powered by TargetChat" branding</label>
                                    </div>
                                </div>
                            )}

                            {/* Install Tab */}
                            {activeTab === 'install' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Installation Instructions</h3>
                                        <p className="text-sm text-blue-700 dark:text-blue-400">
                                            Copy the code below and paste it into your website's HTML, just before the closing <code>&lt;/body&gt;</code> tag.
                                        </p>
                                    </div>

                                    <div className="relative">
                                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-sm font-mono">
                                            {embedCode}
                                        </pre>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(embedCode);
                                                toast.success('Copied to clipboard!');
                                            }}
                                            className="absolute top-4 right-4 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors"
                                        >
                                            Copy Code
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Right Column: Live Preview */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Live Preview</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500">Preview Mode</span>
                                    <button
                                        onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPreviewOpen ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPreviewOpen ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Phone Frame */}
                            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
                                <div className="w-[60px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-20"></div>
                                <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
                                <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>

                                {/* Screen Content */}
                                <div className="relative rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-gray-900">

                                    {/* Mock Website */}
                                    <div className="absolute inset-0 overflow-hidden bg-gray-50 dark:bg-gray-900">
                                        {/* Navbar */}
                                        <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center px-4 justify-between sticky top-0 z-10 opacity-90 backdrop-blur-sm">
                                            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                        </div>

                                        {/* Hero */}
                                        <div className="p-6 space-y-4">
                                            <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4"></div>
                                            <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                            <div className="w-1/2 h-3 bg-gray-100 dark:bg-gray-800 rounded"></div>
                                            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded"></div>
                                        </div>

                                        {/* Grid */}
                                        <div className="grid grid-cols-2 gap-3 p-4 pt-0">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Widget Overlay */}
                                    <div className={`absolute inset-0 pointer-events-none p-4 flex flex-col justify-end ${widget.theme.position === 'bottom-left' ? 'items-start' : 'items-end'}`}>

                                        {/* Chat Window */}
                                        <div
                                            className={`w-full max-w-[260px] bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom mb-3 ${isPreviewOpen
                                                ? 'opacity-100 scale-100 translate-y-0 h-[400px]'
                                                : 'opacity-0 scale-90 translate-y-10 h-0'
                                                }`}
                                            style={{
                                                borderRadius: `${widget.theme.borderRadius || 12}px`,
                                                pointerEvents: 'auto',
                                                zIndex: 50
                                            }}
                                        >
                                            {/* Header */}
                                            <div className="p-3 text-white flex items-center gap-3 shrink-0"
                                                style={{ backgroundColor: widget.theme.primaryColor, color: widget.theme.headerTextColor || '#fff' }}>
                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm truncate max-w-[140px]">{widget.name}</h3>
                                                    <p className="text-[10px] opacity-90">Online</p>
                                                </div>
                                            </div>

                                            {/* Content Area */}
                                            {preChatEnabled ? (
                                                <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto flex flex-col justify-center">

                                                    {widget.preChatMessage && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
                                                            {widget.preChatMessage}
                                                        </div>
                                                    )}

                                                    <div className="space-y-3">
                                                        {(widget.formFields || [
                                                            { id: 'name', label: 'Name', type: 'text' },
                                                            { id: 'email', label: 'Email', type: 'email' },
                                                            { id: 'msg', label: 'Message', type: 'textarea' }
                                                        ]).map((field, idx) => (
                                                            <div key={idx}>
                                                                {field.type === 'textarea' ? (
                                                                    <textarea
                                                                        placeholder={field.label}
                                                                        rows={2}
                                                                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                                        onChange={() => { }}
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type={field.type}
                                                                        placeholder={field.label}
                                                                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                                        onChange={() => { }}
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                        <button
                                                            className="w-full py-2 rounded-lg text-white text-xs font-bold shadow-md opacity-90 hover:opacity-100 transition-opacity"
                                                            style={{ backgroundColor: widget.theme.primaryColor }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                toast('This is just a preview!', { icon: '👀' });
                                                            }}
                                                        >
                                                            Start Chat
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Messages */}
                                                    <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-3 space-y-3 overflow-y-auto">
                                                        {widget.settings.welcomeMessage && (
                                                            <div className="flex justify-start">
                                                                <div className="bg-white dark:bg-gray-800 p-2.5 rounded-2xl rounded-tl-none shadow-sm max-w-[90%] text-xs text-gray-800 dark:text-gray-200"
                                                                    style={{ borderRadius: `${widget.theme.borderRadius || 12}px`, borderTopLeftRadius: 0 }}>
                                                                    {widget.settings.welcomeMessage}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-end">
                                                            <div className="p-2.5 rounded-2xl rounded-tr-none shadow-sm max-w-[90%] text-xs text-white"
                                                                style={{
                                                                    backgroundColor: widget.theme.primaryColor,
                                                                    borderRadius: `${widget.theme.borderRadius || 12}px`,
                                                                    borderTopRightRadius: 0
                                                                }}>
                                                                Hello! How can I help you?
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Input */}
                                                    <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0">
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder={widget.settings.placeholder}
                                                                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-full text-xs border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                                                                onChange={() => { }}
                                                            />
                                                            <button
                                                                className="p-1.5 rounded-full text-white shrink-0"
                                                                style={{ backgroundColor: widget.theme.primaryColor }}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    toast('This is just a preview!', { icon: '👀' });
                                                                }}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                                            </button>
                                                        </div>
                                                        {widget.settings.showBranding && (
                                                            <div className="text-center mt-1 text-[9px] text-gray-400">Powered by TargetChat</div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Launcher */}
                                        <div
                                            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                                            className="rounded-full shadow-lg cursor-pointer flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0"
                                            style={{
                                                backgroundColor: widget.theme.primaryColor,
                                                width: `${Math.min(widget.theme.launcherSize || 60, 56)}px`,
                                                height: `${Math.min(widget.theme.launcherSize || 60, 56)}px`,
                                                pointerEvents: 'auto',
                                                zIndex: 50
                                            }}
                                        >
                                            {widget.theme.launcherIcon ? (
                                                <img src={widget.theme.launcherIcon} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <div className={`transition-transform duration-300 ${isPreviewOpen ? 'rotate-90' : 'rotate-0'}`}>
                                                    {isPreviewOpen ? (
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                    ) : (
                                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                                    )}
                                                </div>
                                            )}
                                        </div>

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
