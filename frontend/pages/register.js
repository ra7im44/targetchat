import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

import { API_URL as API } from '../utils/apiConfig';

const isInternal = (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('tc_token', data.token);
        localStorage.setItem('tc_user', JSON.stringify(data.user));
        toast.success('Account created');
        router.push(isInternal(router.query.redirect) ? router.query.redirect : '/dashboard');
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (err) {
      toast.error('Network error');
    }
    setLoading(false);
  }

  const inputClass =
    'w-full h-10 px-3 rounded-md bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Head>
        <title>Create account — TargetChat</title>
        <meta name="description" content="Create your TargetChat account" />
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
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted">Start with a free workspace. No card required.</p>

          <form onSubmit={submit} className="mt-6 rounded-card border border-border bg-surface p-6 space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-xs font-medium text-secondary mb-1.5">
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmed Hassan"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-xs font-medium text-secondary mb-1.5">
                Work email
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-xs font-medium text-secondary mb-1.5">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground rounded-md text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
