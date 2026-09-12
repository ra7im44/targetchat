import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardSidebar from './DashboardSidebar';
import DashboardNavbar from './DashboardNavbar';
import { toast } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function DashboardContent({ children, title, user, workspaces, currentWorkspace, setCurrentWorkspace, collapsed, setCollapsed }) {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
            <Head>
                <title>{title} | TargetChat</title>
            </Head>

            {/* Sidebar */}
            <DashboardSidebar
                user={user}
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed(!collapsed)}
                currentWorkspace={currentWorkspace}
                workspaces={workspaces}
                onWorkspaceChange={setCurrentWorkspace}
                onCreateWorkspace={() => { }} // TODO: Implement modal
                onManageMembers={() => { }} // TODO: Implement modal
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <DashboardNavbar user={user} />

                <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children, title = 'Dashboard' }) {
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [workspaces, setWorkspaces] = useState([]);
    const [currentWorkspace, setCurrentWorkspace] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        const token = localStorage.getItem('tc_token');

        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            // 1. Fetch User
            const userRes = await fetch(`${API}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!userRes.ok) {
                throw new Error(`Auth failed: ${userRes.status}`);
            }

            const userData = await userRes.json();

            if (!userData.user) {
                throw new Error('User data missing in response');
            }

            setUser(userData.user);

            // 2. Fetch Workspaces
            try {
                const wsRes = await fetch(`${API}/api/workspaces`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (wsRes.ok) {
                    const wsData = await wsRes.json();
                    setWorkspaces(wsData.workspaces || []);

                    if (wsData.workspaces && wsData.workspaces.length > 0) {
                        setCurrentWorkspace(wsData.workspaces[0]);
                    }
                }
            } catch (wsErr) {
                console.error('Workspace fetch error:', wsErr);
            }

        } catch (err) {
            console.error('Auth check error:', err);
            localStorage.removeItem('tc_token');
            router.replace('/login');
            toast.error('Session expired. Please login again.');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <DashboardContent
            title={title}
            user={user}
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            setCurrentWorkspace={setCurrentWorkspace}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
        >
            {children}
        </DashboardContent>
    );
}
