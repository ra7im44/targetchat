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
            auth: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            billing: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            workflow: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            system: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
            admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        };
        return colors[category] || colors.system;
    };

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
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            ðŸ“§ Email Templates
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Manage email templates with live preview and testing
                        </p>
                    </div>
                    <button
                        onClick={() => openModal('create')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        New Template
                    </button>
                </div>

                {/* Message */}
                {message.text && (
                    <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30' : 'bg-red-50 text-red-700 dark:bg-red-900/30'}`}>
                        {message.text}
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                            <select
                                value={filter.category}
                                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
                            <select
                                value={filter.language}
                                onChange={(e) => setFilter({ ...filter, language: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            >
                                <option value="">All Languages</option>
                                <option value="en">English</option>
                                <option value="ar">Arabic</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <select
                                value={filter.active}
                                onChange={(e) => setFilter({ ...filter, active: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            >
                                <option value="">All Status</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilter({ category: '', language: 'en', active: '' })}
                                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
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
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                        {template.name}
                                    </h3>
                                    <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                        {template.slug}
                                    </code>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryBadge(template.category)}`}>
                                    {template.category}
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                {template.subject}
                            </p>

                            <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    ðŸŒ {template.language.toUpperCase()}
                                </span>
                                <span>â€¢</span>
                                <span className="flex items-center gap-1">
                                    {template.isActive ? 'âœ… Active' : 'â¸ï¸ Inactive'}
                                </span>
                                <span>â€¢</span>
                                <span>{template.variables?.length || 0} vars</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openModal('preview', template)}
                                    className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                                >
                                    ðŸ‘ï¸ Preview
                                </button>
                                <button
                                    onClick={() => openModal('test', template)}
                                    className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
                                >
                                    âœ‰ï¸ Test
                                </button>
                                <button
                                    onClick={() => openModal('edit', template)}
                                    className="px-3 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium transition-colors"
                                >
                                    âœï¸
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                                >
                                    ðŸ—‘ï¸
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {templates.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <div className="text-6xl mb-4 opacity-50">ðŸ“§</div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No templates found</p>
                        <button
                            onClick={() => openModal('create')}
                            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
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
                <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">ðŸ‘ï¸ Preview: {template.name}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">âœ•</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {preview && (
                            <div>
                                <div className="mb-4">
                                    <strong className="text-gray-700 dark:text-gray-300">Subject:</strong>
                                    <p className="text-gray-900 dark:text-white">{preview.subject}</p>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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
                <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">âœ‰ï¸ Send Test Email</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Email Address</label>
                            <input
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                placeholder="test@example.com"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium">
                                Cancel
                            </button>
                            <button onClick={handleSendTest} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
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
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {mode === 'create' ? 'âž• Create Template' : 'âœï¸ Edit Template'}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Template Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slug *</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
                            <select
                                value={formData.language}
                                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                                <option value="en">English</option>
                                <option value="ar">Arabic</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <label className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject *</label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Use {{variables}} for dynamic content"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">HTML Body *</label>
                        <textarea
                            value={formData.htmlBody}
                            onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                            rows="10"
                            required
                        />
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                            {saving ? 'Saving...' : mode === 'create' ? 'Create Template' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
