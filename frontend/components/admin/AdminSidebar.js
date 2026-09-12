import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from '../../contexts/ThemeContext';
import {
    LayoutDashboard, Users, Zap, Key, Activity,
    CreditCard, Tag, FileText, Mail, Shield,
    HardDrive, Settings, LogOut, MessageSquare,
    ChevronLeft, ChevronRight, Moon, Sun, Share2,
    Terminal
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
        <aside className={`h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 relative transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
            {/* Collapse Button */}
            <button
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
                aria-expanded={!collapsed}
                className="absolute -right-3 top-6 z-10 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 transition-all shadow-md"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Logo Area */}
            <div className={`p-6 flex items-center ${collapsed ? 'justify-center' : 'justify-start'}`}>
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                    T
                </div>
                {!collapsed && (
                    <div className="ml-3 animate-fadeIn">
                        <h1 className="font-bold text-gray-900 dark:text-white text-lg leading-none">TargetChat</h1>
                        <span className="text-xs text-blue-600 font-semibold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full mt-1 inline-block">
                            ADMIN
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                {navItems.map((item) => {
                    const isActive = router.pathname === item.href;
                    const IconCallback = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${isActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            title={collapsed ? item.label : ''}
                        >
                            <IconCallback size={20} className={`${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`} />

                            {!collapsed && (
                                <span className="font-medium truncate">{item.label}</span>
                            )}

                            {/* Active Indicator Strip */}
                            {isActive && !collapsed && (
                                <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full opacity-50"></div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    aria-pressed={theme !== 'light'}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all ${collapsed ? 'justify-center' : ''}`}
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>

                {/* Back to Chat */}
                <Link
                    href="/chat"
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all mt-1 ${collapsed ? 'justify-center' : ''}`}
                    title="Back to Chat"
                >
                    <MessageSquare size={20} />
                    {!collapsed && <span>Back to Chat</span>}
                </Link>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all mt-1 ${collapsed ? 'justify-center' : ''}`}
                    title="Logout"
                >
                    <LogOut size={20} />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}
