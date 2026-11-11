import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

import { API_URL as API } from '../utils/apiConfig';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Password reset. Redirecting to sign in…');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  }

  const shell = (children) => (
    <div className="min-h-screen bg-background flex flex-col">
      <Head>
        <title>Set a new password — TargetChat</title>
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
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );

  if (!token) {
    return shell(
      <div className="rounded-card border border-border bg-surface p-6 text-center">
        <h1 className="text-base font-semibold text-foreground">Invalid reset link</h1>
        <p className="mt-1.5 text-sm text-muted">Open the link from your email again, or request a new one.</p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-flex px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return shell(
    <>
      <h1 className="text-xl font-semibold text-foreground tracking-tight">Set a new password</h1>
      <p className="mt-1 text-sm text-muted">Use at least 6 characters.</p>

      <form onSubmit={submit} className="mt-6 rounded-card border border-border bg-surface p-6 space-y-4">
        {message && (
          <div role="status" className="p-3 rounded-md bg-success-soft text-success-ink border border-success/20 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div role="alert" className="p-3 rounded-md bg-danger-soft text-danger-ink border border-danger/20 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="new-password" className="block text-xs font-medium text-secondary mb-1.5">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            required
            minLength={6}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-xs font-medium text-secondary mb-1.5">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground rounded-md text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting…' : 'Set new password'}
        </button>
      </form>
    </>
  );
}
