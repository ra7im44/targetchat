import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
    ArrowRight,
    Check,
    ChevronDown,
    CreditCard,
    Gift,
    Languages,
    Loader2,
    Lock,
    Minus,
    Server,
    Shield,
    Zap,
} from 'lucide-react';

import { API_URL as API } from '../utils/apiConfig';

const INCLUDED = [
    { icon: Lock, label: '256-bit encrypted payments' },
    { icon: Server, label: 'Isolated workspace data' },
    { icon: Languages, label: 'Arabic & English AI replies' },
    { icon: Shield, label: 'Cancel or change plan anytime' },
];

const FEATURE_LABELS = {
    priority_support: 'Priority support',
    custom_workflows: 'Custom workflows',
    api_access: 'API access',
    advanced_analytics: 'Advanced analytics',
    white_label: 'White-label branding',
    enable_custom_personas: 'Custom AI personas',
    sso: 'Single sign-on',
};

const FAQS = [
    {
        q: 'Can I change or cancel my plan later?',
        a: 'Yes. Upgrades take effect immediately and downgrades apply at the end of the current billing period. Cancelling keeps your plan active until the paid period ends — nothing is cut off mid-cycle.',
    },
    {
        q: 'What happens when I reach my monthly limits?',
        a: 'New conversations pause until the next cycle or until you upgrade. Existing conversations, knowledge-base documents, and widgets stay available and unchanged.',
    },
    {
        q: 'Is my data used to train AI models?',
        a: 'No. Workspace conversations are isolated per account and are never used for model training. You can also run TargetChat against a local Ollama model so content never leaves your infrastructure.',
    },
    {
        q: 'Do you offer annual invoicing for teams?',
        a: 'Yes. Yearly billing saves you two months, and enterprise plans support custom invoicing, volume pricing, and dedicated onboarding.',
    },
];

const humanize = (key) =>
    key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

const money = (value) => {
    const amount = Number(value) || 0;
    return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
};

const limitText = (value, unit) => {
    const n = Number(value);
    if (n === -1) return 'Unlimited';
    if (!Number.isFinite(n) || n === 0) return `No ${unit}`;
    return `${n.toLocaleString()} ${unit}`;
};

const planLimits = (plan) => [
    { label: 'Conversations / month', value: limitText(plan.maxChats, 'conversations') },
    { label: 'AI messages / month', value: limitText(plan.maxMessagesPerMonth, 'messages') },
    { label: 'Website widgets', value: limitText(plan.maxWidgets, 'widgets') },
    { label: 'Team members', value: limitText(plan.maxMembers, 'members') },
];

const booleanFeatures = (plans) => {
    const keys = new Set();
    plans.forEach((plan) => {
        Object.entries(plan.features || {}).forEach(([key, value]) => {
            if (typeof value === 'boolean') keys.add(key);
        });
    });
    return Array.from(keys).map((key) => ({
        key,
        label: FEATURE_LABELS[key] || humanize(key),
        get: (plan) => !!(plan.features || {})[key],
    }));
};

const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

