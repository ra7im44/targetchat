import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

import { API_URL as API } from '../utils/apiConfig';
import { useGlobalConfig } from '../context/GlobalConfig';

const isInternal = (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { appName } = useGlobalConfig();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('tc_token', data.token);
        localStorage.setItem('tc_user', JSON.stringify(data.user));
        toast.success('Signed in');
        router.push(isInternal(router.query.redirect) ? router.query.redirect : '/dashboard');
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (err) {
      toast.error('Network error');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Head>
        <title>Sign in — {appName}</title>
        <meta name="description" content={`Sign in to your ${appName} account`} />
      </Head>

      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-semibold text-sm">
              T
            </span>
            <span className="text-sm font-semibold text-foreground">{appName}</span>
          </Link>
          <Link href="/register" className="text-sm text-secondary hover:text-foreground transition-colors">
            Create account
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Access your workspaces and conversations.</p>

          <form onSubmit={submit} className="mt-6 rounded-card border border-border bg-surface p-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-secondary mb-1.5">
                Work email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-10 px-3 rounded-md bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-medium text-secondary">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-xs text-primary hover:text-primary-hover transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-md bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground rounded-md text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            No account?{' '}
            <Link href="/register" className="text-primary hover:text-primary-hover font-medium">
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
