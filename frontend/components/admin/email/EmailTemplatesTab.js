import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Mail, Edit, Trash2, Eye, Send, Plus, X } from 'lucide-react';

import { API_URL as API } from '../../../utils/apiConfig';

export default function EmailTemplatesTab() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ category: '', language: '', active: '' });
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'preview', 'test'
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, [filter]);

    async function loadTemplates() {
        const token = localStorage.getItem('tc_token');
        try {
            const params = new URLSearchParams();
            if (filter.category) params.append('category', filter.category);
            if (filter.language) params.append('language', filter.language);
            if (filter.active) params.append('active', filter.active);

            const res = await fetch(`${API}/api/admin/email-templates?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (err) {
            console.error('Error loading templates:', err);
        } finally {
            setLoading(false);
        }
    }

    const openModal = (mode, template = null) => {
        setModalMode(mode);
        setSelectedTemplate(template);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/email-templates/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Template deleted successfully');
                loadTemplates();
            }
        } catch (err) {
            toast.error('Failed to delete template');
        }
    };

    const getCategoryBadge = (category) => {
        const colors = {
            auth: 'bg-blue-100 text-info-ink dark:bg-surface-elevated dark:text-info',
            billing: 'bg-green-100 text-success-ink dark:bg-green-900/30 dark:text-success',
            workflow: 'bg-purple-100 text-info-ink dark:bg-purple-900/30 dark:text-info',
            system: 'bg-gray-100 text-gray-700 dark:bg-surface-elevated dark:text-secondary',
            admin: 'bg-red-100 text-danger-ink dark:bg-red-900/30 dark:text-danger'
        };
        return colors[category] || colors.system;
    };

    const handleSave = async (formData) => {
        const token = localStorage.getItem('tc_token');
        setSaving(true);
        try {
            const url = modalMode === 'edit' ? `${API}/api/admin/email-templates/${selectedTemplate.id}` : `${API}/api/admin/email-templates`;
            const method = modalMode === 'edit' ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(modalMode === 'edit' ? 'Template updated' : 'Template created');
                setShowModal(false);
                loadTemplates();
            } else {
                const err = await res.json();
                toast.error(err.message || 'Failed to save template');
            }
        } catch (err) {
            toast.error('Server error');
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async (templateId, email) => {
        if (!email) {
            setModalMode('test');
            setShowModal(true);
            return;
        }

        const token = localStorage.getItem('tc_token');
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/email-templates/${templateId}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ testEmail: email })
            });

            if (res.ok) {
                toast.success('Test email sent!');
                setShowModal(false);
            } else {
                toast.error('Failed to send test');
            }
        } catch (err) {
            toast.error('Server error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-foreground">Email Templates</h2>
                    <p className="text-sm text-gray-500">Manage and preview global email templates</p>
                </div>
                <button
                    onClick={() => openModal('create')}
                    className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-background rounded-lg font-semibold transition-all shadow-md"
                >
                    <Plus size={18} />
                    New Template
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-surface rounded-xl p-4 border border-gray-100 dark:border-border">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                        value={filter.category}
                        onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background"
                    >
                        <option value="">All Categories</option>
                        <option value="auth">Auth</option>
                        <option value="billing">Billing</option>
                        <option value="workflow">Workflow</option>
                        <option value="system">System</option>
                        <option value="admin">Admin</option>
                    </select>
                    <select
                        value={filter.language}
                        onChange={(e) => setFilter({ ...filter, language: e.target.value })}
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background"
                    >
                        <option value="">All Languages</option>
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                    </select>
                    <select
                        value={filter.active}
                        onChange={(e) => setFilter({ ...filter, active: e.target.value })}
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background"
                    >
                        <option value="">All Status</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                    <button
                        onClick={() => setFilter({ category: '', language: '', active: '' })}
                        className="px-4 py-2 bg-gray-100 dark:bg-surface-elevated text-gray-600 dark:text-secondary rounded-lg font-medium"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div key={template.id} className="bg-white dark:bg-surface rounded-xl p-5 border border-gray-100 dark:border-border transition-all">
                        <div className="flex justify-between mb-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getCategoryBadge(template.category)}`}>
                                {template.category}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-muted font-mono">{template.slug}</span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-foreground mb-2">{template.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-muted mb-6 line-clamp-2">{template.subject}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => openModal('preview', template)}
                                className="flex-1 p-2 bg-gray-50 dark:bg-background text-gray-600 dark:text-muted rounded-lg hover:bg-gray-100 transition-all flex items-center justify-center"
                                title="Preview"
                            >
                                <Eye size={18} />
                            </button>
                            <button
                                onClick={() => openModal('test', template)}
                                className="flex-1 p-2 bg-blue-50 dark:bg-blue-900/20 text-primary-700 dark:text-accent rounded-lg hover:bg-surface-hover transition-all flex items-center justify-center"
                                title="Send Test"
                            >
                                <Send size={18} />
                            </button>
                            <button
                                onClick={() => openModal('edit', template)}
                                className="flex-1 p-2 bg-green-50 dark:bg-green-900/20 text-success-ink dark:text-success rounded-lg hover:bg-green-100 transition-all flex items-center justify-center"
                                title="Edit"
                            >
                                <Edit size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(template.id)}
                                className="flex-1 p-2 bg-red-50 dark:bg-red-900/20 text-danger-ink dark:text-danger rounded-lg hover:bg-red-100 transition-all flex items-center justify-center"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <TemplateModal
                    mode={modalMode}
                    template={selectedTemplate}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                    onTest={handleSendTest}
                    saving={saving}
                />
            )}
        </div>
    );
}

