import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import { Shield, AlertTriangle, Trash2, Lock, Unlock, Globe, Activity } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminSecurity() {
    const [blockedIps, setBlockedIps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalBlocked: 0 });
    const [newBlock, setNewBlock] = useState({ ipAddress: '', reason: '' });
    const [activeTab, setActiveTab] = useState('blocking'); // 'blocking' or 'intelligence'
    const [ipStats, setIpStats] = useState([]);
    const [selectedIpData, setSelectedIpData] = useState(null);
    const [lookupIp, setLookupIp] = useState('');
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        fetchData();
        if (activeTab === 'intelligence') fetchIpIntelligence();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/security/ips`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBlockedIps(data);
                setStats({ totalBlocked: data.length });
            }
        } catch (error) {
            console.error('Error fetching security data:', error);
            toast.error('Failed to load security data');
        } finally {
            setLoading(false);
        }
    };

    const fetchIpIntelligence = async () => {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/intelligence/ips`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIpStats(data.ips);
            }
        } catch (error) {
            toast.error('Failed to load IP intelligence');
        }
    };

    const handleIpLookup = async (ip) => {
        setSearching(true);
        setSelectedIpData(null);
        try {
            const targetIp = ip || lookupIp;
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/intelligence/ips/${targetIp}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedIpData({ ip: targetIp, users: data.users });
                if (!ip) setLookupIp('');
            }
        } catch (error) {
            toast.error('Lookup failed');
        } finally {
            setSearching(false);
        }
    };

    const handleBlock = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/security/ips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newBlock)
            });

            if (res.ok) {
                toast.success('IP Blocked Successfully');
                setNewBlock({ ipAddress: '', reason: '' });
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.message || 'Failed to block IP');
            }
        } catch (error) {
            toast.error('Server error');
        }
    };

    const handleUnblock = async (id) => {
        if (!confirm('Are you sure you want to unblock this IP?')) return;
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/security/ips/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('IP Unblocked');
                fetchData();
            }
        } catch (error) {
            toast.error('Failed to unblock');
        }
    };

    return (
        <AdminLayout title="Security & Intelligence">
            <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                            <Shield className="text-red-600" size={32} />
                            Security Control Room
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Monitor user patterns, detect multi-accounting, and manage access rules.
                        </p>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('blocking')}
                            className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'blocking'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Access Blocking
                        </button>
                        <button
                            onClick={() => setActiveTab('intelligence')}
                            className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'intelligence'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            IP Intelligence
                        </button>
                    </div>
                </div>

                {activeTab === 'blocking' ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Stats Card */}
                            <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg shadow-red-500/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
                                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>

                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold opacity-90 text-sm uppercase tracking-wide">Total Blocked IPs</p>
                                        <h3 className="text-5xl font-black mt-3">{stats.totalBlocked}</h3>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                                        <Lock size={28} />
                                    </div>
                                </div>
                                <div className="relative z-10 mt-8 pt-4 border-t border-white/20 text-sm font-medium flex items-center gap-2">
                                    <Activity size={16} /> Global Firewall Active
                                </div>
                            </div>

                            {/* Block Form */}
                            <div className="md:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <AlertTriangle size={20} className="text-orange-500" />
                                    Block New IP Address
                                </h3>
                                <form onSubmit={handleBlock} className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">IP Address</label>
                                        <div className="relative">
                                            <Globe size={18} className="absolute left-4 top-4 text-gray-400" />
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. 192.168.1.1"
                                                className="w-full pl-11 p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                                                value={newBlock.ipAddress}
                                                onChange={e => setNewBlock({ ...newBlock, ipAddress: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Reason (Internal)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Repeated failed logins"
                                            className="w-full p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                                            value={newBlock.reason}
                                            onChange={e => setNewBlock({ ...newBlock, reason: e.target.value })}
                                        />
                                    </div>
                                    <button type="submit" className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/30 flex items-center gap-2">
                                        <Lock size={18} /> Block
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* List */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Lock size={18} className="text-gray-400" /> Active Block Rules
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">IP Address</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Reason</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Blocked On</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {blockedIps.map(block => (
                                            <tr key={block.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{block.ipAddress}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{block.reason || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(block.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleUnblock(block.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <Unlock size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* IP Overlap Cards */}
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Activity size={20} className="text-emerald-500" />
                                        Multiple Accounts Per IP
                                    </h3>
                                    <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold">TOP 100</span>
                                </div>

                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                    {ipStats.filter(i => i.user_count > 1).map((ip) => (
                                        <button
                                            key={ip.ip}
                                            onClick={() => handleIpLookup(ip.ip)}
                                            className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center font-mono text-sm text-gray-500">
                                                    IP
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white font-mono">{ip.ip}</p>
                                                    <p className="text-sm text-gray-500">{ip.user_count} accounts found</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-black rounded-lg">
                                                    OVERLAP
                                                </div>
                                                <Activity size={18} className="text-gray-300 group-hover:text-blue-500" />
                                            </div>
                                        </button>
                                    ))}
                                    {ipStats.filter(i => i.user_count > 1).length === 0 && (
                                        <div className="text-center py-10 text-gray-500 italic">No IP overlap detected.</div>
                                    )}
                                </div>
                            </div>

                            {/* User Lookup */}
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Globe size={20} className="text-blue-500" />
                                    IP User Lookup
                                </h3>

                                <div className="flex gap-2 mb-8">
                                    <input
                                        type="text"
                                        placeholder="Enter IP to search..."
                                        className="flex-1 p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        value={lookupIp}
                                        onChange={e => setLookupIp(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleIpLookup()}
                                    />
                                    <button
                                        onClick={() => handleIpLookup()}
                                        disabled={searching}
                                        className="px-6 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        Search
                                    </button>
                                </div>

                                {selectedIpData ? (
                                    <div className="space-y-4 animate-fadeIn">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                                            <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">{selectedIpData.ip}</span>
                                            <span className="text-xs font-bold text-blue-600">{selectedIpData.users.length} Users</span>
                                        </div>

                                        <div className="space-y-3">
                                            {selectedIpData.users.map(u => (
                                                <div key={u.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{u.name}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">{u.role}</span>
                                                        <p className="text-[10px] text-gray-500 mt-1">Reg: {u.registrationIp === selectedIpData.ip ? 'MATCH' : 'DIFF'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                        <Globe size={48} className="mx-auto text-gray-200 mb-4" />
                                        <p className="text-gray-400">Search an IP to see who has accessed the system from it.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
