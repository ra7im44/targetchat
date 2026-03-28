import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">User not found</h2>
                    <button
                        onClick={() => router.push('/admin/users')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <button onClick={() => router.push('/admin/users')} className="hover:text-blue-500 transition-colors">Users</button>
                    <span>/</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{user.name}</span>
                </div>

                {/* Profile Header Card */}
                <div className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row items-center md:items-start gap-8 border border-white/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 md:h-full md:w-1/3 opacity-50 blur-3xl -z-10"></div>

                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center text-5xl md:text-6xl shadow-xl ring-4 ring-white/50 dark:ring-white/10">
                        {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : '👤'}
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{user.name}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                }`}>
                                {user.role}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-lg text-gray-500 dark:text-gray-400 font-mono">{user.email}</p>
                        <div className="flex items-center justify-center md:justify-start gap-6 pt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span title={new Date(user.createdAt).toLocaleString()}>
                                📅 Joined {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                            <span>
                                🕒 Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95">
                            Edit Profile
                        </button>
                        <button className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                            ⚙️
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800">
                    {['overview', 'activity', 'tokens'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-semibold capitalize transition-all relative ${activeTab === tab
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="animate-fadeIn">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Stats */}
                            <div className="col-span-2 grid grid-cols-2 gap-6">
                                <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-2xl text-orange-600">
                                        💬
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total Chats</p>
                                        <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats?.chats || 0}</p>
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-2xl text-purple-600">
                                        📨
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Messages</p>
                                        <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats?.messages || 0}</p>
                                    </div>
                                </div>
                            </div>

                            {/* System Info */}
                            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                                <h3 className="font-bold text-gray-900 dark:text-white">System Information</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">User ID</span>
                                        <span className="font-mono text-gray-900 dark:text-gray-200">{user.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Role</span>
                                        <span className="font-mono text-gray-900 dark:text-gray-200">{user.role}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Status</span>
                                        <span className="font-mono text-gray-900 dark:text-gray-200">{user.isActive ? 'Active' : 'Disabled'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Reg. IP</span>
                                        <span className="font-mono text-gray-900 dark:text-gray-200">{user.registrationIp || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Last IP</span>
                                        <span className="font-mono text-gray-900 dark:text-gray-200">{user.lastIp || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="space-y-4">
                            {!logs ? (
                                <div className="text-center py-10 text-gray-500">Loading activity...</div>
                            ) : logs.length === 0 ? (
                                <div className="glass-panel p-12 rounded-2xl text-center border-dashed border-2 border-gray-200 dark:border-gray-700">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                        📜
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Activity Found</h3>
                                    <p className="text-gray-500 dark:text-gray-400">This user hasn't performed any logged actions yet.</p>
                                </div>
                            ) : (
                                <div className="glass-panel overflow-hidden rounded-2xl border border-white/20">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-700/50">
                                            <tr>
                                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Action</th>
                                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Details</th>
                                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">IP Address</th>
                                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="p-4">
                                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${log.action === 'LOGIN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                            log.action === 'DELETE_USER' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                            }`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                                        {JSON.stringify(log.details)}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {log.ip_address || 'N/A'}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
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
                        <div className="glass-panel p-12 rounded-2xl text-center border-dashed border-2 border-gray-200 dark:border-gray-700">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                🔑
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">API Tokens</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2">
                                No active API tokens found for this user.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
