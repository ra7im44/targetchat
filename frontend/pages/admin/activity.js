import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import {
    Activity, Filter, RefreshCw, User,
    Monitor, Clock, Search, Info
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

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
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Activity size={18} />
                            Activity Logs
                        </h1>
                        <p className="text-muted mt-1">
                            Audit trail of all system activities.
                        </p>
                    </div>
                    <button
                        onClick={() => loadLogs()}
                        className="p-2 text-muted hover:text-primary hover:bg-surface-hover rounded-lg transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-surface p-4 rounded-card shadow-sm border border-border flex flex-wrap gap-4 items-center animate-fadeIn">
                    <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border">
                        <Filter size={16} />
                        <span className="text-sm font-semibold text-secondary">Action:</span>
                        <select
                            value={filters.action}
                            onChange={(e) => handleFilterChange('action', e.target.value)}
                            className="bg-transparent text-sm outline-none text-foreground cursor-pointer min-w-[120px]"
                        >
                            <option value="">All Actions</option>
                            <option value="LOGIN">LOGIN</option>
                            <option value="REGISTER">REGISTER</option>
                            <option value="CREATE_USER">CREATE_USER</option>
                            <option value="DELETE_USER">DELETE_USER</option>
                            <option value="UPDATE_USER">UPDATE_USER</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border">
                        <User size={16} />
                        <span className="text-sm font-semibold text-secondary">User ID:</span>
                        <input
                            type="number"
                            placeholder="#"
                            value={filters.userId}
                            onChange={(e) => handleFilterChange('userId', e.target.value)}
                            className="w-16 bg-transparent text-sm outline-none text-foreground placeholder:text-muted"
                        />
                    </div>

                    {(filters.action || filters.userId) && (
                        <button
                            onClick={() => { setFilters({ action: '', userId: '' }); setPage(1); }}
                            className="text-xs text-danger hover:text-danger hover:underline ml-auto font-medium"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto rounded-card border border-border bg-surface shadow-sm relative">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-surface-secondary sticky top-0 z-10 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-bold text-foreground text-xs uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 font-bold text-foreground text-xs uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 font-bold text-foreground text-xs uppercase tracking-wider">Details</th>
                                <th className="px-6 py-4 font-bold text-foreground text-xs uppercase tracking-wider">IP / Agent</th>
                                <th className="px-6 py-4 font-bold text-foreground text-xs uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-surface-elevated rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-surface-elevated rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-surface-elevated rounded w-48"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-surface-elevated rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-surface-elevated rounded w-24"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center text-muted">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search size={18} />
                                            <p>No activity logs found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-info-soft/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${log.action.includes('DELETE')
                                                    ? 'bg-danger-soft text-danger border-danger/25'
                                                    : log.action.includes('LOGIN')
                                                        ? 'bg-success-soft text-success border-success/25'
                                                        : 'bg-info-soft text-info-ink border-info/25'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                                                    <User size={16} />
                                                    {log.user ? log.user.name : (log.user_id ? 'Unknown User' : 'System')}
                                                </div>
                                                <span className="text-xs text-muted pl-5.5">
                                                    {log.user ? log.user.email : (log.user_id ? `ID: ${log.user_id}` : 'System Event')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Info size={16} className="flex-shrink-0" />
                                                <code className="text-xs bg-surface-elevated dark:bg-black/20 px-2 py-1 rounded border border-border max-w-[200px] truncate text-secondary" title={JSON.stringify(log.details, null, 2)}>
                                                    {JSON.stringify(log.details)}
                                                </code>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-muted">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1.5" title="IP Address">
                                                    <Monitor size={12} /> {log.ip_address}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted">
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} />
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
                        className="px-4 py-2 rounded-lg bg-surface border border-border disabled:opacity-50 hover:bg-surface-hover transition-all font-medium text-sm flex items-center gap-2"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-medium text-muted">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                        className="px-4 py-2 rounded-lg bg-surface border border-border disabled:opacity-50 hover:bg-surface-hover transition-all font-medium text-sm flex items-center gap-2"
                    >
                        Next
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
