import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useGlobalConfig } from '../context/GlobalConfig';

import { Gem, Check } from 'lucide-react';
import { API_URL as API, getToken } from '../utils/apiConfig';

export default function PricingModal({ isOpen, onClose, currentWorkspace, onUpgrade }) {
    const router = useRouter();
    const { paymentsEnabled } = useGlobalConfig() || { paymentsEnabled: true };
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [processingPlan, setProcessingPlan] = useState(null);
    const [couponCode, setCouponCode] = useState('');
    const [couponData, setCouponData] = useState(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadPlans();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    if (!paymentsEnabled) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
                <div className="relative bg-surface border border-border rounded-modal p-8 shadow-lg max-w-md w-full text-center">
                    <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="w-16 h-16 bg-primary-soft text-primary rounded-card flex items-center justify-center mx-auto mb-4"><Gem size={18} /></div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Upgrade Unavailable</h2>
                    <p className="text-secondary mb-6">Online payments are currently disabled. Please contact sales.</p>
                    <a href="mailto:sales@targetchat.com" className="block w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover active:bg-primary-active transition-colors">Contact Sales</a>
                </div>
            </div>
        );
    }

    async function loadPlans() {
        try {
            const res = await fetch(`${API}/api/billing/plans`);
            if (res.ok) {
                const data = await res.json();
                setPlans(data.plans || []);
            }
        } catch (err) {
            console.error('Error loading plans:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleApplyCoupon() {
        if (!couponCode) return;

        const token = getToken();
        if (!token) return;

        try {
            setIsValidatingCoupon(true);
            const res = await fetch(`${API}/api/billing/coupons/validate/${couponCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setCouponData(data);
                toast.success('Coupon applied!');
            } else {
                const error = await res.json();
                toast.error(error.message || 'Invalid coupon code');
                setCouponData(null);
            }
        } catch (err) {
            console.error('Error validating coupon:', err);
            toast.error('Failed to validate coupon');
        } finally {
            setIsValidatingCoupon(false);
        }
    }

    const [gateway, setGateway] = useState('stripe');

    async function handleSubscribe(plan) {
        const token = getToken();
        if (!token) {
            router.push('/login?redirect=/pricing');
            return;
        }

        if (parseFloat(plan.priceMonthly) === 0) {
            // Free plan just updates workspace
            setProcessingPlan(plan.id);
            try {
                const res = await fetch(`${API}/api/workspaces/${currentWorkspace?.id || 'none'}/plan`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ plan_type: plan.name })
                });
                if (res.ok) {
                    toast.success('Switched to Free plan');
                    onClose();
                    if (onUpgrade) onUpgrade();
                }
            } catch (err) {
                toast.error('Failed to update plan');
            } finally {
                setProcessingPlan(null);
            }
            return;
        }

        setProcessingPlan(plan.id);

        try {
            const res = await fetch(`${API}/api/billing/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    planId: plan.id,
                    billingCycle,
                    workspaceId: currentWorkspace?.id,
                    gateway,
                    couponCode: couponData?.code
                })
            });

            if (res.ok) {
                const { url } = await res.json();
                window.location.href = url;
            } else {
                const error = await res.json();
                toast.error(error.message || 'Failed to initiate payment');
            }
        } catch (err) {
            console.error('Error:', err);
            toast.error('Something went wrong');
        } finally {
            setProcessingPlan(null);
        }
    }

    const getPrice = (plan) => {
        if (plan.priceMonthly === 0) return 'Free';
        const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
        return `$${price}`;
    };

    const getPriceLabel = (plan) => {
        if (plan.priceMonthly === 0) return 'Forever';
        return billingCycle === 'yearly' ? '/year' : '/month';
    };

    if (!isOpen) return null;

    const paidPlanIdx = plans.findIndex((p) => parseFloat(p.priceMonthly) > 0);
    const popularIndex = paidPlanIdx === -1 ? 1 : paidPlanIdx;
    const currentPlanName = currentWorkspace?.plan_type || null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-surface rounded-modal shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-border">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-muted hover:text-foreground z-10 rounded-lg hover:bg-surface-hover transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-8 sm:p-12">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-foreground mb-4">
                            Choose Your Plan
                        </h2>
                        <p className="text-lg text-secondary mb-8">
                            Start with a free trial. Upgrade anytime.
                        </p>

                        <div className="flex flex-col items-center gap-6">
                            <div className="inline-flex items-center gap-1 p-1 bg-surface-elevated border border-border rounded-xl" role="group" aria-label="Billing period">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    aria-pressed={billingCycle === 'monthly'}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${billingCycle === 'monthly'
                                        ? 'bg-surface text-foreground shadow-xs border border-border'
                                        : 'text-muted hover:text-foreground'
                                        }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    aria-pressed={billingCycle === 'yearly'}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${billingCycle === 'yearly'
                                        ? 'bg-surface text-foreground shadow-xs border border-border'
                                        : 'text-muted hover:text-foreground'
                                        }`}
                                >
                                    Yearly
                                    <span className="ml-2 text-xs font-bold text-success">Save 17%</span>
                                </button>
                            </div>

                            <div className="w-full max-w-sm flex items-center gap-2 p-1.5 bg-surface-elevated border border-border rounded-xl">
                                <span className="pl-3 py-2 text-primary">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="HAVE A COUPON?"
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-wider text-foreground placeholder:text-muted outline-none"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    disabled={couponData || isValidatingCoupon}
                                />
                                {couponData ? (
                                    <button
                                        onClick={() => { setCouponData(null); setCouponCode(''); }}
                                        className="px-4 py-2 text-xs font-bold text-danger hover:bg-danger-soft rounded uppercase transition-colors"
                                    >
                                        Remove
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={!couponCode || isValidatingCoupon}
                                        className="px-5 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors uppercase shadow-xs"
                                    >
                                        {isValidatingCoupon ? '...' : 'Apply'}
                                    </button>
                                )}
                            </div>
                            {couponData && (
                                <p className="text-xs font-bold text-success flex items-center gap-1 animate-fadeIn">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    Applied: {couponData.description || `${couponData.discountValue}${couponData.discountType === 'percentage' ? '%' : '$'} Off`}
                                </p>
                            )}

                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs font-bold text-muted uppercase tracking-widest">Pay With</span>
                                <div className="flex p-1 bg-surface-elevated border border-border rounded-lg">
                                    <button
                                        onClick={() => setGateway('stripe')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${gateway === 'stripe' ? 'bg-surface text-primary shadow-xs border border-border' : 'text-muted hover:text-foreground'}`}
                                    >
                                        Card
                                    </button>
                                    <button
                                        onClick={() => setGateway('paypal')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${gateway === 'paypal' ? 'bg-surface text-info shadow-xs border border-border' : 'text-muted hover:text-foreground'}`}
                                    >
                                        PayPal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-12 h-12 border-4 border-primary/25 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-stretch">
                            {plans.map((plan, index) => {
                                const isPopular = index === popularIndex;
                                const isFree = parseFloat(plan.priceMonthly) === 0;
                                const isCurrent = currentPlanName
                                    ? plan.name === currentPlanName
                                    : isFree;
                                const feat = (v, singular) => `${v === -1 ? 'Unlimited' : Number(v).toLocaleString()} ${singular}${v === 1 ? '' : 's'}`;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative rounded-card p-8 border transition-all duration-200 flex flex-col ${isPopular
                                            ? 'bg-surface border-primary shadow-lg ring-1 ring-primary/40 md:-translate-y-2'
                                            : 'bg-surface border-border hover:border-border-strong hover:bg-surface-hover'
                                            }`}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-xs">
                                                Most Popular
                                            </div>
                                        )}

                                        <div className="text-center mb-6">
                                            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-1.5">
                                                {plan.name}
                                            </h3>
                                            <p className="text-muted text-sm mb-5 min-h-10">
                                                {plan.description}
                                            </p>
                                            <div className="text-[2.5rem] leading-none font-bold tracking-tight text-foreground">
                                                {getPrice(plan)}
                                                <span className="text-base font-normal text-muted">
                                                    {getPriceLabel(plan)}
                                                </span>
                                            </div>
                                        </div>

                                        <ul className="space-y-3 mb-8 text-[15px]">
                                            {[
                                                feat(plan.maxChats, 'Chat'),
                                                `${plan.maxMessagesPerMonth === -1 ? 'Unlimited' : Number(plan.maxMessagesPerMonth).toLocaleString()} Message${plan.maxMessagesPerMonth === 1 ? '' : 's'}`,
                                                feat(plan.maxWidgets, 'Widget'),
                                                feat(plan.maxMembers, 'Member'),
                                            ].map((f) => (
                                                <li key={f} className="flex items-center gap-2.5 text-secondary">
                                                    <span className="text-success font-bold"><Check size={16} /></span>
                                                    <span className="font-medium">{f}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleSubscribe(plan)}
                                            disabled={processingPlan === plan.id || isCurrent}
                                            className={`mt-auto w-full py-3 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${isPopular
                                                ? 'bg-primary hover:bg-primary-hover active:bg-primary-active text-white shadow-xs'
                                                : 'bg-surface-elevated hover:bg-surface-hover text-foreground border border-border'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {processingPlan === plan.id ? 'Processing...' : isCurrent ? 'Current Plan' : isFree ? 'Choose Free' : 'Subscribe'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
