import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

import { API_URL as API } from '../utils/apiConfig';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setFailed(false);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      setMessage(data.message || 'If that address exists, a reset link is on its way.');
      setFailed(!res.ok);
    } catch (err) {
      setMessage('Network error. Please try again.');
      setFailed(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Head>
        <title>Reset password — TargetChat</title>
      </Head>

      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-semibold text-sm">
              T
            </span>
            <span className="text-sm font-semibold text-foreground">TargetChat</span>
          </Link>
          <Link href="/login" className="text-sm text-secondary hover:text-foreground transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">Enter your account email and we’ll send a reset link.</p>

          <form onSubmit={submit} className="mt-6 rounded-card border border-border bg-surface p-6 space-y-4">
            {message && (
              <div
                role="status"
                className={`p-3 rounded-md text-sm border ${
                  failed
                    ? 'bg-danger-soft text-danger-ink border-danger/20'
                    : 'bg-success-soft text-success-ink border-success/20'
                }`}
              >
                {message}
              </div>
            )}

            <div>
              <label htmlFor="recovery-email" className="block text-xs font-medium text-secondary mb-1.5">
                Work email
              </label>
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-10 px-3 rounded-md bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground rounded-md text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="mt-4 mx-auto block text-sm text-secondary hover:text-foreground transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </main>
    </div>
  );
}
