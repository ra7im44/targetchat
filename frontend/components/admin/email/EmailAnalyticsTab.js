import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BarChart2, PieChart, TrendingUp, TrendingDown, Target, Clock, Eye } from 'lucide-react';

import { API_URL as API } from '../../../utils/apiConfig';

export default function EmailAnalyticsTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');

    useEffect(() => {
        loadStats();
    }, [period]);

    async function loadStats() {
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/email-logs/stats/analytics?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Error loading stats:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-success border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Email Analytics</h2>
                    <p className="text-sm text-secondary">Track delivery performance and engagement metrics</p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-sm"
                >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                </select>
            </div>

            {stats ? (
                <>
                    {/* Hero Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Sent', value: stats.totalSent, icon: <TrendingUp size={18} className="text-info" />, bg: 'bg-info-soft border-info/20' },
                            { label: 'Delivered', value: `${stats.rates.delivery}%`, icon: <Target size={18} className="text-success" />, bg: 'bg-success-soft border-success/20' },
                            { label: 'Open Rate', value: `${stats.rates.open}%`, icon: <Eye size={18} className="text-primary" />, bg: 'bg-primary-soft border-primary/20' },
                            { label: 'Failures', value: stats.statusBreakdown.find(s => s.status === 'failed')?.count || 0, icon: <TrendingDown size={18} className="text-danger" />, bg: 'bg-danger-soft border-danger/20' }
                        ].map((card, i) => (
                            <div key={i} className={`${card.bg} rounded-card p-6 border shadow-xs`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-surface rounded-xl shadow-xs border border-border">{card.icon}</div>
                                </div>
                                <p className="text-sm font-medium text-secondary">{card.label}</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Breakdown */}
                        <div className="bg-surface rounded-card p-6 border border-border shadow-xs">
                            <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
                                <PieChart size={20} className="text-primary" />
                                Delivery Status
                            </h3>
                            <div className="space-y-4">
                                {stats.statusBreakdown.map((item) => (
                                    <div key={item.status} className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-secondary">
                                            <span>{item.status}</span>
                                            <span>{item.count}</span>
                                        </div>
                                        <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden border border-border">
                                            <div
                                                className={`h-full rounded-full ${item.status === 'delivered' ? 'bg-success' : item.status === 'sent' ? 'bg-info' : 'bg-muted'}`}
                                                style={{ width: `${(item.count / stats.totalSent) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Templates */}
                        <div className="bg-surface rounded-card p-6 border border-border shadow-xs">
                            <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
                                <BarChart2 size={20} className="text-primary" />
                                Most Used Templates
                            </h3>
                            <div className="space-y-4">
                                {stats.topTemplates.map((template, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-surface-elevated border border-border rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 flex items-center justify-center bg-surface border border-border rounded-lg text-xs font-bold text-foreground shadow-xs">{i + 1}</div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{template['template.name'] || 'Unknown'}</p>
                                                <p className="text-[10px] text-muted font-mono uppercase">{template['template.slug'] || 'manual'}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-primary">{template.count} emails</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-20 bg-surface-elevated rounded-card border-2 border-dashed border-border">
                    <p className="text-muted">No data available for this period</p>
                </div>
            )}
        </div>
    );
}
