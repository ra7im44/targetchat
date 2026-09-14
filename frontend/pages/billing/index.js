import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL as API } from '../../utils/apiConfig';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import PricingModal from '../../components/PricingModal';

const UsageRow = ({ label, icon, current, max }) => {
    const isUnlimited = max === -1;
    const percentage = isUnlimited ? 0 : Math.min(100, (current / max) * 100);

    return (
        <div>
            <div className="flex justify-between items-end mb-2">
                <div className="text-sm font-semibold text-gray-900 dark:text-foreground flex items-center gap-2">
                    {icon}
                    {label}
                </div>
                <div className="text-right">
                    <span className="text-xl font-bold text-gray-900 dark:text-foreground">{current.toLocaleString()}</span>
                    <span className="text-text-muted text-xs font-medium"> / {isUnlimited ? '∞' : max.toLocaleString()}</span>
                </div>
            </div>
            <div className="h-2.5 bg-surface-elevated rounded-full overflow-hidden border border-border">
                <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
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
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground tracking-tight flex items-center gap-3">
                            Billing & Plans
                            {subscription?.gateway === 'paypal' ? (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border border-primary/20">PayPal Account</span>
                            ) : subscription?.gateway === 'stripe' ? (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border border-primary/20">Stripe Account</span>
                            ) : null}
                        </h1>
                        <p className="text-gray-500 dark:text-muted mt-1.5 text-sm font-medium">Manage your subscription, view usage, and download invoices.</p>
                    </div>
                    <button
                        onClick={() => setShowPricing(true)}
                        className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold text-sm shadow-xs transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Upgrade Plan
                    </button>
                </div>

                {/* Plan & Usage Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Current Plan Card */}
                    <div className="lg:col-span-1 bg-surface-elevated rounded-card p-6 sm:p-8 border border-border relative overflow-hidden shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-text-muted font-semibold uppercase tracking-wider text-xs">Current Plan</h2>
                                {subscription?.gateway === 'paypal' && <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" className="h-4 rounded" alt="PayPal" />}
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-foreground mb-3">{plan?.name || 'Free Plan'}</h3>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-full text-xs font-semibold text-text-primary mb-5">
                                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                                {subscription ? `Active until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : 'Forever Free'}
                            </div>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                {subscription
                                    ? `You have access to ${plan?.name} features. Upgrade anytime to scale your limits.`
                                    : 'You are on the basic plan. Upgrade to unlock more features.'}
                            </p>
                        </div>
                        <div className="mt-8 pt-5 border-t border-border flex justify-between items-center">
                            <span className="text-2xl font-bold text-gray-900 dark:text-foreground">
                                ${priceDisplay}<span className="text-xs font-normal text-text-muted">/mo</span>
                            </span>
                            <button onClick={() => setShowPricing(true)} className="text-xs font-semibold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3.5 py-2 rounded-lg transition-colors">
                                Manage Plan
                            </button>
                        </div>
                    </div>

                    {/* Usage Stats Table */}
                    <div className="lg:col-span-2 bg-surface rounded-card p-6 sm:p-8 shadow-xs border border-border">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-foreground mb-6">Resource Usage (God Mode)</h2>
                        <div className="space-y-6">
                            <UsageRow
                                label="Monthly Messages"
                                icon={<svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                                current={usage.messages}
                                max={maxMessages}
                            />
                            <UsageRow
                                label="Active Widgets"
                                icon={<svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>}
                                current={usage.widgets}
                                max={maxWidgets}
                            />
                            <UsageRow
                                label="Team Members"
                                icon={<svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                                current={usage.members}
                                max={maxMembers}
                            />
                        </div>
                    </div>
                </div>

                {/* Payment History */}
                <div className="bg-surface rounded-card shadow-xs border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-foreground">Payment History</h2>
                        <button className="text-xs font-semibold text-primary hover:underline transition-colors">
                            Download History
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-surface-elevated/70 border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-10 text-center text-text-muted text-sm font-medium">No invoices found.</td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-surface-elevated/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-foreground">{new Date(invoice.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-foreground">${(invoice.amount / 100).toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${invoice.status === 'paid' ? 'bg-success/10 text-success border border-success/20' : 'bg-surface-elevated text-text-muted border border-border'}`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <a href={invoice.invoicePdf} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs font-semibold">Download</a>
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
