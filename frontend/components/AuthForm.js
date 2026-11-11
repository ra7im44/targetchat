import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

import { API_URL as API } from '../utils/apiConfig';

export default function AuthForm() {
    const router = useRouter();
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [loading, setLoading] = useState(false);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Only for register

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const body = mode === 'login'
                ? { email, password }
                : { name, email, password };

            const res = await fetch(`${API}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                // Save Token
                localStorage.setItem('tc_token', data.token);
                // Save User Info (Optional, but good for UI)
                localStorage.setItem('tc_user', JSON.stringify(data.user));

                toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');

                // Redirect logic
                router.push('/dashboard');
            } else {
                toast.error(data.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Auth error:', error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-surface rounded-card shadow-lg border border-border overflow-hidden relative">
            <div className="relative">
                {/* Tabs */}
                <div className="flex p-1.5 gap-1.5 bg-surface-elevated border-b border-border">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${mode === 'login'
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-secondary hover:bg-surface-hover hover:text-foreground'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${mode === 'register'
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-secondary hover:bg-surface-hover hover:text-foreground'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-foreground tracking-tight">
                            {mode === 'login' ? 'Welcome Back' : 'Start Free Trial'}
                        </h3>
                        <p className="text-sm text-secondary mt-1 font-normal">
                            {mode === 'login'
                                ? 'Command center access'
                                : 'Deploy your AI agent in seconds'}
                        </p>
                    </div>

                    {mode === 'register' && (
                        <div className="space-y-1.5 animate-slideIn">
                            <label className="text-xs font-semibold text-secondary uppercase tracking-wider ml-1">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground placeholder-muted"
                                required
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-secondary uppercase tracking-wider ml-1">Email Access</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground placeholder-muted"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Passcode</label>
                            {mode === 'login' && (
                                <a href="/forgot-password" className="text-xs text-primary hover:text-primary-hover font-medium transition-colors">Recover?</a>
                            )}
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground placeholder-muted"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                        ) : (
                            <>
                                <span>{mode === 'login' ? 'Initiate Session' : 'Create Account'}</span>
                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
