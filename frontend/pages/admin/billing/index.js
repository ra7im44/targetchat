import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import PlanModal from '../../../components/admin/PlanModal';
import CouponModal from '../../../components/admin/CouponModal';
import { toast } from 'react-hot-toast';
import {
    CreditCard, CheckCircle, Gift, XCircle, DollarSign,
    BarChart, Settings, FileText, Tag, Activity,
    Plus, Trash2, Edit2, Search, Filter, Eye,
    Users, Clock, Percent, Zap, Shield, MessageSquare, AlertCircle
} from 'lucide-react';

import { API_URL as API } from '../../../utils/apiConfig';

export default function AdminBillingCenter() {
    const router = useRouter();
    const { tab } = router.query;
    const [activeTab, setActiveTab] = useState(tab || 'subscribers');

    // Shared State
    const [loading, setLoading] = useState(true);

    // Subscribers State
    const [subscriptions, setSubscriptions] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, trialing: 0, canceled: 0, mrr: 0 });
    const [subPage, setSubPage] = useState(1);
    const [subTotalPages, setSubTotalPages] = useState(1);
    const [subFilterStatus, setSubFilterStatus] = useState('all');

    // Plans State
    const [plans, setPlans] = useState([]);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    // Coupons State
    const [coupons, setCoupons] = useState([]);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    // Logs State
    const [logs, setLogs] = useState([]);
    const [logSearch, setLogSearch] = useState('');
    const [logGateway, setLogGateway] = useState('all');
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        if (tab) setActiveTab(tab);
    }, [tab]);

    useEffect(() => {
        loadData();
    }, [activeTab, subPage, subFilterStatus]);

    async function loadData() {
        const token = localStorage.getItem('tc_token');
        if (!token) return router.replace('/login');

        setLoading(true);
        try {
            if (activeTab === 'subscribers') {
                const [statsRes, subsRes] = await Promise.all([
                    fetch(`${API}/api/admin/billing/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API}/api/admin/billing/subscriptions?page=${subPage}&limit=10&status=${subFilterStatus}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                if (statsRes.ok) setStats(await statsRes.json());
                if (subsRes.ok) {
                    const data = await subsRes.json();
                    setSubscriptions(data.subscriptions);
                    setSubTotalPages(data.totalPages);
                }
            } else if (activeTab === 'plans') {
                const res = await fetch(`${API}/api/admin/plans`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setPlans(await res.json());
            } else if (activeTab === 'coupons') {
                const res = await fetch(`${API}/api/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setCoupons(await res.json());
            } else if (activeTab === 'logs') {
                const res = await fetch(`${API}/api/admin/billing/logs`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setLogs(await res.json());
            }
        } catch (err) {
            console.error('Error loading billing data:', err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    // --- Plan Handlers ---
    async function handleSavePlan(planData) {
        const token = localStorage.getItem('tc_token');
        const url = editingPlan ? `${API}/api/admin/plans/${editingPlan.id}` : `${API}/api/admin/plans`;
        const method = editingPlan ? 'PATCH' : 'POST';
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(planData)
            });
            if (res.ok) {
                toast.success(editingPlan ? 'Plan updated' : 'Plan created');
                setShowPlanModal(false);
                setEditingPlan(null);
                loadData();
            } else {
                toast.error('Failed to save plan');
            }
        } catch (err) {
            toast.error('Error saving plan');
        }
    }

    async function handleDeletePlan(id) {
        if (!confirm('Are you sure?')) return;
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/plans/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                toast.success('Plan deleted');
                loadData();
            }
        } catch (err) { toast.error('Error deleting plan'); }
    }

    // --- Coupon Handlers ---
    async function handleSaveCoupon(couponData) {
        const token = localStorage.getItem('tc_token');
        const url = editingCoupon ? `${API}/api/admin/coupons/${editingCoupon.id}` : `${API}/api/admin/coupons`;
        const method = editingCoupon ? 'PATCH' : 'POST';
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(couponData)
            });
            if (res.ok) {
                toast.success('Coupon saved');
                setShowCouponModal(false);
                setEditingCoupon(null);
                loadData();
            } else { toast.error('Failed to save coupon'); }
        } catch (err) { toast.error('Error saving coupon'); }
    }

    async function handleDeleteCoupon(id) {
        if (!confirm('Delete coupon?')) return;
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/admin/coupons/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { toast.success('Coupon deleted'); loadData(); }
        } catch (err) { toast.error('Error deleting coupon'); }
    }

    return (
        <AdminLayout title="Billing Center">
            <div className="space-y-8 animate-fadeIn">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-4">
                            <CreditCard className="text-primary" size={18} />
                            Billing Center
                        </h1>
                        <p className="text-muted mt-2 text-lg font-medium">
                            One dashboard to rule all payments, plans, and promotional offers.
                        </p>
                    </div>

                    <div className="flex bg-surface-elevated p-1.5 rounded-card shadow-sm border border-border">
                        {['subscribers', 'plans', 'coupons', 'logs'].map((t) => (
                            <button
                                key={t}
                                onClick={() => {
                                    setActiveTab(t);
                                    router.push(`/admin/billing?tab=${t}`, undefined, { shallow: true });
                                }}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${activeTab === t
                                    ? 'bg-primary text-white shadow-lg '
                                    : 'text-muted hover:text-foreground dark:hover:text-white'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content Wrappers */}
                <div className="min-h-[60vh]">
                    {activeTab === 'subscribers' && <SubscribersTab stats={stats} subscriptions={subscriptions} loading={loading} subPage={subPage} setSubPage={setSubPage} subTotalPages={subTotalPages} subFilterStatus={subFilterStatus} setSubFilterStatus={setSubFilterStatus} />}
                    {activeTab === 'plans' && <PlansTab plans={plans} loading={loading} onEdit={(p) => { setEditingPlan(p); setShowPlanModal(true); }} onDelete={handleDeletePlan} onCreate={() => { setEditingPlan(null); setShowPlanModal(true); }} />}
                    {activeTab === 'coupons' && <CouponsTab coupons={coupons} loading={loading} onEdit={(c) => { setEditingCoupon(c); setShowCouponModal(true); }} onDelete={handleDeleteCoupon} onCreate={() => { setEditingCoupon(null); setShowCouponModal(true); }} />}
                    {activeTab === 'logs' && <LogsTab logs={logs} loading={loading} logSearch={logSearch} setLogSearch={setLogSearch} logGateway={logGateway} setLogGateway={setLogGateway} setSelectedLog={setSelectedLog} />}
                </div>

                {/* Modals */}
                {showPlanModal && <PlanModal plan={editingPlan} onClose={() => setShowPlanModal(false)} onSave={handleSavePlan} />}
                {showCouponModal && (
                    <CouponModal
                        isOpen={showCouponModal}
                        onClose={() => { setShowCouponModal(false); setEditingCoupon(null); }}
                        onSubmit={handleSaveCoupon}
                        editingCoupon={editingCoupon}
                    />
                )}

                {selectedLog && (
                    <LogDetailModal
                        log={selectedLog}
                        onClose={() => setSelectedLog(null)}
                    />
                )}
            </div>
        </AdminLayout>
    );
}

function LogDetailModal({ log, onClose }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-surface w-full max-w-2xl rounded-modal shadow-lg border border-border overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center bg-surface-elevated/50">
                    <div>
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">Log Event Details</h2>
                        <p className="text-xs text-muted font-mono tracking-tighter mt-1">{log.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface-hover dark:hover:bg-surface-hover rounded-xl transition-all">
                        <XCircle size={18} />
                    </button>
                </div>
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Gateway</label>
                            <div className="text-sm font-bold text-foreground uppercase">{log.gateway}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Event Type</label>
                            <div className="text-sm font-bold text-foreground uppercase">{log.eventType}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Status</label>
                            <div className={`text-sm font-bold uppercase ${log.status === 'success' ? 'text-success' : 'text-danger-ink'}`}>{log.status}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest">External ID</label>
                            <div className="text-sm font-bold text-muted font-mono break-all">{log.externalId || 'N/A'}</div>
                        </div>
                    </div>

                    {log.error && (
                        <div className="p-4 bg-danger/10 border border-danger/25 rounded-card">
                            <label className="text-[10px] font-bold text-danger uppercase tracking-widest block mb-2">Error Message</label>
                            <p className="text-sm text-danger font-medium">{log.error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Raw Payload Data</label>
                        <pre className="p-4 bg-background rounded-card text-[11px] font-mono text-muted overflow-x-auto border border-border">
                            {JSON.stringify(log.payload, null, 2)}
                        </pre>
                    </div>
                </div>
                <div className="p-6 bg-background border-t border-border flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 bg-surface-elevated text-foreground rounded-xl font-bold text-sm hover:bg-surface-hover transition-all">Close</button>
                </div>
            </div>
        </div>
    );
}

// --- Sub-components (Tabs) ---

function SubscribersTab({ stats, subscriptions, loading, subPage, setSubPage, subTotalPages, subFilterStatus, setSubFilterStatus }) {
    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard label="Total Subs" value={stats?.total || 0} icon={CreditCard} color="blue" />
                <StatCard label="Active" value={stats?.active || 0} icon={CheckCircle} color="emerald" />
                <StatCard label="Trialing" value={stats?.trialing || 0} icon={Gift} color="purple" />
                <StatCard label="Canceled" value={stats?.canceled || 0} icon={XCircle} color="red" />
                <StatCard label="MRR" value={`$${(stats?.mrr || 0).toFixed(2)}`} icon={DollarSign} color="emerald" highlight />
            </div>

            {/* Subscriber Table */}
            <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
                <div className="px-8 py-6 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Users size={18} />
                        Active Subscriptions
                    </h2>
                    <select
                        value={subFilterStatus}
                        onChange={(e) => setSubFilterStatus(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-background border border-border text-sm font-bold outline-none cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="trialing">Trialing</option>
                        <option value="canceled">Canceled</option>
                        <option value="past_due">Past Due</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surface-elevated/50">
                            <tr>
                                <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest">User</th>
                                <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest">Plan</th>
                                <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest">Gateway</th>
                                <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-muted">Loading subscribers...</td></tr>
                            ) : subscriptions.length === 0 ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-muted font-medium">No subscriptions yet.</td></tr>
                            ) : (
                                subscriptions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-surface-hover/50 dark:hover:bg-surface-hover/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-bold">
                                                    {sub.user?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-foreground">{sub.user?.name || 'Unknown'}</div>
                                                    <div className="text-xs text-muted font-medium">{sub.user?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-bold text-secondary">
                                            <span className="bg-surface-elevated px-3 py-1 rounded-lg">{sub.plan?.name}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${sub.status === 'active' ? 'bg-success-soft text-success-ink' : 'bg-surface-elevated text-muted'}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-bold text-muted uppercase flex items-center gap-1.5">
                                                {sub.gateway === 'paypal' ? <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" className="h-3 rounded" /> : <span className="w-2 h-2 rounded-full bg-primary"></span>}
                                                {sub.gateway}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-mono font-bold text-foreground">
                                            ${sub.plan?.priceMonthly}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-8 py-4 border-t border-border flex justify-between items-center text-sm font-bold text-muted">
                    <span>Page {subPage} of {subTotalPages}</span>
                    <div className="flex gap-2">
                        <button disabled={subPage === 1} onClick={() => setSubPage(p => p - 1)} className="px-4 py-2 rounded-xl bg-background hover:bg-surface-hover disabled:opacity-30">Previous</button>
                        <button disabled={subPage >= subTotalPages} onClick={() => setSubPage(p => p + 1)} className="px-4 py-2 rounded-xl bg-background hover:bg-surface-hover disabled:opacity-30">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlansTab({ plans, loading, onEdit, onDelete, onCreate }) {
    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-end">
                <button onClick={onCreate} className="px-6 py-3 bg-primary text-white rounded-card font-bold shadow-lg hover:bg-primary-hover active:bg-primary-active active:scale-95 transition-all flex items-center gap-2">
                    <Plus size={18} /> Create New Plan
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-surface p-8 rounded-card shadow-sm border border-border relative overflow-hidden group hover:shadow-lg dark:hover:shadow-none transition-all duration-500 border-b-8 border-b-accent">
                        <div className="absolute top-6 right-6">
                            {plan.isActive ? (
                                <span className="bg-success-soft text-success-ink px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Active</span>
                            ) : (
                                <span className="bg-surface-elevated text-muted px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Inactive</span>
                            )}
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                        <div className="text-4xl font-bold text-primary mb-8 flex items-baseline gap-1">
                            ${plan.priceMonthly}<span className="text-sm font-bold text-muted uppercase tracking-tighter">/ monthly</span>
                        </div>

                        <div className="space-y-4 mb-10 overflow-hidden">
                            <FeatureRow icon={MessageSquare} label="Max Chats" value={plan.maxChats} />
                            <FeatureRow icon={Zap} label="Messages/mo" value={plan.maxMessagesPerMonth} />
                            <FeatureRow icon={Shield} label="Max Widgets" value={plan.maxWidgets} />
                            <FeatureRow icon={Users} label="Team Members" value={plan.maxMembers} />
                            <FeatureRow icon={Activity} label="Branding" value={plan.features?.removeBranding ? "Hidden" : "Visible"} success={plan.features?.removeBranding} />
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => onEdit(plan)} className="flex-1 py-3 rounded-card bg-surface-elevated text-foreground font-bold hover:bg-primary hover:text-background transition-all transform active:scale-95">Edit Plan</button>
                            <button onClick={() => onDelete(plan.id)} className="w-12 h-12 rounded-card bg-danger/10 text-danger flex items-center justify-center hover:bg-danger-soft0 hover:text-white transition-all active:scale-90"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CouponsTab({ coupons, loading, onEdit, onDelete, onCreate }) {
    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-end">
                <button onClick={onCreate} className="px-6 py-3 bg-primary text-primary-foreground rounded-card font-bold shadow-lg hover:bg-primary-hover active:scale-95 transition-all flex items-center gap-2">
                    <Plus size={18} /> New Coupon
                </button>
            </div>
            <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-surface-elevated/50 border-b border-border">
                        <tr>
                            <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest">Coupon Code</th>
                            <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest">Discount</th>
                            <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest">Activity</th>
                            <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {coupons.map((c) => (
                            <tr key={c.id} className="hover:bg-surface-hover/50 dark:hover:bg-surface-hover/30 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-accent-soft text-accent rounded-card"><Tag size={18} /></div>
                                        <div>
                                            <div className="text-lg font-bold text-foreground font-mono">{c.code}</div>
                                            <div className="text-xs text-muted font-medium">{c.description}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-sm font-bold text-success flex items-center gap-1">
                                        <Percent size={16} /> {c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue}`}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-sm font-bold text-muted">
                                    <span className="text-foreground">{c.timesRedeemed}</span> / {c.maxRedemptions || '∞'} redemptions
                                </td>
                                <td className="px-8 py-5">
                                    {c.isActive ? <span className="text-success-ink flex items-center gap-1 text-[10px] font-bold uppercase"><CheckCircle size={16} /> Active</span> : <span className="text-muted flex items-center gap-1 text-[10px] font-bold uppercase"><XCircle size={16} /> Expired</span>}
                                </td>
                                <td className="px-8 py-5 text-right flex justify-end gap-2">
                                    <button onClick={() => onEdit(c)} className="p-2.5 rounded-xl bg-surface-elevated hover:bg-primary-hover active:bg-primary-active hover:text-background transition-all"><Edit2 size={18} /></button>
                                    <button onClick={() => onDelete(c.id)} className="p-2.5 rounded-xl bg-danger/10 text-danger hover:bg-danger-soft0 hover:text-white transition-all"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function LogsTab({ logs, loading, logSearch, setLogSearch, logGateway, setLogGateway, setSelectedLog }) {
    if (loading && (!logs || logs.length === 0)) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const filtered = (logs || []).filter(l =>
        ((l.externalId || '').toLowerCase().includes(logSearch.toLowerCase()) ||
            (l.user?.name || '').toLowerCase().includes(logSearch.toLowerCase()) ||
            (l.user?.email || '').toLowerCase().includes(logSearch.toLowerCase())) &&
        (logGateway === 'all' || l.gateway === logGateway)
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-surface p-6 rounded-card shadow-sm border border-border">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" />
                    <input type="text" placeholder="Search audit trail..." className="w-full pl-12 pr-4 py-3 bg-background rounded-card border-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold" value={logSearch} onChange={e => setLogSearch(e.target.value)} />
                </div>
                <div className="flex gap-4">
                    <select value={logGateway} onChange={e => setLogGateway(e.target.value)} className="px-6 py-3 bg-background rounded-card border-none text-sm font-bold outline-none cursor-pointer">
                        <option value="all">All Gateways</option>
                        <option value="stripe">Stripe Only</option>
                        <option value="paypal">PayPal Only</option>
                        <option value="system">System Only</option>
                    </select>
                </div>
            </div>

            <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-background border-b border-border">
                        <tr>
                            <th className="px-8 py-4 text-xs font-bold text-muted uppercase tracking-widest">Timestamp</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted uppercase tracking-widest">Event Source</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted uppercase tracking-widest">Action</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted uppercase tracking-widest">Status</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted uppercase tracking-widest text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(l => (
                            <tr key={l.id} className="hover:bg-surface-hover/50 transition-colors">
                                <td className="px-8 py-5 text-xs font-bold text-muted">{new Date(l.created_at).toLocaleString()}</td>
                                <td className="px-8 py-5 font-bold text-sm text-foreground">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${l.gateway === 'stripe' ? 'bg-primary' : l.gateway === 'paypal' ? 'bg-info' : 'bg-border-strong'}`}></div>
                                        {l.gateway.toUpperCase()}
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="text-sm font-bold text-foreground uppercase">{l.eventType}</div>
                                    <div className="text-[10px] text-muted font-mono tracking-tighter truncate max-w-[150px]">{l.externalId}</div>
                                </td>
                                <td className="px-8 py-5">
                                    {l.status === 'success' ? (
                                        <span className="text-success flex items-center gap-1 text-[10px] font-bold uppercase"><CheckCircle size={16} /> Success</span>
                                    ) : (
                                        <span className="text-danger flex items-center gap-1 text-[10px] font-bold uppercase"><AlertCircle size={16} /> {l.status || 'failed'}</span>
                                    )}
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button
                                        className="p-2 hover:bg-surface-hover rounded-xl transition-all"
                                        onClick={() => setSelectedLog(l)}
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Small Helpers ---

function StatCard({ label, value, icon: Icon, color, highlight, highlightColor }) {
    const colorMap = {
        blue: 'text-primary bg-primary/10',
        emerald: 'text-success bg-success/10',
        purple: 'text-accent bg-accent/10',
        red: 'text-danger bg-danger/10',
    };
    return (
        <div className={`p-8 rounded-card shadow-sm border border-border flex flex-col justify-between ${highlight ? 'bg-success text-success-foreground border-none shadow-lg' : 'bg-surface'}`}>
            <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold uppercase tracking-widest ${highlight ? 'text-success-foreground/90' : 'text-muted'}`}>{label}</span>
                <div className={`p-2.5 rounded-card ${highlight ? 'bg-success-foreground/20 text-success-foreground' : colorMap[color]}`}><Icon size={18} /></div>
            </div>
            <div className={`text-3xl font-bold ${highlight ? 'text-success-foreground' : 'text-foreground'}`}>{value}</div>
        </div>
    );
}

function FeatureRow({ icon: Icon, label, value, success }) {
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-border last:border-0 hover:translate-x-1 transition-transform cursor-default group">
            <span className="flex items-center gap-3 text-sm font-bold text-muted group-hover:text-primary transition-colors">
                <Icon size={18} /> {label}
            </span>
            <span className={`text-sm font-bold ${success === true || (typeof value === 'number' && value === -1) ? 'text-success-ink' : 'text-foreground'}`}>
                {value === -1 ? 'Unlimited' : value}
            </span>
        </div>
    );
}
