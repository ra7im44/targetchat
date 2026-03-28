import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import Link from 'next/link';

import { API_URL as API } from '../../utils/apiConfig';

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

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const token = localStorage.getItem('tc_token');
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
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No chart data</div>
        );
        const max = Math.max(...data.map(d => d.count), 5); // Minimum scale of 5
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (d.count / max) * 100;
            return `${x},${y}`;
        }).join(' ');

        // If single point (shouldn't happen with 7 day loop but safety check)
        if (data.length === 1) return null;

        const areaPath = `M0,100 L0,${100 - (data[0].count / max) * 100} ${points.split(' ').map((p, i) => `L${p}`).join(' ')} L100,100 Z`;

        return (
            <div className="w-full h-32 relative group">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible preserve-3d">
                    <defs>
                        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#gradient)" className="transition-all duration-500 ease-in-out" />
                    <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" className="transition-all duration-500 ease-in-out" />

                    {/* Tooltip circles */}
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * 100;
                        const y = 100 - (d.count / max) * 100;
                        return (
                            <circle key={i} cx={x} cy={y} r="2" fill="#fff" stroke="#6366f1" strokeWidth="1" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        );
                    })}
                </svg>
                {/* X-Axis Labels */}
                <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                    {data.map((d, i) => (
                        <span key={i}>{d.date}</span>
                    ))}
                </div>
            </div>
        );
    };

    const OverviewCard = ({ title, value, subtext, icon, gradient }) => (
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-lg transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`}></div>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-indigo-500/20`}>
                        {icon}
                    </div>
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">{value}</h3>
                <p className="text-sm font-medium text-gray-400 dark:text-gray-500">{title}</p>
                {/* Tiny sparkline bar */}
                <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${gradient} w-2/3 rounded-full opacity-50`}></div>
                </div>
            </div>
        </div>
    );

    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '??';

    return (
        <DashboardLayout title="Overview">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Welcome back, Admin <span className="animate-wave inline-block">👋</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Here's your performance overview for {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/widgets/new" className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-gray-200 dark:shadow-none">
                        + New Widget
                    </Link>
                    <Link href="/leads" className="px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        View Leads
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <OverviewCard
                    title="Total Widgets"
                    value={stats.widgets}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    gradient="from-blue-500 to-indigo-600"
                />
                <OverviewCard
                    title="Active Chats"
                    value={stats.activeChats}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                    gradient="from-emerald-500 to-teal-600"
                />
                <OverviewCard
                    title="Total Leads"
                    value={stats.totalLeads}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    gradient="from-violet-500 to-purple-600"
                />
                <OverviewCard
                    title="Messages (Mo)"
                    value={stats.messagesThisMonth}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                    gradient="from-orange-500 to-rose-600"
                />
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column (Analytics + Activity) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Analytics Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Message Activity</h3>
                                <p className="text-sm text-gray-500">Last 7 Days volume</p>
                            </div>
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold dark:bg-indigo-900/30 dark:text-indigo-400">Weekly View</span>
                        </div>
                        <Chart data={stats.dailyStats || []} />
                    </div>

                    {/* Recent Leads Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Leads</h3>
                                <p className="text-sm text-gray-500">Latest potential customers</p>
                            </div>
                            <Link href="/leads" className="text-sm text-indigo-600 hover:text-indigo-700 font-bold">View All Leads →</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 dark:bg-gray-700/30">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                                        <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Source</th>
                                        <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-8 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {lists.recentLeads.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-10 text-center text-gray-500 text-sm">No leads found yet.</td>
                                        </tr>
                                    ) : (
                                        lists.recentLeads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-8 py-5 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                            {getInitials(lead.name)}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{lead.name || 'Anonymous'}</div>
                                                            <div className="text-sm text-gray-500">{lead.email || 'No email'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-medium">
                                                    TargetChat Widget
                                                </td>
                                                <td className="px-8 py-5 whitespace-nowrap">
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800 border border-green-200">
                                                        New
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 whitespace-nowrap text-right text-sm text-gray-500 font-medium">
                                                    {new Date(lead.createdAt || lead.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column (Widgets & Activity) */}
                <div className="space-y-8">

                    {/* Live Activity Feed */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Live Activity</h3>
                        <div className="relative border-l-2 border-dashed border-gray-200 dark:border-gray-700 ml-3 space-y-8 pl-8">
                            {activity.length === 0 ? (
                                <p className="text-gray-500 text-sm">No recent activity.</p>
                            ) : (
                                activity.slice(0, 5).map((log, idx) => (
                                    <div key={log.id} className="relative">
                                        <div className={`absolute -left-[41px] top-1 h-6 w-6 rounded-full border-2 border-white dark:border-gray-800 ${idx === 0 ? 'bg-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-900/30' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.action}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(log.createdAt || log.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Widget Status List */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Widgets</h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            {lists.widgets.length === 0 ? (
                                <p className="text-sm text-gray-500">No widgets.</p>
                            ) : (
                                lists.widgets.map(w => (
                                    <div key={w.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-gray-500 dark:text-white text-xs font-bold">
                                                {w.slug.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="truncate">
                                                <div className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{w.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{w.slug}.targetchat.ai</div>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${w.status === 'active'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                            {w.status || 'Active'}
                                        </span>
                                    </div>
                                ))
                            )}
                            <Link href="/widgets" className="block w-full py-3 mt-4 text-center text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 transition-colors">
                                Manage All Widgets
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
