import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function VerifyEmail() {
    const router = useRouter();
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        if (!router.isReady) return;
        const { token } = router.query;

        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        verifyToken(token);
    }, [router.isReady]);

    async function verifyToken(token) {
        try {
            const res = await fetch(`${API}/api/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('tc_token', data.token);
                setStatus('success');
                setMessage('Email verified successfully! Redirecting...');
                toast.success('Email Verified!');
                setTimeout(() => {
                    router.push('/chat');
                }, 2000);
            } else {
                setStatus('error');
                setMessage(data.message || 'Verification failed.');
                toast.error(data.message || 'Verification failed');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Network error occurred.');
        }
    }

    return (
        <>
            <Head>
                <title>Verify Email - TargetChat</title>
            </Head>
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="mb-6 flex justify-center">
                        {status === 'processing' && (
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {status === 'success' && (
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-3xl">✓</div>
                        )}
                        {status === 'error' && (
                            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-3xl">✕</div>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold mb-2">
                        {status === 'processing' ? 'Verifying...' :
                            status === 'success' ? 'Verified!' : 'Verification Failed'}
                    </h1>
                    <p className="text-gray-400 mb-6">{message}</p>

                    {status === 'error' && (
                        <button
                            onClick={() => router.push('/login')}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                        >
                            Back to Login
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
