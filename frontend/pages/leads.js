import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layouts/DashboardLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
            new: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
            contacted: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
            converted: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
            lost: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
        };
        const style = styles[status] || styles.new;

        return (
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${style} capitalize`}>
                {status}
            </span>
        );
    }

    return (
        <DashboardLayout title="Leads">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Leads</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Manage and track {pagination?.total || 0} potential customers.
                    </p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-gray-200 dark:shadow-none"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export CSV
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 mb-6 flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                    <svg className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-500 focus:ring-0 text-sm font-medium"
                    />
                </div>
                <div className="flex gap-2 p-1">
                    <select
                        value={selectedWidget}
                        onChange={(e) => setSelectedWidget(e.target.value)}
                        className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Widgets</option>
                        {widgets.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500"
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
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">📭</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No leads found</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            {searchQuery || selectedWidget !== 'all' || selectedStatus !== 'all'
                                ? 'Try adjusting your filters to see more results.'
                                : 'Leads will appear here automatically when visitors fill out your pre-chat form.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 dark:bg-gray-700/30">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Company</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                                                    {getInitials(lead.name)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{lead.name || 'Anonymous'}</div>
                                                    <div className="text-xs text-gray-500">ID: #{lead.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-gray-300 font-medium">{lead.email || '-'}</div>
                                            <div className="text-xs text-gray-500">{lead.phone || '-'}</div>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg inline-block">
                                                {lead.company || '-'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            {getStatusBadge(lead.status)}
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-right text-sm text-gray-500 font-medium">
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
                    <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/50 flex items-center justify-between">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Page {page} of {pagination.pages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
