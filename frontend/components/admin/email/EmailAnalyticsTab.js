import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BarChart2, PieChart, TrendingUp, TrendingDown, Target, Clock, Eye } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

    if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Analytics</h2>
                    <p className="text-sm text-gray-500">Track delivery performance and engagement metrics</p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium"
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
                            { label: 'Total Sent', value: stats.totalSent, icon: <TrendingUp className="text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-900/20' },
                            { label: 'Delivered', value: `${stats.rates.delivery}%`, icon: <Target className="text-green-500" />, bg: 'bg-green-50 dark:bg-green-900/20' },
                            { label: 'Open Rate', value: `${stats.rates.open}%`, icon: <Eye className="text-purple-500" />, bg: 'bg-purple-50 dark:bg-purple-900/20' },
                            { label: 'Failures', value: stats.statusBreakdown.find(s => s.status === 'failed')?.count || 0, icon: <TrendingDown className="text-red-500" />, bg: 'bg-red-50 dark:bg-red-900/20' }
                        ].map((card, i) => (
                            <div key={i} className={`${card.bg} rounded-2xl p-6 border border-white/50 dark:border-gray-700/30 shadow-sm`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm">{card.icon}</div>
                                </div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Breakdown */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <PieChart size={20} className="text-indigo-500" />
                                Delivery Status
                            </h3>
                            <div className="space-y-4">
                                {stats.statusBreakdown.map((item) => (
                                    <div key={item.status} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                                            <span>{item.status}</span>
                                            <span>{item.count}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${item.status === 'delivered' ? 'bg-green-500' : item.status === 'sent' ? 'bg-blue-500' : 'bg-gray-400'}`}
                                                style={{ width: `${(item.count / stats.totalSent) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Templates */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <BarChart2 size={20} className="text-orange-500" />
                                Most Used Templates
                            </h3>
                            <div className="space-y-4">
                                {stats.topTemplates.map((template, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg text-xs font-bold shadow-sm">{i + 1}</div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{template['template.name'] || 'Unknown'}</p>
                                                <p className="text-[10px] text-gray-500 font-mono uppercase">{template['template.slug'] || 'manual'}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{template.count} emails</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500">No data available for this period</p>
                </div>
            )}
        </div>
    );
}
