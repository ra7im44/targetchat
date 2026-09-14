import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import Link from 'next/link';

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
    const [displayName, setDisplayName] = useState('there');

    useEffect(() => {
        // Hydrate after mount (SSR-safe: reading storage during render breaks hydration)
        try {
            const u = JSON.parse(window.localStorage.getItem('tc_user') || 'null');
            setDisplayName(u?.name || u?.email?.split('@')[0] || 'there');
        } catch (e) {}
        fetchData();
    }, []);

    async function fetchData() {
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
        }
    }

    // Custom SVG Area Chart
    const Chart = ({ data }) => {
        if (!data || data.length === 0) return (
            <div className="h-32 flex items-center justify-center text-gray-500 dark:text-muted text-sm">No chart data</div>
        );
        const max = Math.max(...data.map(d => d.count), 5); // Minimum scale of 5
        const span = data.length > 1 ? (data.length - 1) : 1;
        const xOf = (i) => (data.length > 1 ? (i / span) * 100 : 50);
        const points = data.map((d, i) => {
            const x = xOf(i);
            const y = 100 - (d.count / max) * 100;
            return `${x},${y}`;
        }).join(' ');

        const areaPath = `M0,100 L0,${100 - (data[0].count / max) * 100} ${points.split(' ').map((p, i) => `L${p}`).join(' ')} L100,100 Z`;

        return (
            <div className="w-full h-44 relative group">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible preserve-3d">
                    <defs>
                        <linearGradient id="msgVolume" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {[25, 50, 75].map((y) => (
                        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" strokeWidth="0.3" className="text-border" />
                    ))}
                    <path d={areaPath} fill="url(#msgVolume)" />
                    <polyline fill="none" stroke="var(--primary)" strokeWidth="1.5" points={points} vectorEffect="non-scaling-stroke" />

                    {/* Tooltip circles */}
                    {data.map((d, i) => {
                        const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
                        const y = 100 - (d.count / max) * 100;
                        return (
                            <circle key={i} cx={x} cy={y} r="1.5" fill="var(--bg-surface)" stroke="var(--primary)" strokeWidth="1" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        );
                    })}
                </svg>
                {/* X-Axis Labels */}
                <div className="flex justify-between mt-2 text-[10px] text-text-muted">
                    {data.map((d, i) => (
                        <span key={i}>{d.date}</span>
                    ))}
                </div>
            </div>
        );
    };

    const Stat = ({ value, label }) => (
        <div className="flex items-baseline gap-2.5">
            <span className="text-[2rem] leading-none font-semibold tracking-tight tabular-nums text-foreground">{value ?? 0}</span>
            <span className="text-[13px] text-text-muted">{label}</span>
        </div>
    );

    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '??';

    return (
        <DashboardLayout title="Overview">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        Welcome back, {displayName}
                    </h1>
                    <p className="text-sm text-text-muted mt-1.5">
                        Here is what needs your attention for {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.
                    </p>
                </div>
                <div className="flex gap-2.5">
                    <Link href="/widgets/new" className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold text-sm transition-colors shadow-sm">
                        + New Widget
                    </Link>
                    <Link href="/leads" className="px-4 py-2.5 bg-surface text-foreground border border-border rounded-lg font-semibold text-sm hover:bg-surface-hover transition-colors">
                        View Leads
                    </Link>
                </div>
            </div>

            {/* Status strip */}
            <div className="border-y border-border mb-10 py-5 flex flex-wrap items-baseline gap-x-10 gap-y-4">
                <Stat value={stats.activeChats} label="Active chats" />
                <Stat value={stats.messagesThisMonth} label="Messages this month" />
                <Stat value={stats.widgets} label="Widgets" />
                <Stat value={stats.totalLeads} label="Total leads" />
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

                {/* Left Column (Signal + Queue) */}
                <div className="lg:col-span-3 space-y-10">

                    {/* Message volume */}
                    <section>
                        <div className="flex items-baseline justify-between mb-4">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Message volume</h2>
                                <p className="text-[13px] text-text-muted mt-0.5">Last 7 days</p>
                            </div>
                            <span className="text-xs text-text-muted tabular-nums">
                                {(stats.dailyStats || []).reduce((s, d) => s + (d.count || 0), 0)} total
                            </span>
                        </div>
                        <Chart data={stats.dailyStats || []} />
                    </section>

                    {/* Recent Leads */}
                    <section>
                        <div className="flex items-baseline justify-between mb-2">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Recent leads</h2>
                                <p className="text-[13px] text-text-muted mt-0.5">Latest potential customers</p>
                            </div>
                            <Link href="/leads" className="text-[13px] font-semibold text-primary hover:underline">View all →</Link>
                        </div>
                        <div className="overflow-x-auto -mx-1 px-1">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="py-3 pr-6 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">User</th>
                                        <th className="py-3 pr-6 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Source</th>
                                        <th className="py-3 pr-6 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Status</th>
                                        <th className="py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {lists.recentLeads.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="py-10 text-center text-sm text-text-muted">No leads found yet.</td>
                                        </tr>
                                    ) : (
                                        lists.recentLeads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-surface-hover transition-colors">
                                                <td className="py-4 pr-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 flex-shrink-0 rounded-full bg-surface-elevated flex items-center justify-center text-text-secondary font-semibold text-xs border border-border">
                                                            {getInitials(lead.name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-foreground truncate">{lead.name || 'Anonymous'}</div>
                                                            <div className="text-[13px] text-text-muted truncate">{lead.email || 'No email'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-6 whitespace-nowrap text-sm text-text-secondary">
                                                    TargetChat Widget
                                                </td>
                                                <td className="py-4 pr-6 whitespace-nowrap text-[13px] font-medium text-text-muted">
                                                    New
                                                </td>
                                                <td className="py-4 whitespace-nowrap text-right text-[13px] text-text-muted tabular-nums">
                                                    {new Date(lead.createdAt || lead.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Right Rail (Activity + Widgets) */}
                <div className="lg:col-span-2 space-y-10">

                    {/* Live Activity Feed */}
                    <section>
                        <h2 className="text-base font-semibold text-foreground mb-5">Live activity</h2>
                        <div className="relative border-l border-border ml-1.5 space-y-6 pl-6">
                            {activity.length === 0 ? (
                                <p className="text-sm text-text-muted">No recent activity.</p>
                            ) : (
                                activity.slice(0, 5).map((log, idx) => (
                                    <div key={log.id} className="relative">
                                        <div className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-surface-elevated border border-border'}`}></div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground leading-snug">{log.action}</p>
                                            <p className="text-xs text-text-muted mt-0.5 tabular-nums">
                                                {new Date(log.createdAt || log.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Widget Status List */}
                    <section>
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-base font-semibold text-foreground">Your widgets</h2>
                            <Link href="/widgets" className="text-[13px] font-semibold text-primary hover:underline">Manage all</Link>
                        </div>
                        <div className="divide-y divide-border border-y border-border">
                            {lists.widgets.length === 0 ? (
                                <p className="text-sm text-text-muted py-6">No widgets.</p>
                            ) : (
                                lists.widgets.map(w => (
                                    <div key={w.id} className="flex items-center justify-between gap-3 py-3.5 cursor-pointer group hover:bg-surface-hover px-2 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                            <div className="w-9 h-9 rounded-lg bg-surface-elevated flex items-center justify-center text-text-secondary text-[11px] font-bold shrink-0 border border-border">
                                                {w.slug.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="truncate min-w-0">
                                                <div className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{w.name}</div>
                                                <div className="text-xs text-text-muted truncate font-mono">{w.slug}.targetchat.ai</div>
                                            </div>
                                        </div>
                                        <span className={`text-[11px] font-semibold uppercase tracking-wider shrink-0 ${w.status === 'active' || !w.status ? 'text-success' : 'text-text-muted'}`}>
                                            {w.status || 'Active'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                </div>
            </div>
        </DashboardLayout>
    );
}
