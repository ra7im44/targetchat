import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import {
    Share2, Facebook, Instagram, MessageCircle,
    Settings, Activity, Globe, ShieldCheck,
    AlertCircle, AlertTriangle, CheckCircle2, XCircle, Server,
    RefreshCw, Clock, Info, Copy, FlaskConical, FileText,
    PlugZap, Unplug, X, Search, ChevronRight, ExternalLink
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

function timeAgo(iso, nowMs = Date.now()) {
    if (!iso) return 'Never';
    const time = new Date(iso).getTime();
    if (isNaN(time)) return 'Never';
    const diff = Math.max(0, nowMs - time);
    const s = Math.floor(diff / 1000);
    if (s < 5) return 'Just now';
    if (s < 60) return `Last checked ${s} second${s === 1 ? '' : 's'} ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `Last checked ${m} minute${m === 1 ? '' : 's'} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Last checked ${h} hour${h === 1 ? '' : 's'} ago`;
    return `Last checked ${Math.floor(h / 24)} day(s) ago`;
}

function formatDateTime(iso) {
    if (!iso) return 'No data yet';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return 'No data yet';
        return d.toLocaleString();
    } catch (e) {
        return 'No data yet';
    }
}

function formatLatency(ms) {
    if (ms === null || ms === undefined) return '—';
    return `${ms} ms`;
}

const STATUS_STYLES = {
    connected: 'bg-success-soft text-success-ink',
    disconnected: 'bg-surface-elevated text-secondary',
    degraded: 'bg-warning-soft text-warning-ink',
    configuration_required: 'bg-warning-soft text-warning-ink',
    token_expiring: 'bg-warning-soft text-warning-ink',
    token_expired: 'bg-danger-soft text-danger-ink',
    error: 'bg-danger-soft text-danger-ink'
};

const STATUS_LABELS = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    degraded: 'Degraded',
    configuration_required: 'Config Required',
    token_expiring: 'Token Expiring',
    token_expired: 'Token Expired',
    error: 'Error'
};

function StatusBadge({ status }) {
    const key = STATUS_STYLES[status] ? status : 'disconnected';
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_STYLES[key]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
            {STATUS_LABELS[key] || status}
        </span>
    );
}

const TOKEN_STYLES = {
    healthy: 'bg-success-soft text-success-ink',
    expiring: 'bg-warning-soft text-warning-ink',
    token_expiring: 'bg-warning-soft text-warning-ink',
    expired: 'bg-danger-soft text-danger-ink',
    token_expired: 'bg-danger-soft text-danger-ink',
    invalid: 'bg-danger-soft text-danger-ink',
    not_configured: 'bg-surface-elevated text-secondary',
    configuration_required: 'bg-warning-soft text-warning-ink',
    unknown: 'bg-surface-elevated text-secondary'
};

const TOKEN_LABELS = {
    healthy: 'Healthy',
    expiring: 'Expiring Soon',
    token_expiring: 'Expiring Soon',
    expired: 'Expired',
    token_expired: 'Expired',
    invalid: 'Invalid',
    not_configured: 'Not Configured',
    configuration_required: 'Config Required',
    unknown: 'Unknown'
};

function TokenBadge({ state }) {
    const key = TOKEN_STYLES[state] ? state : 'unknown';
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${TOKEN_STYLES[key]}`}>
            {TOKEN_LABELS[key] || state}
        </span>
    );
}

