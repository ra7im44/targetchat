import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import { MessageCircle, ShieldCheck, Settings, LogOut, Sun, Moon, ChevronDown, ChevronRight, Menu } from 'lucide-react';

export default function DashboardNavbar({ user, onToggleSidebar }) {
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { theme, toggleTheme } = useTheme();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Simple breadcrumb based on path
    const pathSegments = router.pathname.split('/').filter(Boolean);
    const breadcrumbs = pathSegments.map((segment, index) => {
        const href = '/' + pathSegments.slice(0, index + 1).join('/');
        return { name: segment.charAt(0).toUpperCase() + segment.slice(1), href };
    });

    const handleLogout = () => {
        localStorage.removeItem('tc_token');
        router.push('/');
    };

    return (
        <header className="h-14 bg-surface border-b border-border z-20 relative">
            <div className="max-w-[1240px] mx-auto w-full h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                {/* Left Side: Mobile toggle + Breadcrumbs */}
                <div className="flex items-center gap-2.5">
                    {onToggleSidebar && (
                        <button
                            onClick={onToggleSidebar}
                            aria-label="Toggle navigation"
                            className="md:hidden w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent hover:border-border transition-colors"
                        >
                            <Menu size={16} />
                        </button>
                    )}

                    <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs">
                        <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors">
                            TargetChat
                        </Link>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.href}>
                                <ChevronRight size={12} className="text-text-muted opacity-60" />
                                <span className={index === breadcrumbs.length - 1 ? 'text-text-primary font-semibold' : 'text-text-muted hover:text-text-primary transition-colors'}>
                                    {crumb.name}
                                </span>
                            </React.Fragment>
                        ))}
                    </nav>
                </div>

                {/* Right Side: Theme control + User account */}
                <div className="flex items-center gap-2">
                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        aria-pressed={theme !== 'light'}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-gray-100 dark:hover:bg-surface-hover border border-transparent hover:border-border transition-colors focus-visible:ring-2 focus-visible:ring-primary/60"
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? (
                            <Moon size={15} />
                        ) : (
                            <Sun size={15} />
                        )}
                    </button>

                    {/* User Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            aria-expanded={dropdownOpen}
                            aria-haspopup="true"
                            className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-surface-hover border border-transparent hover:border-border transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 group text-left"
                        >
                            <div className="w-7 h-7 rounded-md bg-surface-elevated border border-border flex items-center justify-center text-text-primary font-semibold text-xs shrink-0 shadow-xs">
                                {(user?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden sm:flex flex-col text-left">
                                <span className="text-xs font-medium text-text-primary leading-tight">
                                    {user?.name || 'Admin User'}
                                </span>
                                <span className="text-[11px] text-text-muted leading-tight truncate max-w-[140px]">
                                    {user?.email || 'admin@targetchat.com'}
                                </span>
                            </div>
                            <ChevronDown size={13} className={`text-text-muted group-hover:text-text-secondary transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-1.5 w-56 bg-surface rounded-lg shadow-xl border border-border py-1.5 z-50 animate-scaleIn origin-top-right">
                                <div className="px-3.5 py-2 border-b border-border mb-1">
                                    <p className="text-xs font-semibold text-text-primary truncate">{user?.name || 'Admin User'}</p>
                                    <p className="text-[11px] text-text-muted truncate">{user?.email}</p>
                                </div>

                                <Link
                                    href="/chat"
                                    onClick={() => setDropdownOpen(false)}
                                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover hover:text-text-primary transition-colors"
                                >
                                    <MessageCircle size={14} /> Back to Chat
                                </Link>

                                {user?.role === 'admin' && (
                                    <Link
                                        href="/admin"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-2 px-3.5 py-2 text-xs text-text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover hover:text-primary transition-colors"
                                    >
                                        <ShieldCheck size={14} /> Admin Panel
                                    </Link>
                                )}

                                <Link
                                    href="/settings"
                                    onClick={() => setDropdownOpen(false)}
                                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover hover:text-text-primary transition-colors"
                                >
                                    <Settings size={14} /> Settings
                                </Link>

                                <div className="h-px bg-border my-1"></div>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-danger hover:bg-danger/10 transition-colors text-left"
                                >
                                    <LogOut size={14} /> Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
