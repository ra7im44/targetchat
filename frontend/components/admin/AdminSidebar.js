import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from '../../contexts/ThemeContext';
import {
    LayoutDashboard, Users, Zap, Key, Activity,
    CreditCard, Tag, FileText, Mail, Shield,
    HardDrive, Settings, LogOut, MessageSquare,
    ChevronLeft, ChevronRight, Moon, Sun, Share2,
    Terminal, Navigation
} from 'lucide-react';

export default function AdminSidebar({ collapsed, onToggleCollapse }) {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = () => {
        localStorage.removeItem('tc_token');
        router.push('/login');
    };

    const navItems = [
        { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/visitors', icon: Navigation, label: 'Session Tracking' },
        { href: '/admin/workflows', icon: Zap, label: 'Workflows' },
        { href: '/admin/channels', icon: Share2, label: 'Channels' },
        { href: '/admin/tokens', icon: Key, label: 'API Tokens' },
        { href: '/admin/activity', icon: Activity, label: 'Activity Logs' },
        { href: '/admin/billing', icon: CreditCard, label: 'Billing Center' },
        { href: '/admin/announcements', icon: MessageSquare, label: 'Announcements' },
        { href: '/admin/emails', icon: Mail, label: 'Email Engine' },
        { href: '/admin/system', icon: HardDrive, label: 'System' }, // using HardDrive for System/Server
        { href: '/admin/security', icon: Shield, label: 'Security & IP' },
        { href: '/admin/files', icon: HardDrive, label: 'File Manager' },
        { href: '/admin/debug', icon: Terminal, label: 'Developer Tools' },
        { href: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        /* shrink-0 matters: without it this aside is a shrinkable flex item and
           wide page content compresses it below w-64/w-20, clipping the labels. */
        <aside className={`shrink-0 h-full flex flex-col bg-surface border-r border-border relative transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
            {/* Collapse Button */}
            <button
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
                aria-expanded={!collapsed}
                className="absolute -right-3 top-6 z-10 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-muted hover:text-primary hover:border-primary transition-all shadow-md"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Logo Area */}
            <div className={`p-5 flex items-center ${collapsed ? 'justify-center' : 'justify-start'}`}>
                <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-semibold text-base">
                    T
                </div>
                {!collapsed && (
                    <div className="ml-3 animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold text-foreground text-base leading-none">TargetChat</h1>
                            <span className="text-[10px] font-bold text-primary bg-primary-soft border border-primary/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                ADMIN
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-thin">
                {navItems.map((item) => {
                    const isActive = router.pathname === item.href;
                    const IconCallback = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all group relative ${isActive
                                ? 'bg-primary-soft text-primary font-bold shadow-2xs'
                                : 'text-secondary hover:bg-surface-hover hover:text-foreground'
                                }`}
                            title={collapsed ? item.label : ''}
                        >
                            <IconCallback size={18} className={`${isActive ? 'text-primary' : 'text-muted group-hover:text-foreground'} shrink-0`} />

                            {!collapsed && (
                                <span className="truncate">{item.label}</span>
                            )}

                            {/* Active Indicator Strip */}
                            {isActive && !collapsed && (
                                <div className="absolute right-2.5 w-1.5 h-1.5 bg-primary rounded-full"></div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border bg-surface">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    aria-pressed={theme === 'dark'}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-secondary hover:bg-surface-hover hover:text-foreground transition-all ${collapsed ? 'justify-center' : ''}`}
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>

                {/* Back to Chat */}
                <Link
                    href="/chat"
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-primary hover:bg-primary-soft transition-all mt-1 ${collapsed ? 'justify-center' : ''}`}
                    title="Back to Chat"
                >
                    <MessageSquare size={20} />
                    {!collapsed && <span>Back to Chat</span>}
                </Link>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-danger hover:bg-danger-soft transition-all mt-1 ${collapsed ? 'justify-center' : ''}`}
                    title="Logout"
                >
                    <LogOut size={20} />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}
