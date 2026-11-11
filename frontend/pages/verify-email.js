import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

import { Check, Loader2, X } from 'lucide-react';
import { API_URL as API } from '../utils/apiConfig';

export default function VerifyEmail() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Verifying your email…');

  useEffect(() => {
    if (!router.isReady) return;
    const { token } = router.query;

    if (!token) {
      setStatus('error');
      setMessage('This verification link is invalid.');
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
        setMessage('Email verified. Redirecting…');
        toast.success('Email verified');
        setTimeout(() => router.push('/chat'), 2000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Verification failed.');
        toast.error(data.message || 'Verification failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Head>
        <title>Verify email — TargetChat</title>
      </Head>

      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-semibold text-sm">
              T
            </span>
            <span className="text-sm font-semibold text-foreground">TargetChat</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 text-center">
          <div className="flex justify-center mb-4">
            {status === 'processing' && <Loader2 size={22} className="text-primary animate-spin" aria-hidden="true" />}
            {status === 'success' && (
              <span className="w-10 h-10 rounded-md bg-success-soft border border-success/20 flex items-center justify-center">
                <Check size={18} className="text-success-ink" aria-hidden="true" />
              </span>
            )}
            {status === 'error' && (
              <span className="w-10 h-10 rounded-md bg-danger-soft border border-danger/20 flex items-center justify-center">
                <X size={18} className="text-danger-ink" aria-hidden="true" />
              </span>
            )}
          </div>

          <h1 className="text-base font-semibold text-foreground">
            {status === 'processing' ? 'Verifying email' : status === 'success' ? 'Email verified' : 'Verification failed'}
          </h1>
          <p role="status" className="mt-1.5 text-sm text-muted">{message}</p>

          {status === 'error' && (
            <Link
              href="/login"
              className="mt-4 inline-flex px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
            >
              Back to sign in
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
