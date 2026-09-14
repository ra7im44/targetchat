import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';

import { API_URL as API, getToken, isAuthError, redirectToLogin } from '../../../utils/apiConfig';

const LIMIT_FIELDS = [
    { key: 'maxChats', label: 'Chats' },
    { key: 'maxMessagesPerMonth', label: 'Messages / mo' },
    { key: 'maxWidgets', label: 'Widgets' },
    { key: 'maxMembers', label: 'Members' },
];

const emptyForm = () => ({
    name: '',
    description: '',
    priceMonthly: '0',
    priceYearly: '',
    trialDays: '0',
    maxChats: '-1',
    maxMessagesPerMonth: '-1',
    maxWidgets: '-1',
    maxMembers: '1',
    isActive: true,
    features: [],
});

export default function AdminPlansPage() {
    const router = useRouter();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    function authHeaders() {
        const token = getToken();
        if (!token) {
            router.replace('/login');
            return null;
        }
        return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    }

    async function fetchPlans() {
        const headers = authHeaders();
        if (!headers) return;
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/admin/plans`, { headers });
            if (isAuthError(res.status)) return redirectToLogin(router);
            if (res.ok) {
                const data = await res.json();
                setPlans(Array.isArray(data) ? data : (data.plans || []));
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    }

    function openCreate() {
        setEditing(null);
        setForm(emptyForm());
        setShowModal(true);
    }

    function openEdit(plan) {
        setEditing(plan);
        setForm({
            name: plan.name || '',
            description: plan.description || '',
            priceMonthly: String(plan.priceMonthly ?? 0),
            priceYearly: plan.priceYearly == null ? '' : String(plan.priceYearly),
            trialDays: String(plan.trialDays ?? 0),
            maxChats: String(plan.maxChats ?? -1),
            maxMessagesPerMonth: String(plan.maxMessagesPerMonth ?? -1),
            maxWidgets: String(plan.maxWidgets ?? -1),
            maxMembers: String(plan.maxMembers ?? 1),
            isActive: !!plan.isActive,
            features: Object.entries(plan.features || {}).map(([key, value]) => ({ key, value: !!value })),
        });
        setShowModal(true);
    }

    function setField(key, value) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    function addFeatureRow() {
        setForm((f) => ({ ...f, features: [...f.features, { key: '', value: true }] }));
    }

    function updateFeatureRow(i, patch) {
        setForm((f) => ({
            ...f,
            features: f.features.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
        }));
    }

    function removeFeatureRow(i) {
        setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
    }

    function buildPayload() {
        const num = (v, fallback) => {
            const n = v === '' || v == null ? fallback : Number(v);
            return Number.isFinite(n) ? n : fallback;
        };
        const features = {};
        for (const row of form.features) {
            const k = (row.key || '').trim();
            if (k) features[k] = !!row.value;
        }
        return {
            name: form.name.trim(),
            description: form.description.trim() || null,
            priceMonthly: num(form.priceMonthly, 0),
            priceYearly: form.priceYearly === '' ? null : num(form.priceYearly, 0),
            trialDays: Math.max(0, Math.trunc(num(form.trialDays, 0))),
            maxChats: Math.trunc(num(form.maxChats, -1)),
            maxMessagesPerMonth: Math.trunc(num(form.maxMessagesPerMonth, -1)),
            maxWidgets: Math.trunc(num(form.maxWidgets, -1)),
            maxMembers: Math.max(1, Math.trunc(num(form.maxMembers, 1))),
            isActive: !!form.isActive,
            features,
        };
    }

    async function handleSave(e) {
        e?.preventDefault();
        if (!form.name.trim()) {
            toast.error('Plan name is required');
            return;
        }
        const headers = authHeaders();
        if (!headers) return;
        try {
            setSaving(true);
            const payload = buildPayload();
            const url = editing ? `${API}/api/admin/plans/${editing.id}` : `${API}/api/admin/plans`;
            const res = await fetch(url, {
                method: editing ? 'PATCH' : 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            if (isAuthError(res.status)) return redirectToLogin(router);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Save failed');
            }
            toast.success(editing ? 'Plan updated' : 'Plan created');
            setShowModal(false);
            fetchPlans();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to save plan');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(plan) {
        if (!confirm(`Delete plan "${plan.name}"? Workspaces on this plan will need a new one.`)) return;
        const token = getToken();
        if (!token) return router.replace('/login');
        try {
            setDeletingId(plan.id);
            const res = await fetch(`${API}/api/admin/plans/${plan.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (isAuthError(res.status)) return redirectToLogin(router);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Delete failed (plan may be in use)');
            }
            toast.success('Plan deleted');
            fetchPlans();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to delete plan');
        } finally {
            setDeletingId(null);
        }
    }

    async function togglePlanStatus(plan) {
        const token = getToken();
        if (!token) return router.replace('/login');
        try {
            const res = await fetch(`${API}/api/admin/plans/${plan.id}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !plan.isActive }),
            });
            if (isAuthError(res.status)) return redirectToLogin(router);
            if (res.ok) fetchPlans();
        } catch (err) {
            console.error(err);
            toast.error('Failed to update plan');
        }
    }

    const fmtLimit = (v) => (v === -1 ? 'Unlimited' : Number(v).toLocaleString());

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Subscription Plans</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Create plans, set prices, limits and feature flags</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/billing"
                            className="px-4 py-2.5 bg-gray-200 dark:bg-white/10 rounded-xl hover:opacity-80 transition-colors text-black dark:text-white text-sm font-semibold"
                        >
                            ← Back to Billing
                        </Link>
                        <button
                            onClick={openCreate}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/25 transition-colors"
                        >
                            + New Plan
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="p-6 rounded-2xl h-72 animate-pulse bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"></div>
                        ))
                    ) : plans.length === 0 ? (
                        <div className="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
                            <div className="text-4xl mb-3">📦</div>
                            <p className="font-semibold">No plans yet</p>
                            <p className="text-sm mt-1">Create your first plan to start selling.</p>
                        </div>
                    ) : (
                        plans.map(plan => (
                            <div key={plan.id} className={`p-6 rounded-2xl border transition-all bg-white dark:bg-white/[0.03] flex flex-col ${plan.isActive ? 'border-gray-200 dark:border-white/10' : 'border-gray-200 dark:border-white/10 opacity-75'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{plan.name}</h3>
                                    <span className={`px-2.5 py-1 text-[11px] rounded-full font-bold ${plan.isActive
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                        : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                                        }`}>
                                        {plan.isActive ? 'ACTIVE' : 'HIDDEN'}
                                    </span>
                                </div>
                                {plan.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{plan.description}</p>
                                )}

                                <div className="mb-4">
                                    <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                        ${plan.priceMonthly}</span>
                                    <span className="text-gray-500 text-sm">/mo</span>
                                    {plan.priceYearly != null && (
                                        <span className="text-gray-500 text-sm"> · ${plan.priceYearly}/yr</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                                    {[['Chats', plan.maxChats], ['Msgs/mo', plan.maxMessagesPerMonth], ['Widgets', plan.maxWidgets], ['Members', plan.maxMembers]].map(([label, v]) => (
                                        <div key={label} className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wider text-gray-400">{label}</div>
                                            <div className="font-bold text-gray-900 dark:text-white">{fmtLimit(v)}</div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Trial: {plan.trialDays ?? 0} days</p>

                                {plan.features && Object.keys(plan.features).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {Object.entries(plan.features).map(([k, v]) => (
                                            <span key={k} className={`px-2 py-0.5 text-[11px] font-mono rounded-md ${v ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-400 dark:bg-white/5 line-through'}`}>
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10 flex items-center gap-2">
                                    <button
                                        onClick={() => openEdit(plan)}
                                        className="flex-1 py-2 text-sm font-bold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 rounded-lg transition-colors text-gray-800 dark:text-white"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(plan)}
                                        disabled={deletingId === plan.id}
                                        className="flex-1 py-2 text-sm font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {deletingId === plan.id ? '...' : 'Delete'}
                                    </button>
                                    <label className="flex items-center cursor-pointer ml-1" title={plan.isActive ? 'Visible to users' : 'Hidden from users'}>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={!!plan.isActive}
                                                onChange={() => togglePlanStatus(plan)}
                                            />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${plan.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/15'} `}></div>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${plan.isActive ? 'translate-x-4' : ''} `}></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
                    <form onSubmit={handleSave} className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">
                            {editing ? 'Edit Plan' : 'New Plan'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {editing ? `Updating "${editing.name}" — changes apply to new checkouts immediately.` : 'Define pricing, limits (-1 = unlimited) and feature flags.'}
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <label className="block sm:col-span-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Plan name *</span>
                                <input value={form.name} onChange={(e) => setField('name', e.target.value)}
                                    placeholder="Pro" required
                                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none text-gray-900 dark:text-white" />
                            </label>
                            <label className="block sm:col-span-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</span>
                                <input value={form.description} onChange={(e) => setField('description', e.target.value)}
                                    placeholder="For professionals and small teams"
                                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none text-gray-900 dark:text-white" />
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Price / month (USD)</span>
                                <input type="number" min="0" step="0.01" value={form.priceMonthly} onChange={(e) => setField('priceMonthly', e.target.value)}
                                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none text-gray-900 dark:text-white" />
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Price / year (empty = none)</span>
                                <input type="number" min="0" step="0.01" value={form.priceYearly} onChange={(e) => setField('priceYearly', e.target.value)}
                                    placeholder="e.g. 190"
                                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none text-gray-900 dark:text-white" />
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Trial days</span>
                                <input type="number" min="0" step="1" value={form.trialDays} onChange={(e) => setField('trialDays', e.target.value)}
                                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none text-gray-900 dark:text-white" />
                            </label>
                            <div className="flex items-center gap-3 pt-6">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)}
                                        className="w-4 h-4 accent-blue-600" />
                                    Visible to users
                                </label>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Limits <span className="normal-case font-normal">(−1 = unlimited)</span></div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {LIMIT_FIELDS.map(({ key, label }) => (
                                    <label key={key} className="block">
                                        <span className="text-xs text-gray-500">{label}</span>
                                        <input type="number" step="1" value={form[key]} onChange={(e) => setField(key, e.target.value)}
                                            className="mt-1 w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none text-gray-900 dark:text-white font-mono" />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Feature flags</div>
                                <button type="button" onClick={addFeatureRow}
                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">+ Add feature</button>
                            </div>
                            {form.features.length === 0 ? (
                                <p className="text-xs text-gray-400">No flags — add keys like <code className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">priority_support</code> to gate features in code via <code className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">plan.hasFeature(key)</code>.</p>
                            ) : (
                                <div className="space-y-2">
                                    {form.features.map((row, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input value={row.key} onChange={(e) => updateFeatureRow(i, { key: e.target.value })}
                                                placeholder="feature_key"
                                                className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-500 outline-none font-mono text-sm text-gray-900 dark:text-white" />
                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
                                                <input type="checkbox" checked={row.value} onChange={(e) => updateFeatureRow(i, { value: e.target.checked })}
                                                    className="w-4 h-4 accent-emerald-500" />
                                                On
                                            </label>
                                            <button type="button" onClick={() => removeFeatureRow(i)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Remove">
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                                className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors text-gray-800 dark:text-white disabled:opacity-50">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving}
                                className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition-colors disabled:opacity-50">
                                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Plan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
}
