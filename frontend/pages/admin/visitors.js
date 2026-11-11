import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import {
    Navigation, Users, Activity, Clock, Globe,
    Search, RefreshCw, Trash2, Copy, Check, X, Headphones,
    Laptop, Smartphone, Monitor
} from 'lucide-react';
import { countryName, countryFlag, parseDevice } from '../../utils/deviceHelper';
import { API_URL as API, getToken } from '../../utils/apiConfig';

const MAX_DETAIL_LENGTH = 96;

function flagEmojiFor(countryCode, fallback = '🌐') {
    if (!countryCode) return fallback;
    try {
        const upper = String(countryCode).toUpperCase().trim();
        if (upper.length !== 2) return fallback;
        return String.fromCodePoint(
            ...upper.split('').map((c) => 0x1F1E6 - 65 + c.charCodeAt(0))
        );
    } catch {
        return fallback;
    }
}

function locationLabelFor(countryCode, withEmoji = false) {
    const label =
        countryCode
            ? countryName(countryCode) ?? 'Unknown location'
            : 'Unknown location';
    if (!withEmoji) return label;
    const flag = flagEmojiFor(countryCode);
    return flag ? `${flag} ${label}` : label;
}

function deviceIconFor(deviceInfo) {
    if (!deviceInfo) return null;
    const lower = deviceInfo.toLowerCase();
    if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('android') || lower.includes('phone') || lower.includes('samsung') || lower.includes('pixel')) {
        return <Smartphone size={14} className="text-muted flex-shrink-0" />;
    }
    if (lower.includes('tablet') || lower.includes('ipad')) {
        return <Monitor size={14} className="text-muted flex-shrink-0" />;
    }
    if (lower.includes('mac') || lower.includes('windows') || lower.includes('linux') || lower.includes('ubuntu') || lower.includes('chromeos')) {
        return <Laptop size={14} className="text-muted flex-shrink-0" />;
    }
    return <Headphones size={14} className="text-muted flex-shrink-0" />;
}

function deviceLabelFor(deviceInfo) {
    if (!deviceInfo) return 'Unknown device';
    return parseDevice(deviceInfo) ?? 'Unknown device';
}

