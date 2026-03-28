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
    TrendingUp, AlertCircle
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    async function checkAdminAccess() {
        const token = localStorage.getItem('tc_token');
        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            // Fetch Basics
            const res = await fetch(`${API}/api/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 403) {
                setAccessDenied(true);
                setLoading(false);
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

                // Mock Chart Data
                const mockChart = Array.from({ length: 7 }, (_, i) => ({
                    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { weekday: 'short' }),
                    count: Math.floor(Math.random() * 50) + (data.messages?.today || 10)
                }));
                setChartData(mockChart);
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
        } catch (err) {
            console.error('Error checking admin access:', err);
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        You don't have permission to access the admin dashboard.
                    </p>
                    <button
                        onClick={() => router.push('/chat')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                    >
                        Return to Chat
                    </button>
                </div>
            </div>
        );
    }

    const quickActions = [
        { icon: Users, label: 'Users', href: '/admin/users', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { icon: Zap, label: 'Workflows', href: '/admin/workflows', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { icon: Key, label: 'API Tokens', href: '/admin/tokens', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { icon: Activity, label: 'Activity Logs', href: '/admin/activity', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
        { icon: CreditCard, label: 'Billing Center', href: '/admin/billing', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        { icon: FileText, label: 'Plans', href: '/admin/billing?tab=plans', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { icon: Tag, label: 'Coupons', href: '/admin/billing?tab=coupons', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
        { icon: MessageSquare, label: 'Announcements', href: '/admin/announcements', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
        { icon: Mail, label: 'Email Logs', href: '/admin/emails', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
        { icon: HardDrive, label: 'System', href: '/admin/system', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
        { icon: Shield, label: 'Security', href: '/admin/security', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
        { icon: Folder, label: 'Files', href: '/admin/files', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    ];

    return (
        <AdminLayout title="Dashboard">
            <div className="space-y-8 animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            Dashboard <span className="text-2xl animate-pulse">⚡</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Welcome back! Here's what's happening today.
                        </p>
                    </div>
                    <Link
                        href="/admin/announcements"
                        className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all"
                    >
                        <MessageSquare size={18} />
                        <span>Post Announcement</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <OverviewCard
                        icon={<Users className="w-6 h-6" />}
                        title="Total Users"
                        value={stats?.users?.total || 0}
                        subtext={`${stats?.users?.active || 0} active now`}
                        gradient="from-blue-500 to-blue-600"
                    />
                    <OverviewCard
                        icon={<MessageSquare className="w-6 h-6" />}
                        title="Total Chats"
                        value={stats?.chats?.total || 0}
                        subtext={`+${stats?.messages?.today || 0} messages today`}
                        gradient="from-purple-500 to-purple-600"
                    />
                    <OverviewCard
                        icon={<Zap className="w-6 h-6" />}
                        title="Active Workflows"
                        value={stats?.workflows?.active || 0}
                        subtext={`${stats?.workflows?.total || 0} total created`}
                        gradient="from-amber-500 to-orange-600"
                    />
                    <OverviewCard
                        icon={<TrendingUp className="w-6 h-6" />}
                        title="System Health"
                        value="98.9%"
                        subtext="All systems operational"
                        gradient="from-emerald-500 to-emerald-600"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Main Content Area (Quick Actions & Chart) */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Quick Actions Grid */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Zap size={20} className="text-amber-500" />
                                Quick Actions
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {quickActions.map((action) => (
                                    <Link
                                        key={action.label}
                                        href={action.href}
                                        className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-600 transition-all group text-center"
                                    >
                                        <div className={`w-12 h-12 rounded-xl ${action.bg} ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                            <action.icon size={24} />
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                            {action.label}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Traffic Overview</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Message volume over the last 7 days</p>
                                </div>
                                <select className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm px-3 py-1 outline-none text-gray-700 dark:text-gray-200">
                                    <option>Last 7 Days</option>
                                    <option>Last 30 Days</option>
                                </select>
                            </div>
                            <AdminChart data={chartData} color="#3b82f6" />
                        </div>
                    </div>

                    {/* Right Sidebar (Recent Activity) */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Activity size={20} className="text-blue-500" />
                                    Recent Activity
                                </h3>
                                <Link href="/admin/activity" className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                                    View All
                                </Link>
                            </div>

                            <div className="relative pl-4 space-y-6 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-700">
                                {recentActivity.length > 0 ? (
                                    recentActivity.map((log) => (
                                        <div key={log.id} className="relative pl-6">
                                            <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-full z-10"></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                                                    {log.action}
                                                </p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(log.created_at || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {log.user && (
                                                        <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                                            {log.user.email?.split('@')[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 py-8">
                                        No recent activity
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">System Status</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Database</span>
                                        <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded text-xs font-bold">Operational</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">API Gateway</span>
                                        <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded text-xs font-bold">Operational</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Email Service</span>
                                        <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded text-xs font-bold">Operational</span>
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
