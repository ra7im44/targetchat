import { useState, useEffect } from 'react';

const KNOWN_FEATURES = [
    { key: 'removeBranding', label: 'Remove Branding' },
    { key: 'workflows', label: 'Advanced Workflows' },
    { key: 'apiAccess', label: 'API Access' },
];

const numOr = (v, fb) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fb;
};

const intOr = (v, fb) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fb;
};

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-300/80 dark:border-white/10 bg-white dark:bg-white/5 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none transition-colors';
const monoCls = `${inputCls} text-xs font-mono`;
const labelCls = 'block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300';
const miniLabelCls = 'block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5';

export default function PlanModal({ plan, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priceMonthly: 0,
        priceYearly: 0,
        stripePriceIdMonthly: '',
        stripePriceIdYearly: '',
        paypalPlanIdMonthly: '',
        paypalPlanIdYearly: '',
        trialDays: 0,
        maxChats: -1,
        maxMessagesPerMonth: -1,
        maxWidgets: -1,
        maxMembers: 1,
        isActive: true,
        features: {
            removeBranding: false,
            workflows: false,
            apiAccess: false
        },
        customFeatures: []
    });

    useEffect(() => {
        if (plan) {
            const known = {};
            for (const { key } of KNOWN_FEATURES) known[key] = !!plan.features?.[key];
            const custom = Object.entries(plan.features || {})
                .filter(([k]) => !KNOWN_FEATURES.some(({ key }) => key === k))
                .map(([key, value]) => ({ key, value: !!value }));
            setFormData({
                name: plan.name || '',
                description: plan.description || '',
                priceMonthly: plan.priceMonthly ?? 0,
                priceYearly: plan.priceYearly ?? 0,
                stripePriceIdMonthly: plan.stripePriceIdMonthly || '',
                stripePriceIdYearly: plan.stripePriceIdYearly || '',
                paypalPlanIdMonthly: plan.paypalPlanIdMonthly || '',
                paypalPlanIdYearly: plan.paypalPlanIdYearly || '',
                trialDays: plan.trialDays ?? 0,
                maxChats: plan.maxChats ?? -1,
                maxMessagesPerMonth: plan.maxMessagesPerMonth ?? -1,
                maxWidgets: plan.maxWidgets !== undefined ? plan.maxWidgets : -1,
                maxMembers: plan.maxMembers !== undefined ? plan.maxMembers : 1,
                isActive: !!plan.isActive,
                features: known,
                customFeatures: custom
            });
        }
    }, [plan]);

    const set = (patch) => setFormData((f) => ({ ...f, ...patch }));
    const setFeature = (key, value) => setFormData((f) => ({ ...f, features: { ...f.features, [key]: value } }));

    const handleSubmit = (e) => {
        e.preventDefault();
        const features = { ...formData.features };
        for (const row of formData.customFeatures) {
            const k = (row.key || '').trim();
            if (k) features[k] = !!row.value;
        }
        onSave({
            name: (formData.name || '').trim(),
            description: (formData.description || '').trim() || null,
            priceMonthly: numOr(formData.priceMonthly, 0),
            priceYearly: formData.priceYearly === '' || formData.priceYearly == null ? null : numOr(formData.priceYearly, 0),
            stripePriceIdMonthly: formData.stripePriceIdMonthly || null,
            stripePriceIdYearly: formData.stripePriceIdYearly || null,
            paypalPlanIdMonthly: formData.paypalPlanIdMonthly || null,
            paypalPlanIdYearly: formData.paypalPlanIdYearly || null,
            trialDays: Math.max(0, intOr(formData.trialDays, 0)),
            maxChats: intOr(formData.maxChats, -1),
            maxMessagesPerMonth: intOr(formData.maxMessagesPerMonth, -1),
            maxWidgets: intOr(formData.maxWidgets, -1),
            maxMembers: Math.max(1, intOr(formData.maxMembers, 1)),
            isActive: !!formData.isActive,
            features
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
            <div className="w-full max-w-2xl my-auto rounded-2xl shadow-2xl overflow-hidden animate-scaleIn bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-white/90 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {plan ? 'Edit Plan' : 'Create New Plan'}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pricing, limits and feature flags</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-7 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em]">General Information</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Plan Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => set({ name: e.target.value })}
                                    className={inputCls}
                                    placeholder="e.g. Enterprise"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Description</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => set({ description: e.target.value })}
                                    className={inputCls}
                                    placeholder="Who is this plan for?"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Monthly Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={formData.priceMonthly}
                                    onChange={(e) => set({ priceMonthly: e.target.value })}
                                    className={`${inputCls} font-mono`}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Yearly Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.priceYearly}
                                    onChange={(e) => set({ priceYearly: e.target.value })}
                                    className={`${inputCls} font-mono`}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Trial Days</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={formData.trialDays}
                                    onChange={(e) => set({ trialDays: e.target.value })}
                                    className={`${inputCls} font-mono`}
                                />
                            </div>
                            <label className="flex items-center gap-2.5 cursor-pointer pt-7 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => set({ isActive: e.target.checked })}
                                    className="w-4 h-4 accent-blue-600"
                                />
                                Visible to users
                            </label>
                        </div>
                    </section>

                    <section className="border-t border-gray-100 dark:border-white/10 pt-6 space-y-4">
                        <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em]">Gateway IDs (PRO)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div>
                                    <label className={miniLabelCls}>Stripe Monthly ID</label>
                                    <input
                                        type="text"
                                        value={formData.stripePriceIdMonthly}
                                        onChange={(e) => set({ stripePriceIdMonthly: e.target.value })}
                                        className={monoCls}
                                        placeholder="price_..."
                                    />
                                </div>
                                <div>
                                    <label className={miniLabelCls}>Stripe Yearly ID</label>
                                    <input
                                        type="text"
                                        value={formData.stripePriceIdYearly}
                                        onChange={(e) => set({ stripePriceIdYearly: e.target.value })}
                                        className={monoCls}
                                        placeholder="price_..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className={miniLabelCls}>PayPal Monthly ID</label>
                                    <input
                                        type="text"
                                        value={formData.paypalPlanIdMonthly}
                                        onChange={(e) => set({ paypalPlanIdMonthly: e.target.value })}
                                        className={monoCls}
                                        placeholder="P-..."
                                    />
                                </div>
                                <div>
                                    <label className={miniLabelCls}>PayPal Yearly ID</label>
                                    <input
                                        type="text"
                                        value={formData.paypalPlanIdYearly}
                                        onChange={(e) => set({ paypalPlanIdYearly: e.target.value })}
                                        className={monoCls}
                                        placeholder="P-..."
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-gray-100 dark:border-white/10 pt-6 space-y-4">
                        <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em]">Resource Limits <span className="normal-case font-medium text-gray-400">(−1 = unlimited)</span></h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                ['maxChats', 'Max Chats'],
                                ['maxMessagesPerMonth', 'Max Msgs / Mo'],
                                ['maxWidgets', 'Max Widgets'],
                                ['maxMembers', 'Max Members'],
                            ].map(([key, label]) => (
                                <div key={key}>
                                    <label className={labelCls}>{label}</label>
                                    <input
                                        type="number"
                                        step="1"
                                        required
                                        value={formData[key]}
                                        onChange={(e) => set({ [key]: e.target.value })}
                                        className={`${inputCls} font-mono`}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="border-t border-gray-100 dark:border-white/10 pt-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em]">Feature Toggles</span>
                            <button
                                type="button"
                                onClick={() => setFormData((f) => ({ ...f, customFeatures: [...f.customFeatures, { key: '', value: true }] }))}
                                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                + Custom flag
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                            {KNOWN_FEATURES.map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.features[key]}
                                        onChange={(e) => setFeature(key, e.target.checked)}
                                        className="w-5 h-5 accent-blue-600 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{label}</span>
                                </label>
                            ))}
                        </div>
                        {formData.customFeatures.length > 0 && (
                            <div className="space-y-2 mt-3">
                                {formData.customFeatures.map((row, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            value={row.key}
                                            onChange={(e) => setFormData((f) => ({
                                                ...f,
                                                customFeatures: f.customFeatures.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)),
                                            }))}
                                            placeholder="feature_key"
                                            className={`${inputCls} font-mono text-sm flex-1`}
                                        />
                                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!row.value}
                                                onChange={(e) => setFormData((f) => ({
                                                    ...f,
                                                    customFeatures: f.customFeatures.map((r, idx) => (idx === i ? { ...r, value: e.target.checked } : r)),
                                                }))}
                                                className="w-4 h-4 accent-emerald-500"
                                            />
                                            On
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData((f) => ({ ...f, customFeatures: f.customFeatures.filter((_, idx) => idx !== i) }))}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900 py-4 -mb-6 -mx-6 px-6">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                            Cancel
                        </button>
                        <button type="submit" className="px-8 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold shadow-md shadow-blue-600/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                            {plan ? 'Save Changes' : 'Create Plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
