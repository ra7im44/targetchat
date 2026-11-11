import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
    ArrowRight,
    BookOpen,
    Bot,
    Check,
    ChevronDown,
    Database,
    Globe,
    Inbox,
    Languages,
    Layers,
    Lock,
    Menu,
    MessageSquare,
    Send,
    Server,
    Shield,
    Users,
    Workflow,
    X,
} from 'lucide-react';

const FEATURES = [
    {
        icon: Bot,
        title: 'Streamed model responses',
        body: 'Replies arrive token by token from a real model, with per-workspace prompts and no canned templates.',
    },
    {
        icon: Database,
        title: 'Answers grounded in your documents',
        body: 'Relevant passages from your knowledge base are retrieved per question, so replies cite your policies instead of guessing.',
    },
    {
        icon: Inbox,
        title: 'Shared inbox with handoff',
        body: 'Every conversation has an owner, a status, and full history. A teammate can take over without losing context.',
    },
    {
        icon: MessageSquare,
        title: 'Embeddable website widget',
        body: 'Configure branding and pre-chat fields, then embed one script tag. Visitors get a conversation, not a form.',
    },
    {
        icon: Workflow,
        title: 'Assignment and business hours',
        body: 'Round-robin or availability routing, out-of-hours replies, and status tracking keep response times predictable.',
    },
    {
        icon: Layers,
        title: 'Workspace isolation',
        body: 'Conversations, knowledge, members, and AI settings are scoped per workspace with role-based access.',
    },
];

const STEPS = [
    {
        n: '01',
        title: 'Connect a model',
        body: 'Start with local Ollama, or configure OpenAI, Anthropic, Gemini, Groq, or DeepSeek when keys are available.',
    },
    {
        n: '02',
        title: 'Add your knowledge',
        body: 'Upload policies and product documentation, then set the system prompt for your brand and tone.',
    },
    {
        n: '03',
        title: 'Embed and route',
        body: 'Place the widget on your site. The AI handles first-line questions; your team takes over from the inbox.',
    },
];

const CAPABILITIES = [
    { icon: Server, term: 'Local inference', detail: 'Runs on your own hardware through Ollama' },
    { icon: Globe, term: 'Six providers', detail: 'One interface, swappable model per workspace' },
    { icon: Languages, term: 'Arabic and English', detail: 'First-class support, including RTL layout' },
    { icon: Shield, term: 'Tenant isolation', detail: 'Every query scoped to a single workspace' },
];

const CHANNELS = [
    { name: 'Website widget', status: 'Available', note: 'Script embed with branding and pre-chat fields' },
    { name: 'REST API', status: 'Available', note: 'Workspace-scoped endpoints with JWT authentication' },
    { name: 'Webhooks', status: 'Available', note: 'Signed outbound events' },
    { name: 'WhatsApp Cloud API', status: 'Configuration required', note: 'Webhook verification and message mapping' },
    { name: 'Telegram', status: 'Configuration required', note: 'Bot token and webhook registration' },
    { name: 'Email / SMTP', status: 'Configuration required', note: 'SMTP delivery, local capture for testing' },
];

const FAQS = [
    {
        q: 'Can TargetChat run without a paid AI API?',
        a: 'Yes. Ollama is the default provider and runs locally. Paid providers are optional adapters that stay inactive until credentials are configured.',
    },
    {
        q: 'Does the assistant handle Arabic?',
        a: 'Yes. Arabic and English use the same workspace, knowledge base, and streaming interface, including right-to-left output.',
    },
    {
        q: 'Where does conversation data go?',
        a: 'With a local model, prompts and documents stay on your infrastructure. Workspaces are isolated at the query level and data is not used for training.',
    },
    {
        q: 'What happens when the AI cannot answer?',
        a: 'The conversation remains in the shared inbox with its full transcript so a teammate can respond with context.',
    },
];

const PROVIDERS = [
    { name: 'Ollama', state: 'Default', note: 'Local' },
    { name: 'OpenAI', state: 'Optional', note: 'API key' },
    { name: 'Anthropic', state: 'Optional', note: 'API key' },
    { name: 'Google Gemini', state: 'Optional', note: 'API key' },
    { name: 'Groq', state: 'Optional', note: 'API key' },
    { name: 'DeepSeek', state: 'Optional', note: 'API key' },
];

