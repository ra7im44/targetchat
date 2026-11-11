import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import { Shield, AlertTriangle, Trash2, Lock, Unlock, Globe, Activity } from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

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
                        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                            <Shield className="text-danger" size={18} />
                            Security Control Room
                        </h1>
                        <p className="text-muted">
                            Monitor user patterns, detect multi-accounting, and manage access rules.
                        </p>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex p-1 bg-surface-elevated rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('blocking')}
                            className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'blocking'
                                ? 'bg-surface-elevated text-primary shadow-sm'
                                : 'text-muted hover:text-secondary dark:hover:text-muted'
                                }`}
                        >
                            Access Blocking
                        </button>
                        <button
                            onClick={() => setActiveTab('intelligence')}
                            className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'intelligence'
                                ? 'bg-surface-elevated text-primary shadow-sm'
                                : 'text-muted hover:text-secondary dark:hover:text-muted'
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
                            <div className="bg-danger rounded-card p-6 text-white shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
                                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>

                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold opacity-90 text-sm uppercase tracking-wide">Total Blocked IPs</p>
                                        <h3 className="text-5xl font-bold mt-3">{stats.totalBlocked}</h3>
                                    </div>
                                    <div className="p-3 bg-surface-secondary border border-border rounded-lg">
                                        <Lock size={18} />
                                    </div>
                                </div>
                                <div className="relative z-10 mt-8 pt-4 border-t border-white/20 text-sm font-medium flex items-center gap-2">
                                    <Activity size={16} /> Global Firewall Active
                                </div>
                            </div>

                            {/* Block Form */}
                            <div className="md:col-span-2 bg-surface p-8 rounded-card shadow-sm border border-border">
                                <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                    <AlertTriangle size={18} />
                                    Block New IP Address
                                </h3>
                                <form onSubmit={handleBlock} className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-bold text-secondary mb-2">IP Address</label>
                                        <div className="relative">
                                            <Globe size={18} className="absolute left-4 top-4" />
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. 192.168.1.1"
                                                className="w-full pl-11 p-3.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-danger outline-none text-foreground"
                                                value={newBlock.ipAddress}
                                                onChange={e => setNewBlock({ ...newBlock, ipAddress: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-bold text-secondary mb-2">Reason (Internal)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Repeated failed logins"
                                            className="w-full p-3.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-danger outline-none text-foreground"
                                            value={newBlock.reason}
                                            onChange={e => setNewBlock({ ...newBlock, reason: e.target.value })}
                                        />
                                    </div>
                                    <button type="submit" className="px-8 py-3.5 bg-danger hover:bg-danger/90 text-danger-foreground font-bold rounded-xl transition-all shadow-lg flex items-center gap-2">
                                        <Lock size={18} /> Block
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* List */}
                        <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
                            <div className="p-6 border-b border-border bg-surface-elevated">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Lock size={18} /> Active Block Rules
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-surface">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase">IP Address</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase">Reason</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase">Blocked On</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-muted uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {blockedIps.map(block => (
                                            <tr key={block.id} className="hover:bg-surface-hover transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-foreground">{block.ipAddress}</td>
                                                <td className="px-6 py-4 text-sm text-muted">{block.reason || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm text-muted">{new Date(block.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleUnblock(block.id)} className="text-danger hover:text-danger p-2 rounded-lg hover:bg-danger-soft">
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
                            <div className="bg-surface p-8 rounded-card shadow-sm border border-border">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                        <Activity size={18} />
                                        Multiple Accounts Per IP
                                    </h3>
                                    <span className="text-xs bg-success-soft text-success px-3 py-1 rounded-full font-bold">TOP 100</span>
                                </div>

                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                    {ipStats.filter(i => i.user_count > 1).map((ip) => (
                                        <button
                                            key={ip.ip}
                                            onClick={() => handleIpLookup(ip.ip)}
                                            className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary dark:hover:border-primary hover:shadow-md transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center font-mono text-sm text-muted">
                                                    IP
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground font-mono">{ip.ip}</p>
                                                    <p className="text-sm text-muted">{ip.user_count} accounts found</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1 bg-danger-soft text-danger text-xs font-bold rounded-lg">
                                                    OVERLAP
                                                </div>
                                                <Activity size={18} className="group-hover:text-primary" />
                                            </div>
                                        </button>
                                    ))}
                                    {ipStats.filter(i => i.user_count > 1).length === 0 && (
                                        <div className="text-center py-10 text-muted italic">No IP overlap detected.</div>
                                    )}
                                </div>
                            </div>

                            {/* User Lookup */}
                            <div className="bg-surface p-8 rounded-card shadow-sm border border-border">
                                <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                    <Globe size={18} />
                                    IP User Lookup
                                </h3>

                                <div className="flex gap-2 mb-8">
                                    <input
                                        type="text"
                                        placeholder="Enter IP to search..."
                                        className="flex-1 p-3.5 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                                        value={lookupIp}
                                        onChange={e => setLookupIp(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleIpLookup()}
                                    />
                                    <button
                                        onClick={() => handleIpLookup()}
                                        disabled={searching}
                                        className="px-6 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover active:bg-primary-active transition-all disabled:opacity-50"
                                    >
                                        Search
                                    </button>
                                </div>

                                {selectedIpData ? (
                                    <div className="space-y-4 animate-fadeIn">
                                        <div className="p-4 bg-info-soft rounded-xl border border-info/25 flex justify-between items-center">
                                            <span className="font-bold text-info font-mono">{selectedIpData.ip}</span>
                                            <span className="text-xs font-bold text-primary">{selectedIpData.users.length} Users</span>
                                        </div>

                                        <div className="space-y-3">
                                            {selectedIpData.users.map(u => (
                                                <div key={u.id} className="p-4 rounded-xl border border-border bg-surface-elevated/30 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-foreground leading-tight">{u.name}</p>
                                                        <p className="text-xs text-muted mt-0.5">{u.email}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted">{u.role}</span>
                                                        <p className="text-[10px] text-muted mt-1">Reg: {u.registrationIp === selectedIpData.ip ? 'MATCH' : 'DIFF'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-surface-elevated/50 rounded-card border border-dashed border-border">
                                        <Globe size={18} className="mx-auto mb-4" />
                                        <p className="text-muted">Search an IP to see who has accessed the system from it.</p>
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