function MetricCard({ label, value, sub, tooltip, icon, accent = 'text-foreground' }) {
    return (
        <div className="bg-surface p-6 rounded-card border border-border shadow-xs">
            <div className="flex items-center gap-1.5 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
                {tooltip && (
                    <span title={tooltip} aria-label={tooltip} className="text-muted hover:text-primary cursor-help">
                        <Info size={16} aria-hidden="true" />
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
                {icon}
                <p className={`text-3xl font-semibold tabular-nums tracking-tight ${accent}`}>{value}</p>
            </div>
            {sub && <p className="text-xs text-muted mt-2">{sub}</p>}
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-surface p-6 rounded-card border border-border shadow-xs animate-pulse" aria-hidden="true">
            <div className="h-4 w-24 bg-surface-elevated rounded mb-3" />
            <div className="h-8 w-16 bg-surface-elevated rounded" />
        </div>
    );
}

function ProviderIcon({ type, size = 20 }) {
    if (type === 'facebook') return <Facebook className="text-primary" size={size} aria-hidden="true" />;
    if (type === 'instagram') return <Instagram size={size} aria-hidden="true" />;
    if (type === 'whatsapp') return <MessageCircle size={size} aria-hidden="true" />;
    return <Share2 size={size} aria-hidden="true" />;
}

function providerDisplayName(type) {
    if (type === 'facebook') return 'Facebook';
    if (type === 'instagram') return 'Instagram';
    if (type === 'whatsapp') return 'WhatsApp Cloud';
    return type;
}

export default function AdminChannelSettings() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [logs, setLogs] = useState([]);
    const [logsError, setLogsError] = useState(null);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logSearch, setLogSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [logProvider, setLogProvider] = useState('');
    const [logStatus, setLogStatus] = useState('');
    const [logDirection, setLogDirection] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);
    const [disconnectTarget, setDisconnectTarget] = useState(null);
    const [disconnecting, setDisconnecting] = useState(false);
    const [validatingId, setValidatingId] = useState(null);
    const [testingWebhook, setTestingWebhook] = useState(null);
    const logsRef = useRef(null);

    const authHeaders = useCallback(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('tc_token') : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    const fetchHealth = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        setError(null);
        try {
            const res = await fetch(`${API}/api/admin/channels/health`, { headers: authHeaders() });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || `Health request failed (${res.status})`);
            }
            const data = await res.json();
            setHealth(data);
        } catch (err) {
            console.error('Failed to fetch channel health:', err);
            setError(err.message || 'Backend unavailable');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authHeaders]);

    const fetchLogs = useCallback(async () => {
        setLogsError(null);
        setLogsLoading(true);
        try {
            const params = new URLSearchParams();
            if (logProvider) params.set('provider', logProvider);
            if (logStatus) params.set('status', logStatus);
            if (logDirection) params.set('direction', logDirection);
            // NOTE: uses appliedSearch (committed on Enter/Reload), not the
            // live input, so typing does not fire a request per keystroke.
            if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
            params.set('limit', '50');
            const res = await fetch(`${API}/api/admin/channels/logs?${params.toString()}`, { headers: authHeaders() });
            if (!res.ok) throw new Error(`Logs request failed (${res.status})`);
            const data = await res.json();
            setLogs(Array.isArray(data.logs) ? data.logs : []);
        } catch (err) {
            console.error('Failed to fetch channel logs:', err);
            setLogsError(err.message || 'Failed to load logs');
        } finally {
            setLogsLoading(false);
        }
    }, [authHeaders, logProvider, logStatus, logDirection, appliedSearch]);

    useEffect(() => {
        fetchHealth(false);
    }, [fetchHealth]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        if (!autoRefresh) return;
        const t = setInterval(() => {
            fetchHealth(false);
            fetchLogs();
        }, 30000);
        return () => clearInterval(t);
    }, [autoRefresh, fetchHealth, fetchLogs]);

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(t);
    }, []);

    // Close drawers/modals with Escape.
    useEffect(() => {
        if (!selectedLog && !disconnectTarget) return;
        const onKey = (e) => {
            if (e.key === 'Escape') {
                setSelectedLog(null);
                if (!disconnecting) setDisconnectTarget(null);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedLog, disconnectTarget, disconnecting]);

    const handleRefresh = () => {
        fetchHealth(true);
        fetchLogs();
    };

    const handleCopy = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Webhook URL copied');
        } catch (e) {
            toast.error('Copy failed');
        }
    };

    const handleTestWebhook = async (provider) => {
        setTestingWebhook(provider);
        try {
            const res = await fetch(`${API}/api/admin/channels/webhooks/${provider}/test`, {
                method: 'POST',
                headers: authHeaders()
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok) {
                toast.success(`${data.name || provider} endpoint is reachable`);
                fetchHealth(false);
            } else {
                toast.error(data.message || 'Endpoint test failed');
            }
        } catch (e) {
            toast.error('Endpoint test failed');
        } finally {
            setTestingWebhook(null);
        }
    };

    const handleValidate = async (channel) => {
        setValidatingId(channel.id);
        try {
            const res = await fetch(`${API}/api/admin/channels/${channel.id}/validate`, {
                method: 'POST',
                headers: authHeaders()
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok) {
                toast.success(`Token valid${data.details?.name ? ` (${data.details.name})` : ''}`);
            } else {
                toast.error(data.message || 'Token validation failed');
            }
            fetchLogs();
            fetchHealth();
        } catch (e) {
            toast.error('Token validation failed');
        } finally {
            setValidatingId(null);
        }
    };

    const handleDisconnect = async () => {
        if (!disconnectTarget) return;
        setDisconnecting(true);
        try {
            const res = await fetch(`${API}/api/admin/channels/${disconnectTarget.id}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success('Channel disconnected. Message history was preserved.');
                setDisconnectTarget(null);
                fetchHealth(false);
            } else {
                toast.error(data.message || 'Disconnect failed');
            }
        } catch (e) {
            toast.error('Disconnect failed');
        } finally {
            setDisconnecting(false);
        }
    };

    const scrollToLogs = (provider) => {
        if (provider) setLogProvider(provider);
        requestAnimationFrame(() => {
            logsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    if (loading) {
        return (
            <AdminLayout title="System Channels">
                <div className="space-y-6" aria-busy="true" aria-label="Loading channel health">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
                                <Server className="text-primary" size={20} aria-hidden="true" />
                                Omnichannel Infrastructure
                            </h1>
                            <p className="text-sm text-secondary mt-1">
                                System-wide monitoring and global configuration for external messaging gateways.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                        {[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
                    </div>
                    <div className="bg-surface rounded-card p-8 border border-border shadow-xs animate-pulse">
                        <div className="h-6 w-48 bg-surface-elevated rounded mb-4" />
                        <div className="h-4 w-full bg-surface-elevated rounded mb-2" />
                        <div className="h-4 w-2/3 bg-surface-elevated rounded" />
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error && !health) {
        return (
            <AdminLayout title="System Channels">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
                            <Server className="text-primary" size={20} aria-hidden="true" />
                            Omnichannel Infrastructure
                        </h1>
                        <p className="text-sm text-secondary mt-1">
                            System-wide monitoring and global configuration for external messaging gateways.
                        </p>
                    </div>
                    <div className="bg-surface rounded-card p-12 text-center border border-danger/30 shadow-xs" role="alert">
                        <XCircle className="mx-auto text-danger mb-4" size={18} aria-hidden="true" />
                        <h2 className="text-base font-semibold text-foreground mb-2">Backend unavailable</h2>
                        <p className="text-sm text-muted mb-6 max-w-md mx-auto">
                            Could not reach the channels health API ({error}). The backend may be down or your session may have expired.
                        </p>
                        <button
                            onClick={handleRefresh}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:ring-offset-2 focus:ring-offset-background"
                        >
                            <RefreshCw size={18} aria-hidden="true" />
                            Retry
                        </button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const summary = health?.summary || {};
    const configuration = health?.configuration || {};
    const providers = health?.providers || [];
    const webhooks = health?.webhooks || [];
    const security = health?.security || {};
    const alerts = health?.alerts || [];
    const configComplete = configuration.metaAppId?.configured && configuration.metaAppSecret?.configured && configuration.verifyToken?.configured;
    const tokenState = summary.tokenHealth?.state || 'unknown';

    const configRows = [
        { label: 'Meta App ID', configured: !!configuration.metaAppId?.configured, value: configuration.metaAppId?.value || null, hint: 'Public app identifier. Safe to display.' },
        { label: 'Meta App Secret configured', configured: !!configuration.metaAppSecret?.configured, value: null, hint: 'Secret status only — the value never leaves the server.' },
        { label: 'Webhook Verify Token configured', configured: !!configuration.verifyToken?.configured, value: null, hint: 'Used for Meta webhook verification handshakes.' },
        { label: 'Facebook / Instagram token configured', configured: !!configuration.facebookInstagramToken?.configured, value: configuration.facebookInstagramToken ? `${configuration.facebookInstagramToken.count}/${configuration.facebookInstagramToken.total} channels` : null, hint: 'At least one FB/IG channel has an access token stored.' },
        { label: 'WhatsApp Cloud token configured', configured: !!configuration.whatsappToken?.configured, value: configuration.whatsappToken ? `${configuration.whatsappToken.count}/${configuration.whatsappToken.total} channels` : null, hint: 'At least one WhatsApp channel (or system token) is configured.' },
        { label: 'Public webhook URL configured', configured: !!configuration.publicWebhookUrl?.configured, value: configuration.publicWebhookUrl?.value || null, hint: 'Meta requires a public HTTPS URL. Localhost works for development only.' },
        { label: 'API version', configured: true, value: configuration.apiVersion?.value || 'Unknown', hint: 'Meta Graph API version used for outbound calls.' }
    ];

    return (
        <AdminLayout title="System Channels">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
                            <Server className="text-primary" size={20} aria-hidden="true" />
                            Omnichannel Infrastructure
                        </h1>
                        <p className="text-sm text-secondary mt-1">
                            System-wide monitoring and global configuration for external messaging gateways.
                        </p>
                        <p className="text-xs text-muted mt-2 flex items-center gap-1.5" aria-live="polite">
                            <Clock size={16} aria-hidden="true" />
                            {health?.lastCheckedAt ? timeAgo(health.lastCheckedAt, now) : 'Not checked yet'}
                            <span className="text-muted" aria-hidden="true">·</span>
                            <span className="tabular-nums">{formatDateTime(health?.lastCheckedAt)}</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-secondary cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4 rounded accent-accent focus:ring-primary/40 focus:border-primary"
                                aria-label="Enable auto-refresh every 30 seconds"
                            />
                            Auto-refresh (30s)
                        </label>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-60 text-primary-foreground font-semibold rounded-lg transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:ring-offset-2 focus:ring-offset-background"
                            aria-label="Refresh channel health"
                        >
                            <RefreshCw size={18} aria-hidden="true" className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {error && health && (
                    <div className="p-4 bg-warning-soft border border-warning/30 rounded-card flex items-start gap-3 text-warning-ink" role="alert">
                        <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                        <div className="text-sm">
                            <p className="font-semibold">Partial refresh failed</p>
                            <p>{error}. Showing the last known data.</p>
                        </div>
                    </div>
                )}

                {/* Alerts */}
                {alerts.length > 0 && (
                    <div className="space-y-3" role="region" aria-label="Channel alerts">
                        {alerts.map((alert, i) => (
                            <div
                                key={`${alert.code}-${i}`}
                                className={`p-4 rounded-card border flex items-start gap-3 ${alert.severity === 'error'
                                    ? 'bg-danger-soft border-danger/30 text-danger-ink'
                                    : alert.severity === 'warning'
                                        ? 'bg-warning-soft border-warning/30 text-warning-ink'
                                        : 'bg-primary-soft border-primary/30 text-primary'
                                    }`}
                            >
                                <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                                <p className="text-sm">
                                    {alert.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* KPI cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4" role="region" aria-label="Channel metrics">
                    <MetricCard
                        label="Connected Channels"
                        value={summary.connectedChannels ?? 0}
                        sub={summary.totalChannels ? `${summary.totalChannels} total channel(s)` : 'No channels yet'}
                        tooltip="Channels that are active AND have an access token stored. A reachable webhook alone does not count as a connection."
                    />
                    <MetricCard
                        label="Webhooks Online"
                        value={`${summary.webhooksOnline?.online ?? 0}/${summary.webhooksOnline?.total ?? 0}`}
                        sub="Endpoint availability only — not account connections"
                        tooltip="Whether the backend webhook routes are registered and responding. This does not mean a Meta/Facebook/Instagram/WhatsApp account is connected."
                        icon={<span className={`w-3 h-3 rounded-full ${(summary.webhooksOnline?.online ?? 0) === (summary.webhooksOnline?.total ?? 0) ? 'bg-success animate-pulse' : 'bg-warning'}`} aria-hidden="true" />}
                    />
                    <div className="bg-surface p-6 rounded-card border border-border shadow-xs">
                        <div className="flex items-center gap-1.5 mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Token Health</p>
                            <span title="Aggregated token state. Unknown means a token is stored but expiry cannot be determined. Never shown as 100% without proof." aria-label="Token health meaning" className="text-muted hover:text-primary cursor-help">
                                <Info size={16} aria-hidden="true" />
                            </span>
                        </div>
                        <TokenBadge state={tokenState} />
                        <p className="text-xs text-muted mt-2">
                            {summary.tokenHealth ? `${summary.tokenHealth.configured}/${summary.tokenHealth.total} with token` : 'No data yet'}
                        </p>
                    </div>
                    <MetricCard
                        label="Msgs (24h)"
                        value={summary.messages24h ?? 0}
                        sub="Messages stored in the last 24 hours"
                        tooltip="Count of message records created in the last 24 hours."
                        accent="text-primary"
                    />
                    <MetricCard
                        label="Failed Events (24h)"
                        value={summary.failedEvents24h ?? 0}
                        sub={(summary.failedEvents24h ?? 0) > 0 ? 'Requires attention' : 'No failures recorded'}
                        tooltip="Webhook and delivery events marked as failed in the last 24 hours (in-memory tracker; resets on restart)."
                        accent={(summary.failedEvents24h ?? 0) > 0 ? 'text-danger-ink' : 'text-foreground'}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column */}
                    <div className="lg:col-span-2 space-y-6 min-w-0">
                        {/* Global configuration */}
                        <section className="bg-surface rounded-card p-6 md:p-8 border border-border shadow-xs" aria-label="Global Meta configuration">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                    <Settings className="text-primary" size={18} aria-hidden="true" />
                                    Global Meta Configuration
                                </h3>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${configComplete ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink'}`}>
                                    {configComplete ? 'Complete' : 'Incomplete'}
                                </span>
                            </div>
                            <ul className="space-y-3">
                                {configRows.map((row) => (
                                    <li key={row.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-background rounded-card">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {row.configured
                                                ? <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
                                                : <XCircle size={18} className="shrink-0" aria-hidden="true" />}
                                            <span className="font-semibold text-sm text-foreground">{row.label}</span>
                                            <span title={row.hint} aria-label={row.hint} className="text-muted hover:text-primary cursor-help">
                                                <Info size={16} aria-hidden="true" />
                                            </span>
                                        </div>
                                        <span className="text-sm font-mono text-secondary truncate">
                                            {row.value ? (
                                                <span className="break-all">{row.value}</span>
                                            ) : row.configured ? (
                                                <span className="text-success font-sans font-bold">Configured</span>
                                            ) : (
                                                <span className="text-muted font-sans">Not configured</span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 p-4 bg-warning-soft border border-warning/30 rounded-card flex items-start gap-3 text-warning-ink">
                                <AlertCircle className="shrink-0 mt-0.5" size={18} aria-hidden="true" />
                                <p className="text-xs">
                                    Provider credentials are managed through server environment variables and{' '}
                                    <Link href="/admin/settings" className="underline font-semibold hover:opacity-80">
                                        Admin &gt; Settings &gt; Integrations
                                    </Link>
                                    . Secrets are never displayed here — only their configuration status.
                                </p>
                            </div>
                        </section>

                        {/* Connected channels */}
                        <section className="bg-surface rounded-card p-6 md:p-8 border border-border shadow-xs" aria-label="Connected channels">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                    <PlugZap className="text-primary" size={18} aria-hidden="true" />
                                    Connected Channels
                                    <span className="text-sm font-bold text-muted">({providers.length})</span>
                                </h3>
                                <Link
                                    href="/channels"
                                    className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary rounded-lg px-2 py-1"
                                >
                                    Open Channel Setup <ChevronRight size={16} aria-hidden="true" />
                                </Link>
                            </div>

                            {providers.length === 0 ? (
                                <div className="rounded-card border-2 border-dashed border-border p-10 text-center">
                                    <div className="w-14 h-14 bg-background rounded-card flex items-center justify-center mx-auto mb-4">
                                        <Unplug size={18} aria-hidden="true" />
                                    </div>
                                    <h4 className="text-sm font-semibold text-foreground mb-1">No channels connected yet.</h4>
                                    <p className="text-sm text-muted mb-6 max-w-md mx-auto">
                                        Connect a Facebook Page, Instagram business account, or WhatsApp number to start receiving messages.
                                    </p>
                                    <Link
                                        href="/channels"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-semibold rounded-lg transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:ring-offset-2 focus:ring-offset-background"
                                    >
                                        <Share2 size={18} aria-hidden="true" />
                                        Connect Channel
                                    </Link>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {providers.map((ch) => (
                                        <li key={ch.id} className="p-5 bg-background rounded-card border border-border hover:border-primary/30 dark:hover:border-strong transition-colors">
                                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-11 h-11 bg-surface-elevated border border-border rounded-lg flex items-center justify-center shadow-xs shrink-0">
                                                        <ProviderIcon type={ch.provider} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-foreground truncate">{ch.name}</p>
                                                        <p className="text-xs text-muted font-mono truncate">
                                                            {providerDisplayName(ch.provider)} · {ch.externalId}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={ch.status} />
                                                    <TokenBadge state={ch.tokenState} />
                                                </div>
                                            </div>
                                            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                                                <div>
                                                    <dt className="uppercase font-bold text-muted text-[10px] mb-1">Owner</dt>
                                                    <dd className="text-secondary truncate">{ch.owner?.email || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="uppercase font-bold text-muted text-[10px] mb-1">Routing</dt>
                                                    <dd className="text-secondary capitalize">{ch.mode || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="uppercase font-bold text-muted text-[10px] mb-1">Last active</dt>
                                                    <dd className="text-secondary">{ch.lastActiveAt ? formatDateTime(ch.lastActiveAt) : 'No data yet'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="uppercase font-bold text-muted text-[10px] mb-1">Last Validated</dt>
                                                    <dd className="text-secondary">{ch.lastHealthCheckAt ? formatDateTime(ch.lastHealthCheckAt) : 'Never verified'}</dd>
                                                </div>
                                            </dl>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => handleValidate(ch)}
                                                    disabled={validatingId === ch.id}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-border hover:border-primary/50 hover:text-primary rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                    aria-label={`Test connection for ${ch.name}`}
                                                >
                                                    <FlaskConical size={16} aria-hidden="true" />
                                                    {validatingId === ch.id ? 'Testing…' : 'Test Connection'}
                                                </button>
                                                <Link
                                                    href="/channels"
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-border hover:border-primary/50 hover:text-primary rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                    aria-label={`Configure ${ch.name}`}
                                                >
                                                    <Settings size={16} aria-hidden="true" />
                                                    Configure
                                                </Link>
                                                <button
                                                    onClick={() => setDisconnectTarget(ch)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-border hover:border-danger/60 hover:text-danger rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                                                    aria-label={`Disconnect ${ch.name}`}
                                                >
                                                    <Unplug size={16} aria-hidden="true" />
                                                    Disconnect
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* Webhook endpoints */}
                        <section className="bg-surface rounded-card p-6 md:p-8 border border-border shadow-xs" aria-label="Webhook endpoints">
                            <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                                <Globe className="text-primary" size={18} aria-hidden="true" />
                                Webhook Endpoints
                            </h3>
                            <p className="text-xs text-muted mb-6">
                                Online means the backend route is registered and responding — not that an account is connected.
                            </p>
                            {configuration.publicWebhookUrl?.isLocalhost && (
                                <div className="mb-4 p-4 bg-warning-soft border border-warning/30 rounded-card flex items-start gap-3 text-warning-ink" role="alert">
                                    <AlertTriangle className="shrink-0 mt-0.5" size={18} aria-hidden="true" />
                                    <p className="text-xs">
                                        Current base URL is localhost. Meta requires a public HTTPS webhook URL — configure{' '}
                                        <code className="font-mono font-bold">BACKEND_URL</code> (or <code className="font-mono font-bold">PUBLIC_BASE_URL</code>) on the server.
                                    </p>
                                </div>
                            )}
                            <ul className="space-y-3">
                                {webhooks.map((hook) => (
                                    <li key={hook.id} className="p-4 bg-background rounded-card">
                                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-foreground">{hook.name}</p>
                                                <p className="text-xs text-muted font-mono truncate" title={hook.url}>{hook.url}</p>
                                            </div>
                                            <span className="inline-flex items-center gap-1.5 text-success font-bold text-sm">
                                                <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse" aria-hidden="true" />
                                                Online
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-muted mb-2">
                                            <span>Last request: <strong className="text-secondary">{hook.lastRequestAt ? formatDateTime(hook.lastRequestAt) : 'No data yet'}</strong></span>
                                            <span>Last success: <strong className="text-secondary">{hook.lastSuccessAt ? formatDateTime(hook.lastSuccessAt) : 'No data yet'}</strong></span>
                                            <span>Last error: <strong className="text-secondary">{hook.lastError ? `${formatDateTime(hook.lastErrorAt)} — ${hook.lastError}` : 'None'}</strong></span>
                                            <span>Traffic Latency: <strong className="text-secondary">{formatLatency(hook.lastLatencyMs)}</strong></span>
                                        </div>
                                        {hook.lastCheckAt && (
                                            <div className="text-[11px] text-secondary mb-3 px-3 py-1.5 bg-surface-elevated rounded-lg flex flex-wrap items-center justify-between gap-1 border border-border">
                                                <span>Self-Check Ping: <strong className={hook.lastCheckOk ? 'text-success' : 'text-danger'}>{hook.lastCheckOk ? 'Operational' : 'Failing'}</strong> ({formatLatency(hook.lastCheckLatencyMs)}{hook.lastCheckHttpStatus ? `, HTTP ${hook.lastCheckHttpStatus}` : ''})</span>
                                                <span className="text-[10px] text-muted">{formatDateTime(hook.lastCheckAt)}</span>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleCopy(hook.url)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted hover:text-primary hover:bg-surface-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                aria-label={`Copy ${hook.name} URL`}
                                            >
                                                <Copy size={16} aria-hidden="true" /> Copy URL
                                            </button>
                                            <button
                                                onClick={() => handleTestWebhook(hook.id)}
                                                disabled={testingWebhook === hook.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                aria-label={`Test ${hook.name} endpoint`}
                                            >
                                                <FlaskConical size={16} aria-hidden="true" /> {testingWebhook === hook.id ? 'Testing…' : 'Test Endpoint'}
                                            </button>
                                            <button
                                                onClick={() => scrollToLogs(hook.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted hover:text-primary hover:bg-surface-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                aria-label={`View ${hook.name} logs`}
                                            >
                                                <FileText size={16} aria-hidden="true" /> View Logs
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    {/* Right column */}
                    <div className="space-y-6 min-w-0">
                        <section className="bg-surface rounded-card p-6 md:p-8 border border-border shadow-xs" aria-label="Security status">
                            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                                <ShieldCheck className="text-primary" size={18} aria-hidden="true" />
                                Security Status
                            </h3>
                            <ul className="text-sm space-y-3 text-secondary">
                                {[
                                    security.signatureVerification,
                                    security.httpsTls,
                                    security.rateLimiting,
                                    security.authProtection,
                                    security.secretRedaction
                                ].filter(Boolean).map((check) => (
                                    <li key={check.label} className="flex items-start gap-2" title={check.detail}>
                                        <span aria-hidden="true" className={`flex items-center mt-0.5 ${check.enabled ? 'text-success' : 'text-warning'}`}>
                                            {check.enabled ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                        </span>
                                        <span>
                                            <span className="font-semibold text-foreground">{check.label}</span>
                                            <span className="block text-xs text-muted">{check.enabled ? 'Enabled' : 'Attention needed'}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="bg-surface rounded-card p-6 md:p-8 border border-border shadow-xs" aria-label="Setup guidance">
                            <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                                <ExternalLink size={18} className="text-primary" aria-hidden="true" />
                                Setup
                            </h3>
                            <p className="text-xs text-muted mb-4">
                                Account connections use the existing Meta OAuth flow. Server credentials stay in environment variables — they are never pasted into this dashboard.
                            </p>
                            <div className="flex flex-col gap-2">
                                <Link
                                    href="/channels"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:ring-offset-2 focus:ring-offset-background"
                                >
                                    <Share2 size={16} aria-hidden="true" />
                                    Connect Channel
                                </Link>
                                <Link
                                    href="/admin/settings"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-elevated border border-border hover:bg-surface-hover text-sm font-semibold text-foreground rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <Settings size={16} aria-hidden="true" />
                                    Integration Settings
                                </Link>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Recent logs */}
                <section ref={logsRef} className="bg-surface rounded-card p-6 md:p-8 border border-border shadow-xs scroll-mt-6" aria-label="Recent webhook logs">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <Activity size={18} className="text-primary" aria-hidden="true" />
                            Recent Logs
                            <span className="text-sm font-bold text-muted">({logs.length})</span>
                        </h3>
                        <button
                            onClick={() => { setAppliedSearch(logSearch); fetchLogs(); }}
                            disabled={logsLoading}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary rounded-lg px-2 py-1"
                            aria-label="Reload logs"
                        >
                            <RefreshCw size={16} aria-hidden="true" className={logsLoading ? 'animate-spin' : ''} />
                            Reload
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <label className="relative block">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                            <input
                                type="search"
                                value={logSearch}
                                onChange={(e) => {
                                    setLogSearch(e.target.value);
                                    if (!e.target.value) setAppliedSearch('');
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch(logSearch); }}
                                onBlur={() => { if (logSearch !== appliedSearch) setAppliedSearch(logSearch); }}
                                placeholder="Search events, IDs, errors… (Enter to apply)"
                                aria-label="Search logs"
                                className="w-full pl-9 pr-3 py-2.5 bg-surface-elevated rounded-lg border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 text-sm"
                            />
                        </label>
                        <select value={logProvider} onChange={(e) => setLogProvider(e.target.value)} aria-label="Filter by provider" className="px-3 py-2.5 bg-surface-elevated rounded-lg border border-border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40">
                            <option value="">All providers</option>
                            <option value="meta">Meta (FB/IG)</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="n8n">System (n8n)</option>
                        </select>
                        <select value={logStatus} onChange={(e) => setLogStatus(e.target.value)} aria-label="Filter by status" className="px-3 py-2.5 bg-surface-elevated rounded-lg border border-border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40">
                            <option value="">All statuses</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                        </select>
                        <select value={logDirection} onChange={(e) => setLogDirection(e.target.value)} aria-label="Filter by direction" className="px-3 py-2.5 bg-surface-elevated rounded-lg border border-border text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40">
                            <option value="">All directions</option>
                            <option value="inbound">Inbound</option>
                            <option value="outbound">Outbound</option>
                            <option value="system">System</option>
                        </select>
                    </div>

                    {logsError ? (
                        <div className="p-6 text-center border border-warning/30 bg-warning-soft rounded-card" role="alert">
                            <p className="text-sm text-warning-ink mb-3">Could not load logs ({logsError}). Health data above is unaffected.</p>
                            <button onClick={fetchLogs} className="inline-flex items-center gap-1.5 px-4 py-2 bg-warning text-warning-foreground hover:bg-warning/90 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
                                <RefreshCw size={16} aria-hidden="true" /> Retry logs
                            </button>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-10 text-center border-2 border-dashed border-border rounded-card">
                            <Activity className="mx-auto mb-3 text-muted" size={18} aria-hidden="true" />
                            <p className="font-bold text-foreground">No data yet</p>
                            <p className="text-sm text-muted mt-1">No webhook or channel events match the current filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-2 px-2">
                            <table className="w-full text-sm min-w-[720px]">
                                <thead>
                                    <tr className="text-left text-[11px] uppercase tracking-wider text-secondary border-b border-border">
                                        <th className="py-2 pr-3 font-bold">Timestamp</th>
                                        <th className="py-2 pr-3 font-bold">Provider</th>
                                        <th className="py-2 pr-3 font-bold">Direction</th>
                                        <th className="py-2 pr-3 font-bold">Event</th>
                                        <th className="py-2 pr-3 font-bold">Status</th>
                                        <th className="py-2 pr-3 font-bold">Message / Event ID</th>
                                        <th className="py-2 pr-3 font-bold">HTTP</th>
                                        <th className="py-2 pr-3 font-bold">Latency</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr
                                            key={log.id}
                                            onClick={() => setSelectedLog(log)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLog(log); } }}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`View details for ${log.eventType} from ${log.provider}`}
                                            className="border-b border-border hover:bg-primary/10 dark:hover:bg-primary/20 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40"
                                        >
                                            <td className="py-2.5 pr-3 font-mono text-xs text-muted whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                                            <td className="py-2.5 pr-3 capitalize font-semibold text-secondary">{log.provider}</td>
                                            <td className="py-2.5 pr-3 capitalize text-muted">{log.direction}</td>
                                            <td className="py-2.5 pr-3 font-mono text-xs text-secondary">{log.eventType}</td>
                                            <td className="py-2.5 pr-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${log.status === 'failed' ? 'bg-danger-soft text-danger-ink' : 'bg-success-soft text-success-ink'}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="py-2.5 pr-3 font-mono text-xs text-muted truncate max-w-[160px]">{log.messageId || '—'}</td>
                                            <td className="py-2.5 pr-3 font-mono text-xs text-muted">{log.httpStatus ?? '—'}</td>
                                            <td className="py-2.5 pr-3 font-mono text-xs text-muted whitespace-nowrap">{formatLatency(log.latencyMs)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* Log details drawer */}
            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label="Log event details">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedLog(null)} aria-hidden="true" />                        <div className="relative w-full max-w-md bg-surface h-full shadow-modal p-6 overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-semibold text-foreground">Event details</h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 text-muted hover:bg-surface-hover rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                aria-label="Close event details"
                                autoFocus
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>
                        <dl className="space-y-3 text-sm mb-5">
                            {[
                                ['Timestamp', formatDateTime(selectedLog.timestamp)],
                                ['Provider', selectedLog.provider],
                                ['Direction', selectedLog.direction],
                                ['Event type', selectedLog.eventType],
                                ['Status', selectedLog.status],
                                ['Message / Event ID', selectedLog.messageId || '—'],
                                ['HTTP status', selectedLog.httpStatus ?? '—'],
                                ['Latency', formatLatency(selectedLog.latencyMs)],
                                ['Error', selectedLog.error || '—']
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-4 p-3 bg-background rounded-xl">
                                    <dt className="text-muted font-bold text-xs uppercase shrink-0">{k}</dt>
                                    <dd className="text-foreground text-foreground font-mono text-xs text-right break-all">{String(v)}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className="text-xs font-bold text-muted uppercase mb-2">Sanitized metadata</p>
                        <pre className="text-xs font-mono bg-surface-elevated text-foreground border border-border rounded-card p-4 overflow-x-auto whitespace-pre-wrap break-all" aria-label="Sanitized request metadata">
                            {selectedLog.body ? JSON.stringify(selectedLog.body, null, 2).slice(0, 8000) : 'No payload stored.'}
                        </pre>
                        <p className="text-[11px] text-muted mt-3">
                            Tokens, secrets, and authorization headers are redacted server-side before storage.
                        </p>
                    </div>
                </div>
            )}

            {/* Disconnect confirmation */}
            {disconnectTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Confirm channel disconnect">
                    <div className="absolute inset-0 bg-black/60" onClick={() => { if (!disconnecting) setDisconnectTarget(null); }} aria-hidden="true" />
                    <div className="relative bg-surface w-full max-w-md rounded-modal shadow-modal p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-11 h-11 bg-danger-soft rounded-lg flex items-center justify-center">
                                <Unplug className="text-danger" size={18} aria-hidden="true" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">Disconnect {disconnectTarget.name}?</h3>
                        </div>
                        <p className="text-sm text-muted mb-2">
                            This will remove the <strong>{providerDisplayName(disconnectTarget.provider)}</strong> connection
                            (<span className="font-mono">{disconnectTarget.externalId}</span>). Inbound and outbound messaging for this account will stop.
                        </p>
                        <p className="text-sm text-muted mb-6">
                            Message history is <strong>preserved</strong> — only the connection itself is removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { if (!disconnecting) setDisconnectTarget(null); }}
                                disabled={disconnecting}
                                className="flex-1 px-4 py-3 bg-surface-elevated border border-border text-foreground font-semibold rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                className="flex-1 px-4 py-3 bg-danger text-danger-foreground font-semibold rounded-lg hover:bg-danger/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                                autoFocus
                            >
                                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
