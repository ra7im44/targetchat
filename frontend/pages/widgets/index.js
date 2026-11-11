import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    AppWindow, Plus, Trash2, Copy, Check, ExternalLink,
    Settings, MessageSquareCode, ArrowRight, Sparkles,
    CheckCircle2, Clock, Globe, Zap, ShieldCheck
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

export default function WidgetsPage() {
    const router = useRouter();
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState(null);

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
        setCreating(true);
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/widgets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: 'New Chat Widget' })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('Widget created successfully');
                router.push(`/widgets/${data.widget.id}`);
            } else {
                toast.error('Failed to create widget');
            }
        } catch (err) {
            console.error('Create error:', err);
            toast.error('Failed to create widget');
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(e, widgetId, widgetName) {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`Are you sure you want to delete "${widgetName || 'this widget'}"? Any websites embedding this snippet will stop loading the chat.`)) {
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

    const copyEmbedSlug = (e, slug) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(slug);
        setCopiedSlug(slug);
        toast.success('Widget identifier copied!');
        setTimeout(() => setCopiedSlug(null), 2000);
    };

    const activeCount = widgets.filter(w => (w.status || 'active').toLowerCase() === 'active').length;

    return (
        <DashboardLayout title="Widgets">
            <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
                {/* Header Strip */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                                <AppWindow className="text-primary" size={28} />
                                <span>My Widgets</span>
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-elevated text-secondary border border-border">
                                {widgets.length} {widgets.length === 1 ? 'Widget' : 'Widgets'}
                            </span>
                        </div>
                        <p className="text-xs md:text-sm text-muted mt-1 max-w-2xl">
                            Create, customize, and embed lightweight conversational widgets into your websites, portals, and landing pages.
                        </p>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="group inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-button text-xs md:text-sm shadow-xs transition-all disabled:opacity-60"
                    >
                        <Plus size={16} />
                        <span>{creating ? 'Creating...' : 'Create New Widget'}</span>
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>

                {/* Quick Stats Overview Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Widgets</span>
                            <div className="text-xl font-bold text-foreground tabular-nums mt-0.5">
                                {widgets.length}
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center border border-primary/20">
                            <AppWindow size={18} />
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Active & Deployed</span>
                            <div className="text-xl font-bold text-success tabular-nums mt-0.5 flex items-center gap-1.5">
                                <span>{activeCount}</span>
                                {activeCount > 0 && (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-success-soft text-success flex items-center justify-center border border-success/20">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Embed Infrastructure</span>
                            <div className="text-xs font-semibold text-foreground mt-1 flex items-center gap-1">
                                <Globe size={13} className="text-primary" />
                                <span>CDN Ready (v1.0)</span>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-info-soft text-info flex items-center justify-center border border-info/20">
                            <ShieldCheck size={18} />
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-56 bg-surface rounded-xl border border-border animate-pulse p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-surface-elevated"></div>
                                    <div className="w-16 h-5 rounded-full bg-surface-elevated"></div>
                                </div>
                                <div className="w-3/4 h-5 bg-surface-elevated rounded mb-2"></div>
                                <div className="w-1/2 h-4 bg-surface-elevated rounded mb-6"></div>
                                <div className="w-full h-8 bg-surface-elevated rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : widgets.length === 0 ? (
                    <div className="text-center py-16 bg-surface rounded-2xl border border-border shadow-xs max-w-2xl mx-auto p-8">
                        <div className="w-16 h-16 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-xs">
                            <MessageSquareCode size={28} />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-1.5">No widgets created yet</h2>
                        <p className="text-xs md:text-sm text-muted mb-6 max-w-md mx-auto leading-relaxed">
                            Generate your first chat widget to deploy AI automation or live customer support to your website in minutes.
                        </p>
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-button text-xs font-semibold shadow-xs transition-all"
                        >
                            <Plus size={16} />
                            <span>Create Your First Widget</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {widgets.map((widget) => {
                            const primaryColor = widget.theme?.primaryColor || '#5B5BD6';
                            const isActive = (widget.status || 'active').toLowerCase() === 'active';

                            return (
                                <Link
                                    href={`/widgets/${widget.id}`}
                                    key={widget.id}
                                    className="group relative bg-surface rounded-xl p-5 shadow-xs border border-border hover:border-border-strong hover:shadow-raise transition-all flex flex-col justify-between overflow-hidden"
                                >
                                    {/* Top Color Accent Line */}
                                    <div
                                        className="h-1 absolute top-0 left-0 right-0 transition-opacity"
                                        style={{ backgroundColor: primaryColor }}
                                    />

                                    <div>
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div
                                                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-2xs group-hover:scale-105 transition-transform"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {(widget.name || 'W').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                                                    isActive
                                                        ? 'bg-success-soft text-success border-success/20'
                                                        : 'bg-surface-elevated text-muted border-border'
                                                }`}>
                                                    {isActive ? 'Active' : 'Paused'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDelete(e, widget.id, widget.name)}
                                                    className="p-1.5 text-muted hover:text-danger hover:bg-danger-soft rounded-lg transition-colors"
                                                    title="Delete Widget"
                                                    aria-label="Delete Widget"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="mb-5">
                                            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                {widget.name || 'Untitled Widget'}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <div className="inline-flex items-center gap-1.5 text-[11px] text-muted font-mono bg-surface-elevated px-2 py-0.5 rounded border border-border/70 truncate max-w-[200px]">
                                                    <span>{widget.slug}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => copyEmbedSlug(e, widget.slug)}
                                                    className="p-1 text-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors"
                                                    title="Copy widget identifier"
                                                    aria-label="Copy widget identifier"
                                                >
                                                    {copiedSlug === widget.slug ? (
                                                        <Check size={12} className="text-success" />
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="flex items-center justify-between pt-3.5 border-t border-border/60 text-xs">
                                        <span className="text-[11px] text-muted tabular-nums">
                                            {new Date(widget.createdAt || widget.created_at || Date.now()).toLocaleDateString()}
                                        </span>
                                        <div className="flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                                            <span>Configure</span>
                                            <ArrowRight size={13} />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}

                        {/* 'Add New' Interactive Card */}
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="flex flex-col items-center justify-center min-h-[190px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary-soft/20 transition-all group text-muted hover:text-primary p-6 text-center"
                        >
                            <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border group-hover:border-primary/30 group-hover:bg-primary-soft flex items-center justify-center mb-2.5 transition-all group-hover:scale-105">
                                <Plus size={18} className="text-secondary group-hover:text-primary transition-colors" />
                            </div>
                            <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                {creating ? 'Creating Widget...' : 'Create New Widget'}
                            </span>
                            <span className="text-[11px] text-muted mt-0.5 max-w-[180px]">
                                Deploy a new conversational channel in minutes
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
