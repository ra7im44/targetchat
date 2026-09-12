import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL as API } from '../../utils/apiConfig';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import PricingModal from '../../components/PricingModal';

const UsageRow = ({ label, icon, current, max, color, shadow }) => {
    const isUnlimited = max === -1;
    const percentage = isUnlimited ? 0 : Math.min(100, (current / max) * 100);

    return (
        <div>
            <div className="flex justify-between items-end mb-3">
                <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {icon}
                        {label}
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{current.toLocaleString()}</span>
                    <span className="text-gray-400 text-sm font-medium"> / {isUnlimited ? '∞' : max.toLocaleString()}</span>
                </div>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out shadow-lg ${shadow} dark:shadow-none`}
                    style={{ width: `${isUnlimited ? (current > 0 ? 100 : 0) : percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export default function BillingPage() {
    const [subscription, setSubscription] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPricing, setShowPricing] = useState(false);
    const [usage, setUsage] = useState({ widgets: 0, messages: 0, members: 0, storage: 0 });

    useEffect(() => {
        fetchBillingData();
    }, []);

    async function fetchBillingData() {
        try {
            const token = localStorage.getItem('tc_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [subRes, invRes] = await Promise.all([
                fetch(`${API}/api/billing/subscription`, { headers }),
                fetch(`${API}/api/billing/invoices`, { headers })
            ]);

            if (subRes.ok) {
                const data = await subRes.json();
                setSubscription(data.subscription);
                if (data.usage) setUsage(data.usage);
            }
            if (invRes.ok) {
                const data = await invRes.json();
                setInvoices(data.invoices || []);
            }
        } catch (err) {
            console.error('Failed to fetch billing data:', err);
            toast.error('Failed to load billing info');
        } finally {
            setLoading(false);
        }
    }

    const plan = subscription?.plan;
    const maxMessages = plan?.maxMessagesPerMonth || 500;
    const maxWidgets = plan?.maxWidgets || 2;
    const maxMembers = plan?.maxMembers || 1;

    const priceDisplay = plan?.priceMonthly || (plan?.price / 100) || 0;

    return (
        <DashboardLayout title="Billing">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                            Billing & Plans
                            {subscription?.gateway === 'paypal' ? (
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border border-blue-200">PayPal Account</span>
                            ) : subscription?.gateway === 'stripe' ? (
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border border-indigo-200">Stripe Account</span>
                            ) : null}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage your subscription, view usage, and download invoices.</p>
                    </div>
                    <button
                        onClick={() => setShowPricing(true)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Upgrade Plan
                    </button>
                </div>

                {/* Plan & Usage Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Current Plan Card */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 opacity-20 rounded-full -ml-16 -mb-16 blur-2xl"></div>

                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-blue-100 font-bold uppercase tracking-wider text-xs">Current Plan</h2>
                                    {subscription?.gateway === 'paypal' && <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" className="h-4 rounded" alt="PayPal" />}
                                </div>
                                <h3 className="text-4xl font-extrabold mb-4">{plan?.name || 'Free Plan'}</h3>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium mb-6">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    {subscription ? `Active until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : 'Forever Free'}
                                </div>
                                <p className="text-blue-100/80 text-sm leading-relaxed">
                                    {subscription
                                        ? `You have access to ${plan?.name} features. Upgrade anytime to scale your limits.`
                                        : 'You are on the basic plan. Upgrade to unlock more features.'}
                                </p>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                                <span className="text-xl font-bold">
                                    ${priceDisplay}<span className="text-sm font-normal opacity-70">/mo</span>
                                </span>
                                <button onClick={() => setShowPricing(true)} className="text-sm font-bold hover:bg-white hover:text-blue-600 transition-all bg-white/10 px-4 py-2 rounded-xl active:scale-95">
                                    Manage Plan
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Usage Stats Table */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Resource Usage (God Mode)</h2>
                        <div className="space-y-8">
                            <UsageRow
                                label="Monthly Messages"
                                icon={<svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                                current={usage.messages}
                                max={maxMessages}
                                color="from-blue-500 to-blue-400"
                                shadow="shadow-blue-200"
                            />
                            <UsageRow
                                label="Active Widgets"
                                icon={<svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>}
                                current={usage.widgets}
                                max={maxWidgets}
                                color="from-purple-500 to-purple-400"
                                shadow="shadow-purple-200"
                            />
                            <UsageRow
                                label="Team Members"
                                icon={<svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                                current={usage.members}
                                max={maxMembers}
                                color="from-emerald-500 to-emerald-400"
                                shadow="shadow-emerald-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Payment History */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment History</h2>
                        <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            Download History
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-12 text-center text-gray-500 font-medium">No invoices found.</td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-8 py-5 text-sm text-gray-900 dark:text-white">{new Date(invoice.created_at).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 text-sm font-bold text-gray-900 dark:text-white">${(invoice.amount / 100).toFixed(2)}</td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <a href={invoice.invoicePdf} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-bold">Download</a>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showPricing && <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />}
            </div>
        </DashboardLayout>
    );
}
