import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import { countryName, countryFlag, parseDevice } from '../../../utils/deviceHelper';
import { User, Globe, Smartphone, CalendarDays, Clock, MessageSquare, Send, ScrollText, Key, Settings } from 'lucide-react';

import { API_URL as API } from '../../../utils/apiConfig';

export default function UserDetailsPage() {
    const router = useRouter();
    const { id } = router.query;
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, activity, tokens

    useEffect(() => {
        if (!id) return;
        fetchUserDetails();
    }, [id]);

    async function fetchUserDetails() {
        const token = localStorage.getItem('tc_token');
        try {
            setLoading(true);
            const [userRes, statsRes, logsRes] = await Promise.all([
                fetch(`${API}/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/api/admin/users/${id}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/api/admin/users/${id}/logs`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (userRes.ok) {
                const userData = await userRes.json();
                setUser(userData); // Changed from userData.user
            }
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
            if (logsRes.ok) {
                const logsData = await logsRes.json();
                setLogs(logsData);
            }
        } catch (err) {
            console.error('Error fetching user details:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!user) {
        return (
            <AdminLayout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-secondary">User not found</h2>
                    <button
                        onClick={() => router.push('/admin/users')}
                        className="mt-4 px-4 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover transition"
                    >
                        Back to Users
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
                {/* Header / Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-muted mb-4">
                    <button onClick={() => router.push('/admin/users')} className="hover:text-accent transition-colors">Users</button>
                    <span>/</span>
                    <span className="font-semibold text-gray-900 dark:text-foreground">{user.name}</span>
                </div>

                {/* Profile Header Card */}
                <div className="glass-panel p-8 rounded-card flex flex-col md:flex-row items-center md:items-start gap-8 border border-white/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-32 bg-accent/20 md:h-full md:w-1/3 opacity-50 blur-3xl -z-10"></div>

                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-surface-elevated flex items-center justify-center text-5xl md:text-6xl shadow-lg ring-4 ring-white/50 dark:ring-white/10">
                        {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : <User size={48} />}
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground">{user.name}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-blue-100 text-info dark:bg-blue-900/30 dark:text-info border border-blue-200 dark:border-blue-800'
                                }`}>
                                {user.role}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-gray-100 text-gray-600 dark:bg-surface dark:text-muted border border-gray-200 dark:border-border'
                                }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-lg text-gray-500 dark:text-muted font-mono">{user.email}</p>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2 text-xs">
                            <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-secondary bg-gray-100 dark:bg-surface px-2.5 py-1 rounded-lg">
                                {countryName(user.country)} {user.city ? `· ${user.city}` : ''}
                            </span>
                            <span className="font-mono bg-blue-50 dark:bg-blue-900/30 text-info dark:text-info px-2.5 py-1 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                                <Globe size={16} /> <code>{user.lastIp || 'No IP'}</code>
                            </span>
                            <span className="bg-gray-100 dark:bg-surface px-2.5 py-1 rounded-lg text-gray-600 dark:text-secondary">
                                <Smartphone size={16} /> {parseDevice(user.deviceInfo)}
                            </span>
                            <span className="text-gray-500 dark:text-muted" title={new Date(user.created_at || user.createdAt).toLocaleString()}>
                                <CalendarDays size={16} /> Joined {new Date(user.created_at || user.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-gray-500 dark:text-muted">
                                <Clock size={16} /> Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="px-5 py-2.5 rounded-lg bg-accent text-background font-semibold hover:bg-accent-hover transition-colors">
                            Edit Profile
                        </button>
                        <button className="p-2.5 rounded-xl border border-gray-200 dark:border-border text-gray-500 hover:bg-gray-50 dark:hover:bg-surface-hover transition-all">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-200 dark:border-border">
                    {['overview', 'activity', 'tokens'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-semibold capitalize transition-all relative ${activeTab === tab
                                ? 'text-accent dark:text-info'
                                : 'text-gray-500 dark:text-muted hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent dark:bg-blue-400 rounded-t-full"></span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="animate-fadeIn">
                    {activeTab === 'overview' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Stats */}
                            <div className="col-span-2 grid grid-cols-2 gap-6">
                                <div className="glass-panel p-6 rounded-card border border-white/10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-2xl text-orange-600">
                                        <MessageSquare size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-muted uppercase font-bold tracking-wider">Total Chats</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-foreground">{stats?.chats || 0}</p>
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-card border border-white/10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-2xl text-purple-600">
                                        <Send size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-muted uppercase font-bold tracking-wider">Messages</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-foreground">{stats?.messages || 0}</p>
                                    </div>
                                </div>
                            </div>

                            {/* System Info */}
                            <div className="glass-panel p-6 rounded-card border border-white/10 space-y-4">
                                <h3 className="font-bold text-gray-900 dark:text-foreground">System Information</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">User ID</span>
                                        <span className="font-mono text-gray-900 dark:text-secondary">{user.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Role</span>
                                        <span className="font-mono text-gray-900 dark:text-secondary">{user.role}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Status</span>
                                        <span className="font-mono text-gray-900 dark:text-secondary">{user.isActive ? 'Active' : 'Disabled'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Location</span>
                                        <span className="text-gray-900 dark:text-secondary">{countryName(user.country)} {user.city ? `· ${user.city}` : ''}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Device</span>
                                        <span className="text-gray-900 dark:text-secondary">{parseDevice(user.deviceInfo)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Reg. IP</span>
                                        <span className="font-mono text-gray-900 dark:text-secondary">{user.registrationIp || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Last IP</span>
                                        <span className="font-mono text-gray-900 dark:text-secondary">{user.lastIp || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Recorded Sessions */}
                        {user.recentSessions && user.recentSessions.length > 0 && (
                            <div className="mt-6 glass-panel p-6 rounded-card border border-white/10 space-y-4">
                                <h3 className="font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                                    <Globe size={18} /> Recent User Sessions (سجلات الجلسات)
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-border">
                                            <tr>
                                                <th className="py-2.5">Network IP</th>
                                                <th className="py-2.5">Location</th>
                                                <th className="py-2.5">Device & Browser</th>
                                                <th className="py-2.5">Last Activity</th>
                                                <th className="py-2.5">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {user.recentSessions.map(sess => (
                                                <tr key={sess.id}>
                                                    <td className="py-3 font-mono text-xs text-accent dark:text-info">
                                                        <code>{sess.ipAddress || '127.0.0.1'}</code>
                                                    </td>
                                                    <td className="py-3">
                                                        {countryName(sess.country)} {sess.city ? `· ${sess.city}` : ''}
                                                    </td>
                                                    <td className="py-3 text-gray-600 dark:text-secondary">
                                                        {parseDevice(sess.deviceInfo)}
                                                    </td>
                                                    <td className="py-3 text-xs text-gray-500">
                                                        {new Date(sess.lastActivity || sess.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${sess.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600'}`}>
                                                            {sess.isActive ? 'Active' : 'Ended'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        </>
                    )}

                    {activeTab === 'activity' && (
                        <div className="space-y-4">
                            {!logs ? (
                                <div className="text-center py-10 text-gray-500">Loading activity...</div>
                            ) : logs.length === 0 ? (
                                <div className="glass-panel p-12 rounded-card text-center border-dashed border-2 border-gray-200 dark:border-border">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                        <ScrollText size={18} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-foreground">No Activity Found</h3>
                                    <p className="text-gray-500 dark:text-muted">This user hasn't performed any logged actions yet.</p>
                                </div>
                            ) : (
                                <div className="glass-panel overflow-hidden rounded-card border border-white/20">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-border">
                                            <tr>
                                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-secondary">Action</th>
                                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-secondary">Details</th>
                                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-secondary">IP Address</th>
                                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-secondary">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="p-4">
                                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${log.action === 'LOGIN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                            log.action === 'DELETE_USER' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                                'bg-blue-100 text-info dark:bg-blue-900/30 dark:text-info'
                                                            }`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 dark:text-secondary font-mono">
                                                        {JSON.stringify(log.details)}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-500 dark:text-muted">
                                                        {log.ip_address || 'N/A'}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-500 dark:text-muted">
                                                        {new Date(log.created_at || log.createdAt).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'tokens' && (
                        <div className="glass-panel p-12 rounded-card text-center border-dashed border-2 border-gray-200 dark:border-border">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                <Key size={18} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-foreground">API Tokens</h3>
                            <p className="text-gray-500 dark:text-muted max-w-md mx-auto mt-2">
                                No active API tokens found for this user.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
