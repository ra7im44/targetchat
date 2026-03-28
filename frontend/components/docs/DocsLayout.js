import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DocsSidebar from './DocsSidebar';
import DocsTableOfContents from './DocsTableOfContents';

export default function DocsLayout({ children, title, description }) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    // Toggle dark mode
    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        if (typeof window !== 'undefined') {
            document.documentElement.classList.toggle('dark');
        }
    };

    return (
        <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
            <Head>
                <title>{title ? `${title} - TargetChat Docs` : 'TargetChat Documentation'}</title>
                <meta name="description" content={description || 'Complete guide to using TargetChat'} />
            </Head>

            {/* Top Navbar */}
            <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Left: Logo + Mobile Menu */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            <Link href="/" className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">T</div>
                                <div>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">TargetChat</span>
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Docs</span>
                                </div>
                            </Link>
                        </div>

                        {/* Right: Dark Mode + Login */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleDarkMode}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                title="Toggle dark mode"
                            >
                                {darkMode ? (
                                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>

                            <Link href="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors">
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
                        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
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
                        <article className="prose prose-lg dark:prose-invert max-w-none">
                            {children}
                        </article>

                        {/* Feedback */}
                        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Was this page helpful?</p>
                            <div className="flex gap-3">
                                <button className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-medium">
                                    👍 Yes
                                </button>
                                <button className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium">
                                    👎 No
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
