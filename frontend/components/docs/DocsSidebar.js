import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    Home, Rocket, Layers, MessageSquare,
    Settings, Zap, HelpCircle, AlertTriangle,
    Book, Lock, Boxes, LayoutDashboard, Users
} from 'lucide-react';

const SidebarItem = ({ href, icon: Icon, label, isActive }) => (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}>
        <Icon size={18} />
        <span>{label}</span>
    </Link>
);

const SidebarSection = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {title}
        </h3>
        <div className="space-y-1">
            {children}
        </div>
    </div>
);

export default function DocsSidebar({ isOpen }) {
    const router = useRouter();
    const currentPath = router.pathname;

    return (
        <aside className={`fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 w-64 transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0 overflow-y-auto`}>
            <div className="p-4">
                <SidebarItem
                    href="/docs"
                    icon={Home}
                    label="Home"
                    isActive={currentPath === '/docs'}
                />
            </div>

            <div className="px-4">
                <SidebarSection title="Getting Started">
                    <SidebarItem
                        href="/docs/getting-started/quick-start"
                        icon={Rocket}
                        label="Quick Start"
                        isActive={currentPath === '/docs/getting-started/quick-start'}
                    />
                    <SidebarItem
                        href="/docs/dashboard/overview"
                        icon={LayoutDashboard}
                        label="Dashboard"
                        isActive={currentPath === '/docs/dashboard/overview'}
                    />
                </SidebarSection>

                <SidebarSection title="Core Features">
                    <SidebarItem
                        href="/docs/chat"
                        icon={MessageSquare}
                        label="Chat Interface"
                        isActive={currentPath === '/docs/chat'}
                    />
                    <SidebarItem
                        href="/docs/features/workspaces"
                        icon={Users}
                        label="Workspaces"
                        isActive={currentPath === '/docs/features/workspaces'}
                    />
                    <SidebarItem
                        href="/docs/features/human-handoff"
                        icon={Users}
                        label="Human Handoff"
                        isActive={currentPath === '/docs/features/human-handoff'}
                    />
                    <SidebarItem
                        href="/docs/widgets/creating"
                        icon={Layers}
                        label="Creating Widgets"
                        isActive={currentPath === '/docs/widgets/creating'}
                    />
                    <SidebarItem
                        href="/docs/widgets/installation"
                        icon={Boxes}
                        label="Widget Installation"
                        isActive={currentPath === '/docs/widgets/installation'}
                    />
                </SidebarSection>

                <SidebarSection title="Automation">
                    <SidebarItem
                        href="/docs/automation/private-workflows"
                        icon={Lock}
                        label="Private Workflows"
                        isActive={currentPath === '/docs/automation/private-workflows'}
                    />
                    <SidebarItem
                        href="/docs/automation/template-guide"
                        icon={Zap}
                        label="n8n Template Guide"
                        isActive={currentPath === '/docs/automation/template-guide'}
                    />
                    <SidebarItem
                        href="/docs/integrations/overview"
                        icon={Boxes}
                        label="Integrations & API"
                        isActive={currentPath === '/docs/integrations/overview'}
                    />
                </SidebarSection>

                <SidebarSection title="Support">
                    <SidebarItem
                        href="/docs/faq"
                        icon={HelpCircle}
                        label="FAQ"
                        isActive={currentPath === '/docs/faq'}
                    />
                    <SidebarItem
                        href="/docs/troubleshooting"
                        icon={AlertTriangle}
                        label="Troubleshooting"
                        isActive={currentPath === '/docs/troubleshooting'}
                    />
                </SidebarSection>
            </div>
        </aside>
    );
}
