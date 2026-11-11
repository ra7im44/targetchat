import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DocsSidebar from './DocsSidebar';
import DocsTableOfContents from './DocsTableOfContents';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function DocsLayout({ children, title, description }) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const darkMode = theme !== 'light';

    return (
        <div className="min-h-screen">
            <Head>
                <title>{title ? `${title} - TargetChat Docs` : 'TargetChat Documentation'}</title>
                <meta name="description" content={description || 'Complete guide to using TargetChat'} />
            </Head>

            {/* Top Navbar */}
            <nav className="sticky top-0 z-50 bg-surface border-b border-border">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Left: Logo + Mobile Menu */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                aria-label={sidebarOpen ? 'Close docs navigation' : 'Open docs navigation'}
                                aria-expanded={sidebarOpen}
                                className="lg:hidden p-2 rounded-xl hover:bg-surface-hover"
                            >
                                <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            <Link href="/" className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-xs">T</div>
                                <div>
                                    <span className="text-xl font-bold text-foreground">TargetChat</span>
                                    <span className="ml-2 text-sm text-secondary">Docs</span>
                                </div>
                            </Link>
                        </div>

                        {/* Right: Dark Mode + Login */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleTheme}
                                aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
                                aria-pressed={darkMode}
                                className="p-2 rounded-xl hover:bg-surface-hover text-secondary hover:text-foreground transition-colors"
                                title="Toggle dark mode"
                            >
                                {darkMode ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>

                            <Link href="/login" className="px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-xl font-semibold text-sm transition-colors shadow-xs">
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex gap-8 py-8">
                    {/* Sidebar */}
                    <aside className={`
                        fixed lg:sticky top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] overflow-y-auto
                        bg-surface border-r border-border
                        transition-transform lg:translate-x-0
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    `}>
                        <DocsSidebar currentPath={router.pathname} />
                    </aside>

                    {/* Overlay for mobile */}
                    {sidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    {/* Content */}
                    <main className="flex-1 min-w-0 max-w-4xl">
                        <article className="prose prose-lg dark:prose-invert max-w-none text-foreground">
                            {children}
                        </article>

                        {/* Feedback */}
                        <div className="mt-12 pt-8 border-t border-border">
                            <p className="text-sm text-secondary mb-4">Was this page helpful?</p>
                            <div className="flex gap-3">
                                <button className="px-4 py-2 bg-success-soft text-success border border-success/20 rounded-xl hover:bg-success/20 transition-colors text-sm font-semibold flex items-center gap-2">
                                    <ThumbsUp size={16} /> Yes
                                </button>
                                <button className="px-4 py-2 bg-danger-soft text-danger border border-danger/20 rounded-xl hover:bg-danger/20 transition-colors text-sm font-semibold flex items-center gap-2">
                                    <ThumbsDown size={16} /> No
                                </button>
                            </div>
                        </div>
                    </main>

                    {/* Table of Contents (Desktop only) */}
                    <aside className="hidden xl:block w-64 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
                        <DocsTableOfContents />
                    </aside>
                </div>
            </div>
        </div>
    );
}
