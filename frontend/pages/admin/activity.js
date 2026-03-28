import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import {
    Activity, Filter, RefreshCw, User,
    Monitor, Clock, Search, Info
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ActivityLogs() {
    const router = useRouter();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        action: '',
        userId: '',
    });

    useEffect(() => {
        loadLogs();
    }, [page, filters]);

    async function loadLogs() {
        setLoading(true);
        const token = localStorage.getItem('tc_token');
        if (!token) return router.replace('/login');

        try {
            const queryParams = new URLSearchParams({
                limit: 20,
                offset: (page - 1) * 20,
                ...filters
            });
            if (!filters.action) queryParams.delete('action');
            if (!filters.userId) queryParams.delete('userId');

            const res = await fetch(`${API}/api/admin/activity-logs?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) return router.replace('/admin');

            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setTotalPages(data.totalPages || 1);
            } else {
                setLogs([]);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error loading logs:', err);
            setLoading(false);
        }
    }

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    return (
        <AdminLayout title="Activity Logs">
            <div className="flex flex-col h-full overflow-hidden space-y-6">
                <div className="flex justify-between items-center animate-fadeIn">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            <Activity size={32} className="text-cyan-500" />
                            Activity Logs
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Audit trail of all system activities.
                        </p>
                    </div>
                    <button
                        onClick={() => loadLogs()}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center animate-fadeIn">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Filter size={16} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Action:</span>
                        <select
                            value={filters.action}
                            onChange={(e) => handleFilterChange('action', e.target.value)}
                            className="bg-transparent text-sm outline-none text-gray-900 dark:text-white cursor-pointer min-w-[120px]"
                        >
                            <option value="">All Actions</option>
                            <option value="LOGIN">LOGIN</option>
                            <option value="REGISTER">REGISTER</option>
                            <option value="CREATE_USER">CREATE_USER</option>
                            <option value="DELETE_USER">DELETE_USER</option>
                            <option value="UPDATE_USER">UPDATE_USER</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <User size={16} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">User ID:</span>
                        <input
                            type="number"
                            placeholder="#"
                            value={filters.userId}
                            onChange={(e) => handleFilterChange('userId', e.target.value)}
                            className="w-16 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                        />
                    </div>

                    {(filters.action || filters.userId) && (
                        <button
                            onClick={() => { setFilters({ action: '', userId: '' }); setPage(1); }}
                            className="text-xs text-red-500 hover:text-red-600 hover:underline ml-auto font-medium"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800 shadow-sm relative">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/80 dark:bg-gray-800 sticky top-0 z-10 backdrop-blur-md border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Details</th>
                                <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">IP / Agent</th>
                                <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-48"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-24"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search size={32} />
                                            <p>No activity logs found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${log.action.includes('DELETE')
                                                    ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                                    : log.action.includes('LOGIN')
                                                        ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                                                        : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white text-sm">
                                                    <User size={14} className="text-gray-400" />
                                                    {log.user ? log.user.name : (log.user_id ? 'Unknown User' : 'System')}
                                                </div>
                                                <span className="text-xs text-gray-500 pl-5.5">
                                                    {log.user ? log.user.email : (log.user_id ? `ID: ${log.user_id}` : 'System Event')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Info size={14} className="text-gray-400 flex-shrink-0" />
                                                <code className="text-xs bg-gray-50 dark:bg-black/20 px-2 py-1 rounded border border-gray-100 dark:border-gray-700/50 max-w-[200px] truncate text-gray-600 dark:text-gray-300" title={JSON.stringify(log.details, null, 2)}>
                                                    {JSON.stringify(log.details)}
                                                </code>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1.5" title="IP Address">
                                                    <Monitor size={12} /> {log.ip_address}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-gray-400" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center px-2 py-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium text-sm flex items-center gap-2"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                        className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium text-sm flex items-center gap-2"
                    >
                        Next
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
