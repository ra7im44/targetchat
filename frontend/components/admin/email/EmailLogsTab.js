import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, RefreshCw, Eye, RotateCcw, Filter, X } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function EmailLogsTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
    const [filters, setFilters] = useState({ status: '', recipient: '', templateId: '' });
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        loadLogs();
    }, [pagination.page, filters]);

    async function loadLogs() {
        const token = localStorage.getItem('tc_token');
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            });

            const res = await fetch(`${API}/api/admin/email-logs?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setPagination(prev => ({ ...prev, ...data.pagination }));
            }
        } catch (err) {
            console.error('Error loading logs:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleRetry = async (logId) => {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/email-logs/${logId}/retry`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('Email retry queued!');
                loadLogs();
            }
        } catch (err) {
            toast.error('Failed to retry email');
        }
    };

    const viewDetails = async (log) => {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/email-logs/${log.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedLog(data);
                setShowDetails(true);
            }
        } catch (err) {
            toast.error('Failed to load log details');
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            queued: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
            sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            opened: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        };
        return colors[status] || 'bg-gray-100 text-gray-600';
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Logs</h2>
                    <p className="text-sm text-gray-500">Monitor and track every email sent by the system</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Recipient email..."
                            value={filters.recipient}
                            onChange={(e) => setFilters({ ...filters, recipient: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                    </div>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    >
                        <option value="">All Statuses</option>
                        <option value="queued">Queued</option>
                        <option value="sent">Sent</option>
                        <option value="delivered">Delivered</option>
                        <option value="opened">Opened</option>
                        <option value="failed">Failed</option>
                    </select>
                    <button
                        onClick={loadLogs}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
                    >
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setFilters({ status: '', recipient: '', templateId: '' })}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-medium"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-left border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Recipient</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Subject</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Template</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${getStatusBadge(log.status)}`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white font-mono">{log.recipientEmail}</td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{log.subject}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{log.template?.name || 'Manual'}</td>
                                <td className="px-6 py-4 text-xs text-gray-500">{new Date(log.createdAt || log.created_at).toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => viewDetails(log)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md shadow-sm">
                                            <Eye size={16} />
                                        </button>
                                        {log.status === 'failed' && (
                                            <button onClick={() => handleRetry(log.id)} className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md shadow-sm">
                                                <RotateCcw size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple Pagination */}
            {pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <button
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50"
                    >
                        Prev
                    </button>
                    <span className="text-sm py-1 font-medium text-gray-500">Page {pagination.page} of {pagination.pages}</span>
                    <button
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {showDetails && selectedLog && (
                <EmailLogDetailModal
                    log={selectedLog}
                    onClose={() => { setShowDetails(false); setSelectedLog(null); }}
                    onRetry={() => handleRetry(selectedLog.id)}
                />
            )}
        </div>
    );
}

function EmailLogDetailModal({ log, onClose, onRetry }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn text-left">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Email Delivery Details</h2>
                        <p className="text-xs text-gray-400 font-mono mt-1">{log.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Recipient</label>
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={log.recipientEmail}>{log.recipientEmail}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</label>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${log.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                {log.status}
                            </span>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Sent Date</label>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(log.createdAt || log.created_at).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Subject</label>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{log.subject}</p>
                    </div>

                    {/* Rendered Content */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rendered Content</label>
                        <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-white">
                            <iframe
                                srcDoc={log.htmlBody || `<div style="padding: 20px; font-family: sans-serif;">${log.textContent || 'No content found'}</div>`}
                                title="Email Preview"
                                className="w-full min-h-[400px] border-none"
                            />
                        </div>
                    </div>

                    {/* Metadata / Variables */}
                    {log.variables && Object.keys(log.variables).length > 0 && (
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Used Variables</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                {Object.entries(log.variables).map(([key, val]) => (
                                    <div key={key} className="p-3 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">{key}</p>
                                        <p className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate" title={String(val)}>{String(val)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Info */}
                    {log.errorMessage && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl">
                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">Delivery Error</label>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{log.errorMessage}</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-gray-600 dark:text-gray-400 font-bold text-sm">Close</button>
                    {log.status === 'failed' && (
                        <button
                            onClick={() => { onClose(); onRetry(); }}
                            className="px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 shadow-lg shadow-orange-500/25 transition-all"
                        >
                            Retry Sending
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
