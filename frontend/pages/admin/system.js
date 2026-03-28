import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import {
    HardDrive, Activity, Cpu, Server, Clock,
    Download, Info, AlertTriangle, Database, Shield
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SystemPage() {
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [backupLoading, setBackupLoading] = useState(false);

    useEffect(() => {
        loadStats();
        // Auto-refresh every 10 seconds
        const interval = setInterval(loadStats, 10000);
        return () => clearInterval(interval);
    }, []);

    async function loadStats() {
        const token = localStorage.getItem('tc_token');
        if (!token) return router.replace('/login');

        try {
            const res = await fetch(`${API}/api/admin/system/health`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) return router.replace('/admin');

            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error loading stats:', err);
            setLoading(false);
        }
    }

    async function handleBackup() {
        setBackupLoading(true);
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/system/backup`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                // Determine filename from header or default
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Backup failed');
            }
        } catch (err) {
            console.error('Backup error:', err);
            alert('Backup error');
        } finally {
            setBackupLoading(false);
        }
    }

    // Helper to get color based on percentage
    const getStatusColor = (pct) => {
        if (pct < 50) return 'bg-emerald-500';
        if (pct < 80) return 'bg-amber-500';
        return 'bg-red-500';
    };

    if (loading && !stats) return (
        <AdminLayout>
            <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        </AdminLayout>
    );

    return (
        <AdminLayout title="System Health">
            <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
                <div className="mb-10">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                        <Activity size={32} className="text-red-500" />
                        System Health
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Monitor server vitals and verify system integrity.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Memory Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-blue-500">
                            <HardDrive size={80} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <HardDrive size={20} className="text-blue-500" />
                                Memory Usage
                            </h3>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{stats?.memory?.percentage}%</span>
                                <span className="text-sm text-gray-500 mb-1">{stats?.memory?.used} / {stats?.memory?.total}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-1000 shadow-sm ${getStatusColor(stats?.memory?.percentage)}`}
                                    style={{ width: `${stats?.memory?.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* CPU Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-purple-500">
                            <Cpu size={80} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <Cpu size={20} className="text-purple-500" />
                                CPU Info
                            </h3>
                            <div className="mb-4">
                                <div className="text-sm text-gray-500">Model</div>
                                <div className="font-medium text-gray-900 dark:text-white truncate text-sm" title={stats?.cpu?.model}>{stats?.cpu?.model}</div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-500">Cores</div>
                                <div className="font-bold text-xl dark:text-white">{stats?.cpu?.cores}</div>
                            </div>
                        </div>
                    </div>

                    {/* Uptime Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 duration-500 text-emerald-500">
                            <Clock size={80} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <Clock size={20} className="text-emerald-500" />
                                Server Uptime
                            </h3>
                            <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                                {Math.floor(stats?.uptime / 3600)}h {Math.floor((stats?.uptime % 3600) / 60)}m
                            </div>
                            <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                                <Server size={14} />
                                <span className="font-medium capitalize">{stats?.platform} ({stats?.arch})</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Area */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-red-500 to-orange-500"></div>

                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500" size={24} />
                        Danger Zone & Data Recovery
                    </h2>

                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <button
                            onClick={handleBackup}
                            disabled={backupLoading}
                            className={`px-8 py-4 rounded-xl flex items-center gap-4 font-bold text-lg shadow-lg transition-all w-full md:w-auto
                                ${backupLoading
                                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:-translate-y-1 active:scale-95'
                                }`}
                        >
                            <Download size={24} />
                            {backupLoading ? 'Backing up...' : 'Download Database Backup'}
                        </button>

                        <div className="flex-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                                <Info size={16} className="text-blue-500" />
                                About Backups
                            </p>
                            <p className="leading-relaxed">
                                This will generate a JSON dump containing all Users, Widgets, Workflows, and recent Leads.
                                Downloading this file periodically significantly reduces the risk of data loss.
                                <span className="block mt-2 font-semibold text-orange-600 dark:text-orange-400">
                                    Keep this file safe! It contains sensitive user data.
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
