import React, { useState } from 'react';
import Head from 'next/head';
import AdminSidebar from './AdminSidebar';
import AppFooter from '../layouts/AppFooter';

function AdminLayoutContent({ children, title = 'Admin Dashboard' }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="fixed inset-0 flex bg-background text-foreground overflow-hidden font-sans">
            <Head>
                <title>{title} | TargetChat Admin</title>
            </Head>

            {/* Sidebar */}
            <AdminSidebar
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed(!collapsed)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
                <main className="flex-1 overflow-y-auto min-h-0 p-6 bg-background scrollbar-thin">
                    <div className="max-w-7xl mx-auto animate-fadeIn">
                        {children}
                    </div>
                </main>

                {/* Outside <main>, so the scroll region is bounded by it and the
                    footer is always visible instead of sitting past the content. */}
                <AppFooter />
            </div>
        </div>
    );
}

export default function AdminLayout({ children, title }) {
    return (
        <AdminLayoutContent title={title}>{children}</AdminLayoutContent>
    );
}
