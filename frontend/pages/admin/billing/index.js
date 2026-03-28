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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
                        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                            <CreditCard className="text-blue-600" size={40} />
                            Billing Center
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg font-medium">
                            One dashboard to rule all payments, plans, and promotional offers.
                        </p>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                        {['subscribers', 'plans', 'coupons', 'logs'].map((t) => (
                            <button
                                key={t}
                                onClick={() => {
                                    setActiveTab(t);
                                    router.push(`/admin/billing?tab=${t}`, undefined, { shallow: true });
                                }}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${activeTab === t
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Log Event Details</h2>
                        <p className="text-xs text-gray-400 font-mono tracking-tighter mt-1">{log.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all">
                        <XCircle size={24} className="text-gray-400" />
                    </button>
                </div>
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gateway</label>
                            <div className="text-sm font-bold text-gray-900 dark:text-white uppercase">{log.gateway}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Event Type</label>
                            <div className="text-sm font-bold text-gray-900 dark:text-white uppercase">{log.eventType}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                            <div className={`text-sm font-bold uppercase ${log.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{log.status}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">External ID</label>
                            <div className="text-sm font-bold text-gray-400 font-mono break-all">{log.externalId || 'N/A'}</div>
                        </div>
                    </div>

                    {log.error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl">
                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-2">Error Message</label>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{log.error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Raw Payload Data</label>
                        <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-[11px] font-mono text-gray-600 dark:text-gray-400 overflow-x-auto border border-gray-100 dark:border-gray-700">
                            {JSON.stringify(log.payload, null, 2)}
                        </pre>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">Close</button>
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
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="text-blue-500" size={24} />
                        Active Subscriptions
                    </h2>
                    <select
                        value={subFilterStatus}
                        onChange={(e) => setSubFilterStatus(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-bold outline-none cursor-pointer"
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
                        <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Plan</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Gateway</th>
                                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-400">Loading subscribers...</td></tr>
                            ) : subscriptions.length === 0 ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-medium">No subscriptions yet.</td></tr>
                            ) : (
                                subscriptions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                                    {sub.user?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{sub.user?.name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500 font-medium">{sub.user?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-bold text-gray-700 dark:text-gray-300">
                                            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">{sub.plan?.name}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tight ${sub.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500'}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                                                {sub.gateway === 'paypal' ? <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" className="h-3 rounded" /> : <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                                {sub.gateway}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-mono font-bold text-gray-900 dark:text-white">
                                            ${sub.plan?.priceMonthly}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-8 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm font-bold text-gray-500">
                    <span>Page {subPage} of {subTotalPages}</span>
                    <div className="flex gap-2">
                        <button disabled={subPage === 1} onClick={() => setSubPage(p => p - 1)} className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 disabled:opacity-30">Previous</button>
                        <button disabled={subPage >= subTotalPages} onClick={() => setSubPage(p => p + 1)} className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 disabled:opacity-30">Next</button>
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
                <button onClick={onCreate} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
                    <Plus size={20} /> Create New Plan
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none transition-all duration-500 border-b-8 border-b-blue-500">
                        <div className="absolute top-6 right-6">
                            {plan.isActive ? (
                                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Active</span>
                            ) : (
                                <span className="bg-gray-100 text-gray-400 dark:bg-gray-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Inactive</span>
                            )}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                        <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-8 flex items-baseline gap-1">
                            ${plan.priceMonthly}<span className="text-sm font-bold text-gray-400 uppercase tracking-tighter">/ monthly</span>
                        </div>

                        <div className="space-y-4 mb-10 overflow-hidden">
                            <FeatureRow icon={MessageSquare} label="Max Chats" value={plan.maxChats} />
                            <FeatureRow icon={Zap} label="Messages/mo" value={plan.maxMessagesPerMonth} />
                            <FeatureRow icon={Shield} label="Max Widgets" value={plan.maxWidgets} />
                            <FeatureRow icon={Users} label="Team Members" value={plan.maxMembers} />
                            <FeatureRow icon={Activity} label="Branding" value={plan.features?.removeBranding ? "Hidden" : "Visible"} success={plan.features?.removeBranding} />
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => onEdit(plan)} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold hover:bg-blue-600 hover:text-white transition-all transform active:scale-95">Edit Plan</button>
                            <button onClick={() => onDelete(plan.id)} className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"><Trash2 size={20} /></button>
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
                <button onClick={onCreate} className="px-6 py-3 bg-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-pink-500/30 hover:bg-pink-700 active:scale-95 transition-all flex items-center gap-2">
                    <Plus size={20} /> New Coupon
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Coupon Code</th>
                            <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Discount</th>
                            <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Activity</th>
                            <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {coupons.map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-2xl"><Tag size={20} /></div>
                                        <div>
                                            <div className="text-lg font-black text-gray-900 dark:text-white font-mono">{c.code}</div>
                                            <div className="text-xs text-gray-500 font-medium">{c.description}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <Percent size={14} /> {c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue}`}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-sm font-bold text-gray-500">
                                    <span className="text-gray-900 dark:text-white">{c.timesRedeemed}</span> / {c.maxRedemptions || '∞'} redemptions
                                </td>
                                <td className="px-8 py-5">
                                    {c.isActive ? <span className="text-emerald-500 flex items-center gap-1 text-[10px] font-black uppercase"><CheckCircle size={14} /> Active</span> : <span className="text-gray-400 flex items-center gap-1 text-[10px] font-black uppercase"><XCircle size={14} /> Expired</span>}
                                </td>
                                <td className="px-8 py-5 text-right flex justify-end gap-2">
                                    <button onClick={() => onEdit(c)} className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-indigo-500 hover:text-white transition-all"><Edit2 size={18} /></button>
                                    <button onClick={() => onDelete(c.id)} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
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
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input type="text" placeholder="Search audit trail..." className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold" value={logSearch} onChange={e => setLogSearch(e.target.value)} />
                </div>
                <div className="flex gap-4">
                    <select value={logGateway} onChange={e => setLogGateway(e.target.value)} className="px-6 py-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none text-sm font-bold outline-none cursor-pointer">
                        <option value="all">All Gateways</option>
                        <option value="stripe">Stripe Only</option>
                        <option value="paypal">PayPal Only</option>
                        <option value="system">System Only</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Timestamp</th>
                            <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Event Source</th>
                            <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                            <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filtered.map(l => (
                            <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-5 text-xs font-bold text-gray-500">{new Date(l.created_at).toLocaleString()}</td>
                                <td className="px-8 py-5 font-bold text-sm text-gray-900 dark:text-white">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${l.gateway === 'stripe' ? 'bg-indigo-500' : l.gateway === 'paypal' ? 'bg-blue-300' : 'bg-gray-400'}`}></div>
                                        {l.gateway.toUpperCase()}
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="text-sm font-black text-gray-900 dark:text-white uppercase">{l.eventType}</div>
                                    <div className="text-[10px] text-gray-400 font-mono tracking-tighter truncate max-w-[150px]">{l.externalId}</div>
                                </td>
                                <td className="px-8 py-5">
                                    {l.status === 'success' ? (
                                        <span className="text-emerald-500 flex items-center gap-1 text-[10px] font-black uppercase"><CheckCircle size={14} /> Success</span>
                                    ) : (
                                        <span className="text-red-500 flex items-center gap-1 text-[10px] font-black uppercase"><AlertCircle size={14} /> {l.status || 'failed'}</span>
                                    )}
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                                        onClick={() => setSelectedLog(l)}
                                    >
                                        <Eye size={18} className="text-gray-400" />
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
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
        purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
        red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    };
    return (
        <div className={`p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between ${highlight ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-emerald-500/20 shadow-xl' : 'bg-white dark:bg-gray-800'}`}>
            <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-black uppercase tracking-widest ${highlight ? 'text-white/80' : 'text-gray-400'}`}>{label}</span>
                <div className={`p-2.5 rounded-2xl ${highlight ? 'bg-white/20 text-white' : colorMap[color]}`}><Icon size={20} /></div>
            </div>
            <div className={`text-3xl font-black ${highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{value}</div>
        </div>
    );
}

function FeatureRow({ icon: Icon, label, value, success }) {
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:translate-x-1 transition-transform cursor-default group">
            <span className="flex items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors">
                <Icon size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400" /> {label}
            </span>
            <span className={`text-sm font-black ${success === true || (typeof value === 'number' && value === -1) ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                {value === -1 ? 'Unlimited' : value}
            </span>
        </div>
    );
}
