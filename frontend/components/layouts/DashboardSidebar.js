import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    LayoutDashboard,
    Inbox,
    Users,
    Share2,
    MessageSquareCode,
    Workflow,
    CreditCard,
    Settings,
    Shield,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import WorkspaceSwitcher from '../WorkspaceSwitcher';

export default function DashboardSidebar({
    user,
    collapsed,
    onToggleCollapse,
    currentWorkspace,
    workspaces,
    onWorkspaceChange,
    onCreateWorkspace,
    onManageMembers
}) {
    const router = useRouter();

    const primaryNav = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Inbox', href: '/inbox', icon: Inbox },
        { name: 'Leads', href: '/leads', icon: Users },
        { name: 'Channels', href: '/channels', icon: Share2 },
        { name: 'Widgets', href: '/widgets', icon: MessageSquareCode },
        { name: 'Workflows', href: '/workflows', icon: Workflow },
    ];

    const secondaryNav = [
        { name: 'Billing', href: '/billing', icon: CreditCard },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const adminNav = user?.role === 'admin' ? [
        { name: 'Admin Panel', href: '/admin', icon: Shield }
    ] : [];

    const renderNavGroup = (items, label) => (
        <div className="space-y-0.5">
            {!collapsed && label && (
                <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted/70">
                    {label}
                </div>
            )}
            {items.map((item) => {
                const IconComponent = item.icon;
                const isActive = router.pathname === item.href || (item.href !== '/dashboard' && router.pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`group relative flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'} py-2 rounded-md text-xs transition-colors ${
                            isActive
                                ? 'bg-primary/10 text-primary font-semibold after:absolute after:left-0 after:top-1.5 after:bottom-1.5 after:w-[2px] after:rounded-r after:bg-primary'
                                : 'text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary hover:bg-gray-100 dark:hover:bg-surface-hover/70'
                        }`}
                        title={collapsed ? item.name : ''}
                    >
                        <IconComponent
                            size={16}
                            className={`shrink-0 transition-colors ${
                                isActive
                                    ? 'text-primary'
                                    : 'text-gray-400 dark:text-text-muted group-hover:text-gray-600 dark:group-hover:text-text-secondary'
                            }`}
                        />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                );
            })}
        </div>
    );

    return (
        <>
            {/* Mobile backdrop */}
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-background/80 z-30 md:hidden backdrop-blur-xs"
                    onClick={onToggleCollapse}
                />
            )}
            <aside
                className={`h-full flex flex-col bg-surface border-r border-border select-none z-30 transition-all duration-200 ${
                    collapsed
                        ? 'hidden md:flex w-14 relative'
                        : 'fixed md:relative inset-y-0 left-0 w-[230px] shadow-2xl md:shadow-none'
                }`}
            >
                {/* Collapse / Expand Toggle Button */}
                <button
                    onClick={onToggleCollapse}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-expanded={!collapsed}
                    className="hidden md:flex absolute -right-2.5 top-5 z-20 w-5 h-5 bg-surface border border-border rounded-full items-center justify-center text-text-muted hover:text-text-primary hover:border-primary transition-colors shadow-xs"
                >
                    {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
                </button>

            {/* Workspace Switcher */}
            {!collapsed ? (
                <WorkspaceSwitcher
                    currentWorkspace={currentWorkspace}
                    workspaces={workspaces}
                    onWorkspaceChange={onWorkspaceChange}
                    onCreateWorkspace={onCreateWorkspace}
                    onManageMembers={onManageMembers}
                />
            ) : (
                <div className="p-3 border-b border-border flex justify-center">
                    <div className="w-8 h-8 rounded-md bg-surface-elevated border border-border flex items-center justify-center text-xs font-semibold text-text-primary">
                        {currentWorkspace ? currentWorkspace.name?.charAt(0)?.toUpperCase() : 'P'}
                    </div>
                </div>
            )}

            {/* Navigation Groups */}
            <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto scrollbar-thin">
                {renderNavGroup(primaryNav, 'Navigation')}
                {renderNavGroup(secondaryNav, 'Preferences')}
                {adminNav.length > 0 && renderNavGroup(adminNav, 'Admin')}
            </nav>
        </aside>
        </>
    );
}
