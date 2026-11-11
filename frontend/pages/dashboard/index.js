import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import AdminChart from '../../components/admin/AdminChart';
import Link from 'next/link';
import {
    MessageSquareCode,
    Zap,
    AppWindow,
    Users,
    ArrowRight,
    Plus,
    Activity,
    CalendarDays,
    RotateCw
} from 'lucide-react';

import { API_URL as API, getToken } from '../../utils/apiConfig';

export default function DashboardHome() {
    const [stats, setStats] = useState({
        widgets: 0,
        activeChats: 0,
        totalLeads: 0,
        messagesThisMonth: 0,
        dailyStats: []
    });
    const [lists, setLists] = useState({
        recentLeads: [],
        widgets: []
    });
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [displayName, setDisplayName] = useState('there');

    useEffect(() => {
        try {
            const u = JSON.parse(window.localStorage.getItem('tc_user') || 'null');
            setDisplayName(u?.name || u?.email?.split('@')[0] || 'there');
        } catch (e) {}
        fetchData();
    }, []);

    async function fetchData(isManual = false) {
        if (isManual) setRefreshing(true);
        try {
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [statsRes, listsRes, activityRes] = await Promise.all([
                fetch(`${API}/api/dashboard/stats`, { headers }),
                fetch(`${API}/api/dashboard/lists`, { headers }),
                fetch(`${API}/api/dashboard/activity`, { headers })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (listsRes.ok) setLists(await listsRes.json());
            if (activityRes.ok) {
                const data = await activityRes.json();
                setActivity(data.activities || []);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
            if (isManual) setRefreshing(false);
        }
    }

    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '??';

    const chartData = (stats.dailyStats && stats.dailyStats.length > 0)
        ? stats.dailyStats
        : Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { weekday: 'short' }),
            count: 0
        }));

    const total7dMessages = chartData.reduce((acc, curr) => acc + (curr.count || 0), 0);
    const avgDailyMessages = Math.round(total7dMessages / (chartData.length || 1));
    const peakMessages = Math.max(...chartData.map(c => c.count || 0), 0);

    return (
        <DashboardLayout title="Overview">
            <div className="space-y-8 animate-fadeIn">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                Welcome back, {displayName}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success border border-success/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                                Live
                            </span>
                        </div>
                        <p className="text-sm text-muted mt-1">
                            Here is an overview of what needs your attention for {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-surface-hover active:bg-surface-secondary text-secondary hover:text-foreground border border-border rounded-button text-xs font-semibold transition-all shadow-2xs"
                            title="Refresh Data"
                        >
                            <RotateCw size={14} className={refreshing ? 'animate-spin text-primary' : ''} />
                            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                        <Link
                            href="/leads"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-hover text-foreground border border-border rounded-button text-xs font-semibold transition-all shadow-2xs"
                        >
                            <Users size={14} />
                            <span>View Leads</span>
                        </Link>
                        <Link
                            href="/widgets/new"
                            className="group inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-button text-xs font-semibold shadow-xs transition-all"
                        >
                            <Plus size={15} />
                            <span>New Widget</span>
                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Active Chats */}
                    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs hover:border-border-strong hover:shadow-raise transition-all duration-200 group flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted group-hover:text-secondary transition-colors">
                                Active Chats
                            </span>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-primary-soft text-primary border-primary/20 transition-transform duration-200 group-hover:scale-105">
                                <MessageSquareCode size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                                {stats.activeChats ?? 0}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted mt-1.5">
                                {Boolean(stats.activeChats > 0) && (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                                    </span>
                                )}
                                <span className={stats.activeChats > 0 ? 'text-success font-medium' : 'text-muted'}>
                                    {stats.activeChats > 0 ? 'Active conversations' : 'No active sessions'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Messages this Month */}
                    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs hover:border-border-strong hover:shadow-raise transition-all duration-200 group flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted group-hover:text-secondary transition-colors">
                                Messages This Month
                            </span>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-info-soft text-info border-info/20 transition-transform duration-200 group-hover:scale-105">
                                <Zap size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                                {stats.messagesThisMonth ?? 0}
                            </div>
                            <p className="text-xs text-muted mt-1.5">
                                Total message throughput
                            </p>
                        </div>
                    </div>

                    {/* Widgets */}
                    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs hover:border-border-strong hover:shadow-raise transition-all duration-200 group flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted group-hover:text-secondary transition-colors">
                                Deployed Widgets
                            </span>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-warning-soft text-warning border-warning/20 transition-transform duration-200 group-hover:scale-105">
                                <AppWindow size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                                {stats.widgets ?? 0}
                            </div>
                            <p className="text-xs text-muted mt-1.5">
                                Active customer touchpoints
                            </p>
                        </div>
                    </div>

                    {/* Total Leads */}
                    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs hover:border-border-strong hover:shadow-raise transition-all duration-200 group flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted group-hover:text-secondary transition-colors">
                                Total Leads
                            </span>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-success-soft text-success border-success/20 transition-transform duration-200 group-hover:scale-105">
                                <Users size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                                {stats.totalLeads ?? 0}
                            </div>
                            <p className="text-xs text-muted mt-1.5">
                                Prospective clients captured
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Column (Message Volume & Recent Leads) */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Message volume card */}
                        <div className="bg-surface rounded-xl p-6 border border-border shadow-xs">
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-foreground">Message Volume</h2>
                                    <p className="text-xs text-muted mt-0.5">Traffic trends across your chat widgets</p>
                                </div>
                                <span
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-2.5 py-1 text-xs font-semibold text-secondary"
                                >
                                    <CalendarDays size={13} aria-hidden="true" />
                                    Last 7 days
                                </span>
                            </div>

                            {/* Summary Metrics Row */}
                            <div className="grid grid-cols-3 gap-3 p-3 mb-4 rounded-xl bg-surface-elevated/40 border border-border/60">
                                <div>
                                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">7-Day Volume</span>
                                    <div className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {total7dMessages} <span className="text-xs font-normal text-muted">msgs</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Daily Average</span>
                                    <div className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {avgDailyMessages} <span className="text-xs font-normal text-muted">msgs/d</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Peak Volume</span>
                                    <div className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {peakMessages} <span className="text-xs font-normal text-muted">peak</span>
                                    </div>
                                </div>
                            </div>

                            <AdminChart data={chartData} tone="primary" unitLabel="messages" />
                        </div>

                        {/* Recent Leads card */}
                        <div className="bg-surface rounded-xl p-6 border border-border shadow-xs">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-base font-bold text-foreground">Recent Leads</h2>
                                    <p className="text-xs text-muted mt-0.5">Prospects captured from your chat widgets</p>
                                </div>
                                <Link
                                    href="/leads"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline group"
                                >
                                    <span>View all</span>
                                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </div>

                            {lists.recentLeads.length === 0 ? (
                                <div className="py-10 text-center flex flex-col items-center justify-center">
                                    <div className="w-11 h-11 rounded-2xl bg-surface-elevated text-muted flex items-center justify-center mb-3 border border-border">
                                        <Users size={20} />
                                    </div>
                                    <h4 className="text-sm font-semibold text-foreground">No leads captured yet</h4>
                                    <p className="text-xs text-muted max-w-sm mt-1 mb-4">
                                        When visitors interact with your deployed widgets and provide contact information, they will appear here.
                                    </p>
                                    <Link
                                        href="/widgets"
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-soft hover:bg-primary/20 text-primary rounded-button text-xs font-semibold transition-colors"
                                    >
                                        <AppWindow size={13} />
                                        <span>Check Widgets</span>
                                    </Link>
                                </div>
                            ) : (
                                <div className="overflow-x-auto -mx-2 px-2">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
                                                <th className="pb-3 pr-4">User</th>
                                                <th className="pb-3 pr-4">Channel</th>
                                                <th className="pb-3 pr-4">Status</th>
                                                <th className="pb-3 text-right">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {lists.recentLeads.map((lead) => (
                                                <tr key={lead.id} className="hover:bg-surface-hover/60 transition-colors">
                                                    <td className="py-3.5 pr-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-primary-soft text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                                                                {getInitials(lead.name)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-semibold text-foreground truncate">{lead.name || 'Anonymous Visitor'}</div>
                                                                <div className="text-[11px] text-muted truncate">{lead.email || 'No email provided'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 pr-4 whitespace-nowrap">
                                                        <span className="text-xs text-secondary font-medium">Widget Form</span>
                                                    </td>
                                                    <td className="py-3.5 pr-4 whitespace-nowrap">
                                                        <span className="text-[11px] font-semibold text-success bg-success-soft border border-success/20 px-2 py-0.5 rounded-full">
                                                            New Lead
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 whitespace-nowrap text-right text-xs text-muted tabular-nums">
                                                        {new Date(lead.createdAt || lead.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column (Live Activity & Widgets) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Live Activity Feed Card */}
                        <div className="bg-surface rounded-xl p-6 border border-border shadow-xs">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <Activity size={17} className="text-primary" />
                                    Live Activity
                                </h2>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-soft text-success border border-success/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                                    Real-time
                                </span>
                            </div>

                            <div className="relative pl-4 space-y-5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                                {activity.length === 0 ? (
                                    <div className="text-center text-muted py-8 text-xs">
                                        No recent activity recorded
                                    </div>
                                ) : (
                                    activity.slice(0, 5).map((log, idx) => (
                                        <div key={log.id || idx} className="relative pl-5">
                                            <div className="absolute left-0 top-1.5 w-3 h-3 bg-surface border-2 border-primary rounded-full z-10"></div>
                                            <div>
                                                <p className="text-xs font-semibold text-foreground leading-snug">
                                                    {log.action}
                                                </p>
                                                <p className="text-[11px] text-muted mt-0.5 tabular-nums">
                                                    {new Date(log.createdAt || log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Active Widgets Card */}
                        <div className="bg-surface rounded-xl p-6 border border-border shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <AppWindow size={17} className="text-warning" />
                                    Your Widgets
                                </h2>
                                <Link
                                    href="/widgets"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline group"
                                >
                                    <span>Manage all</span>
                                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </div>

                            <div className="space-y-2.5 mb-4">
                                {lists.widgets.length === 0 ? (
                                    <div className="text-center py-6">
                                        <p className="text-xs text-muted mb-3">No widgets created yet.</p>
                                        <Link
                                            href="/widgets/new"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-button text-xs font-semibold shadow-xs"
                                        >
                                            <Plus size={13} />
                                            <span>Create Widget</span>
                                        </Link>
                                    </div>
                                ) : (
                                    lists.widgets.map((w) => (
                                        <div
                                            key={w.id}
                                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-elevated/40 hover:bg-surface-hover border border-border/60 hover:border-border-strong transition-all group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                                                    {w.slug ? w.slug.substring(0, 2).toUpperCase() : 'W'}
                                                </div>
                                                <div className="truncate min-w-0">
                                                    <div className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                                        {w.name}
                                                    </div>
                                                    <div className="text-[11px] text-muted truncate font-mono flex items-center gap-1">
                                                        <span>{w.slug}.targetchat.ai</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success-soft text-success border border-success/20 shrink-0">
                                                Active
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Link
                                href="/widgets/new"
                                className="flex items-center justify-center gap-1.5 w-full py-2 bg-surface-elevated hover:bg-surface-hover border border-border border-dashed rounded-lg text-xs font-semibold text-secondary hover:text-foreground transition-all"
                            >
                                <Plus size={13} />
                                <span>Create New Widget</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
