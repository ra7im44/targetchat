import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Inbox } from 'lucide-react';

import { API_URL as API } from '../utils/apiConfig';

export default function LeadsPage() {
    const router = useRouter();
    const [leads, setLeads] = useState([]);
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWidget, setSelectedWidget] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    useEffect(() => {
        loadWidgets();
        loadLeads();
    }, [selectedWidget, selectedStatus, searchQuery, page]);

    async function loadWidgets() {
        const token = localStorage.getItem('tc_token');
        if (!token) return;

        try {
            const res = await fetch(`${API}/api/widgets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWidgets(data.widgets || []);
            }
        } catch (err) {
            console.error('Error loading widgets:', err);
        }
    }

    async function loadLeads() {
        const token = localStorage.getItem('tc_token');
        if (!token) {
            router.replace('/login');
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });

            if (selectedWidget !== 'all') {
                params.append('widget_id', selectedWidget);
            }
            if (selectedStatus !== 'all') {
                params.append('status', selectedStatus);
            }
            if (searchQuery) {
                params.append('search', searchQuery);
            }

            const res = await fetch(`${API}/api/leads?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
                setPagination(data.pagination);
            }
        } catch (err) {
            console.error('Error loading leads:', err);
        } finally {
            setLoading(false);
        }
    }

    async function exportToCSV() {
        const token = localStorage.getItem('tc_token');
        if (!token) return;

        try {
            const params = new URLSearchParams();
            if (selectedWidget !== 'all') {
                params.append('widget_id', selectedWidget);
            }
            if (selectedStatus !== 'all') {
                params.append('status', selectedStatus);
            }

            const res = await fetch(`${API}/api/leads/export/csv?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'leads.csv';
                a.click();
            }
        } catch (err) {
            console.error('Error exporting leads:', err);
        }
    }

    function getInitials(name) {
        return name ? name.substring(0, 2).toUpperCase() : '??';
    }

    function getStatusBadge(status) {
        const styles = {
            new: 'bg-info-soft text-info border-info/20',
            contacted: 'bg-warning-soft text-warning border-warning/20',
            converted: 'bg-success-soft text-success border-success/20',
            lost: 'bg-surface-elevated text-muted border-border'
        };
        const style = styles[status] || styles.new;

        return (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${style} capitalize`}>
                {status}
            </span>
        );
    }

    return (
        <DashboardLayout title="Leads">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground tracking-tight">Leads</h1>
                    <p className="text-secondary mt-1.5 text-sm">
                        Manage and track {pagination?.total || 0} potential customers.
                    </p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export CSV
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-surface rounded-xl shadow-xs border border-border p-2 mb-6 flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                    <svg className="w-5 h-5 absolute left-4 top-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-transparent border-none text-foreground placeholder-muted focus:ring-0 text-sm font-medium"
                    />
                </div>
                <div className="flex gap-2 p-1">
                    <select
                        value={selectedWidget}
                        onChange={(e) => setSelectedWidget(e.target.value)}
                        className="px-4 py-2 bg-surface-elevated border border-border rounded-xl text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                        <option value="all">All Widgets</option>
                        {widgets.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-4 py-2 bg-surface-elevated border border-border rounded-xl text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-surface rounded-xl shadow-xs border border-border overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-surface-elevated border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                            <Inbox size={18} className="text-muted" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">No leads found</h3>
                        <p className="text-secondary text-sm max-w-sm mx-auto">
                            {searchQuery || selectedWidget !== 'all' || selectedStatus !== 'all'
                                ? 'Try adjusting your filters to see more results.'
                                : 'Leads will appear here automatically when visitors fill out your pre-chat form.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-elevated/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Contact Info</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Company</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-secondary uppercase tracking-wider">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-surface-hover transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-9 w-9 flex-shrink-0 rounded-full bg-primary-soft border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                                    {getInitials(lead.name)}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-semibold text-foreground">{lead.name || 'Anonymous'}</div>
                                                    <div className="text-xs text-muted">ID: #{lead.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground font-medium">{lead.email || '-'}</div>
                                            <div className="text-xs text-muted">{lead.phone || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-semibold text-secondary bg-surface-elevated border border-border px-2.5 py-1 rounded-md inline-block">
                                                {lead.company || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(lead.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-muted tabular-nums font-mono">
                                            {new Date(lead.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Footer */}
                {pagination && pagination.pages > 1 && (
                    <div className="px-6 py-4 border-t border-border bg-surface-elevated/30 flex items-center justify-between">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3.5 py-1.5 bg-surface border border-border rounded-lg text-sm font-medium text-foreground disabled:opacity-50 hover:bg-surface-hover transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-medium text-muted">
                            Page {page} of {pagination.pages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="px-3.5 py-1.5 bg-surface border border-border rounded-lg text-sm font-medium text-foreground disabled:opacity-50 hover:bg-surface-hover transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