export default function PricingPage() {
    const router = useRouter();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [processingPlan, setProcessingPlan] = useState(null);
    const [account, setAccount] = useState(null);
    const [gateway, setGateway] = useState('stripe');
    const comparisonRef = useRef(null);

    const loadPlans = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await fetch(`${API}/api/billing/plans`);
            if (!res.ok) throw new Error(`Plans request failed (${res.status})`);
            const data = await res.json();
            setPlans(Array.isArray(data.plans) ? data.plans : []);
        } catch (err) {
            console.error('Error loading plans:', err);
            setLoadError('We could not load the plans right now. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadAccount = async () => {
        try {
            const token = localStorage.getItem('tc_token');
            if (!token) return;
            const res = await fetch(`${API}/api/billing/subscription`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('tc_token');
                return router.push('/login');
            }
            if (!res.ok) return;
            const data = await res.json();
            if (data.subscription) setAccount({ subscription: data.subscription, usage: data.usage || {} });
        } catch (err) {
            console.error('Error loading subscription:', err);
        }
    };

    useEffect(() => {
        loadPlans();
        loadAccount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const subscription = account?.subscription || null;
    const usage = account?.usage || {};

    const handleSubscribe = async (plan) => {
        const token = localStorage.getItem('tc_token');
        if (!token) {
            router.push('/login?redirect=/pricing');
            return;
        }

        setProcessingPlan(plan.id);

        try {
            if (Number(plan.priceMonthly) === 0) {
                const res = await fetch(`${API}/api/billing/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    toast.success('You are now on the Free plan');
                    setAccount(null);
                    await loadAccount();
                    return;
                }
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || 'Could not switch to the Free plan');
                return;
            }

            const res = await fetch(`${API}/api/billing/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ planId: plan.id, billingCycle, gateway }),
            });

            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('tc_token');
                return router.push('/login');
            }

            if (res.ok) {
                const { url } = await res.json();
                if (url) {
                    window.location.href = url;
                } else {
                    toast.error('Checkout is not available right now');
                }
                return;
            }

            const errorData = await res.json().catch(() => ({}));
            if (res.status === 502) {
                toast.error('Payments are not configured in this environment yet. No charge was made.');
            } else {
                toast.error(errorData.message || 'Failed to create checkout session');
            }
        } catch (err) {
            console.error('Error:', err);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setProcessingPlan(null);
        }
    };

    const savings = useMemo(() => {
        const ratios = plans
            .filter((p) => Number(p.priceMonthly) > 0 && Number(p.priceYearly) > 0)
            .map((p) => 1 - Number(p.priceYearly) / (Number(p.priceMonthly) * 12));
        if (!ratios.length) return 20;
        return Math.max(0, Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100));
    }, [plans]);

    const priceFor = (plan) => {
        const monthly = Number(plan.priceMonthly) || 0;
        const yearly = Number(plan.priceYearly) || 0;

        if (monthly === 0) return { headline: '$0', meta: 'Free forever', strike: null, save: 0 };
        if (billingCycle === 'yearly' && yearly > 0) {
            return {
                headline: money(yearly / 12),
                meta: `${money(yearly)} billed yearly`,
                strike: money(monthly),
                save: Math.max(0, Math.round(monthly * 12 - yearly)),
            };
        }
        return {
            headline: money(monthly),
            meta: yearly > 0 ? 'billed monthly' : 'billed monthly · annual unavailable',
            strike: null,
            save: 0,
        };
    };

    const matrix = useMemo(() => {
        const features = booleanFeatures(plans);
        return { features, limits: plans.length ? planLimits(plans[0]) : [] };
    }, [plans]);

    const currentPlanId = subscription?.plan?.id || null;
    const popularIndex = plans.length >= 3 ? 1 : -1;

    return (
        <div className="min-h-screen bg-background overflow-x-hidden selection:bg-primary-soft font-sans">
            <Head>
                <title>Pricing — TargetChat AI</title>
                <meta
                    name="description"
                    content="Transparent pricing for AI customer conversations. Start free, scale when you need to."
                />
            </Head>

            <header className="relative z-50 w-full border-b border-border bg-surface">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group" aria-label="TargetChat home">
                        <span className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                            T
                        </span>
                        <span className="text-lg font-bold text-foreground tracking-tight">TargetChat</span>
                    </Link>
                    <nav className="flex items-center gap-4 text-sm" aria-label="Account">
                        <Link href="/" className="hidden sm:block text-secondary hover:text-foreground transition-colors">
                            Home
                        </Link>
                        <Link
                            href="/login"
                            className="px-4 py-2 rounded-button border border-border text-secondary hover:text-foreground hover:bg-surface transition-colors"
                        >
                            Sign in
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="relative z-10 w-full pb-24">
                <div className="container mx-auto px-6">
                    <section className="text-center max-w-3xl mx-auto pt-14 pb-10">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted mb-4">Pricing</p>
                        <h1 className="text-4xl sm:text-5xl font-semibold text-foreground mb-4 tracking-tight leading-[1.1]">
                            Start free. Pay for what you use.
                        </h1>
                        <p className="text-base sm:text-lg text-secondary leading-relaxed max-w-xl mx-auto">
                            Every plan includes real AI replies, Arabic and English support, and a workspace your data
                            never leaves. Upgrade only when your team outgrows the limits.
                        </p>
                    </section>

                    {/* Current subscription context */}
                    {subscription && (
                        <section
                            aria-label="Your current subscription"
                            className="max-w-3xl mx-auto mb-10 rounded-card border border-border bg-surface p-5 sm:p-6"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted mb-1">
                                        Your plan
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-lg font-bold text-foreground">{subscription.plan?.name || 'Free'}</p>
                                        <span
                                            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border ${
                                                subscription.status === 'active' || subscription.status === 'trialing'
                                                    ? 'bg-success-soft text-success-ink border-success/20'
                                                    : subscription.status === 'past_due'
                                                    ? 'bg-warning-soft text-warning-ink border-warning/20'
                                                    : 'bg-surface-elevated text-muted border-border'
                                            }`}
                                        >
                                            {subscription.status}
                                        </span>
                                        {subscription.cancelAtPeriodEnd && (
                                            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border border-warning/20 bg-warning-soft text-warning-ink">
                                                ends soon
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-muted">
                                        {subscription.currentPeriodEnd
                                            ? `Renews ${formatDate(subscription.currentPeriodEnd)}`
                                            : 'No renewal date recorded'}
                                        {subscription.cancelAtPeriodEnd ? ' · cancels automatically' : ''}
                                    </p>
                                </div>
                                <Link
                                    href="/billing"
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-button border border-border bg-surface-elevated text-foreground hover:bg-surface-hover text-xs font-bold transition-colors shrink-0"
                                >
                                    Manage billing <ArrowRight size={13} aria-hidden="true" />
                                </Link>
                            </div>

                            <dl className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-border">
                                {[
                                    { label: 'Messages', used: usage.messages, max: subscription.plan?.maxMessagesPerMonth, unit: 'this month' },
                                    { label: 'Widgets', used: usage.widgets, max: subscription.plan?.maxWidgets, unit: 'active' },
                                    { label: 'Members', used: usage.members, max: subscription.plan?.maxMembers, unit: 'seats' },
                                ].map((row) => {
                                    const max = Number(row.max);
                                    const used = Number(row.used) || 0;
                                    const unlimited = max === -1;
                                    const pct = unlimited || !max ? 0 : Math.min(100, Math.round((used / max) * 100));
                                    return (
                                        <div key={row.label}>
                                            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{row.label}</dt>
                                            <dd className="mt-1 text-sm font-bold text-foreground">
                                                {used.toLocaleString()}
                                                <span className="text-muted font-medium">
                                                    {' / '}
                                                    {unlimited ? '∞' : max > 0 ? max.toLocaleString() : '0'}
                                                </span>
                                            </dd>
                                            <div className="mt-1.5 h-1 rounded-full bg-surface-elevated overflow-hidden" aria-hidden="true">
                                                <div
                                                    className={`h-full rounded-full ${pct >= 90 ? 'bg-warning' : 'bg-primary'}`}
                                                    style={{ width: `${unlimited ? 8 : Math.max(2, pct)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </dl>
                        </section>
                    )}

                    {/* Billing controls */}
                    <section className="flex flex-col items-center gap-4 mb-12" aria-label="Billing options">
                        <div
                            role="group"
                            aria-label="Billing cycle"
                            className="p-1.5 bg-surface border border-border rounded-card flex items-center gap-1"
                        >
                            {[
                                { id: 'monthly', label: 'Monthly' },
                                { id: 'yearly', label: 'Yearly' },
                            ].map((option) => {
                                const active = billingCycle === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setBillingCycle(option.id)}
                                        aria-pressed={active}
                                        className={`px-6 sm:px-8 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                            active ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
                                        }`}
                                    >
                                        {option.label}
                                        {option.id === 'yearly' && (
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${
                                                    active
                                                        ? 'bg-primary-hover border-primary-hover text-primary-foreground'
                                                        : 'bg-success-soft border-success/20 text-success-ink'
                                                }`}
                                            >
                                                −{savings}%
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="sr-only" aria-live="polite">
                            Showing {billingCycle} prices
                            {billingCycle === 'yearly' ? `, saving ${savings}%` : ''}.
                        </p>

                        <div className="flex items-center gap-3 text-xs">
                            <span className="font-semibold text-muted uppercase tracking-widest">Pay with</span>
                            <div role="group" aria-label="Payment method" className="flex items-center gap-1 p-1 bg-surface border border-border rounded-card">
                                {[
                                    { id: 'stripe', label: 'Card', icon: CreditCard },
                                    { id: 'paypal', label: 'PayPal', icon: null },
                                ].map(({ id, label, icon: Icon }) => {
                                    const active = gateway === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setGateway(id)}
                                            aria-pressed={active}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                                active
                                                    ? 'bg-surface-elevated text-foreground border border-border shadow-xs'
                                                    : 'text-muted hover:text-foreground border border-transparent'
                                            }`}
                                        >
                                            {Icon ? <Icon size={13} aria-hidden="true" /> : null}
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* Plans */}
                    {loading ? (
                        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto" aria-busy="true" aria-label="Loading plans">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="h-[500px] rounded-card border border-border bg-surface animate-pulse" />
                            ))}
                        </div>
                    ) : loadError ? (
                        <div role="alert" className="max-w-lg mx-auto text-center bg-surface border border-border rounded-card p-8">
                            <p className="text-foreground font-semibold mb-2">Plans are unavailable</p>
                            <p className="text-sm text-muted mb-6">{loadError}</p>
                            <button
                                type="button"
                                onClick={loadPlans}
                                className="px-5 py-2.5 rounded-button bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                Try again
                            </button>
                        </div>
                    ) : plans.length === 0 ? (
                        <p className="text-center text-muted">No plans are configured yet.</p>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
                            {plans.map((plan, index) => {
                                const isPopular = index === popularIndex;
                                const isCurrentPlan = currentPlanId === plan.id;
                                const price = priceFor(plan);
                                const free = Number(plan.priceMonthly) === 0;
                                const busy = processingPlan === plan.id;
                                const limits = planLimits(plan);

                                return (
                                    <article
                                        key={plan.id}
                                        aria-labelledby={`plan-${plan.id}`}
                                        className={`relative flex flex-col rounded-card p-6 ${
                                            isPopular
                                                ? 'bg-surface border border-primary'
                                                : 'bg-surface border border-border'
                                        }`}
                                    >
                                        <div className="mb-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <h2 id={`plan-${plan.id}`} className="text-base font-semibold text-foreground">
                                                    {plan.name}
                                                </h2>
                                                <div className="flex items-center gap-2">
                                                    {isPopular && (
                                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                                                            Most popular
                                                        </span>
                                                    )}
                                                    {isCurrentPlan && (
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-success-soft text-success-ink border border-success/20">
                                                            Current
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="mt-2 text-sm text-muted leading-relaxed min-h-[40px]">
                                                {plan.description}
                                            </p>
                                        </div>

                                        <div className="mb-5">
                                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                                <span className="text-4xl font-bold text-foreground tracking-tight">
                                                    {price.headline}
                                                </span>
                                                <span className="text-sm font-medium text-muted">{free ? '' : '/month'}</span>
                                                {price.strike && (
                                                    <span className="text-sm text-muted line-through decoration-border-strong">
                                                        {price.strike}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1.5 text-xs text-muted">{price.meta}</p>
                                            {price.save > 0 && (
                                                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-success-ink">
                                                    <Check size={11} aria-hidden="true" /> Save {money(price.save)} a year
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleSubscribe(plan)}
                                            disabled={busy || isCurrentPlan}
                                            className={`w-full py-3.5 rounded-button font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                                isPopular
                                                    ? 'bg-primary hover:bg-primary-hover text-white shadow-sm'
                                                    : 'bg-surface-elevated hover:bg-surface-hover text-foreground border border-border'
                                            }`}
                                        >
                                            {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                                            {isCurrentPlan
                                                ? 'Your current plan'
                                                : free
                                                ? 'Start for free'
                                                : subscription
                                                ? 'Switch to this plan'
                                                : 'Get started'}
                                            {!busy && !isCurrentPlan && <ArrowRight size={15} aria-hidden="true" />}
                                        </button>
                                        <p className="mt-2.5 text-center text-[11px] text-muted">
                                            {free ? 'No credit card required' : 'Cancel anytime · secure checkout'}
                                        </p>

                                        <ul className="mt-7 space-y-3 border-t border-border pt-6 flex-1">
                                            {limits.slice(0, 2).map((row) => (
                                                <li key={row.label} className="flex items-start gap-2.5 text-sm">
                                                    <span className="mt-0.5 w-5 h-5 rounded-full bg-success-soft flex items-center justify-center shrink-0" aria-hidden="true">
                                                        <Check size={12} className="text-success-ink" />
                                                    </span>
                                                    <span className="text-secondary">
                                                        <span className="font-bold text-foreground">{row.value}</span>
                                                        <span className="block text-xs text-muted">
                                                            {row.label.replace(' / month', '')}
                                                        </span>
                                                    </span>
                                                </li>
                                            ))}
                                            {booleanFeatures([plan])
                                                .filter((feature) => feature.get(plan))
                                                .map((feature) => (
                                                <li key={feature.key} className="flex items-start gap-2.5 text-sm">
                                                    <span className="mt-0.5 w-5 h-5 rounded-full bg-success-soft flex items-center justify-center shrink-0" aria-hidden="true">
                                                        <Check size={12} className="text-success-ink" />
                                                    </span>
                                                    <span className="text-secondary">{feature.label}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {/* Comparison */}
                    {!loading && !loadError && plans.length > 0 && (
                        <section className="mt-16 max-w-6xl mx-auto" aria-labelledby="compare-heading">
                            <div className="flex items-end justify-between gap-4 mb-5">
                                <div>
                                    <h2 id="compare-heading" className="font-display text-2xl font-bold text-foreground">
                                        Compare every plan
                                    </h2>
                                    <p className="text-sm text-muted mt-1">Limits and features, side by side.</p>
                                </div>
                            </div>

                            <div
                                ref={comparisonRef}
                                tabIndex={0}
                                role="region"
                                aria-label="Plan comparison table, scroll horizontally to see all plans"
                                className="overflow-x-auto rounded-card border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <table className="w-full min-w-[640px] text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th scope="col" className="sticky left-0 z-10 bg-surface text-left px-5 py-4 text-xs font-bold uppercase tracking-wide text-muted w-[34%]">
                                                What you get
                                            </th>
                                            {plans.map((plan, i) => (
                                                <th
                                                    key={plan.id}
                                                    scope="col"
                                                    className={`px-4 py-4 text-center font-bold text-foreground ${
                                                        i === popularIndex ? 'bg-primary-soft/40' : ''
                                                    }`}
                                                >
                                                    {plan.name}
                                                    {i === popularIndex && (
                                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-primary mt-0.5">
                                                            Popular
                                                        </span>
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {matrix.limits.map((row) => (
                                            <tr key={row.label}>
                                                <th scope="row" className="sticky left-0 z-10 bg-surface text-left px-5 py-3 font-medium text-secondary">
                                                    {row.label}
                                                </th>
                                                {plans.map((plan, i) => {
                                                    const value = planLimits(plan).find((r) => r.label === row.label)?.value;
                                                    return (
                                                        <td
                                                            key={plan.id}
                                                            className={`px-4 py-3 text-center text-foreground font-semibold ${
                                                                i === popularIndex ? 'bg-primary-soft/20' : ''
                                                            }`}
                                                        >
                                                            {value}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        {matrix.features.map((feature) => (
                                            <tr key={feature.key}>
                                                <th scope="row" className="sticky left-0 z-10 bg-surface text-left px-5 py-3 font-medium text-secondary">
                                                    {feature.label}
                                                </th>
                                                {plans.map((plan, i) => (
                                                    <td
                                                        key={plan.id}
                                                        className={`px-4 py-3 text-center ${i === popularIndex ? 'bg-primary-soft/20' : ''}`}
                                                    >
                                                        {feature.get(plan) ? (
                                                            <>
                                                                <Check size={16} className="inline text-success-ink" aria-hidden="true" />
                                                                <span className="sr-only">Included</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Minus size={16} className="inline text-muted/60" aria-hidden="true" />
                                                                <span className="sr-only">Not included</span>
                                                            </>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-2 text-[11px] text-muted sm:hidden">Swipe the table horizontally to compare all plans.</p>
                        </section>
                    )}

                    {/* Included strip */}
                    <section className="mt-12 max-w-6xl mx-auto rounded-card border border-border bg-surface/70 px-6 py-5">
                        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {INCLUDED.map(({ icon: Icon, label }) => (
                                <li key={label} className="flex items-center gap-2.5 text-xs font-medium text-secondary">
                                    <Icon size={15} className="text-primary shrink-0" aria-hidden="true" />
                                    {label}
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* FAQ */}
                    <section className="mt-20 max-w-3xl mx-auto" aria-labelledby="pricing-faq">
                        <h2 id="pricing-faq" className="text-2xl font-bold text-foreground text-center mb-8">
                            Questions before you commit
                        </h2>
                        <div className="divide-y divide-border rounded-card border border-border bg-surface">
                            {FAQS.map((item) => (
                                <details key={item.q} className="group px-5 py-4">
                                    <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden">
                                        {item.q}
                                        <ChevronDown
                                            size={16}
                                            className="text-muted transition-transform group-open:rotate-180 shrink-0"
                                            aria-hidden="true"
                                        />
                                    </summary>
                                    <p className="mt-3 text-sm text-secondary leading-relaxed">{item.a}</p>
                                </details>
                            ))}
                        </div>
                    </section>

                    {/* Enterprise */}
                    <section className="mt-16 max-w-4xl mx-auto rounded-card border border-border bg-surface p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">                                        <div className="flex-1 text-left">
                                            <h2 className="text-lg font-semibold text-foreground mb-1.5 flex items-center gap-2">
                                                <Gift size={16} className="text-muted" aria-hidden="true" />
                                                Enterprise &amp; high volume
                                            </h2>
                            <p className="text-sm text-secondary leading-relaxed">
                                Dedicated infrastructure, custom limits, SSO, and onboarding for teams handling
                                thousands of conversations a day.
                            </p>
                        </div>
                        <a
                            href="mailto:sales@targetchat.ai"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-button font-bold text-sm transition-colors shrink-0"
                        >
                            Talk to sales <Zap size={15} aria-hidden="true" />
                        </a>
                    </section>

                    <p className="mt-10 text-center text-xs text-muted">
                        Prices in USD. Taxes may apply at checkout. Local AI usage is free of provider charges.
                    </p>
                </div>
            </main>

            <footer className="py-8 border-t border-border text-center text-muted text-sm relative z-10">
                © {new Date().getFullYear()} TargetChat AI. All rights reserved.
            </footer>
        </div>
    );
}