function truncateMiddle(value, maxLength) {
    if (!value) return '—';
    if (value.length <= maxLength + 3) return value;
    const head = value.slice(0, maxLength / 2);
    const tail = value.slice(-Math.ceil(maxLength / 2));
    return `${head}…${tail}`;
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const PresenceBadge = ({ presence, isInline = false }) => {
    const tone =
        presence === 'Online'
            ? 'success'
            : presence === 'RecentlyActive'
                ? 'warning'
                : 'neutral';

    const label =
        presence === 'Online'
            ? 'Online'
            : presence === 'RecentlyActive'
                ? 'Recently Active'
                : 'Idle';

    if (isInline) {
        return (
            <span className={`
                inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px]
                font-semibold tracking-tight border leading-none
                ${tone === 'neutral'
                    ? 'bg-surface-elevated text-muted border-border'
                    : `bg-${tone}-soft text-${tone} border-${tone}/20`}
            `}>
                {presence === 'Online' && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                )}
                {label}
            </span>
        );
    }

    return (
        <span className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs
            font-semibold tracking-tight border leading-none
            ${tone === 'neutral'
                ? 'bg-surface-elevated text-muted border-border'
                : `bg-${tone}-soft text-${tone} border-${tone}/20`}
        `}>
            <span className={`
                inline-block h-2 w-2 rounded-full
                ${tone === 'neutral' ? 'bg-border-strong' : `bg-${tone} ${presence === 'Online' ? 'animate-pulse' : ''}`}
            `} />
            {label}
        </span>
    );
};

export default function VisitorsTrackingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [copiedIp, setCopiedIp] = useState(null);
    const [clearing, setClearing] = useState(false);
    const [clearConfirm, setClearConfirm] = useState(false);

    const tokenRef = useRef(null);

    const fetchVisitorsData = useCallback(async () => {
        const token = getToken();
        if (!token) return router.replace('/login');
        tokenRef.current = token;

        try {
            setLoading(true);
            setError(null);
            const queryParams = new URLSearchParams({
                page,
                limit: 20,
                search
            });

            const res = await fetch(`${API}/api/admin/visitors?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                return router.replace('/admin');
            }

            if (!res.ok) {
                setError(`Visitor data could not be loaded.`);
                return;
            }

            const resData = await res.json();
            setData(resData);
        } catch (err) {
            console.error('Error fetching visitor sessions:', err);
            setError(`Visitor data could not be loaded.`);
        } finally {
            setLoading(false);
        }
    }, [router, page, search]);

    useEffect(() => {
        if (!router.isReady) return;
        fetchVisitorsData();
    }, [router.isReady, fetchVisitorsData]);

    async function handleClearLogs() {
        if (!clearConfirm) return;
        const token = tokenRef.current || getToken();
        if (!token) return;
        try {
            setClearing(true);
            const res = await fetch(`${API}/api/admin/visitors/clear`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setClearConfirm(false);
                await fetchVisitorsData();
            } else {
                setError(`Logs could not be cleared.`);
            }
        } catch (err) {
            console.error('Failed to clear logs:', err);
            setError(`Logs could not be cleared.`);
        } finally {
            setClearing(false);
        }
    }

    function copyToClipboard(text) {
        if (!text || !navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIp(text);
            setTimeout(() => setCopiedIp(null), 2000);
        }).catch(() => {
            setError(`IP address could not be copied.`);
        });
    }

    const currentVisitors = Array.isArray(data?.latestVisitors) ? data.latestVisitors : [];
    const topCountries = Array.isArray(data?.topCountries) ? data.topCountries : [];
    const topDevices = Array.isArray(data?.topDevices) ? data.topDevices : [];
    const pagination = data?.pagination ?? null;

    const activeLoggedCount = data?.activeLoggedUsers ?? 0;
    const activeMinuteCount = data?.activeLast5Minutes ?? 0;
    const activeCount = data?.pagination?.total ?? 0;

    const hasVisitors = currentVisitors.length > 0;

    return (
        <AdminLayout title="Session Tracking">
            <div className="space-y-6 animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="min-w-0">
                        <header className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                                Session Tracking & User Intelligence
                            </h1>
                            <PresenceBadge presence="Online" isInline />
                        </header>
                        <p className="text-sm text-muted mt-1 leading-relaxed">
                            Live user location, IP addresses, device analytics, and active presence sessions.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={fetchVisitorsData}
                            aria-label="Refresh visitor data"
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-md
                                bg-surface text-foreground border border-border
                                hover:bg-surface-hover active:bg-surface-elevated
                                transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Refreshing…' : 'Refresh'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setClearConfirm(true)}
                            disabled={clearing || !hasVisitors}
                            aria-label="Clear inactive visitor logs"
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-md
                                text-danger border border-danger/20
                                bg-danger-soft text-danger
                                hover:bg-danger hover:text-white active:bg-danger/90
                                transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                        >
                            <Trash2 size={16} />
                            {clearing ? 'Clearing…' : 'Clear Inactive'}
                        </button>
                    </div>
                </div>

                {/* KPI Counters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CardWithIcon
                        icon={<Users size={18} />}
                        tone="info"
                        label="Active Sessions"
                        value={activeLoggedCount}
                    />
                    <CardWithIcon
                        icon={<Activity size={18} />}
                        tone="success"
                        label="Last 5 Minutes"
                        value={activeMinuteCount}
                    />
                    <CardWithIcon
                        icon={<Smartphone size={18} />}
                        tone="primary"
                        value={activeCount}
                        label="Currently on site"
                        live
                    />
                    <CardWithIcon
                        icon={<Clock size={18} />}
                        tone="accent"
                        value={data?.totalToday ?? 0}
                        label="Active today"
                    />
                </div>

                {/* Summaries */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Panel>
                        <PanelHeader icon={<Globe size={16} />} title="Top Locations & Countries" />
                        <PanelBody>
                            {topCountries.length > 0 ? (
                                topCountries.map((item) => (
                                    <ListItem key={item.country}>
                                        <ListItemLabel>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span aria-hidden="true">{flagEmojiFor(item.country, '🌐')}</span>
                                                <span>{countryName(item.country)}</span>
                                            </span>
                                        </ListItemLabel>
                                        <ListItemValue count={item.count} percentage={item.percentage} />
                                        <BarTrack percentage={item.percentage} fill="primary" minPercent={5} />
                                    </ListItem>
                                ))
                            ) : (
                                <EmptyState icon={<Globe size={18} />} title="No country data recorded yet." />
                            )}
                        </PanelBody>
                    </Panel>

                    <Panel>
                        <PanelHeader icon={<Smartphone size={16} />} title="Top Devices & Operating Systems" />
                        <PanelBody>
                            {topDevices.length > 0 ? (
                                topDevices.map((item) => (
                                    <ListItem key={item.device}>
                                        <ListItemLabel>
                                            <span className="inline-flex items-center gap-1.5">
                                                {deviceIconFor(item.device)}
                                                <span>
                                                    {item.device.length > MAX_DETAIL_LENGTH
                                                        ? truncateMiddle(item.device, MAX_DETAIL_LENGTH)
                                                        : item.device}
                                                </span>
                                            </span>
                                        </ListItemLabel>
                                        <ListItemValue count={item.count} percentage={item.percentage} />
                                        <BarTrack percentage={item.percentage} fill="success" minPercent={5} />
                                    </ListItem>
                                ))
                            ) : (
                                <EmptyState icon={<Smartphone size={18} />} title="No device data recorded yet." />
                            )}
                        </PanelBody>
                    </Panel>
                </div>

                {/* Search */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="visitor-search" className="sr-only">
                        Search visitors by IP, device, user, or location
                    </label>
                    <div className="relative w-full">
                        <Search
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                            aria-hidden="true"
                        />
                        <input
                            id="visitor-search"
                            type="text"
                            autoComplete="off"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape' && search) {
                                    setSearch('');
                                    setPage(1);
                                }
                            }}
                            placeholder="Search IP, device, user, email, country, or city…"
                            className={`w-full pl-10 pr-10 py-2.5 rounded-lg
                                bg-surface border border-border
                                placeholder:text-muted
                                hover:border-border-strong
                                focus:border-primary focus:ring-2 focus:ring-primary/20
                                outline-none transition-colors text-foreground`}
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2
                                    p-1.5 rounded-md text-muted hover:text-foreground
                                    hover:bg-surface-hover active:bg-surface-elevated
                                    transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                aria-label={`Clear search for "${search}"`}
                            >
                                <X size={16} />
                            </button>
                        ) : null}
                    </div>
                    <p className="text-xs text-muted">
                        Searches name, email, IP address, device info, country, and city.
                        {' '}Press <kbd className="px-1 py-0.5 rounded border border-border bg-surface-elevated text-[10px] font-sans">Esc</kbd> to clear.
                    </p>
                </div>

                {/* Sessions */}
                <section aria-label="Visitor sessions">
                    {error ? (
                        <div className="rounded-xl border border-danger/20 bg-danger-soft p-6 text-sm">
                            <p className="text-danger font-semibold">{error}</p>
                            <div className="mt-4 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setError(null)}
                                    className="underline underline-offset-2"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ) : null}

                    <div
                        className={`overflow-x-auto rounded-xl border border-border bg-surface shadow-xs transition-opacity ${loading && currentVisitors.length > 0 ? 'opacity-60' : ''}`}
                        aria-busy={loading}
                    >
                        <table className="w-full min-w-[860px] border-separate">
                            <thead>
                                <tr className="bg-surface-elevated">
                                    <TableHeader>User</TableHeader>
                                    <TableHeader>Account</TableHeader>
                                    <TableHeader>Presence</TableHeader>
                                    <TableHeader>Location</TableHeader>
                                    <TableHeader>Network / Device</TableHeader>
                                    <TableHeader>Session Timing</TableHeader>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading && currentVisitors.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <Spinner label="Loading visitor tracking records…" />
                                        </td>
                                    </tr>
                                ) : hasVisitors ? (
                                    currentVisitors.map((row) => {
                                        const isInactiveRow = !row.isUserActive;

                                        return (
                                            <tr
                                                key={row.sessionId}
                                                className={
                                                    `group transition-colors ` +
                                                    (isInactiveRow
                                                        ? 'opacity-60'
                                                        : 'hover:bg-surface-hover')
                                                }
                                                aria-rowindex={row.rowIndex ?? undefined}
                                            >
                                                <TableCell>
                                                    <UserCell
                                                        name={row.name}
                                                        email={row.email}
                                                        userId={row.userId}
                                                        avatar={row.avatar}
                                                        isInactive={isInactiveRow}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <StatusCell
                                                        active={row.isUserActive}
                                                        sessionActive={row.isSessionActive}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <PresenceCell
                                                        presence={row.presence}
                                                        lastActivity={row.lastActivity}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <LocationCell
                                                        countryCode={row.country}
                                                        city={row.city}
                                                        isInactive={isInactiveRow}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <NetworkCell
                                                        ipAddress={row.ipAddress}
                                                        deviceInfo={row.deviceInfo}
                                                        copiedIp={copiedIp}
                                                        onCopyIp={() => copyToClipboard(row.ipAddress)}
                                                        isInactive={isInactiveRow}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TimingCell
                                                        createdAt={row.createdAt}
                                                        lastActivity={row.lastActivity}
                                                        expiresAt={row.expiresAt}
                                                        isInactive={isInactiveRow}
                                                    />
                                                </TableCell>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-16">
                                            {currentVisitors.length === 0 && !loading && !error ? (
                                                <EmptyState
                                                    icon={<Users size={22} />}
                                                    title="No visitor sessions found"
                                                    hint={search
                                                        ? null
                                                        : 'Use the search above to filter, or refresh to load the latest sessions.'}
                                                >
                                                    {search ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSearch('');
                                                                setPage(1);
                                                            }}
                                                            className={buttonBase + ' ' + btnVariants.secondary + ' ' + btnSizes.sm + ' mt-2'}
                                                        >
                                                            <X size={14} />
                                                            Clear search &ldquo;{search}&rdquo;
                                                        </button>
                                                    ) : null}
                                                </EmptyState>
                                            ) : null}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.pages > 1 ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                            <p className="text-xs text-muted">
                                Showing{' '}
                                <span className="font-semibold tabular-nums text-foreground">
                                    {(pagination.page - 1) * 20 + 1}–{Math.min(pagination.page * 20, pagination.total)}
                                </span>
                                {' '}of{' '}
                                <span className="font-semibold tabular-nums text-foreground">{pagination.total}</span>
                                {' '}sessions · Page {pagination.page} of {pagination.pages}
                            </p>
                            <nav aria-label="Session table pagination" className="flex gap-2">
                                <PageButton
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={pagination.page <= 1}
                                    aria-label="Previous page of sessions"
                                >
                                    Previous
                                </PageButton>
                                <PageButton
                                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                                    disabled={pagination.page >= pagination.pages}
                                    aria-label="Next page of sessions"
                                >
                                    Next
                                </PageButton>
                            </nav>
                        </div>
                    ) : null}
                </section>

                {/* Clear logs confirmation */}
                {clearConfirm ? (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="clear-logs-title"
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
                    >
                        <div className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-modal p-6">
                            <h2
                                id="clear-logs-title"
                                className="text-base font-semibold text-foreground"
                            >
                                Clear inactive visitor logs?
                            </h2>
                            <p className="text-sm text-muted mt-2">
                                This removes ended and inactive session tracking logs for all users.
                                Logged-in users with active sessions are not affected.
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setClearConfirm(false)}
                                    className={buttonBase + ' ' + btnVariants.secondary + ' ' + btnSizes.sm}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearLogs}
                                    disabled={clearing}
                                    className={buttonBase + ' ' + btnVariants.danger + ' ' + btnSizes.sm}
                                >
                                    {clearing ? 'Clearing…' : 'Clear logs'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </AdminLayout>
    );
}

