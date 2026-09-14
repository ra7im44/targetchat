import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import {
    Navigation, Users, Activity, Clock, Globe,
    Search, RefreshCw, Trash2, Copy, Check,
    Laptop, Smartphone, Monitor, Apple, Shield, ArrowRight, CheckCircle, AlertCircle
} from 'lucide-react';
import { countryName, countryFlag, parseDevice } from '../../utils/deviceHelper';

import { API_URL as API, getToken } from '../../utils/apiConfig';

export default function VisitorsTrackingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [copiedIp, setCopiedIp] = useState(null);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        if (!router.isReady) return;
        fetchVisitorsData();
    }, [router.isReady, page, search]);

    async function fetchVisitorsData() {
        const token = getToken();
        if (!token) return router.replace('/login');

        try {
            setLoading(true);
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

            if (res.ok) {
                const resData = await res.json();
                setData(resData);
            }
        } catch (err) {
            console.error('Error fetching visitor sessions:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleClearLogs() {
        if (!confirm('Are you sure you want to clear ended/inactive session tracking logs?')) return;
        const token = getToken();
        try {
            setClearing(true);
            const res = await fetch(`${API}/api/admin/visitors/clear`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                await fetchVisitorsData();
            }
        } catch (err) {
            console.error('Failed to clear logs:', err);
        } finally {
            setClearing(false);
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        setCopiedIp(text);
        setTimeout(() => setCopiedIp(null), 2000);
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

    return (
        <AdminLayout title="Session Tracking">
            <div className="space-y-8 animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground flex items-center gap-3">
                            <Navigation size={18} className="text-accent" />
                            Session Tracking & User Intelligence
                        </h1>
                        <p className="text-gray-500 dark:text-muted mt-1">
                            Comprehensive user location, IP addresses, device analytics, and live presence sessions.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchVisitorsData}
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-surface text-gray-700 dark:text-secondary hover:bg-gray-50 dark:hover:bg-surface-hover transition shadow-sm"
                            title="Refresh Data"
                            aria-label="Refresh visitor data"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleClearLogs}
                            disabled={clearing}
                            className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/30 transition text-sm flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            <span>{clearing ? 'Clearing...' : 'Clear Inactive'}</span>
                        </button>
                    </div>
                </div>

                {/* KPI Counters (Matching U-Axis SPA) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Active Logged Users */}
                    <div className="bg-white dark:bg-surface p-6 rounded-card shadow-sm border border-blue-100 dark:border-blue-900/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-blue-500">
                            <Users size={18} />
                        </div>
                        <div className="relative z-10">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl w-fit mb-4 text-accent dark:text-info">
                                <Users size={18} />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-1">
                                {data?.activeLoggedUsers ?? 0}
                            </h3>
                            <p className="text-sm font-semibold text-gray-500 dark:text-muted">Users with Active Sessions</p>
                        </div>
                    </div>

                    {/* Active Last 5 Min */}
                    <div className="bg-white dark:bg-surface p-6 rounded-card shadow-sm border border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-emerald-500">
                            <Activity size={18} />
                        </div>
                        <div className="relative z-10">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl w-fit mb-4 text-emerald-600 dark:text-emerald-400">
                                <Activity size={18} />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-1 flex items-center gap-2">
                                <span>{data?.activeLast5Minutes ?? 0}</span>
                                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                            </h3>
                            <p className="text-sm font-semibold text-gray-500 dark:text-muted">Active (Last 5 min) Real-time</p>
                        </div>
                    </div>

                    {/* Active Today */}
                    <div className="bg-white dark:bg-surface p-6 rounded-card shadow-sm border border-purple-100 dark:border-purple-900/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-purple-500">
                            <Clock size={18} />
                        </div>
                        <div className="relative z-10">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl w-fit mb-4 text-purple-600 dark:text-purple-400">
                                <Clock size={18} />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-1">
                                {data?.totalToday ?? 0}
                            </h3>
                            <p className="text-sm font-semibold text-gray-500 dark:text-muted">Active Today</p>
                        </div>
                    </div>
                </div>

                {/* Summaries: Top Locations & Top Devices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Locations */}
                    <div className="bg-white dark:bg-surface p-6 rounded-card shadow-sm border border-gray-100 dark:border-border">
                        <h3 className="text-base font-bold text-gray-900 dark:text-foreground mb-4 flex items-center gap-2">
                            <Globe size={18} /> Top Locations & Countries
                        </h3>
                        <div className="space-y-3">
                            {data?.topCountries && data.topCountries.length > 0 ? (
                                data.topCountries.map((item) => (
                                    <div key={item.country} className="space-y-1">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-800 dark:text-secondary flex items-center gap-2">
                                                <span>{countryFlag(item.country)}</span>
                                                <span>{countryName(item.country)}</span>
                                            </span>
                                            <span className="font-bold text-gray-600 dark:text-muted">
                                                {item.count} <span className="text-xs text-gray-400 font-normal">({item.percentage}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-surface-elevated h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-accent h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.max(item.percentage, 5)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No country data recorded yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Top Devices */}
                    <div className="bg-white dark:bg-surface p-6 rounded-card shadow-sm border border-gray-100 dark:border-border">
                        <h3 className="text-base font-bold text-gray-900 dark:text-foreground mb-4 flex items-center gap-2">
                            <Smartphone size={18} /> Top Devices & Operating Systems
                        </h3>
                        <div className="space-y-3">
                            {data?.topDevices && data.topDevices.length > 0 ? (
                                data.topDevices.map((item) => (
                                    <div key={item.device} className="space-y-1">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-800 dark:text-secondary flex items-center gap-2">
                                                {item.device.toLowerCase().includes('windows') ? <Laptop size={16} /> : item.device.toLowerCase().includes('mac') ? <Apple size={16} /> : item.device.toLowerCase().includes('ios') || item.device.toLowerCase().includes('android') ? <Smartphone size={16} /> : <Monitor size={16} />}
                                                <span>{item.device}</span>
                                            </span>
                                            <span className="font-bold text-gray-600 dark:text-muted">
                                                {item.count} <span className="text-xs text-gray-400 font-normal">({item.percentage}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-surface-elevated h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-success h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.max(item.percentage, 5)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No device data recorded yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="bg-white dark:bg-surface p-4 rounded-card flex flex-col md:flex-row gap-4 items-center shadow-sm border border-gray-100 dark:border-border">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} />
                        <input
                            type="text"
                            placeholder="Search IP, device, user name, email, country, or city..."
                            aria-label="Search visitors by IP, device, user, or location"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-background border border-gray-200 dark:border-border focus:ring-2 focus:ring-accent/50 outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-border text-gray-600 dark:text-muted font-bold hover:bg-gray-50 dark:hover:bg-surface-hover text-sm"
                        >
                            Reset
                        </button>
                    )}
                </div>

                {/* Visitors Sessions Table */}
                <div className="bg-white dark:bg-surface rounded-card overflow-hidden shadow-sm border border-gray-100 dark:border-border">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 dark:bg-surface-elevated border-b border-gray-100 dark:border-border">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-muted uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-muted uppercase tracking-wider">Account State</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-muted uppercase tracking-wider">Presence</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-muted uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-muted uppercase tracking-wider">Network / Device</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-muted uppercase tracking-wider">Session Timing</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {data?.latestVisitors && data.latestVisitors.length > 0 ? (
                                    data.latestVisitors.map((row) => {
                                        return (
                                            <tr key={row.sessionId} className="hover:bg-gray-50 dark:hover:bg-surface-hover/30 transition-colors">
                                                {/* User Info */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
                                                            {row.avatar ? (
                                                                <img src={row.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                                            ) : (
                                                                (row.name || 'U')[0].toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            {row.userId ? (
                                                                <Link
                                                                    href={`/admin/users/${row.userId}`}
                                                                    className="font-bold text-gray-900 dark:text-foreground hover:text-accent transition-colors"
                                                                >
                                                                    {row.name}
                                                                </Link>
                                                            ) : (
                                                                <span className="font-bold text-gray-900 dark:text-foreground">{row.name}</span>
                                                            )}
                                                            <div className="text-xs text-gray-500 dark:text-muted">
                                                                {row.email || 'No email'} · #{row.userId ?? 'Guest'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Account State */}
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.isUserActive
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                                        }`}>
                                                        {row.isUserActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Session: <span className={row.isSessionActive ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>{row.isSessionActive ? 'Active' : 'Ended'}</span>
                                                    </div>
                                                </td>

                                                {/* Presence */}
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${row.presence === 'Online'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                        : row.presence === 'RecentlyActive'
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-surface-elevated dark:text-muted'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${row.presence === 'Online' ? 'bg-emerald-500 animate-pulse' : row.presence === 'RecentlyActive' ? 'bg-amber-500' : 'bg-gray-400'}`}></span>
                                                        {row.presence === 'Online' ? 'Online' : row.presence === 'RecentlyActive' ? 'Recently Active' : 'Idle'}
                                                    </span>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        Activity: {formatRelativeTime(row.lastActivity)}
                                                    </div>
                                                </td>

                                                {/* Location */}
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900 dark:text-foreground flex items-center gap-1.5 text-sm">
                                                        <span>{countryFlag(row.country)}</span>
                                                        <span>{countryName(row.country)}</span>
                                                    </div>
                                                    {row.city && (
                                                        <div className="text-xs text-gray-500 dark:text-muted mt-0.5">
                                                            {row.city}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Network / Device */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-xs font-mono bg-blue-50 dark:bg-blue-900/30 text-info dark:text-info px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
                                                            {row.ipAddress}
                                                        </code>
                                                        <button
                                                            onClick={() => copyToClipboard(row.ipAddress)}
                                                            className="text-gray-400 hover:text-accent transition"
                                                            title="Copy IP"
                                                            aria-label={`Copy IP address ${row.ipAddress}`}
                                                        >
                                                            {copiedIp === row.ipAddress ? <Check size={16} /> : <Copy size={16} />}
                                                        </button>
                                                    </div>
                                                    <div className="text-xs text-gray-600 dark:text-secondary mt-1 font-medium flex items-center gap-1.5">
                                                        <Smartphone size={16} />
                                                        <span>{parseDevice(row.deviceInfo)}</span>
                                                    </div>
                                                    {row.deviceInfo && (
                                                        <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5" title={row.deviceInfo}>
                                                            {row.deviceInfo}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Session Timing */}
                                                <td className="px-6 py-4 text-xs text-gray-500 dark:text-muted space-y-0.5">
                                                    <div><span className="font-semibold text-gray-600 dark:text-secondary">Last:</span> {new Date(row.lastActivity || row.createdAt).toLocaleTimeString()}</div>
                                                    <div><span className="font-semibold text-gray-600 dark:text-secondary">Started:</span> {new Date(row.createdAt).toLocaleDateString()}</div>
                                                    <div><span className="font-semibold text-gray-600 dark:text-secondary">Expires:</span> {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : '—'}</div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-muted">
                                            {loading ? 'Loading visitor tracking records...' : 'No visitor sessions found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data?.pagination && data.pagination.pages > 1 && (
                        <div className="px-6 py-4 bg-gray-50/50 dark:bg-surface-elevated border-t border-gray-100 dark:border-border flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total sessions)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={data.pagination.page <= 1}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-surface-hover transition"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                                    disabled={data.pagination.page >= data.pagination.pages}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-surface-hover transition"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
