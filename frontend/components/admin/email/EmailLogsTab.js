import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, RefreshCw, Eye, RotateCcw, Filter, X } from 'lucide-react';

import { API_URL as API } from '../../../utils/apiConfig';

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
            queued: 'bg-surface-elevated text-muted border border-border',
            sent: 'bg-info-soft text-info border border-info/20',
            delivered: 'bg-success-soft text-success border border-success/20',
            opened: 'bg-primary-soft text-primary border border-primary/20',
            failed: 'bg-danger-soft text-danger border border-danger/20'
        };
        return colors[status] || 'bg-surface-elevated text-muted border border-border';
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Email Logs</h2>
                    <p className="text-sm text-muted">Monitor and track every email sent by the system</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-surface rounded-xl p-4 border border-border shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Recipient email..."
                            value={filters.recipient}
                            onChange={(e) => setFilters({ ...filters, recipient: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-surface-elevated text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-4 py-2 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-xl font-semibold transition-all shadow-xs"
                    >
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setFilters({ status: '', recipient: '', templateId: '' })}
                        className="px-4 py-2 bg-surface-elevated hover:bg-surface-hover text-secondary hover:text-foreground border border-border rounded-xl font-semibold transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface rounded-card shadow-xs border border-border overflow-hidden">
                <table className="w-full border-collapse">
                    <thead className="bg-surface-elevated text-left border-b border-border">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase">Recipient</th>
                            <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase">Subject</th>
                            <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase">Template</th>
                            <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase">Date</th>
                            <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getStatusBadge(log.status)}`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-foreground font-mono">{log.recipientEmail}</td>
                                <td className="px-6 py-4 text-sm text-secondary max-w-[200px] truncate">{log.subject}</td>
                                <td className="px-6 py-4 text-sm text-secondary">{log.template?.name || 'Manual'}</td>
                                <td className="px-6 py-4 text-xs text-muted font-mono">{new Date(log.createdAt || log.created_at).toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => viewDetails(log)} className="p-1.5 text-primary hover:bg-primary-soft rounded-lg transition-colors" title="View details">
                                            <Eye size={16} />
                                        </button>
                                        {log.status === 'failed' && (
                                            <button onClick={() => handleRetry(log.id)} className="p-1.5 text-warning hover:bg-warning-soft rounded-lg transition-colors" title="Retry">
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
                <div className="flex justify-center items-center gap-2 mt-4">
                    <button
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border rounded-xl text-sm font-semibold text-secondary hover:text-foreground disabled:opacity-50 transition-colors"
                    >
                        Prev
                    </button>
                    <span className="text-sm py-1 font-medium text-secondary">Page {pagination.page} of {pagination.pages}</span>
                    <button
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border rounded-xl text-sm font-semibold text-secondary hover:text-foreground disabled:opacity-50 transition-colors"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-left">
            <div className="bg-surface w-full max-w-4xl rounded-card shadow-lg border border-border overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex justify-between items-center bg-surface-elevated">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Email Delivery Details</h2>
                        <p className="text-xs text-muted font-mono mt-1">{log.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface-hover text-muted hover:text-foreground rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-surface">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-surface-elevated rounded-card border border-border">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Recipient</label>
                            <p className="text-sm font-semibold text-foreground truncate" title={log.recipientEmail}>{log.recipientEmail}</p>
                        </div>
                        <div className="p-4 bg-surface-elevated rounded-card border border-border">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Status</label>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === 'delivered' ? 'bg-success-soft text-success border border-success/20' :
                                log.status === 'failed' ? 'bg-danger-soft text-danger border border-danger/20' : 'bg-info-soft text-info border border-info/20'
                                }`}>
                                {log.status}
                            </span>
                        </div>
                        <div className="p-4 bg-surface-elevated rounded-card border border-border">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Sent Date</label>
                            <p className="text-sm font-semibold text-foreground">{new Date(log.createdAt || log.created_at).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="p-4 bg-surface-elevated rounded-card border border-border">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Subject</label>
                        <p className="text-sm font-semibold text-foreground">{log.subject}</p>
                    </div>

                    {/* Rendered Content */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Rendered Content</label>
                        <div className="border border-border rounded-card overflow-hidden bg-white">
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
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Used Variables</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                {Object.entries(log.variables).map(([key, val]) => (
                                    <div key={key} className="p-3 bg-surface-elevated rounded-xl border border-border">
                                        <p className="text-[9px] font-bold text-muted uppercase tracking-tighter mb-1">{key}</p>
                                        <p className="text-xs font-mono text-secondary truncate" title={String(val)}>{String(val)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Info */}
                    {log.errorMessage && (
                        <div className="p-4 bg-danger-soft border border-danger/30 rounded-card">
                            <label className="text-[10px] font-bold text-danger uppercase tracking-widest block mb-1">Delivery Error</label>
                            <p className="text-sm text-danger font-medium">{log.errorMessage}</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-surface-elevated border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-muted hover:text-foreground font-bold text-sm transition-colors">Close</button>
                    {log.status === 'failed' && (
                        <button
                            onClick={() => { onClose(); onRetry(); }}
                            className="px-6 py-2.5 bg-warning text-white rounded-button font-bold text-sm hover:opacity-90 shadow-sm transition-all"
                        >
                            Retry Sending
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
