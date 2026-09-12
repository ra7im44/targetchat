import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function WidgetsPage() {
    const router = useRouter();
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWidgets();
    }, []);

    async function fetchWidgets() {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWidgets(data.widgets || []);
            }
        } catch (err) {
            console.error('Failed to fetch widgets:', err);
            toast.error('Failed to load widgets');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: 'New Widget' })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('Widget created');
                router.push(`/widgets/${data.widget.id}`);
            } else {
                toast.error('Failed to create widget');
            }
        } catch (err) {
            console.error('Create error:', err);
            toast.error('Failed to create widget');
        }
    }

    async function handleDelete(e, widgetId, widgetName) {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`Are you sure you want to delete "${widgetName || 'this widget'}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets/${widgetId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                toast.success('Widget deleted successfully');
                setWidgets(prev => prev.filter(w => w.id !== widgetId));
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || 'Failed to delete widget');
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Failed to delete widget');
        }
    }

    // Function generates color based on string char code
    const getGradient = (str) => {
        const gradients = [
            'from-blue-400 to-indigo-500',
            'from-purple-400 to-pink-500',
            'from-green-400 to-emerald-500',
            'from-orange-400 to-red-500',
            'from-cyan-400 to-blue-500'
        ];
        const code = str.charCodeAt(0) % gradients.length;
        return gradients[code];
    };

    return (
        <DashboardLayout title="Widgets">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">My Widgets</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Create, customize, and deploy your chat widgets.
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:scale-105 transition-transform"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Create New Widget
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse"></div>
                    ))}
                </div>
            ) : widgets.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No widgets created</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                        Get started by creating your first chat widget. Customize it and add it to your website in minutes.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                    >
                        Create Your First Widget
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {widgets.map((widget) => (
                        <Link href={`/widgets/${widget.id}`} key={widget.id} className="group relative bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradient(widget.name || 'W')} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                                    {(widget.name || 'W').substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${widget.status === 'active'
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-700 dark:text-gray-400'}`}>
                                        {widget.status || 'Active'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDelete(e, widget.id, widget.name)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="Delete Widget"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                                    {widget.name || 'Untitled Widget'}
                                </h3>
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg w-fit mt-2">
                                    <svg className="w-3 h-3 mr-1.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    {widget.slug}
                                </div>
                            </div>

                            {/* Footer / Actions */}
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-medium text-gray-400">
                                    Created {new Date(widget.createdAt || widget.created_at || Date.now()).toLocaleDateString()}
                                </span>
                                <span className="text-sm font-bold text-blue-600 group-hover:underline">
                                    Manage →
                                </span>
                            </div>
                        </Link>
                    ))}

                    {/* 'Add New' Card */}
                    <button onClick={handleCreate} className="flex flex-col items-center justify-center h-full min-h-[280px] rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group text-gray-400 hover:text-blue-600">
                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 flex items-center justify-center mb-4 transition-colors">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="font-bold">Create New Widget</span>
                    </button>
                </div>
            )}
        </DashboardLayout>
    );
}
