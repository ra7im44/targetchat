import { useState, useEffect } from 'react';

export default function PlanModal({ plan, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        priceMonthly: 0,
        priceYearly: 0,
        stripePriceIdMonthly: '',
        stripePriceIdYearly: '',
        paypalPlanIdMonthly: '',
        paypalPlanIdYearly: '',
        maxChats: -1,
        maxMessagesPerMonth: -1,
        maxWidgets: -1,
        maxMembers: 1,
        isActive: true,
        features: {
            removeBranding: false,
            workflows: false,
            apiAccess: false
        }
    });

    useEffect(() => {
        if (plan) {
            setFormData({
                name: plan.name,
                priceMonthly: plan.priceMonthly,
                priceYearly: plan.priceYearly || 0,
                stripePriceIdMonthly: plan.stripePriceIdMonthly || '',
                stripePriceIdYearly: plan.stripePriceIdYearly || '',
                paypalPlanIdMonthly: plan.paypalPlanIdMonthly || '',
                paypalPlanIdYearly: plan.paypalPlanIdYearly || '',
                maxChats: plan.maxChats,
                maxMessagesPerMonth: plan.maxMessagesPerMonth,
                maxWidgets: plan.maxWidgets !== undefined ? plan.maxWidgets : -1,
                maxMembers: plan.maxMembers !== undefined ? plan.maxMembers : 1,
                isActive: plan.isActive,
                features: {
                    removeBranding: plan.features?.removeBranding || false,
                    workflows: plan.features?.workflows || false,
                    apiAccess: plan.features?.apiAccess || false,
                    ...plan.features
                }
            });
        }
    }, [plan]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
            <div className="glass-panel w-full max-w-2xl my-auto rounded-2xl shadow-2xl overflow-hidden animate-scaleIn border border-white/20">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {plan ? 'Edit Plan' : 'Create New Plan'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">General Information</h3>
                        <div>
                            <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Plan Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Enterprise"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Monthly Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.priceMonthly}
                                    onChange={(e) => setFormData({ ...formData, priceMonthly: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Yearly Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.priceYearly}
                                    onChange={(e) => setFormData({ ...formData, priceYearly: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700/50 pt-6 space-y-4">
                        <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Gateway IDs (PRO)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Stripe Monthly ID</label>
                                    <input
                                        type="text"
                                        value={formData.stripePriceIdMonthly}
                                        onChange={(e) => setFormData({ ...formData, stripePriceIdMonthly: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white text-xs font-mono"
                                        placeholder="price_..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Stripe Yearly ID</label>
                                    <input
                                        type="text"
                                        value={formData.stripePriceIdYearly}
                                        onChange={(e) => setFormData({ ...formData, stripePriceIdYearly: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white text-xs font-mono"
                                        placeholder="price_..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">PayPal Monthly ID</label>
                                    <input
                                        type="text"
                                        value={formData.paypalPlanIdMonthly}
                                        onChange={(e) => setFormData({ ...formData, paypalPlanIdMonthly: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white text-xs font-mono"
                                        placeholder="P-..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">PayPal Yearly ID</label>
                                    <input
                                        type="text"
                                        value={formData.paypalPlanIdYearly}
                                        onChange={(e) => setFormData({ ...formData, paypalPlanIdYearly: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white text-xs font-mono"
                                        placeholder="P-..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700/50 pt-6 space-y-4">
                        <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Resource Limits</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Max Chats (-1 = ∞)</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.maxChats}
                                    onChange={(e) => setFormData({ ...formData, maxChats: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Max Msgs/Mo (-1 = ∞)</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.maxMessagesPerMonth}
                                    onChange={(e) => setFormData({ ...formData, maxMessagesPerMonth: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Max Widgets (-1 = ∞)</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.maxWidgets}
                                    onChange={(e) => setFormData({ ...formData, maxWidgets: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 dark:text-gray-300">Max Members (-1 = ∞)</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.maxMembers}
                                    onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700/50 pt-6">
                        <label className="block text-sm font-bold text-gray-400 uppercase mb-3 tracking-wider">Feature Toggles</label>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.features.removeBranding}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        features: { ...formData.features, removeBranding: e.target.checked }
                                    })}
                                    className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium dark:text-gray-300 group-hover:text-blue-500 transition-colors">Remove Branding</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.features.workflows}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        features: { ...formData.features, workflows: e.target.checked }
                                    })}
                                    className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium dark:text-gray-300 group-hover:text-blue-500 transition-colors">Advanced Workflows</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.features.apiAccess}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        features: { ...formData.features, apiAccess: e.target.checked }
                                    })}
                                    className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium dark:text-gray-300 group-hover:text-blue-500 transition-colors">API Access</span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100 dark:border-gray-700/50 flex justify-end gap-3 sticky bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md pb-2">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all">
                            {plan ? 'Save Changes' : 'Create Plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

