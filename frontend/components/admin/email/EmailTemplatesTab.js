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
            auth: 'bg-info-soft text-info border border-info/20',
            billing: 'bg-success-soft text-success border border-success/20',
            workflow: 'bg-primary-soft text-primary border border-primary/20',
            system: 'bg-surface-elevated text-secondary border border-border',
            admin: 'bg-danger-soft text-danger border border-danger/20'
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

    if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Email Templates</h2>
                    <p className="text-sm text-muted">Manage and preview global email templates</p>
                </div>
                <button
                    onClick={() => openModal('create')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-xl font-semibold transition-all shadow-xs"
                >
                    <Plus size={18} />
                    New Template
                </button>
            </div>

            {/* Filters */}
            <div className="bg-surface rounded-xl p-4 border border-border shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                        value={filter.category}
                        onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                        className="px-4 py-2 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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
                        className="px-4 py-2 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                        <option value="">All Languages</option>
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                    </select>
                    <select
                        value={filter.active}
                        onChange={(e) => setFilter({ ...filter, active: e.target.value })}
                        className="px-4 py-2 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                        <option value="">All Status</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                    <button
                        onClick={() => setFilter({ category: '', language: '', active: '' })}
                        className="px-4 py-2 bg-surface-elevated hover:bg-surface-hover text-secondary hover:text-foreground border border-border rounded-xl font-semibold transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div key={template.id} className="bg-surface rounded-card p-5 border border-border shadow-xs hover:border-primary/40 transition-all">
                        <div className="flex justify-between mb-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getCategoryBadge(template.category)}`}>
                                {template.category}
                            </span>
                            <span className="text-xs text-muted font-mono">{template.slug}</span>
                        </div>
                        <h4 className="font-semibold text-foreground mb-1">{template.name}</h4>
                        <p className="text-sm text-secondary mb-5 line-clamp-2">{template.subject}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => openModal('preview', template)}
                                className="flex-1 p-2 bg-surface-elevated text-secondary hover:text-foreground hover:bg-surface-hover rounded-xl transition-all flex items-center justify-center border border-border"
                                title="Preview"
                            >
                                <Eye size={18} />
                            </button>
                            <button
                                onClick={() => openModal('test', template)}
                                className="flex-1 p-2 bg-info-soft text-primary rounded-lg hover:bg-surface-hover transition-all flex items-center justify-center"
                                title="Send Test"
                            >
                                <Send size={18} />
                            </button>
                            <button
                                onClick={() => openModal('edit', template)}
                                className="flex-1 p-2 bg-success-soft text-success-ink rounded-lg hover:bg-success-soft transition-all flex items-center justify-center"
                                title="Edit"
                            >
                                <Edit size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(template.id)}
                                className="flex-1 p-2 bg-danger-soft text-danger-ink rounded-lg hover:bg-danger-soft transition-all flex items-center justify-center"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-surface w-full max-w-4xl rounded-card shadow-lg border border-border overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex justify-between items-center bg-surface-elevated">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">
                            {mode === 'create' ? 'Create Template' : mode === 'edit' ? 'Edit Template' : mode === 'preview' ? 'Preview Template' : 'Send Test Email'}
                        </h2>
                        {template && <p className="text-xs text-muted font-mono mt-1">{template.slug}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface-hover text-muted hover:text-foreground rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-surface">
                    {isPreview ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-surface-elevated rounded-card border border-border">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Subject Line</label>
                                <p className="text-sm font-semibold text-foreground">{template.subject}</p>
                            </div>
                            <div className="border border-border rounded-card overflow-hidden bg-white">
                                <iframe
                                    srcDoc={template.htmlBody}
                                    title="Preview"
                                    className="w-full min-h-[500px] border-none"
                                />
                            </div>
                        </div>
                    ) : isTest ? (
                        <div className="space-y-6">
                            <div className="p-6 bg-info-soft rounded-card border border-info/20">
                                <h4 className="font-semibold text-info mb-2">Send a test for "{template.name}"</h4>
                                <p className="text-sm text-secondary">This will send a live email to the address below using mock data for any variables.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-secondary">Recipient Email Address</label>
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-2.5 bg-surface-elevated rounded-xl border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-secondary">Template Name</label>
                                <input type="text" className="w-full px-4 py-2.5 bg-surface-elevated rounded-xl border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-secondary">Slug (Unique ID)</label>
                                <input type="text" className="w-full px-4 py-2.5 bg-surface-elevated rounded-xl border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono placeholder:text-muted" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} disabled={mode === 'edit'} />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-semibold text-secondary">Email Subject</label>
                                <input type="text" className="w-full px-4 py-2.5 bg-surface-elevated rounded-xl border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-semibold text-secondary">HTML Content</label>
                                <textarea className="w-full px-4 py-2.5 bg-surface-elevated rounded-xl border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono text-sm h-64 placeholder:text-muted" value={formData.htmlBody} onChange={e => setFormData({ ...formData, htmlBody: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-secondary">Category</label>
                                <select className="w-full px-4 py-2.5 bg-surface-elevated rounded-xl border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option value="auth">Auth</option>
                                    <option value="billing">Billing</option>
                                    <option value="workflow">Workflow</option>
                                    <option value="system">System</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-secondary">Language</label>
                                <select className="w-full px-4 py-2.5 bg-surface-elevated rounded-xl border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" value={formData.language} onChange={e => setFormData({ ...formData, language: e.target.value })}>
                                    <option value="en">English</option>
                                    <option value="ar">Arabic</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-surface-elevated border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-secondary hover:text-foreground font-semibold text-sm border border-border rounded-xl hover:bg-surface-hover transition-colors">Cancel</button>
                    {isPreview ? (
                        <button onClick={() => { onClose(); onTest(template.id); }} className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-hover active:bg-primary-active shadow-xs transition-all">Send Test</button>
                    ) : isTest ? (
                        <button onClick={() => onTest(template.id, testEmail)} disabled={saving || !testEmail} className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-hover active:bg-primary-active shadow-xs transition-all disabled:opacity-50">
                            {saving ? 'Sending...' : 'Send Now'}
                        </button>
                    ) : (
                        <button onClick={() => onSave(formData)} disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-hover active:bg-primary-active shadow-xs transition-all">
                            {saving ? 'Saving...' : 'Save Template'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
