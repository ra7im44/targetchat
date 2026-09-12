import React, { useState } from 'react';
import Head from 'next/head';
import AdminSidebar from './AdminSidebar';

function AdminLayoutContent({ children, title = 'Admin Dashboard' }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
            <Head>
                <title>{title} | TargetChat Admin</title>
            </Head>

            {/* Sidebar */}
            <AdminSidebar
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed(!collapsed)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                    <div className="max-w-7xl mx-auto animate-fadeIn">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function AdminLayout({ children, title }) {
    return (
        <AdminLayoutContent title={title}>{children}</AdminLayoutContent>
    );
}
