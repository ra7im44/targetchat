import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from './AdminLayout';
import { Mail, Eye, X, Plus, Pencil, Send, Trash2, Globe, CircleCheck, CirclePause } from 'lucide-react';
import { API_URL as API } from '../../utils/apiConfig';

export default function EmailTemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ category: '', language: 'en', active: '' });
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'preview', 'test'
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadTemplates();
    }, [filter]);

    async function loadTemplates() {
        const token = localStorage.getItem('tc_token');
        if (!token) return router.replace('/login');

        try {
            const params = new URLSearchParams();
            if (filter.category) params.append('category', filter.category);
            if (filter.language) params.append('language', filter.language);
            if (filter.active) params.append('active', filter.active);

            const res = await fetch(`${API}/api/admin/email-templates?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 403) return router.replace('/admin');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error loading templates:', err);
            setLoading(false);
        }
    }

    const openModal = (mode, template = null) => {
        setModalMode(mode);
        setSelectedTemplate(template);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedTemplate(null);
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
                setMessage({ type: 'success', text: 'Template deleted successfully' });
                loadTemplates();
            } else {
                throw new Error('Failed to delete');
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete template' });
        }
    };

    const getCategoryBadge = (category) => {
        const colors = {
            auth: 'bg-blue-100 text-info dark:bg-surface-elevated dark:text-info',
            billing: 'bg-green-100 text-success dark:bg-green-900/30 dark:text-success',
            workflow: 'bg-purple-100 text-info dark:bg-purple-900/30 dark:text-info',
            system: 'bg-gray-100 text-gray-700 dark:bg-surface-elevated dark:text-secondary',
            admin: 'bg-red-100 text-danger dark:bg-red-900/30 dark:text-danger'
        };
        return colors[category] || colors.system;
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-2 flex items-center gap-3">
                            <Mail size={18} /> Email Templates
                        </h1>
                        <p className="text-gray-500 dark:text-muted">
                            Manage email templates with live preview and testing
                        </p>
                    </div>
                    <button
                        onClick={() => openModal('create')}
                        className="px-6 py-3 bg-accent hover:bg-accent-hover text-background rounded-lg font-semibold shadow-lg transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        New Template
                    </button>
                </div>

                {/* Message */}
                {message.text && (
                    <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-success dark:bg-green-900/30' : 'bg-red-50 text-danger dark:bg-red-900/30'}`}>
                        {message.text}
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white dark:bg-surface rounded-xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-border">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Category</label>
                            <select
                                value={filter.category}
                                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-gray-900 dark:text-foreground"
                            >
                                <option value="">All Categories</option>
                                <option value="auth">Auth</option>
                                <option value="billing">Billing</option>
                                <option value="workflow">Workflow</option>
                                <option value="system">System</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Language</label>
                            <select
                                value={filter.language}
                                onChange={(e) => setFilter({ ...filter, language: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-gray-900 dark:text-foreground"
                            >
                                <option value="">All Languages</option>
                                <option value="en">English</option>
                                <option value="ar">Arabic</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Status</label>
                            <select
                                value={filter.active}
                                onChange={(e) => setFilter({ ...filter, active: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-gray-900 dark:text-foreground"
                            >
                                <option value="">All Status</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilter({ category: '', language: 'en', active: '' })}
                                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-surface-elevated dark:hover:bg-surface-hover text-gray-700 dark:text-secondary rounded-lg font-medium transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-white dark:bg-surface rounded-xl p-6 shadow-sm border border-gray-100 dark:border-border transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-foreground mb-1">
                                        {template.name}
                                    </h3>
                                    <code className="text-xs text-gray-500 dark:text-muted bg-gray-100 dark:bg-surface-elevated px-2 py-1 rounded">
                                        {template.slug}
                                    </code>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryBadge(template.category)}`}>
                                    {template.category}
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-muted mb-4 line-clamp-2">
                                {template.subject}
                            </p>

                            <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 dark:text-muted">
                                <span className="flex items-center gap-1">
                                    <Globe size={16} /> {template.language.toUpperCase()}
                                </span>
                                <span>â€¢</span>
                                <span className="flex items-center gap-1">
                                    {template.isActive ? (<><CircleCheck size={16} /> Active</>) : (<><CirclePause size={16} /> Inactive</>)}
                                </span>
                                <span>â€¢</span>
                                <span>{template.variables?.length || 0} vars</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openModal('preview', template)}
                                    className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-surface-elevated dark:hover:bg-surface-hover text-gray-700 dark:text-secondary rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Eye size={16} /> Preview
                                </button>
                                <button
                                    onClick={() => openModal('test', template)}
                                    className="flex-1 px-3 py-2 bg-blue-50 hover:bg-surface-hover dark:bg-surface-elevated dark:hover:bg-surface-hover text-accent dark:text-accent rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Send size={16} /> Test
                                </button>
                                <button
                                    onClick={() => openModal('edit', template)}
                                    className="px-3 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-success dark:text-success rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-danger dark:text-danger rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {templates.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 dark:bg-surface/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-border">
                        <div className="mb-4 opacity-50 flex justify-center"><Mail size={48} /></div>
                        <p className="text-gray-500 dark:text-muted text-lg">No templates found</p>
                        <button
                            onClick={() => openModal('create')}
                            className="mt-4 px-6 py-2 bg-accent hover:bg-accent-hover text-background rounded-lg font-medium"
                        >
                            Create First Template
                        </button>
                    </div>
                )}

                {/* Modal Component */}
                {showModal && (
                    <TemplateModal
                        mode={modalMode}
                        template={selectedTemplate}
                        onClose={closeModal}
                        onSuccess={() => {
                            loadTemplates();
                            closeModal();
                            setMessage({ type: 'success', text: `Template ${modalMode}d successfully!` });
                        }}
                    />
                )}
            </div>
        </AdminLayout>
    );
}

// Template Modal Component
function TemplateModal({ mode, template, onClose, onSuccess }) {
    const [formData, setFormData] = useState(template || {
        name: '',
        slug: '',
        category: 'system',
        subject: '',
        htmlBody: '',
        textBody: '',
        variables: [],
        language: 'en',
        isActive: true
    });
    const [preview, setPreview] = useState(null);
    const [testEmail, setTestEmail] = useState('');
    const [testVars, setTestVars] = useState({});
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const token = localStorage.getItem('tc_token');
        const url = mode === 'edit'
            ? `${API}/api/admin/email-templates/${template.id}`
            : `${API}/api/admin/email-templates`;

        try {
            const res = await fetch(url, {
                method: mode === 'edit' ? 'PATCH' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                onSuccess();
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to save template');
            }
        } catch (err) {
            alert('Error saving template');
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = async () => {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/email-templates/${template.id}/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ sampleVariables: testVars })
            });

            if (res.ok) {
                const data = await res.json();
                setPreview(data);
            }
        } catch (err) {
            alert('Failed to preview template');
        }
    };

    const handleSendTest = async () => {
        if (!testEmail) {
            alert('Please enter a test email address');
            return;
        }

        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/email-templates/${template.id}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ testEmail, testVariables: testVars })
            });

            if (res.ok) {
                alert(`Test email sent to ${testEmail}!`);
                onClose();
            }
        } catch (err) {
            alert('Failed to send test email');
        }
    };

    if (mode === 'preview') {
        if (!preview) handlePreview();

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-white dark:bg-background w-full max-w-4xl max-h-[90vh] rounded-card shadow-lg flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-border flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2"><Eye size={18} /> Preview: {template.name}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-hover rounded-lg"><X size={18} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {preview && (
                            <div>
                                <div className="mb-4">
                                    <strong className="text-gray-700 dark:text-secondary">Subject:</strong>
                                    <p className="text-gray-900 dark:text-foreground">{preview.subject}</p>
                                </div>
                                <div className="border border-gray-200 dark:border-border rounded-lg p-4">
                                    <iframe srcDoc={preview.html} className="w-full h-[500px] border-0" title="Email Preview" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'test') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-white dark:bg-background w-full max-w-lg rounded-card shadow-lg p-6" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-4 flex items-center gap-2"><Mail size={18} /> Send Test Email</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Test Email Address</label>
                            <input
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-surface text-gray-900 dark:text-foreground"
                                placeholder="test@example.com"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-surface-elevated text-gray-700 dark:text-secondary rounded-lg font-medium">
                                Cancel
                            </button>
                            <button onClick={handleSendTest} className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover text-background rounded-lg font-medium">
                                Send Test
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Create/Edit Form
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-background w-full max-w-4xl max-h-[90vh] rounded-card shadow-lg flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-border">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-foreground">
                        {mode === 'create' ? (<span className="flex items-center gap-2"><Plus size={18} /> Create Template</span>) : (<span className="flex items-center gap-2"><Pencil size={18} /> Edit Template</span>)}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Template Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-surface text-gray-900 dark:text-foreground"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Slug *</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-surface text-gray-900 dark:text-foreground font-mono text-sm"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Category *</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-surface text-gray-900 dark:text-foreground"
                                required
                            >
                                <option value="auth">Auth</option>
                                <option value="billing">Billing</option>
                                <option value="workflow">Workflow</option>
                                <option value="system">System</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Language</label>
                            <select
                                value={formData.language}
                                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-surface text-gray-900 dark:text-foreground"
                            >
                                <option value="en">English</option>
                                <option value="ar">Arabic</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Status</label>
                            <label className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-secondary">Active</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">Subject *</label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-surface text-gray-900 dark:text-foreground"
                            placeholder="Use {{variables}} for dynamic content"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">HTML Body *</label>
                        <textarea
                            value={formData.htmlBody}
                            onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-surface text-gray-900 dark:text-foreground font-mono text-sm"
                            rows="10"
                            required
                        />
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-border">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-surface-elevated text-gray-700 dark:text-secondary rounded-lg font-medium">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover text-background rounded-lg font-medium disabled:opacity-50">
                            {saving ? 'Saving...' : mode === 'create' ? 'Create Template' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
