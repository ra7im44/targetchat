import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import { ArrowLeft } from 'lucide-react';

import { API_URL as API } from '../../../utils/apiConfig';

export default function BillingEventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchEvents();
    }, [page]);

    async function fetchEvents() {
        const token = localStorage.getItem('tc_token');
        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${API}/api/admin/billing/events?page=${page}&limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
                setTotalPages(data.totalPages);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Billing Events Log</h1>
                        <p className="text-muted mt-1">Stripe webhook events and processing status</p>
                    </div>
                    <Link
                        href="/admin/billing"
                        className="px-4 py-2 bg-surface rounded-card hover:opacity-80 transition-colors text-foreground flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Back to Billing
                    </Link>
                </div>

                <div className="bg-surface border border-border rounded-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-elevated/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Event ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center">
                                            <div className="flex justify-center">
                                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : events.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-muted">
                                            No events recorded
                                        </td>
                                    </tr>
                                ) : (
                                    events.map((event) => (
                                        <tr key={event.id} className="hover:bg-surface-hover/50 dark:hover:bg-surface-hover/50 transition-colors font-mono text-sm">
                                            <td className="px-6 py-4 whitespace-nowrap text-muted">
                                                {event.stripeEventId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-primary font-medium">
                                                    {event.eventType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${event.status === 'processed'
                                                    ? 'bg-success-soft text-success'
                                                    : 'bg-warning-soft text-warning'
                                                    }`}>
                                                    {event.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-muted">
                                                {new Date(event.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
