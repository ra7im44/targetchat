import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../../components/layouts/DashboardLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MyWorkflowsPage() {
    const router = useRouter();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        webhookUrl: '',
        icon: '⚡'
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
                setWorkflows(data);
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
                toast.success(editingWorkflow ? 'Workflow updated!' : 'Workflow created!');
                setShowModal(false);
                setEditingWorkflow(null);
                setFormData({ name: '', description: '', webhookUrl: '', icon: '⚡' });
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
                toast.success('Workflow deleted!');
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
        setFormData({ name: '', description: '', webhookUrl: '', icon: '⚡' });
        setShowModal(true);
    }

    function openEditModal(workflow) {
        setEditingWorkflow(workflow);
        setFormData({
            name: workflow.name,
            description: workflow.description || '',
            webhookUrl: workflow.webhookUrl,
            icon: workflow.icon || '⚡'
        });
        setShowModal(true);
    }

    const iconOptions = ['⚡', '🤖', '💬', '🎯', '🚀', '💡', '🔥', '⭐', '🎨', '🔧'];

    return (
        <DashboardLayout title="My Workflows">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Workflows</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Automate your chats with custom AI workflows connected to n8n.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 transition-transform flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    New Workflow
                </button>
            </div>

            {/* Workflows Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse"></div>
                    ))}
                </div>
            ) : workflows.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">⚡</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No workflows found</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                        Create your first workflow to start automating your customer conversations.
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                    >
                        Create Workflow
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="group bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-3xl shadow-sm">
                                        {workflow.icon}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEditModal(workflow)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(workflow.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                    {workflow.name}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-2 h-10">
                                    {workflow.description || 'No description provided.'}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${workflow.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                            {workflow.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                        Auto-Reply
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Create New Card (Placeholder style) */}
                    <button onClick={openCreateModal} className="group flex flex-col items-center justify-center h-full min-h-[250px] rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-gray-400 hover:text-indigo-600">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 flex items-center justify-center mb-4 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="font-bold">New Workflow</span>
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                                {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                                    Workflow Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-all bg-gray-50 dark:bg-gray-900/50 font-medium"
                                    placeholder="e.g., Customer Support Bot"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-5 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-all bg-gray-50 dark:bg-gray-900/50 font-medium"
                                    rows="3"
                                    placeholder="Describe what this workflow does..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                                    n8n Webhook URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    required
                                    value={formData.webhookUrl}
                                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                                    className="w-full px-5 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-all bg-gray-50 dark:bg-gray-900/50 font-mono text-sm"
                                    placeholder="https://your-n8n-instance.com/webhook/..."
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Paste the production URL from your n8n workflow webhook node.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">
                                    Choose Icon
                                </label>
                                <div className="flex gap-3 flex-wrap">
                                    {iconOptions.map((icon) => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, icon })}
                                            className={`w-12 h-12 flex items-center justify-center rounded-xl text-2xl transition-all ${formData.icon === icon
                                                ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500 shadow-md transform scale-110'
                                                : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-600 hover:shadow-md'
                                                }`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingWorkflow(null);
                                    }}
                                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-[1.02]"
                                >
                                    {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