const CardWithIcon = ({ icon, tone = 'primary', label, value, live = false }) => {
    const toneMap = {
        primary: { bg: 'bg-primary-soft', text: 'text-primary', border: 'border-primary/20' },
        success: { bg: 'bg-success-soft', text: 'text-success', border: 'border-success/20' },
        info: { bg: 'bg-info-soft', text: 'text-info', border: 'border-info/20' },
        accent: { bg: 'bg-primary-soft', text: 'text-primary', border: 'border-primary/20' },
    };
    const t = toneMap[tone] || toneMap.primary;

    return (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {label}
                </span>
                {icon && (
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${t.bg} ${t.text} ${t.border}`}>
                        {icon}
                    </div>
                )}
            </div>
            <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                    {value ?? 0}
                </span>
                {live && (
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                )}
            </div>
        </div>
    );
};

const Panel = ({ children }) => (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
        {children}
    </div>
);

const PanelHeader = ({ icon, title }) => (
    <div className="flex items-center gap-2 mb-4">
        <span className="text-muted" aria-hidden="true">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
);

const PanelBody = ({ children }) => <div className="space-y-3">{children}</div>;

const ListItem = ({ children }) => {
    const arr = React.Children.toArray(children);
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
                <div>{arr[0]}</div>
                <div>{arr[1]}</div>
            </div>
            {arr[2]}
        </div>
    );
};

const ListItemLabel = ({ children }) => <span className="text-sm text-secondary">{children}</span>;

const ListItemValue = ({ count, percentage }) => (
    <span className="text-sm font-semibold tabular-nums text-foreground">
        {count}
        <span className="text-xs font-normal text-muted ml-1">({percentage}%)</span>
    </span>
);

const BarTrack = ({ percentage, fill = 'primary', minPercent = 5 }) => {
    const fillCls = fill === 'success' ? 'bg-success' : 'bg-primary';
    return (
        <div className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden">
            <div
                className={`${fillCls} h-full rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(percentage || 0, minPercent)}%` }}
                aria-hidden="true"
            />
        </div>
    );
};

const EmptyState = ({ icon, title, hint, children }) => (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <span className="text-muted" aria-hidden="true">{icon}</span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {hint && (
            <p className="text-xs text-muted">{hint}</p>
        )}
        {children}
    </div>
);

const buttonBase =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

const btnVariants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
    secondary: 'bg-surface text-foreground border border-border hover:bg-surface-hover active:bg-surface-elevated',
    danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white border border-danger/20 active:bg-danger/90',
};

const btnSizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
};

const PageButton = ({ onClick, disabled, children, 'aria-label': ariaLabel }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-surface text-foreground hover:bg-surface-hover active:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
        {children}
    </button>
);

const BadgeVariant = Object.freeze({
    neutral: { bg: 'bg-surface-elevated', text: 'text-muted', border: 'border-border' },
    success: { bg: 'bg-success-soft', text: 'text-success', border: 'border-success/20' },
    warning: { bg: 'bg-warning-soft', text: 'text-warning', border: 'border-warning/20' },
    danger: { bg: 'bg-danger-soft', text: 'text-danger', border: 'border-danger/20' },
    primary: { bg: 'bg-primary-soft', text: 'text-primary', border: 'border-primary/20' },
    accent: { bg: 'bg-primary-soft', text: 'text-primary', border: 'border-primary/20' },
    info: { bg: 'bg-info-soft', text: 'text-info', border: 'border-info/20' },
});

function badgeClassesFor(tone) {
    const v = BadgeVariant[tone] || BadgeVariant.neutral;
    return `${v.bg} ${v.text} ${v.border}`;
}

function badgeShape() {
    return 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border';
}

function badgeFor(tone, label) {
    return (
        <span className={`${badgeShape()} ${badgeClassesFor(tone)}`}>
            {label}
        </span>
    );
}

const Badge = ({ tone = 'neutral', children }) => badgeFor(tone, children);

const Spinner = ({ label = 'Loading…' }) => (
    <div className="flex flex-col items-center justify-center gap-2 py-4" role="status">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <span className="text-xs text-muted font-medium">{label}</span>
    </div>
);

const TableHeader = ({ children }) => (
    <th
        scope="col"
        className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
    >
        {children}
    </th>
);

const TableCell = ({ children, className = '' }) => (
    <td className={`px-5 py-3.5 text-sm ${className}`}>{children}</td>
);

const UserCell = ({ name, email, userId, avatar, isInactive }) => (
    <div className="flex items-center gap-3">
        <div
            className={`shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center text-background font-semibold text-sm
                shadow-xs ${isInactive ? 'opacity-70' : ''}`}
            aria-hidden="true"
        >
            {avatar ? (
                <img
                    src={avatar}
                    alt={`${name || 'User'} avatar`}
                    className="w-full h-full rounded-full object-cover"
                />
            ) : (
                String(name || 'U').charAt(0).toUpperCase()
            )}
        </div>
        <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
                {userId ? (
                    <Link
                        href={`/admin/users/${userId}`}
                        className="font-semibold text-foreground hover:text-primary underline-offset-2 underline transition-colors"
                    >
                        {name}
                    </Link>
                ) : (
                    <span className="font-semibold text-foreground">{name}</span>
                )}
                {isInactive && (
                    <Badge tone="neutral">Inactive</Badge>
                )}
            </div>
            <div className="text-xs text-muted mt-0.5 truncate" title={email || ''}>
                {(email || '—')} {userId ? `· #${userId}` : '· Guest'}
            </div>
        </div>
    </div>
);

const StatusCell = ({ active, sessionActive }) => {
    const accountTone = active ? 'success' : 'danger';
    const accountLabel = active ? 'Active' : 'Inactive';
    const sessionTone = sessionActive ? 'success' : 'neutral';
    const sessionLabel = sessionActive ? 'Active' : 'Ended';

    return (
        <div>
            {badgeFor(accountTone, accountLabel)}
            <div className="text-xs text-muted mt-1">
                Session:{' '}
                <span className={sessionTone === 'neutral' ? 'text-muted' : `text-${sessionTone}`}>
                    {sessionLabel}
                </span>
            </div>
        </div>
    );
};

const PresenceCell = ({ presence, lastActivity }) => {
    const tone =
        presence === 'Online'
            ? 'success'
            : presence === 'RecentlyActive'
                ? 'warning'
                : 'neutral';
    const label =
        presence === 'Online'
            ? 'Online'
            : presence === 'RecentlyActive'
                ? 'Recently Active'
                : 'Idle';

    return (
        <div className="mt-1">
            {badgeFor(tone, label)}
            <div className="text-xs text-muted mt-1">Last activity {formatRelativeTime(lastActivity)}</div>
        </div>
    );
};

const LocationCell = ({ countryCode, city, isInactive }) => (
    <div className={isInactive ? 'opacity-70' : ''}>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span aria-hidden="true">{flagEmojiFor(countryCode, '🌐')}</span>
            <span>{locationLabelFor(countryCode)}</span>
        </div>
        {city && (
            <div className="text-xs text-muted mt-0.5 truncate" title={city}>{city}</div>
        )}
    </div>
);

const NetworkCell = ({ ipAddress, deviceInfo, copiedIp, onCopyIp, isInactive }) => (
    <div>
        <div className="flex items-center gap-2">
            <span
                className="inline-flex items-center gap-1.5
                    text-xs font-mono bg-info-soft text-info px-2 py-0.5 rounded-md border border-info/20"
            >
                {ipAddress || '—'}
            </span>
            <button
                type="button"
                onClick={onCopyIp}
                disabled={!ipAddress}
                aria-label={`Copy IP address ${ipAddress || ''}`}
                aria-pressed={copiedIp === ipAddress}
                title={copiedIp === ipAddress ? 'Copied' : 'Copy IP address'}
                className="inline-flex items-center gap-1
                    text-xs font-medium text-muted
                    hover:text-primary
                    hover:bg-surface-hover active:bg-surface-elevated
                    rounded-md px-1.5 py-0.5 transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                    disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {copiedIp === ipAddress ? <Check size={13} /> : <Copy size={13} aria-hidden="true" />}
                {copiedIp === ipAddress ? 'Copied' : 'Copy'}
            </button>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-secondary flex-wrap">
            {deviceIconFor(deviceInfo)}
            <span>{deviceLabelFor(deviceInfo)}</span>
        </div>
        {deviceInfo && (
            <div
                className="text-[11px] text-muted truncate mt-0.5"
                title={deviceInfo}
            >
                {deviceInfo}
            </div>
        )}
    </div>
);

const TimingCell = ({ createdAt, lastActivity, expiresAt, isInactive }) => (
    <div className={isInactive ? 'opacity-70' : ''}>
        <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs">
                <span className="text-secondary font-medium" aria-label="Last activity">Last:</span>
                <span className="text-foreground tabular-nums">
                    {lastActivity ? new Date(lastActivity).toLocaleTimeString() : '—'}
                </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
                <span className="text-secondary font-medium" aria-hidden="true">Started:</span>
                <span className="text-foreground">
                    {new Date(createdAt).toLocaleDateString()}
                </span>
            </div>
            {expiresAt && (
                <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-secondary font-medium" aria-hidden="true">Expires:</span>
                    <span className="text-foreground">
                        {new Date(expiresAt).toLocaleDateString()}
                    </span>
                </div>
            )}
        </div>
    </div>
);
