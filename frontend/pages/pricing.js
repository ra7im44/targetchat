import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Check, X, CreditCard, Shield, Zap, Gift, Sparkles } from 'lucide-react';

import { API_URL as API } from '../utils/apiConfig';

export default function PricingPage() {
    const router = useRouter();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [processingPlan, setProcessingPlan] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [gateway, setGateway] = useState('stripe');
    const [couponCode, setCouponCode] = useState('');
    const [couponData, setCouponData] = useState(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    useEffect(() => {
        loadPlans();
        loadSubscription();
    }, []);

    const loadPlans = async () => {
        try {
            const res = await fetch(`${API}/api/billing/plans`);
            const data = await res.json();
            setPlans(data.plans || []);
        } catch (err) {
            console.error('Error loading plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthError = () => {
        localStorage.removeItem('tc_token');
        router.push('/login');
    };

    const loadSubscription = async () => {
        try {
            const token = localStorage.getItem('tc_token');
            if (!token) return;

            const res = await fetch(`${API}/api/billing/subscription`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) return handleAuthError();

            const data = await res.json();
            if (data.subscription) {
                setSubscription(data.subscription);
            }
        } catch (err) {
            console.error('Error loading subscription:', err);
        }
    };

    const handleSubscribe = async (plan) => {
        const token = localStorage.getItem('tc_token');
        if (!token) {
            router.push('/login?redirect=/pricing');
            return;
        }

        setProcessingPlan(plan.id);

        try {
            if (parseFloat(plan.priceMonthly) === 0) {
                // Handle Free Plan Switch
                const res = await fetch(`${API}/api/billing/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    toast.success('Switched to Free plan');
                    window.location.reload();
                }
                return;
            }

            const res = await fetch(`${API}/api/billing/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    planId: plan.id,
                    billingCycle,
                    gateway,
                    couponCode: couponCode
                })
            });

            if (res.status === 401 || res.status === 403) return handleAuthError();

            if (res.ok) {
                const { url } = await res.json();
                window.location.href = url;
            } else {
                const errorData = await res.json();
                toast.error(errorData.message || 'Failed to create checkout session');
            }
        } catch (err) {
            console.error('Error:', err);
            toast.error('Something went wrong');
        } finally {
            setProcessingPlan(null);
        }
    };

    const getPrice = (plan) => {
        if (plan.priceMonthly === 0) return 'Free';
        const base = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
        if (couponData) {
            if (couponData.discountType === 'percentage') {
                return `$${(base * (1 - couponData.discountValue / 100)).toFixed(2)}`;
            } else {
                return `$${Math.max(0, base - couponData.discountValue).toFixed(2)}`;
            }
        }
        return `$${base}`;
    };

    const getPriceLabel = (plan) => {
        if (plan.priceMonthly === 0) return 'Forever';
        return billingCycle === 'yearly' ? '/year' : '/month';
    };

    return (
        <div className="min-h-screen bg-background overflow-x-hidden selection:bg-accent/30 font-sans">
            <Head>
                <title>Pricing - TargetChat AI</title>
                <meta name="description" content="Simple, transparent pricing for your AI workforce." />
            </Head>

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Navbar */}
            <nav className="absolute top-0 left-0 w-full p-6 z-50">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-background font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">T</div>
                        <span className="text-xl font-bold text-white tracking-wide">TargetChat</span>
                    </Link>
                    <Link href="/" className="text-gray-500 dark:text-muted hover:text-white font-medium transition-colors">
                        Back to Home
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 w-full pt-32 pb-20">
                <div className="container mx-auto px-6">

                    {/* Header */}
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 border border-strong backdrop-blur-md mb-8 animate-fadeIn">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-info-ink dark:text-info tracking-wider uppercase"><Sparkles size={16} /> Upgrade your workflow</span>
                        </div>
                        <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight leading-tight">
                            Simple Pricing, <br />
                            <span className="text-transparent bg-clip-text bg-accent">Infinite Potential.</span>
                        </h1>
                        <p className="text-lg text-gray-500 dark:text-muted leading-relaxed">
                            Choose the perfect plan for your business. No hidden fees, cancel anytime.
                        </p>
                    </div>

                    {/* Toggles Section */}
                    <div className="flex flex-col items-center gap-8 mb-16">
                        {/* Billing Toggle */}
                        <div className="p-1.5 bg-surface/80 backdrop-blur-md border border-white/10 rounded-card inline-flex relative">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`relative z-10 px-8 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-500 dark:text-muted hover:text-white'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`relative z-10 px-8 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center gap-2 ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-500 dark:text-muted hover:text-white'
                                    }`}
                            >
                                Yearly
                                <span className="text-[10px] bg-success/20 text-success-ink dark:text-success px-2 py-0.5 rounded-full border border-success/20">SAVE 20%</span>
                            </button>
                            <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-accent rounded-xl shadow-lg transition-all duration-300 ${billingCycle === 'monthly' ? 'left-1.5' : 'left-[calc(50%+4px)]'
                                }`}></div>
                        </div>

                        {/* Gateway Toggle */}
                        <div className="flex items-center gap-4 animate-fadeIn">
                            <span className="text-xs font-bold text-gray-500 dark:text-muted uppercase tracking-widest">Pay with</span>
                            <div className="p-1 bg-surface/80 backdrop-blur-md border border-white/10 rounded-card flex relative">
                                <button
                                    onClick={() => setGateway('stripe')}
                                    className={`relative z-10 px-6 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center gap-2 ${gateway === 'stripe' ? 'text-white' : 'text-gray-500 dark:text-muted hover:text-white'}`}
                                >
                                    <CreditCard size={14} /> Credit Card
                                </button>
                                <button
                                    onClick={() => setGateway('paypal')}
                                    className={`relative z-10 px-6 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center gap-2 ${gateway === 'paypal' ? 'text-white' : 'text-gray-500 dark:text-muted hover:text-white'}`}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.723a.641.641 0 0 1 .63-.503h9.231c.422 0 .809.243.985.627.509 1.113.8 2.343.8 3.633 0 4.609-3.375 8.347-7.538 8.347h-1.3l-.975 5.51h-.001zm10.722-15.305c-.394-1.296-1.113-2.394-2.156-3.23a.641.641 0 0 0-.406-.144H6.01a.641.641 0 0 1 .631-.502h9.231c.421 0 .809.243.984.627.509 1.113.8 2.343.8 3.633 0 1.954-.607 3.766-1.646 5.253a.641.641 0 0 0-.131.32l-.545 3.082a.641.641 0 0 1-.632.529h-1.3c4.163 0 7.538-3.738 7.538-8.347 0-1.892-.589-3.647-1.597-5.143l-.305-.53z" /></svg>
                                    PayPal
                                </button>
                                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-accent/40 rounded-lg shadow-inner transition-all duration-300 ${gateway === 'stripe' ? 'left-1' : 'left-[calc(50%+2px)]'}`}></div>
                            </div>
                        </div>
                    </div>

                    {/* Plans Grid */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto relative">
                            {/* Decorative Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/5 blur-[120px] rounded-full pointer-events-none"></div>

                            {plans.map((plan, index) => {
                                const features = plan.features || {};
                                const isPopular = index === 1; // Assuming 2nd plan is popular
                                const isCurrentPlan = subscription && subscription.plan && subscription.plan.id === plan.id && subscription.status === 'active';

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative group bg-surface/60 backdrop-blur-md border ${isPopular ? 'border-cyan-500/50 shadow-lg' : 'border-white/5 hover:border-white/10'
                                            } rounded-card p-8 transition-all duration-300`}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-background text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                                                Most Popular
                                            </div>
                                        )}

                                        <div className="mb-8">
                                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-muted h-10 line-clamp-2">{plan.description}</p>
                                        </div>

                                        <div className="mb-8 flex items-baseline gap-1">
                                            <span className="text-5xl font-bold text-white tracking-tight">{getPrice(plan)}</span>
                                            <span className="text-gray-500 dark:text-muted font-medium">{getPriceLabel(plan)}</span>
                                        </div>

                                        <button
                                            onClick={() => handleSubscribe(plan)}
                                            disabled={processingPlan === plan.id || isCurrentPlan}
                                            className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 ${isPopular
                                                ? 'bg-accent text-background shadow-lg'
                                                : 'bg-white/10 text-white hover:bg-white/20'
                                                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2`}
                                        >
                                            {processingPlan === plan.id && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            {isCurrentPlan ? 'Current Plan' : (parseFloat(plan.priceMonthly) === 0 ? 'Start For Free' : (subscription ? 'Switch Plan' : 'Get Started Now'))}
                                        </button>

                                        <div className="mt-8 space-y-4">
                                            <p className="text-xs font-bold text-gray-500 dark:text-muted uppercase tracking-widest">What's included</p>
                                            <ul className="space-y-3">
                                                <FeatureItem text={plan.maxChats === -1 ? 'Unlimited chats' : `${plan.maxChats} chats/month`} included={true} />
                                                <FeatureItem text={plan.maxMessagesPerMonth === -1 ? 'Unlimited messages' : `${plan.maxMessagesPerMonth} messages/month`} included={true} />
                                                <FeatureItem text="Priority support" included={!!features.priority_support} />
                                                <FeatureItem text="Custom workflows" included={!!features.custom_workflows} />
                                                <FeatureItem text="API access" included={!!features.api_access} />
                                                <FeatureItem text="Advanced Analytics" included={isPopular || index > 1} />
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Payment Methods Slider */}
                    <div className="mt-24 pt-12 border-t border-white/5 mx-auto max-w-4xl text-center">
                        <p className="text-sm font-semibold text-gray-500 dark:text-muted uppercase tracking-widest mb-8">Secure Payment Methods</p>
                        <div className="relative group overflow-hidden">
                            <div className="absolute inset-0 z-10 bg-accent via-transparent pointer-events-none"></div>
                            <div className="flex justify-center items-center gap-12 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500">
                                {/* SVG Placeholders for Payment Methods */}
                                <PaymentLogo name="Visa" />
                                <PaymentLogo name="Mastercard" />
                                <PaymentLogo name="Amex" />
                                <PaymentLogo name="PayPal" />
                                <PaymentLogo name="Stripe" />
                                <PaymentLogo name="Apple Pay" />
                            </div>
                        </div>
                        <div className="mt-8 flex justify-center items-center gap-2 text-gray-500 dark:text-muted text-xs">
                            <Shield className="w-4 h-4" />
                            <span>256-bit SSL Encrypted Payment</span>
                        </div>
                    </div>

                    {/* Gift / Special Offer Section */}
                    <div className="mt-24 bg-accent border border-purple-500/20 rounded-card p-8 md:p-12 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <Gift className="w-12 h-12 text-purple-400 mx-auto mb-6" />
                            <h3 className="text-2xl font-bold text-white mb-3">Enterprise & High Volume</h3>
                            <p className="text-gray-600 dark:text-secondary max-w-2xl mx-auto mb-8">Need more than what's listed? We offer custom enterprise plans with tailored features, dedicated support, and volume discounts.</p>
                            <a href="mailto:sales@targetchat.ai" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                                Contact Sales <Zap className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 border-t border-white/5 text-center text-gray-500 dark:text-muted text-sm bg-background relative z-10">
                © 2025 TargetChat AI. All rights reserved.
            </footer>
        </div>
    );
}

function FeatureItem({ text, included }) {
    if (!included) return (
        <li className="flex items-center gap-3 text-gray-500 dark:text-muted line-through decoration-slate-600/50 text-sm">
            <div className="w-5 h-5 rounded-full bg-surface-elevated flex items-center justify-center">
                <X className="w-3 h-3 text-slate-600" />
            </div>
            {text}
        </li>
    );

    return (
        <li className="flex items-center gap-3 text-gray-600 dark:text-secondary text-sm">
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-info-ink dark:text-info" />
            </div>
            {text}
        </li>
    );
}

function PaymentLogo({ name }) {
    // Simple text-based placeholders with premium styling to act as logos
    return (
        <span className="text-xl font-bold font-mono text-gray-500 dark:text-muted tracking-tighter hover:text-white transition-colors cursor-default select-none">
            {name}
        </span>
    );
}