export default function Home() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setIsLoggedIn(!!localStorage.getItem('tc_token'));
    }, []);

    return (
        <div className="min-h-screen bg-background font-sans">
            <Head>
                <title>TargetChat — AI customer conversations, on your terms</title>
                <meta
                    name="description"
                    content="TargetChat combines streamed AI replies, a shared team inbox, and workspace knowledge. Local Ollama support, no paid API required."
                />
            </Head>

            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
            >
                Skip to content
            </a>

            <header className="sticky top-0 z-50 border-b border-border bg-surface">
                <div className="mx-auto w-full max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="TargetChat home">
                        <span className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-semibold text-sm">
                            T
                        </span>
                        <span className="text-sm font-semibold text-foreground tracking-tight">TargetChat</span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-6 text-sm" aria-label="Main">
                        <a href="#features" className="text-secondary hover:text-foreground transition-colors">
                            Features
                        </a>
                        <a href="#how-it-works" className="text-secondary hover:text-foreground transition-colors">
                            How it works
                        </a>
                        <a href="#integrations" className="text-secondary hover:text-foreground transition-colors">
                            Channels
                        </a>
                        <Link href="/pricing" className="text-secondary hover:text-foreground transition-colors">
                            Pricing
                        </Link>
                        <Link href="/docs" className="text-secondary hover:text-foreground transition-colors">
                            Docs
                        </Link>
                    </nav>

                    <div className="hidden lg:flex items-center gap-2">
                        {isLoggedIn ? (
                            <>
                                <Link
                                    href="/chat"
                                    className="px-3 py-2 text-sm font-medium text-secondary hover:text-foreground transition-colors"
                                >
                                    Chat
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="px-3.5 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors"
                                >
                                    Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="px-3 py-2 text-sm font-medium text-secondary hover:text-foreground transition-colors"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-3.5 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors"
                                >
                                    Start free
                                </Link>
                            </>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-menu"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        className="lg:hidden p-2 -mr-2 rounded-md text-secondary hover:text-foreground hover:bg-surface-hover transition-colors"
                    >
                        {menuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                {menuOpen && (
                    <div id="mobile-menu" className="lg:hidden border-t border-border bg-surface px-6 py-3">
                        {[
                            ['Features', '#features'],
                            ['How it works', '#how-it-works'],
                            ['Channels', '#integrations'],
                            ['Pricing', '/pricing'],
                            ['Docs', '/docs'],
                        ].map(([label, href]) => (
                            <a
                                key={href}
                                href={href}
                                onClick={() => setMenuOpen(false)}
                                className="block px-2 py-2.5 rounded-md text-sm text-secondary hover:text-foreground hover:bg-surface-hover"
                            >
                                {label}
                            </a>
                        ))}
                        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                            <Link
                                href={isLoggedIn ? '/dashboard' : '/login'}
                                className="px-3 py-2 rounded-md border border-border text-sm font-medium text-center text-foreground"
                            >
                                {isLoggedIn ? 'Dashboard' : 'Sign in'}
                            </Link>
                            {!isLoggedIn && (
                                <Link
                                    href="/register"
                                    className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold text-center"
                                >
                                    Start free
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </header>

            <main id="main">
                {/* Hero */}
                <section className="mx-auto w-full max-w-6xl px-6 py-14 lg:py-20">
                    <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                                Local-first AI · Arabic and English
                            </p>

                            <h1 className="mt-4 text-4xl sm:text-5xl font-semibold text-foreground tracking-tight leading-[1.1]">
                                Turn visitors into
                                <br className="hidden sm:block" /> real conversations.
                            </h1>

                            <p className="mt-5 text-base sm:text-lg text-secondary leading-relaxed max-w-xl">
                                TargetChat answers with a streaming model, grounds replies in your own knowledge, and
                                hands the conversation to your team when it matters. Your data stays where you put it.
                            </p>

                            <div className="mt-7 flex flex-col sm:flex-row gap-3">
                                <Link
                                    href={isLoggedIn ? '/dashboard' : '/register'}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm transition-colors"
                                >
                                    {isLoggedIn ? 'Open dashboard' : 'Start free'}
                                    <ArrowRight size={15} aria-hidden="true" />
                                </Link>
                                <a
                                    href="#how-it-works"
                                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-md border border-border bg-surface text-foreground hover:bg-surface-hover font-medium text-sm transition-colors"
                                >
                                    See how it works
                                </a>
                            </div>

                            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
                                {['Runs on local Ollama', 'No credit card required', 'Workspace isolation'].map((item) => (
                                    <li key={item} className="flex items-center gap-1.5">
                                        <Check size={13} className="text-success-ink" aria-hidden="true" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Product panel — a plain interface specimen, not an illustration */}
                        <div className="w-full max-w-lg mx-auto lg:mx-0 lg:justify-self-end rounded-card border border-border bg-surface overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-secondary">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded-md border border-border bg-surface flex items-center justify-center">
                                        <Bot size={14} className="text-secondary" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold text-foreground leading-tight">Support agent</p>
                                        <p className="text-[11px] text-muted leading-tight">qwen2.5-coder:3b · local</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-secondary">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
                                    Ready
                                </span>
                            </div>

                            <div className="p-4 space-y-3" aria-hidden="true">
                                <div className="flex justify-end">
                                    <p className="max-w-[85%] rounded-lg bg-primary text-primary-foreground text-[13px] leading-relaxed px-3 py-2">
                                        مرحباً، هل يمكنني إرجاع منتج بعد أسبوعين؟
                                    </p>
                                </div>
                                <div className="flex justify-start">
                                    <div className="max-w-[88%] rounded-lg border border-border bg-surface-secondary text-[13px] leading-relaxed text-secondary px-3 py-2">
                                        نعم. تسمح سياستنا بالإرجاع خلال 14 يوماً من الاستلام، بشرط أن يكون المنتج
                                        بحالته الأصلية مع الفاتورة.
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted">
                                    <BookOpen size={12} aria-hidden="true" />
                                    Knowledge base · Refund policy
                                    <span className="ml-auto font-mono">152 tokens</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-3 border-t border-border">
                                <div className="flex-1 h-8 rounded-md border border-border bg-surface px-2.5 flex items-center text-xs text-muted">
                                    Ask something…
                                </div>
                                <span className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
                                    <Send size={14} aria-hidden="true" />
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Capabilities */}
                <section className="border-y border-border bg-surface" aria-label="Platform capabilities">
                    <div className="mx-auto w-full max-w-6xl px-6 py-8">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                            {CAPABILITIES.map(({ icon: Icon, term, detail }) => (
                                <div key={term} className="flex items-start gap-3">
                                    <Icon size={16} className="text-muted mt-0.5 shrink-0" aria-hidden="true" />
                                    <div>
                                        <dt className="text-sm font-semibold text-foreground">{term}</dt>
                                        <dd className="text-xs text-muted leading-relaxed mt-0.5">{detail}</dd>
                                    </div>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* Features */}
                <section id="features" className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20 scroll-mt-16">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Platform</p>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground tracking-tight max-w-2xl">
                        Answer, ground, escalate, and keep the record
                    </h2>
                    <p className="mt-3 text-secondary leading-relaxed max-w-2xl">
                        Not a chat widget bolted onto a contact form. A complete conversation loop with the team and
                        audit trail around it.
                    </p>

                    <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
                        {FEATURES.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="border-t border-border pt-4">
                                <div className="flex items-center gap-2">
                                    <Icon size={15} className="text-primary" aria-hidden="true" />
                                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                                </div>
                                <p className="mt-2 text-sm text-secondary leading-relaxed">{body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How it works */}
                <section id="how-it-works" className="border-y border-border bg-surface scroll-mt-16">
                    <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
                        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-start">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Setup</p>
                                <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                                    Live in an afternoon
                                </h2>
                                <p className="mt-3 text-secondary leading-relaxed">
                                    The default path uses only local services: Ollama for inference, SQLite or MariaDB
                                    for storage, and Redis when you run more than one instance.
                                </p>
                                <Link
                                    href="/docs"
                                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
                                >
                                    Read the setup guide <ArrowRight size={14} aria-hidden="true" />
                                </Link>
                            </div>

                            <ol className="divide-y divide-border border-y border-border">
                                {STEPS.map((step) => (
                                    <li key={step.n} className="flex gap-5 py-5">
                                        <span className="font-mono text-xs text-muted w-7 shrink-0 pt-0.5">{step.n}</span>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                                            <p className="mt-1 text-sm text-secondary leading-relaxed">{step.body}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </section>

                {/* Inbox */}
                <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
                    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                        <div className="rounded-card border border-border bg-surface overflow-hidden order-2 lg:order-1">
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-secondary">
                                <Inbox size={14} className="text-muted" aria-hidden="true" />
                                <span className="text-xs font-semibold text-foreground">Inbox</span>
                                <span className="ml-auto text-[11px] text-muted">3 open</span>
                            </div>
                            <ul className="divide-y divide-border" aria-hidden="true">
                                {[
                                    { name: 'Sara A.', msg: 'هل لديكم خطة للشركات الصغيرة؟', tag: 'AI' },
                                    { name: 'Omar K.', msg: 'I need an invoice for last month.', tag: 'Agent' },
                                    { name: 'Nadia M.', msg: 'Can I export the chat history?', tag: 'Pending' },
                                ].map((row) => (
                                    <li key={row.name} className="flex items-start gap-3 px-4 py-3">
                                        <span className="w-7 h-7 rounded-md border border-border bg-surface-secondary flex items-center justify-center text-[11px] font-semibold text-secondary shrink-0">
                                            {row.name.charAt(0)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold text-foreground">{row.name}</p>
                                                <span className="text-[10px] uppercase tracking-wide text-muted">{row.tag}</span>
                                            </div>
                                            <p className="text-xs text-muted truncate mt-0.5">{row.msg}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="order-1 lg:order-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Handoff</p>
                            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                                The AI starts it. Your team finishes it.
                            </h2>
                            <p className="mt-3 text-secondary leading-relaxed">
                                Automated replies handle repetitive questions. When a conversation needs judgement, it
                                is already in the inbox with the transcript, visitor details, and the knowledge used.
                            </p>
                            <ul className="mt-6 space-y-4">
                                {[
                                    { icon: Users, t: 'Assignment by workload', d: 'Round-robin or availability routing, reassignable by supervisors.' },
                                    { icon: Workflow, t: 'Status and hours', d: 'Open, pending, and resolved states with out-of-hours handling.' },
                                    { icon: MessageSquare, t: 'Context survives handoff', d: 'Agents see the same history the model used.' },
                                ].map(({ icon: Icon, t, d }) => (
                                    <li key={t} className="flex gap-3">
                                        <Icon size={15} className="text-muted mt-0.5 shrink-0" aria-hidden="true" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{t}</p>
                                            <p className="text-sm text-muted leading-relaxed">{d}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Providers */}
                <section className="border-y border-border bg-surface">
                    <div className="mx-auto w-full max-w-6xl px-6 py-12">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-12">
                            <div className="lg:w-72 shrink-0">
                                <h2 className="text-lg font-semibold text-foreground">Model layer</h2>
                                <p className="mt-1.5 text-sm text-secondary leading-relaxed">
                                    One abstraction with streaming, timeouts, usage metrics, and fallback ordering.
                                    Cloud adapters stay dormant until configured.
                                </p>
                            </div>
                            <ul className="flex-1 grid sm:grid-cols-2 gap-x-8 gap-y-2">
                                {PROVIDERS.map((p) => (
                                    <li key={p.name} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                                        <span className="text-sm text-foreground">{p.name}</span>
                                        <span className="flex items-center gap-2 text-[11px]">
                                            <span className="text-muted">{p.note}</span>
                                            <span
                                                className={
                                                    p.state === 'Default'
                                                        ? 'text-success-ink font-semibold w-14 text-right'
                                                        : 'text-muted w-14 text-right'
                                                }
                                            >
                                                {p.state}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Channels */}
                <section id="integrations" className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20 scroll-mt-16">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Channels</p>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                        Meet customers where they already are
                    </h2>
                    <p className="mt-3 text-secondary leading-relaxed max-w-2xl">
                        Start on your website. Add messaging and email when credentials are available — each channel is
                        isolated behind workspace settings and stays inactive until configured.
                    </p>

                    <div className="mt-8 border border-border rounded-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-secondary">
                                <tr className="text-left">
                                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Channel</th>
                                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted hidden sm:table-cell">Details</th>
                                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-surface">
                                {CHANNELS.map((c) => (
                                    <tr key={c.name}>
                                        <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">{c.name}</td>
                                        <td className="px-4 py-3 text-muted hidden sm:table-cell">{c.note}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span
                                                className={`inline-flex items-center gap-1.5 text-xs ${
                                                    c.status === 'Available' ? 'text-success-ink' : 'text-muted'
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        c.status === 'Available' ? 'bg-success' : 'bg-border-strong'
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                                {c.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Security */}
                <section className="border-y border-border bg-surface">
                    <div className="mx-auto w-full max-w-6xl px-6 py-16">
                        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Lock size={15} className="text-primary" aria-hidden="true" />
                                    <h2 className="text-lg font-semibold text-foreground">Security is not a plan tier</h2>
                                </div>
                                <p className="mt-2 text-sm text-secondary leading-relaxed">
                                    Tenant boundaries are enforced in queries, not only in the interface. Billing test
                                    mode is blocked outside development, uploads are validated, and secrets stay in
                                    environment configuration.
                                </p>
                            </div>
                            <dl className="grid sm:grid-cols-2 gap-x-10 gap-y-6">
                                {[
                                    { t: 'Workspace isolation', d: 'Conversations, knowledge, and AI settings scoped per tenant.' },
                                    { t: 'JWT sessions', d: 'Verified tokens with role checks on protected routes.' },
                                    { t: 'Private uploads', d: 'Access-controlled files with type and size validation.' },
                                    { t: 'No training on your data', d: 'Conversations are not used to improve models.' },
                                ].map(({ t, d }) => (
                                    <div key={t} className="border-t border-border pt-3">
                                        <dt className="text-sm font-semibold text-foreground">{t}</dt>
                                        <dd className="mt-1 text-sm text-muted leading-relaxed">{d}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section className="mx-auto w-full max-w-6xl px-6 py-14">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-border rounded-card bg-surface px-6 py-6">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Start free. Upgrade when it pays for itself.</h2>
                            <p className="mt-1 text-sm text-secondary">
                                Every plan includes AI replies, the knowledge base, and the shared inbox.
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Link
                                href="/pricing"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors"
                            >
                                Compare plans <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                            <Link
                                href="/register"
                                className="inline-flex items-center px-4 py-2 rounded-md border border-border text-foreground hover:bg-surface-hover text-sm font-medium transition-colors"
                            >
                                Create account
                            </Link>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="mx-auto w-full max-w-3xl px-6 pb-16">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Common questions</h2>
                    <div className="border-t border-border">
                        {FAQS.map((item) => (
                            <details key={item.q} className="group border-b border-border py-4">
                                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden">
                                    {item.q}
                                    <ChevronDown
                                        size={15}
                                        className="text-muted transition-transform group-open:rotate-180 shrink-0"
                                        aria-hidden="true"
                                    />
                                </summary>
                                <p className="mt-2.5 text-sm text-secondary leading-relaxed pr-8">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                {/* Closing */}
                <section className="border-t border-border">
                    <div className="mx-auto w-full max-w-6xl px-6 py-12 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <p className="text-sm text-secondary max-w-md">
                            Set up a workspace, connect a local model, and answer with something better than an
                            auto-responder.
                        </p>
                        <div className="flex gap-2">
                            <Link
                                href={isLoggedIn ? '/dashboard' : '/register'}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors"
                            >
                                {isLoggedIn ? 'Open dashboard' : 'Get started'}
                                <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                            <a
                                href="mailto:sales@targetchat.ai"
                                className="inline-flex items-center px-4 py-2 rounded-md border border-border text-foreground hover:bg-surface-hover text-sm font-medium transition-colors"
                            >
                                Contact
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-border bg-surface">
                <div className="mx-auto w-full max-w-6xl px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-semibold text-xs">
                                T
                            </span>
                            <span className="text-sm font-semibold text-foreground">TargetChat</span>
                        </div>
                        <p className="mt-2.5 text-sm text-muted leading-relaxed max-w-sm">
                            AI customer conversations with streamed replies, your own knowledge, and a team inbox built
                            for handoff. Local-first by default.
                        </p>
                    </div>

                    <nav aria-label="Product">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted mb-2.5">Product</p>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#features" className="text-secondary hover:text-foreground transition-colors">Features</a></li>
                            <li><Link href="/pricing" className="text-secondary hover:text-foreground transition-colors">Pricing</Link></li>
                            <li><Link href="/docs" className="text-secondary hover:text-foreground transition-colors">Documentation</Link></li>
                            <li><Link href="/widgets" className="text-secondary hover:text-foreground transition-colors">Widgets</Link></li>
                        </ul>
                    </nav>

                    <nav aria-label="Account">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted mb-2.5">Account</p>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/login" className="text-secondary hover:text-foreground transition-colors">Sign in</Link></li>
                            <li><Link href="/register" className="text-secondary hover:text-foreground transition-colors">Create account</Link></li>
                            <li><Link href="/dashboard" className="text-secondary hover:text-foreground transition-colors">Dashboard</Link></li>
                            <li><a href="mailto:sales@targetchat.ai" className="text-secondary hover:text-foreground transition-colors">Contact</a></li>
                        </ul>
                    </nav>
                </div>

                <div className="border-t border-border">
                    <div className="mx-auto w-full max-w-6xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
                        <p>© {new Date().getFullYear()} TargetChat AI. All rights reserved.</p>
                        <p>Local-first · Arabic and English</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
