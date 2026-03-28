import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useGlobalConfig } from '../context/GlobalConfig';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
                <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">💎</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upgrade Unavailable</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Online payments are currently disabled. Please contact sales.</p>
                    <a href="mailto:sales@targetchat.com" className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Contact Sales</a>
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

        const token = localStorage.getItem('tc_token');
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
        const token = localStorage.getItem('tc_token');
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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-8 sm:p-12">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                            Choose Your Plan
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                            Start with a free trial. Upgrade anytime.
                        </p>

                        <div className="flex flex-col items-center gap-6">
                            <div className="inline-flex items-center gap-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all ${billingCycle === 'monthly'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all ${billingCycle === 'yearly'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    Yearly
                                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">Save 17%</span>
                                </button>
                            </div>

                            <div className="w-full max-w-sm flex items-center gap-2 p-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                                <span className="pl-3 py-2 text-blue-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="HAVE A COUPON?"
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-100 placeholder:text-blue-300 dark:placeholder:text-blue-700"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    disabled={couponData || isValidatingCoupon}
                                />
                                {couponData ? (
                                    <button
                                        onClick={() => { setCouponData(null); setCouponCode(''); }}
                                        className="px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 uppercase"
                                    >
                                        Remove
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={!couponCode || isValidatingCoupon}
                                        className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all uppercase"
                                    >
                                        {isValidatingCoupon ? '...' : 'Apply'}
                                    </button>
                                )}
                            </div>
                            {couponData && (
                                <p className="text-xs font-bold text-green-600 flex items-center gap-1 animate-fadeIn">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    Applied: {couponData.description || `${couponData.discountValue}${couponData.discountType === 'percentage' ? '%' : '$'} Off`}
                                </p>
                            )}

                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pay With</span>
                                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    <button
                                        onClick={() => setGateway('stripe')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${gateway === 'stripe' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        Card
                                    </button>
                                    <button
                                        onClick={() => setGateway('paypal')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${gateway === 'paypal' ? 'bg-white dark:bg-gray-700 text-blue-800 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        PayPal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8">
                            {plans.map((plan, index) => {
                                const features = plan.features || {};
                                const isPopular = index === 1;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border ${isPopular
                                            ? 'border-blue-500 shadow-xl ring-1 ring-blue-500'
                                            : 'border-transparent'
                                            }`}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-sm font-bold rounded-full">
                                                Most Popular
                                            </div>
                                        )}

                                        <div className="text-center mb-6">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                                {plan.name}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 h-10">
                                                {plan.description}
                                            </p>
                                            <div className="text-4xl font-bold text-gray-900 dark:text-white">
                                                {getPrice(plan)}
                                                <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                                                    {getPriceLabel(plan)}
                                                </span>
                                            </div>
                                        </div>

                                        <ul className="space-y-3 mb-8">
                                            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <span className="text-green-500">✓</span>
                                                {plan.maxChats === -1 ? 'Unlimited' : plan.maxChats} Chats
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <span className="text-green-500">✓</span>
                                                {plan.maxMessagesPerMonth === -1 ? 'Unlimited' : plan.maxMessagesPerMonth.toLocaleString()} Messages
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <span className="text-green-500">✓</span>
                                                {plan.maxWidgets === -1 ? 'Unlimited' : plan.maxWidgets} Widgets
                                            </li>
                                            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <span className="text-green-500">✓</span>
                                                {plan.maxMembers === -1 ? 'Unlimited' : plan.maxMembers} Members
                                            </li>
                                        </ul>

                                        <button
                                            onClick={() => handleSubscribe(plan)}
                                            disabled={processingPlan === plan.id}
                                            className={`w-full py-3 rounded-xl font-semibold transition-all ${isPopular
                                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                                } disabled:opacity-50`}
                                        >
                                            {processingPlan === plan.id ? 'Processing...' : plan.priceMonthly === 0 ? 'Current Plan' : 'Subscribe'}
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
