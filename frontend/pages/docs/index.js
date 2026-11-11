import React from 'react';
import DocsLayout from '../../components/docs/DocsLayout';
import Link from 'next/link';
import {
    Rocket, MessageSquare, Layers, Lock,
    Zap, AlertTriangle, Workflow // Using Workflow icon if available, else Zap
} from 'lucide-react';

// Premium Card Component
const CategoryCard = ({ href, icon: Icon, title, description, gradient }) => (
    <Link href={href} className="group relative overflow-hidden rounded-card bg-surface border border-border hover:shadow-lg transition-all duration-300">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 bg-accent" />

        <div className="p-6 relative z-10">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transform group-hover:scale-110 transition-transform duration-300 bg-accent">
                <Icon className="w-7 h-7 text-background" strokeWidth={1.5} />
            </div>

            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {title}
            </h3>

            <p className="text-muted leading-relaxed text-sm">
                {description}
            </p>
        </div>
    </Link>
);

export default function DocsHome() {
    return (
        <DocsLayout
            title="Documentation"
            description="Learn how to use TargetChat effectively"
        >
            {/* Premium Hero Section */}
            <div className="relative overflow-hidden rounded-card bg-surface border border-border p-10 md:p-16 mb-16 text-center shadow-lg">
                {/* Animated Background Blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute -top-20 -left-20 w-80 h-80 bg-accent/30 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-[120px]"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid.svg')] opacity-10"></div>
                </div>

                <div className="relative z-10 max-w-3xl mx-auto">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-surface-elevated border border-border text-sm font-medium text-secondary mb-6">
                        Documentation v1.0
                    </span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight text-foreground">
                        How can we help you?
                    </h1>
                    <p className="text-secondary text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
                        Explore our comprehensive guides to master TargetChat, from setting up your first widget to building advanced AI workflows.
                    </p>

                    {/* Glassmorphism Search */}
                    <div className="relative max-w-xl mx-auto group">
                        <div className="absolute inset-0 bg-accent blur-xl rounded-full opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
                        <div className="relative flex items-center bg-surface-elevated border border-border rounded-full px-6 py-4 shadow-lg transition-all">
                            <svg className="w-6 h-6 text-muted mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search guides, tutorials, and API docs..."
                                className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted text-lg"
                                disabled
                            />
                            <span className="text-xs font-mono text-muted border border-border rounded px-2 py-1 ml-4 hidden sm:block">
                                CTRL K
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Categories - Premium Grid */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
                    <span className="w-1 h-8 bg-accent rounded-full"></span>
                    Get Started
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    <CategoryCard
                        href="/docs/getting-started/quick-start"
                        icon={Rocket}
                        title="Quick Start"
                        description="Launch your first AI assistant in under 5 minutes. Includes account setup and widget creation."
                        gradient=""
                    />
                    <CategoryCard
                        href="/docs/widgets/creating"
                        icon={Layers}
                        title="Widget Design"
                        description="Customize the look and feel of your chat widget to match your brand identity perfectly."
                        gradient=""
                    />
                    <CategoryCard
                        href="/docs/widgets/installation"
                        icon={Layers}
                        title="Installation"
                        description="Copy-paste guides for WordPress, Shopify, Next.js, and raw HTML websites."
                        gradient=""
                    />
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
                    <span className="w-1 h-8 bg-accent rounded-full"></span>
                    Advanced Features
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    <CategoryCard
                        href="/docs/automation/template-guide"
                        icon={Workflow}
                        title="n8n Templates"
                        description="Download the official TargetChat n8n workflow. Includes Webhook, Memory, and AI Agent nodes."
                        gradient=""
                    />
                    <CategoryCard
                        href="/docs/automation/private-workflows"
                        icon={Lock}
                        title="Custom Workflows"
                        description="Connect your own n8n headers and secure webhooks to build bespoke AI logic."
                        gradient=""
                    />
                    <CategoryCard
                        href="/docs/features/human-handoff"
                        icon={MessageSquare}
                        title="Human Handoff"
                        description="Learn how to monitor chats in the Inbox and manually take over control from the AI."
                        gradient=""
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                <CategoryCard
                    href="/docs/integrations/overview"
                    icon={Zap}
                    title="Integrations API"
                    description="Connect with CRMs, databases, and third-party tools via our REST API."
                    gradient=""
                />
                <CategoryCard
                    href="/docs/troubleshooting"
                    icon={AlertTriangle}
                    title="Troubleshooting"
                    description="Solutions to common issues, error codes, and connectivity problems."
                    gradient=""
                />
            </div>

            {/* Footer Links */}
            <div className="rounded-card bg-surface border border-border p-8 md:p-12 text-center">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                    Still need help?
                </h2>
                <p className="text-muted mb-8 max-w-lg mx-auto">
                    Join our developer community or contact our support team for personalized assistance.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Link href="/docs/faq" className="px-6 py-3 bg-surface-elevated text-foreground rounded-xl shadow hover:shadow-md transition-all font-medium border border-border-strong">
                        Read FAQ
                    </Link>
                    <a href="mailto:support@targetchat.ai" className="px-6 py-3 bg-accent text-background rounded-xl shadow-lg hover:bg-accent-hover transition-all font-medium">
                        Contact Support
                    </a>
                </div>
            </div>
        </DocsLayout>
    );
}
