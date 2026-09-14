import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardSidebar from './DashboardSidebar';
import DashboardNavbar from './DashboardNavbar';
import { toast } from 'react-hot-toast';
import { API_URL as API, getToken, isAuthError, redirectToLogin } from '../../utils/apiConfig';
import CreateWorkspaceModal from '../CreateWorkspaceModal';
import MembersModal from '../MembersModal';

function DashboardContent({ children, title, user, workspaces, currentWorkspace, setCurrentWorkspace, collapsed, setCollapsed, onCreateWorkspace, onManageMembers }) {
    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
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
                onCreateWorkspace={onCreateWorkspace}
                onManageMembers={onManageMembers}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <DashboardNavbar user={user} onToggleSidebar={() => setCollapsed(!collapsed)} />

                <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-background scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-border">
                    <div className="max-w-[1240px] mx-auto w-full">
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
    const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);

    useEffect(() => {
        checkAuth();
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setCollapsed(true);
        }
    }, []);

    async function checkAuth() {
        const token = getToken();

        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            // 1. Fetch User
            const userRes = await fetch(`${API}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (isAuthError(userRes.status)) {
                redirectToLogin(router);
                toast.error('Session expired. Please login again.');
                return;
            }
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    function handleWorkspaceCreated(ws) {
        if (ws) {
            setWorkspaces(prev => prev.some(w => w.id === ws.id)
                ? prev.map(w => (w.id === ws.id ? ws : w))
                : [...prev, ws]);
            setCurrentWorkspace(ws);
            try { localStorage.setItem('current_workspace_id', ws.id); } catch (e) {}
        }
    }

    return (
        <>
            <DashboardContent
                title={title}
                user={user}
                workspaces={workspaces}
                currentWorkspace={currentWorkspace}
                setCurrentWorkspace={setCurrentWorkspace}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                onCreateWorkspace={() => setShowCreateWorkspace(true)}
                onManageMembers={() => setShowMembersModal(true)}
            >
                {children}
            </DashboardContent>
            <CreateWorkspaceModal
                isOpen={showCreateWorkspace}
                onClose={() => setShowCreateWorkspace(false)}
                onCreated={handleWorkspaceCreated}
            />
            <MembersModal
                isOpen={showMembersModal}
                onClose={() => setShowMembersModal(false)}
                workspace={currentWorkspace}
            />
        </>
    );
}
