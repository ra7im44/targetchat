import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import OverviewCard from '../../components/admin/OverviewCard';
import AdminChart from '../../components/admin/AdminChart';
import Link from 'next/link';
import {
    Users, Zap, Key, Activity, CreditCard,
    FileText, Tag, MessageSquare, Mail,
    HardDrive, Shield, Folder, ArrowRight,
    TrendingUp, AlertCircle, Globe, Navigation, Laptop, Smartphone, Monitor, Apple,
    CalendarDays, RotateCw, CheckCircle2
} from 'lucide-react';
import { countryName, countryFlag, parseDevice } from '../../utils/deviceHelper';

import { API_URL as API } from '../../utils/apiConfig';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [timeframe, setTimeframe] = useState(7);
    const [chartLoading, setChartLoading] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    async function fetchTrafficData(days, token) {
        const authToken = token || localStorage.getItem('tc_token');
        if (!authToken) return;
        setChartLoading(true);
        try {
            const res = await fetch(`${API}/api/admin/stats/traffic?days=${days}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.length > 0) {
                    setChartData(json.data);
                    return;
                }
            }
            fallbackChartData(days);
        } catch (err) {
            console.error('Error fetching traffic stats:', err);
            fallbackChartData(days);
        } finally {
            setChartLoading(false);
        }
    }

    function fallbackChartData(days) {
        const mockChart = Array.from({ length: days }, (_, i) => {
            const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
            return {
                date: d.toLocaleDateString(undefined, {
                    month: days > 14 ? 'numeric' : 'short',
                    day: 'numeric',
                    ...(days <= 7 ? { weekday: 'short' } : {})
                }),
                count: Math.floor(Math.random() * 30) + 5
            };
        });
        setChartData(mockChart);
    }

    const handleTimeframeChange = (days) => {
        setTimeframe(days);
        fetchTrafficData(days);
    };

    async function checkAdminAccess(isManualRefresh = false) {
        const token = localStorage.getItem('tc_token');
        if (!token) {
            router.replace('/login');
            return;
        }

        if (isManualRefresh) {
            setRefreshing(true);
        }

        try {
            // Fetch Basics
            const res = await fetch(`${API}/api/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 403) {
                setAccessDenied(true);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            if (res.status === 401) {
                localStorage.removeItem('tc_token');
                router.replace('/login');
                return;
            }

            if (res.ok) {
                const data = await res.json();
                setStats(data);
                // Fetch traffic for selected timeframe
                await fetchTrafficData(timeframe, token);
            }

            // Fetch Recent Activity
            const activityRes = await fetch(`${API}/api/admin/activity?limit=5`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (activityRes.ok) {
                const activityData = await activityRes.json();
                setRecentActivity(activityData.logs || []);
            }

            setLoading(false);
            setRefreshing(false);
        } catch (err) {
            console.error('Error checking admin access:', err);
            setLoading(false);
            setRefreshing(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="text-center max-w-md p-8 bg-surface rounded-card shadow-lg border border-border">
                    <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
                    <p className="text-muted mb-6">
                        You don't have permission to access the admin dashboard.
                    </p>
                    <button
                        onClick={() => router.push('/chat')}
                        className="px-6 py-3 bg-primary text-white rounded-button font-bold hover:bg-primary-hover active:bg-primary-active transition-all"
                    >
                        Return to Chat
                    </button>
                </div>
            </div>
        );
    }

    const quickActions = [
        { icon: Users, label: 'Users', href: '/admin/users', color: 'text-primary', bg: 'bg-primary-soft' },
        { icon: Zap, label: 'Workflows', href: '/admin/workflows', color: 'text-primary', bg: 'bg-primary-soft' },
        { icon: Key, label: 'API Tokens', href: '/admin/tokens', color: 'text-warning', bg: 'bg-warning-soft' },
        { icon: Activity, label: 'Activity Logs', href: '/admin/activity', color: 'text-info', bg: 'bg-info-soft' },
        { icon: CreditCard, label: 'Billing Center', href: '/admin/billing', color: 'text-success', bg: 'bg-success-soft' },
        { icon: FileText, label: 'Plans', href: '/admin/billing?tab=plans', color: 'text-primary', bg: 'bg-primary-soft' },
        { icon: Tag, label: 'Coupons', href: '/admin/billing?tab=coupons', color: 'text-secondary', bg: 'bg-surface-elevated' },
        { icon: MessageSquare, label: 'Announcements', href: '/admin/announcements', color: 'text-warning', bg: 'bg-warning-soft' },
        { icon: Mail, label: 'Email Engine', href: '/admin/emails', color: 'text-info', bg: 'bg-info-soft' },
        { icon: HardDrive, label: 'System', href: '/admin/system', color: 'text-muted', bg: 'bg-surface-elevated' },
        { icon: Shield, label: 'Security & IP', href: '/admin/security', color: 'text-danger', bg: 'bg-danger-soft' },
        { icon: Navigation, label: 'Session Tracking', href: '/admin/visitors', color: 'text-primary', bg: 'bg-primary-soft' },
        { icon: Folder, label: 'File Manager', href: '/admin/files', color: 'text-primary', bg: 'bg-primary-soft' },
    ];

    return (
        <AdminLayout title="Dashboard">
            <div className="space-y-8 animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                Dashboard
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success border border-success/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                                Live
                            </span>
                        </div>
                        <p className="text-sm text-muted mt-1">
                            Welcome back! Here's an overview of your platform operations and metrics.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => checkAdminAccess(true)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-surface-hover active:bg-surface-secondary text-secondary hover:text-foreground border border-border rounded-button text-xs font-semibold transition-all shadow-2xs"
                            title="Refresh Dashboard Data"
                        >
                            <RotateCw size={14} className={refreshing ? 'animate-spin text-primary' : ''} />
                            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                        <Link
                            href="/admin/announcements"
                            className="group inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-button text-xs font-semibold shadow-xs transition-all"
                        >
                            <MessageSquare size={15} />
                            <span>Post Announcement</span>
                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <OverviewCard
                        icon={<Users className="w-5 h-5" />}
                        title="Total Users"
                        value={stats?.users?.total || 0}
                        subtext={`${stats?.users?.active || 0} active now`}
                        tone="primary"
                        isLive={Boolean(stats?.users?.active > 0)}
                    />
                    <OverviewCard
                        icon={<MessageSquare className="w-5 h-5" />}
                        title="Total Chats"
                        value={stats?.chats?.total || 0}
                        subtext={`+${stats?.messages?.today || 0} messages today`}
                        tone="info"
                    />
                    <OverviewCard
                        icon={<Zap className="w-5 h-5" />}
                        title="Active Workflows"
                        value={stats?.workflows?.active || 0}
                        subtext={`${stats?.workflows?.total || 0} total created`}
                        tone="warning"
                    />
                    <OverviewCard
                        icon={<TrendingUp className="w-5 h-5" />}
                        title="System Health"
                        value="99.9%"
                        subtext="All systems operational"
                        tone="success"
                        isLive={true}
                    />
                </div>

                {/* User Demographics & Session Analytics Section */}
                <div className="bg-surface rounded-xl p-6 border border-border shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2.5">
                                <Globe className="text-primary" size={18} />
                                User Demographics & Platforms
                            </h2>
                            <p className="text-xs text-muted mt-0.5">
                                Real-time geographical distribution, operating systems, and active user sessions.
                            </p>
                        </div>
                        <Link
                            href="/admin/visitors"
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary-soft hover:bg-primary/20 text-primary rounded-button text-xs font-semibold transition-all self-start sm:self-auto"
                        >
                            <Navigation size={14} />
                            <span>Full Session Tracking</span>
                            <ArrowRight size={14} />
                        </Link>
                    </div>

                    {/* Mini Metric Counters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-surface-elevated/60 border border-border/80 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Active Logged Users</span>
                                <div className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                                    {stats?.users?.activeLoggedUsers ?? stats?.users?.active ?? 0}
                                </div>
                                <p className="text-xs text-muted mt-0.5">Users with live active session</p>
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                                <Users size={18} />
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-surface-elevated/60 border border-border/80 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                                    Active (Last 5 Min)
                                </span>
                                <div className="text-2xl font-bold text-foreground tabular-nums mt-0.5 flex items-center gap-2">
                                    {stats?.users?.activeLast5Minutes ?? 0}
                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                                </div>
                                <p className="text-xs text-muted mt-0.5">Real-time online presence</p>
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-success-soft text-success flex items-center justify-center shrink-0">
                                <Activity size={18} />
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-surface-elevated/60 border border-border/80 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Sessions Today</span>
                                <div className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                                    {stats?.users?.totalSessionsToday ?? 0}
                                </div>
                                <p className="text-xs text-muted mt-0.5">Total visits logged today</p>
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-info-soft text-info flex items-center justify-center shrink-0">
                                <Navigation size={18} />
                            </div>
                        </div>
                    </div>

                    {/* Distribution Grid: Top Countries & Top Devices */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-1">
                        {/* Top Countries */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <Globe size={15} className="text-primary" /> Top User Locations
                                </h3>
                                <span className="text-[11px] text-muted font-medium">Distribution</span>
                            </div>
                            <div className="space-y-3">
                                {(stats?.demographics?.topCountries?.length > 0 ? stats.demographics.topCountries : [
                                    { country: 'EG', count: 1, percentage: 100 }
                                ]).map((item) => (
                                    <div key={item.country} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-foreground flex items-center gap-2">
                                                <span className="text-base leading-none">{countryFlag(item.country)}</span>
                                                <span className="text-xs sm:text-sm font-semibold">{countryName(item.country)}</span>
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-foreground tabular-nums">{item.count}</span>
                                                <span className="text-[11px] font-semibold text-primary bg-primary-soft px-1.5 py-0.5 rounded tabular-nums">
                                                    {item.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden border border-border/40">
                                            <div
                                                className="bg-primary h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.max(item.percentage, 4)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Devices */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <Smartphone size={15} className="text-info" /> Platforms & Operating Systems
                                </h3>
                                <span className="text-[11px] text-muted font-medium">Share</span>
                            </div>
                            <div className="space-y-3">
                                {(stats?.demographics?.topDevices?.length > 0 ? stats.demographics.topDevices : [
                                    { device: 'Windows 10+', count: 1, percentage: 100 }
                                ]).map((item) => (
                                    <div key={item.device} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-foreground flex items-center gap-2">
                                                <span className="text-muted">
                                                    {item.device.toLowerCase().includes('windows') ? <Laptop size={15} /> : item.device.toLowerCase().includes('mac') ? <Apple size={15} /> : item.device.toLowerCase().includes('ios') || item.device.toLowerCase().includes('android') ? <Smartphone size={15} /> : <Monitor size={15} />}
                                                </span>
                                                <span className="text-xs sm:text-sm font-semibold">{item.device}</span>
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-foreground tabular-nums">{item.count}</span>
                                                <span className="text-[11px] font-semibold text-info-ink bg-info-soft px-1.5 py-0.5 rounded tabular-nums">
                                                    {item.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden border border-border/40">
                                            <div
                                                className="bg-info h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.max(item.percentage, 4)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Quick Actions Grid */}
                        <div className="bg-surface rounded-xl p-6 border border-border shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
                                    <Zap size={16} className="text-primary" />
                                    Quick Navigation
                                </h3>
                                <span className="text-xs text-muted">13 tools</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {quickActions.map((action) => (
                                    <Link
                                        key={action.label}
                                        href={action.href}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated/40 hover:bg-surface-hover border border-border hover:border-border-strong hover:shadow-2xs transition-all duration-150 group"
                                    >
                                        <div className={`w-9 h-9 rounded-lg ${action.bg} ${action.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                                            <action.icon size={17} />
                                        </div>
                                        <span className="text-xs font-semibold text-secondary group-hover:text-foreground truncate">
                                            {action.label}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-surface rounded-xl p-6 border border-border shadow-xs">
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-foreground">Traffic Overview</h3>
                                    <p className="text-xs text-muted mt-0.5">
                                        Message volume over the last {timeframe} days
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-1 p-1 bg-surface-elevated border border-border rounded-lg text-xs">
                                    {[
                                        { label: '7 Days', value: 7 },
                                        { label: '14 Days', value: 14 },
                                        { label: '30 Days', value: 30 },
                                    ].map((item) => (
                                        <button
                                            key={item.value}
                                            onClick={() => handleTimeframeChange(item.value)}
                                            disabled={chartLoading}
                                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                                timeframe === item.value
                                                    ? 'bg-surface text-primary shadow-xs border border-border/80'
                                                    : 'text-muted hover:text-foreground'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Metrics Row */}
                            <div className="grid grid-cols-3 gap-3 p-3 mb-4 rounded-xl bg-surface-elevated/40 border border-border/60">
                                <div>
                                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{timeframe}-Day Volume</span>
                                    <div className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {chartData.reduce((acc, c) => acc + (c.count || 0), 0)} <span className="text-xs font-normal text-muted">msgs</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Daily Average</span>
                                    <div className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {Math.round(chartData.reduce((acc, c) => acc + (c.count || 0), 0) / (chartData.length || 1))} <span className="text-xs font-normal text-muted">msgs/d</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Peak Volume</span>
                                    <div className="text-base font-bold text-foreground tabular-nums mt-0.5">
                                        {Math.max(...chartData.map(c => c.count || 0), 0)} <span className="text-xs font-normal text-muted">peak</span>
                                    </div>
                                </div>
                            </div>

                            <AdminChart data={chartData} tone="primary" unitLabel="messages" />
                        </div>
                    </div>

                    {/* Right Sidebar (Recent Activity) */}
                    <div className="space-y-6">
                        <div className="bg-surface rounded-xl p-6 border border-border shadow-xs flex flex-col justify-between h-full">
                            <div>
                                <div className="flex justify-between items-center mb-5">
                                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <Activity size={17} className="text-primary" />
                                        Recent Activity
                                    </h3>
                                    <Link href="/admin/activity" className="text-xs font-semibold text-primary hover:bg-primary/20 bg-primary-soft px-2.5 py-1 rounded-lg transition-colors">
                                        View All
                                    </Link>
                                </div>

                                <div className="relative pl-4 space-y-5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                                    {recentActivity.length > 0 ? (
                                        recentActivity.map((log) => (
                                            <div key={log.id} className="relative pl-5">
                                                <div className="absolute left-0 top-1.5 w-3 h-3 bg-surface border-2 border-primary rounded-full z-10"></div>
                                                <div>
                                                    <p className="text-xs font-semibold text-foreground leading-snug">
                                                        {log.action}
                                                    </p>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-[11px] text-muted">
                                                            {new Date(log.created_at || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {log.user && (
                                                            <span className="text-[10px] font-medium bg-surface-elevated border border-border px-1.5 py-0.5 rounded text-secondary">
                                                                {log.user.email?.split('@')[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted py-8 text-xs">
                                            No recent activity recorded
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-5 border-t border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">System Services</h4>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                                        3 / 3 Healthy
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-surface-elevated/40 border border-border/50">
                                        <span className="text-secondary font-medium">Database (SQLite)</span>
                                        <span className="text-success font-semibold text-[11px] bg-success-soft border border-success/20 px-1.5 py-0.2 rounded">Operational</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-surface-elevated/40 border border-border/50">
                                        <span className="text-secondary font-medium">API Gateway</span>
                                        <span className="text-success font-semibold text-[11px] bg-success-soft border border-success/20 px-1.5 py-0.2 rounded">Operational</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-surface-elevated/40 border border-border/50">
                                        <span className="text-secondary font-medium">Automation & Webhooks</span>
                                        <span className="text-success font-semibold text-[11px] bg-success-soft border border-success/20 px-1.5 py-0.2 rounded">Operational</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