function TemplateModal({ mode, template, onClose, onSave, onTest, saving }) {
    const [formData, setFormData] = useState(template || {
        name: '',
        slug: '',
        subject: '',
        htmlBody: '',
        category: 'system',
        language: 'en',
    });
    const [testEmail, setTestEmail] = useState('');

    const isPreview = mode === 'preview';
    const isTest = mode === 'test';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-surface w-full max-w-4xl rounded-modal shadow-lg border border-gray-100 dark:border-border overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 dark:border-border flex justify-between items-center bg-gray-50/50 dark:bg-background/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-foreground uppercase tracking-tight">
                            {mode === 'create' ? 'Create Template' : mode === 'edit' ? 'Edit Template' : mode === 'preview' ? 'Preview Template' : 'Send Test Email'}
                        </h2>
                        {template && <p className="text-xs text-gray-500 dark:text-muted font-mono mt-1">{template.slug}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-surface-hover rounded-xl transition-all">
                        <X size={24} className="text-gray-500 dark:text-muted" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {isPreview ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 dark:bg-background rounded-card border border-gray-100 dark:border-border">
                                <label className="text-[10px] font-bold text-gray-500 dark:text-muted uppercase tracking-widest block mb-1">Subject Line</label>
                                <p className="text-sm font-bold text-gray-900 dark:text-foreground">{template.subject}</p>
                            </div>
                            <div className="border border-gray-100 dark:border-border rounded-card overflow-hidden bg-white">
                                <iframe
                                    srcDoc={template.htmlBody}
                                    title="Preview"
                                    className="w-full min-h-[500px] border-none"
                                />
                            </div>
                        </div>
                    ) : isTest ? (
                        <div className="space-y-6">
                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-card border border-blue-100 dark:border-blue-900/50">
                                <h4 className="font-bold text-blue-900 dark:text-info mb-2">Send a test for "{template.name}"</h4>
                                <p className="text-sm text-info/70 dark:text-info/70">This will send a live email to the address below using mock data for any variables.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 dark:text-secondary">Recipient Email Address</label>
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-border focus:ring-2 focus:ring-accent outline-none"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 dark:text-secondary">Template Name</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-border" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 dark:text-secondary">Slug (Unique ID)</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-border font-mono" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} disabled={mode === 'edit'} />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-gray-700 dark:text-secondary">Email Subject</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-border" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-gray-700 dark:text-secondary">HTML Content</label>
                                <textarea className="w-full px-4 py-3 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-border font-mono text-sm h-64" value={formData.htmlBody} onChange={e => setFormData({ ...formData, htmlBody: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 dark:text-secondary">Category</label>
                                <select className="w-full px-4 py-3 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-border" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option value="auth">Auth</option>
                                    <option value="billing">Billing</option>
                                    <option value="workflow">Workflow</option>
                                    <option value="system">System</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 dark:text-secondary">Language</label>
                                <select className="w-full px-4 py-3 bg-gray-50 dark:bg-background rounded-xl border border-gray-200 dark:border-border" value={formData.language} onChange={e => setFormData({ ...formData, language: e.target.value })}>
                                    <option value="en">English</option>
                                    <option value="ar">Arabic</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-background/50 border-t border-gray-100 dark:border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-gray-600 dark:text-muted font-bold text-sm">Cancel</button>
                    {isPreview ? (
                        <button onClick={() => { onClose(); onTest(template.id); }} className="px-6 py-2.5 bg-accent text-background rounded-xl font-bold text-sm hover:bg-accent-hover shadow-lg transition-all">Send Test</button>
                    ) : isTest ? (
                        <button onClick={() => onTest(template.id, testEmail)} disabled={saving || !testEmail} className="px-6 py-2.5 bg-accent text-background rounded-xl font-bold text-sm hover:bg-accent-hover shadow-lg transition-all disabled:opacity-50">
                            {saving ? 'Sending...' : 'Send Now'}
                        </button>
                    ) : (
                        <button onClick={() => onSave(formData)} disabled={saving} className="px-6 py-2.5 bg-accent text-background rounded-xl font-bold text-sm hover:bg-accent-hover shadow-lg transition-all">
                            {saving ? 'Saving...' : 'Save Template'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
