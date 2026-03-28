import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing Events Log</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Stripe webhook events and processing status</p>
                    </div>
                    <Link
                        href="/admin/billing"
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:opacity-80 transition-colors text-black dark:text-white"
                    >
                        ← Back to Billing
                    </Link>
                </div>

                <div className="glass-panel rounded-2xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/20 dark:divide-gray-700/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center">
                                            <div className="flex justify-center">
                                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : events.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            No events recorded
                                        </td>
                                    </tr>
                                ) : (
                                    events.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors font-mono text-sm">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                {event.stripeEventId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                    {event.eventType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${event.status === 'processed'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                    }`}>
                                                    {event.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
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
