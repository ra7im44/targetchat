import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { API_URL as API } from '../../utils/apiConfig';

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
            '',
            '',
            '',
            '',
            ''
        ];
        const key = String(str || 'W');
        const code = key.charCodeAt(0) % gradients.length;
        return gradients[code] || gradients[0];
    };

    return (
        <DashboardLayout title="Widgets">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">My Widgets</h1>
                    <p className="text-text-muted mt-1.5 text-sm font-medium">
                        Create, customize, and deploy your chat widgets.
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold text-sm shadow-xs transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Create New Widget
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-surface-elevated rounded-card border border-border animate-pulse"></div>
                    ))}
                </div>
            ) : widgets.length === 0 ? (
                <div className="text-center py-20 bg-surface rounded-card border-2 border-dashed border-border">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-1.5">No widgets created</h2>
                    <p className="text-gray-500 dark:text-muted mb-6 max-w-md mx-auto text-sm">
                        Get started by creating your first chat widget. Customize it and add it to your website in minutes.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold text-sm shadow-xs transition-colors"
                    >
                        Create Your First Widget
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {widgets.map((widget) => (
                        <Link href={`/widgets/${widget.id}`} key={widget.id} className="group relative bg-surface rounded-card p-6 shadow-xs border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-5">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                                    {(widget.name || 'W').substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${widget.status === 'active'
                                        ? 'bg-success/10 text-success border-success/20'
                                        : 'bg-surface-elevated text-text-muted border-border'}`}>
                                        {widget.status || 'Active'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDelete(e, widget.id, widget.name)}
                                        className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                                        title="Delete Widget"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="mb-5">
                                <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                                    {widget.name || 'Untitled Widget'}
                                </h3>
                                <div className="flex items-center text-xs text-text-muted font-mono bg-surface-elevated border border-border px-2 py-1 rounded w-fit mt-2">
                                    <svg className="w-3 h-3 mr-1.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    {widget.slug}
                                </div>
                            </div>

                            {/* Footer / Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <span className="text-xs text-text-muted">
                                    Created {new Date(widget.createdAt || widget.created_at || Date.now()).toLocaleDateString()}
                                </span>
                                <span className="text-xs font-semibold text-primary group-hover:underline">
                                    Manage →
                                </span>
                            </div>
                        </Link>
                    ))}

                    {/* 'Add New' Card */}
                    <button onClick={handleCreate} className="flex flex-col items-center justify-center h-full min-h-[200px] rounded-card border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group text-text-muted hover:text-primary p-6">
                        <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border group-hover:bg-primary/10 group-hover:border-primary/20 flex items-center justify-center mb-3 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="font-semibold text-sm">Create New Widget</span>
                    </button>
                </div>
            )}
        </DashboardLayout>
    );
}
