import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-hot-toast';

import { API_URL as API } from '../../../utils/apiConfig';

export default function InvitationPage() {
    const router = useRouter();
    const { token } = router.query;

    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [invitation, setInvitation] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (token) {
            validateInvitation();
        }
    }, [token]);

    async function validateInvitation() {
        try {
            const res = await fetch(`${API}/api/workspaces/invite/${token}`);
            const data = await res.json();

            if (res.ok) {
                setInvitation(data);
            } else {
                setError(data.message || 'Invalid invitation');
            }
        } catch (err) {
            console.error('Validation error:', err);
            setError('Failed to validate invitation');
        } finally {
            setLoading(false);
        }
    }

    async function handleAccept() {
        setAccepting(true);
        try {
            const token = localStorage.getItem('tc_token');
            if (!token) {
                // Redirect to login with return URL
                router.push(`/login?redirect=/workspace/invite/${router.query.token}`);
                return;
            }

            const res = await fetch(`${API}/api/workspaces/invite/${router.query.token}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Joined workspace successfully!');
                router.push('/chat');
            } else {
                toast.error(data.message || 'Failed to join workspace');
                if (data.message.includes('already a member')) {
                    router.push('/chat');
                }
            }
        } catch (err) {
            console.error('Accept error:', err);
            toast.error('Something went wrong');
        } finally {
            setAccepting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background p-4">
                <div className="bg-white dark:bg-surface p-8 rounded-card shadow-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-2">Invitation Error</h1>
                    <p className="text-gray-600 dark:text-muted mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/chat')}
                        className="px-6 py-2 bg-gray-100 dark:bg-surface-elevated text-gray-700 dark:text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-surface-hover transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background p-4">
            <Head>
                <title>Join Workspace | TargetChat</title>
            </Head>

            <div className="bg-white dark:bg-surface p-8 rounded-card shadow-lg max-w-md w-full text-center">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-accent dark:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-2">
                    Join {invitation?.workspace?.name}
                </h1>

                <p className="text-gray-600 dark:text-muted mb-8">
                    <strong>{invitation?.inviter?.name}</strong> has invited you to join this workspace as a <span className="capitalize">{invitation?.role}</span>.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-background font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {accepting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Joining...
                            </>
                        ) : (
                            'Accept Invitation'
                        )}
                    </button>

                    <button
                        onClick={() => router.push('/chat')}
                        className="w-full py-3 px-4 bg-transparent text-gray-500 dark:text-muted hover:text-gray-700 dark:hover:text-secondary transition-colors"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}
