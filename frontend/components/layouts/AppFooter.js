import React from 'react';
import Link from 'next/link';
import { BookOpen, Server } from 'lucide-react';

/**
 * AppFooter — the shell footer, shared by AdminLayout and DashboardLayout.
 *
 * It is rendered as a **sibling of `<main>`**, not inside it. Both shells are
 * `h-screen overflow-hidden` with `<main>` as the only scroll container, so a
 * footer placed inside the scroll area is only ever reached by scrolling past
 * the content — which is exactly what made short pages look like they ended in
 * dead space. Keeping it outside bounds the scroll region and makes the footer
 * permanent chrome.
 */
export default function AppFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="shrink-0 border-t border-border bg-surface px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted">
                <p className="flex items-center gap-1.5">
                    <span className="font-semibold text-secondary">TargetChat</span>
                    <span aria-hidden="true">·</span>
                    <span>Admin console</span>
                    <span aria-hidden="true" className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">&copy; {year}</span>
                </p>

                <nav aria-label="Footer" className="flex items-center gap-4">
                    <Link
                        href="/admin/system"
                        className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <Server size={13} aria-hidden="true" />
                        System status
                    </Link>
                    <Link
                        href="/docs"
                        className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <BookOpen size={13} aria-hidden="true" />
                        Documentation
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
