import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import {
    Settings, Save, Globe, Database, Mail,
    Plug, Cpu, Shield, AlertTriangle, Eye, EyeOff,
    RefreshCw, CheckCircle2, Lock, Sliders, Share2, XCircle
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

export default function AdminSettings() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [activeSection, setActiveSection] = useState('general');
    const [showPasswords, setShowPasswords] = useState({});
    const [status, setStatus] = useState(null);
    const [formKey, setFormKey] = useState(0);

    useEffect(() => {
        fetchSettings();
        fetchStatus();
    }, []);

    const authHeaders = () => {
        const token = localStorage.getItem('tc_token');
        return { Authorization: `Bearer ${token}` };
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/admin/settings`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                const sections = Object.keys(data);
                if (sections.length > 0) {
                    setActiveSection(prev => (sections.includes(prev) ? prev : sections[0]));
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(`Error ${res.status}: ${errData.message || 'Failed to load settings'}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to connect to backend');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API}/api/admin/settings/status`, { headers: authHeaders() });
            if (res.ok) setStatus(await res.json());
        } catch (error) {
            // Status is informational; a failure must not block editing.
            console.warn('Could not load runtime status:', error.message);
        }
    };

    // Only used for the genuinely-empty database state. It no longer pretends
    // to reset values (see handleReset for that).
    const handleSeedDefaults = async () => {
        try {
            setIsResetting(true);
            const res = await fetch(`${API}/api/admin/settings/seed-defaults`, {
                method: 'POST',
                headers: authHeaders()
            });
            if (res.ok) {
                toast.success('Default settings created');
                await fetchSettings();
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.message || 'Failed to create default settings');
            }
        } catch (error) {
            console.error(error);
            toast.error('Network error creating default settings');
        } finally {
            setIsResetting(false);
        }
    };

    const handleReset = async () => {
        if (!activeSection) return;
        const confirmed = window.confirm(
            `Reset every setting in "${activeSection}" to its default?\n\nStored secrets and credentials are preserved. Other sections are untouched.`
        );
        if (!confirmed) return;

        try {
            setIsResetting(true);
            const res = await fetch(`${API}/api/admin/settings/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ section: activeSection, confirm: true })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || 'Reset failed');
                return;
            }
            toast.success(
                data.preservedSecrets?.length
                    ? `Reset ${data.reset.length} settings; ${data.preservedSecrets.length} secrets preserved`
                    : `Reset ${data.reset.length} settings`
            );
            await Promise.all([fetchSettings(), fetchStatus()]);
            setFormKey(k => k + 1);
        } catch (error) {
            console.error(error);
            toast.error('Network error resetting settings');
        } finally {
            setIsResetting(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updates = Object.fromEntries(formData.entries());
        delete updates.__versions;

        const currentItems = settings[activeSection] || [];
        const versions = {};

        currentItems.forEach(item => {
            if (item.version) versions[item.key] = item.version;
            if (item.type === 'boolean') {
                updates[item.key] = formData.has(item.key) ? 'true' : 'false';
            }
            // The server never returns secret values, so an untouched (empty)
            // secret field must be omitted instead of clearing the credential.
            if (item.secret && !String(updates[item.key] || '').trim()) {
                delete updates[item.key];
            }
        });

        if (Object.keys(updates).length === 0) {
            toast('No changes to save', { icon: 'ℹ️' });
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ ...updates, __versions: versions })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const fieldErrors = data.errors
                    ? Object.entries(data.errors).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' • ')
                    : '';
                toast.error(fieldErrors || data.message || 'Failed to update settings');
                return;
            }

            // Re-read from the database rather than assuming the submitted
            // values are what the server stored (typed/normalised values).
            await Promise.all([fetchSettings(), fetchStatus()]);
            setFormKey(k => k + 1);
            toast.success(`Saved ${data.updated} setting${data.updated === 1 ? '' : 's'}`);
        } catch (error) {
            console.error(error);
            toast.error('Server error saving settings');
        } finally {
            setIsSaving(false);
        }
    };

    const togglePasswordVisibility = (key) => {
        setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const formatSettingLabel = (key) => {
        return String(key || '')
            .replace(/[_-]+/g, ' ')
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const getSectionIcon = (section) => {
        switch (section) {
            case 'general': return Globe;
            case 'ai': return Cpu;
            case 'features': return Plug;
            case 'payment': return Shield;
            case 'email': return Mail;
            case 'integrations': return Share2;
            case 'security': return Lock;
            case 'database': return Database;
            case 'system': return Sliders;
            default: return Settings;
        }
    };

    const sectionDescriptions = {
        general: 'Brand identity, public application URLs, and global configuration.',
        ai: 'Provider, model, generation parameters, timeouts, and fallback policy. AI runs locally through Ollama by default.',
        features: 'Server-enforced capability switches. Disabling a feature closes its API, not just its button.',
        payment: 'PayPal credentials, sandbox/live mode, and mock billing controls.',
        email: 'SMTP credentials, provider selection, sender identity, and delivery testing.',
        integrations: 'Meta, Facebook, WhatsApp Business, and external partner credentials.',
        security: 'Login throttling, JWT session lifetime, and signed media URL expiry.',
        system: 'Maintenance mode and platform-wide operational switches.'
    };

    const sectionOrder = ['general', 'ai', 'features', 'payment', 'email', 'integrations', 'security', 'system', 'database'];
    const sortedSections = Object.entries(settings).sort(([a], [b]) => {
        const indexA = sectionOrder.indexOf(a);
        const indexB = sectionOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const statusBadge = (ok, label, detail) => (
        <span
            title={detail || label}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${ok
                ? 'bg-success-soft text-success-ink'
                : 'bg-surface-elevated text-muted'}`}
        >
            {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {label}
        </span>
    );

    return (
        <AdminLayout title="System Settings">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Settings className="text-primary-active" size={32} />
                            System Settings
                        </h1>
                        <p className="text-muted mt-1">
                            Configure global application preferences, intelligence routing, and API connections.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={isResetting || loading || !activeSection}
                            className="flex items-center gap-2 px-4 py-2.5 bg-surface-elevated hover:bg-surface-hover text-secondary font-medium rounded-xl transition-all text-sm"
                            title="Reset this section to defaults (secrets preserved)"
                        >
                            <RefreshCw size={16} className={isResetting ? 'animate-spin' : ''} />
                            {isResetting ? 'Resetting...' : 'Reset Defaults'}
                        </button>

                        <button
                            form="settings-form"
                            type="submit"
                            disabled={isSaving || loading || sortedSections.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-white font-bold rounded-lg transition-all shadow-lg text-sm"
                        >
                            {isSaving ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* Runtime status: real values from the backend, never a green
                    badge just because a credential string exists. */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-surface rounded-card border border-border text-xs text-muted">
                    <span className="font-semibold text-secondary">Runtime:</span>
                    {status?.ai ? (
                        statusBadge(
                            status.ai.ok && status.ai.enabled,
                            status.ai.enabled
                                ? `AI ${status.ai.provider}${status.ai.model ? ` / ${status.ai.model}` : ''}${status.ai.ok ? '' : ' (unreachable)'}`
                                : 'AI disabled',
                            status.ai.error?.message || (status.ai.reachable === null ? 'Configured; live probing not performed for cloud providers' : '')
                        )
                    ) : <span className="px-2 py-1 rounded bg-surface-elevated">AI status unavailable</span>}
                    {status?.email ? statusBadge(
                        status.email.verified,
                        status.email.enabled
                            ? `Email ${status.email.provider}${status.email.verified ? '' : ' (unverified)'}`
                            : 'Email disabled',
                        status.email.error || status.email.host || ''
                    ) : null}
                    {status?.integrations?.meta ? statusBadge(
                        status.integrations.meta.configured,
                        status.integrations.meta.configured ? 'Meta configured' : 'Meta not configured'
                    ) : null}
                    {status?.integrations?.whatsapp ? statusBadge(
                        status.integrations.whatsapp.configured,
                        status.integrations.whatsapp.configured ? 'WhatsApp configured' : 'WhatsApp not configured'
                    ) : null}
                    {status?.payment?.paypal ? statusBadge(
                        status.payment.paypal.configured,
                        status.payment.paypal.configured ? 'PayPal credentials set' : 'PayPal not configured'
                    ) : null}
                    {status?.maintenance && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warning-soft text-warning-ink text-[11px] font-semibold">
                            <AlertTriangle size={12} /> Maintenance mode ON
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={fetchStatus}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-primary-active hover:underline"
                    >
                        <RefreshCw size={12} /> Recheck
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[350px] bg-surface rounded-card border border-border">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted mt-4 text-sm font-medium">Loading system settings...</p>
                    </div>
                ) : sortedSections.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-surface rounded-card border border-border shadow-sm">
                        <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 text-primary-active rounded-card flex items-center justify-center mx-auto mb-4">
                            <Settings size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">No System Settings Configured</h3>
                        <p className="text-muted max-w-md mx-auto mb-6 text-sm">
                            The database settings table is currently empty. Click below to initialize all standard platform settings.
                        </p>
                        <button
                            onClick={handleSeedDefaults}
                            disabled={isResetting}
                            className="px-6 py-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-lg transition-all shadow-md inline-flex items-center gap-2 text-sm"
                        >
                            <RefreshCw size={18} className={isResetting ? 'animate-spin' : ''} />
                            {isResetting ? 'Initializing...' : 'Initialize Default Settings'}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Sidebar Tabs */}
                        <div className="space-y-2">
                            {sortedSections.map(([section, items]) => {
                                const Icon = getSectionIcon(section);
                                const isCurrent = activeSection === section;
                                return (
                                    <button
                                        key={section}
                                        type="button"
                                        onClick={() => setActiveSection(section)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-card transition-all font-medium text-left ${isCurrent
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-muted hover:bg-white dark:hover:bg-surface-hover'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={18} className={isCurrent ? 'text-white' : 'text-muted'} />
                                            <span className="capitalize text-sm font-semibold">{section}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${isCurrent
                                            ? 'bg-primary/60 text-white'
                                            : 'bg-surface-elevated text-muted'
                                            }`}>
                                            {items.length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Main Form Area */}
                        <div className="lg:col-span-3">
                            <form
                                key={`${activeSection}-${formKey}`}
                                id="settings-form"
                                onSubmit={handleUpdate}
                                className="bg-surface rounded-card p-8 shadow-sm border border-border"
                            >
                                <div className="mb-8 border-b border-border pb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-primary/10 dark:bg-primary/20 text-primary-active rounded-xl">
                                            {React.createElement(getSectionIcon(activeSection), { size: 22 })}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-foreground capitalize">
                                                {activeSection} Settings
                                            </h2>
                                            <p className="text-xs text-muted mt-0.5">
                                                {sectionDescriptions[activeSection] || 'Configure section properties and operational settings.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {settings[activeSection]?.map((setting) => (
                                        <div
                                            key={setting.key}
                                            className="p-4 rounded-card bg-surface-elevated/50 border border-border/80 transition-all hover:border-border dark:hover:border-border"
                                        >
                                            <div className="flex items-center justify-between mb-2 gap-3">
                                                <label className="block text-sm font-semibold text-secondary">
                                                    {formatSettingLabel(setting.key)}
                                                </label>
                                                <span
                                                    title={setting.isPublic
                                                        ? 'Exposed to the public /api/settings endpoint (never secrets)'
                                                        : 'Only returned to authenticated admins'}
                                                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium shrink-0 ${setting.isPublic
                                                        ? 'bg-success-soft text-success-ink'
                                                        : 'bg-surface-elevated text-secondary'
                                                        }`}
                                                >
                                                    {setting.isPublic ? 'Public' : 'Server Only'}
                                                </span>
                                            </div>

                                            {setting.description && (
                                                <p className="text-xs text-muted mb-3">
                                                    {setting.description}
                                                </p>
                                            )}

                                            {setting.type === 'boolean' ? (
                                                <div className="flex items-center gap-3 pt-1">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            name={setting.key}
                                                            defaultChecked={setting.value === 'true' || setting.value === '1'}
                                                            value="true"
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer bg-surface-elevated peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-border-strong peer-checked:bg-primary"></div>
                                                    </label>
                                                    <span className="text-xs font-medium text-secondary">
                                                        Enabled
                                                    </span>
                                                </div>
                                            ) : setting.type === 'textarea' ? (
                                                <textarea
                                                    name={setting.key}
                                                    defaultValue={setting.value || ''}
                                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-mono text-secondary"
                                                    rows={4}
                                                />
                                            ) : setting.secret ? (
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords[setting.key] ? 'text' : 'password'}
                                                        name={setting.key}
                                                        defaultValue=""
                                                        autoComplete="new-password"
                                                        placeholder={setting.hasValue
                                                            ? 'Stored — leave blank to keep unchanged'
                                                            : `Enter ${setting.key.toLowerCase().replace(/_/g, ' ')}...`}
                                                        className="w-full pl-4 pr-11 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-secondary"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePasswordVisibility(setting.key)}
                                                        title={showPasswords[setting.key] ? 'Hide typed value' : 'Show typed value'}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                                                    >
                                                        {showPasswords[setting.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <input
                                                    type={setting.type === 'number' ? 'number' : 'text'}
                                                    name={setting.key}
                                                    defaultValue={setting.value || ''}
                                                    step={setting.key === 'ai_temperature' ? '0.1' : undefined}
                                                    placeholder={`Enter ${setting.key.toLowerCase().replace(/_/g, ' ')}...`}
                                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-secondary"
                                                />
                                            )}

                                            {setting.secret && setting.hasValue && (
                                                <p className="text-[11px] text-muted mt-2 flex items-center gap-1">
                                                    <Lock size={11} /> A value is stored. It is never returned by the API.
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {activeSection === 'email' && (
                                    <EmailTestPanel authHeaders={authHeaders} />
                                )}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

function EmailTestPanel({ authHeaders }) {
    const [to, setTo] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    const sendTest = async () => {
        setSending(true);
        setResult(null);
        try {
            const res = await fetch(`${API}/api/admin/settings/email/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ to })
            });
            const data = await res.json().catch(() => ({}));
            setResult({ ok: res.ok, ...data });
            if (res.ok) toast.success('Test email handed to the provider');
            else toast.error(data.message || 'Test email failed');
        } catch (error) {
            setResult({ ok: false, message: error.message });
            toast.error('Network error sending test email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-bold text-foreground mb-1">Send a test email</h3>
            <p className="text-xs text-muted mb-3">
                Uses the saved provider and credentials. With the console provider the message is logged, not delivered.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                    type="button"
                    onClick={sendTest}
                    disabled={sending || !to}
                    className="px-4 py-2.5 bg-surface-elevated hover:bg-surface-hover text-secondary text-sm font-semibold rounded-xl disabled:opacity-50"
                >
                    {sending ? 'Sending...' : 'Send test'}
                </button>
            </div>
            {result && (
                <p className={`text-xs mt-2 flex items-center gap-1.5 ${result.ok ? 'text-success-ink' : 'text-danger-ink'}`}>
                    {result.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {result.ok
                        ? `Accepted by ${result.provider}${result.messageId ? ` (${result.messageId})` : ''}${result.note ? ` — ${result.note}` : ''}`
                        : (result.message || 'Delivery failed')}
                </p>
            )}
        </div>
    );
}
