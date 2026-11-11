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
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="bg-surface p-8 rounded-card shadow-lg border border-border max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-danger-soft border border-danger/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Invitation Error</h1>
                    <p className="text-muted mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/chat')}
                        className="px-6 py-2.5 bg-surface hover:bg-surface-hover text-secondary hover:text-foreground border border-border rounded-button font-semibold transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Head>
                <title>Join Workspace | TargetChat</title>
            </Head>

            <div className="bg-surface p-8 rounded-card shadow-lg border border-border max-w-md w-full text-center">
                <div className="w-20 h-20 bg-primary-soft border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2">
                    Join {invitation?.workspace?.name}
                </h1>

                <p className="text-muted mb-8">
                    <strong className="text-foreground">{invitation?.inviter?.name}</strong> has invited you to join this workspace as a <span className="capitalize text-foreground font-semibold">{invitation?.role}</span>.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full py-3 px-4 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-button transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
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
                        className="w-full py-3 px-4 bg-surface text-secondary hover:text-foreground hover:bg-surface-hover border border-border font-semibold rounded-button transition-colors"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}
