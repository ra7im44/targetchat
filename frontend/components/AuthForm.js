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
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative">
                {/* Tabs */}
                <div className="flex p-1.5 gap-1.5 bg-slate-800/50 border-b border-white/5">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${mode === 'login'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${mode === 'register'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-white tracking-tight">
                            {mode === 'login' ? 'Welcome Back' : 'Start Free Trial'}
                        </h3>
                        <p className="text-sm text-slate-400 mt-2 font-medium">
                            {mode === 'login'
                                ? 'Command center access'
                                : 'Deploy your AI agent in seconds'}
                        </p>
                    </div>

                    {mode === 'register' && (
                        <div className="space-y-2 animate-slideIn">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative group/input">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-0 group-hover/input:opacity-50 transition duration-500"></div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="relative w-full px-5 py-3.5 bg-slate-900 border border-slate-700/50 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-white placeholder-slate-600"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Access</label>
                        <div className="relative group/input">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-0 group-hover/input:opacity-50 transition duration-500"></div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="relative w-full px-5 py-3.5 bg-slate-900 border border-slate-700/50 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-white placeholder-slate-600"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passcode</label>
                            {mode === 'login' && (
                                <a href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">Recover?</a>
                            )}
                        </div>
                        <div className="relative group/input">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-0 group-hover/input:opacity-50 transition duration-500"></div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="relative w-full px-5 py-3.5 bg-slate-900 border border-slate-700/50 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-white placeholder-slate-600"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="relative w-full py-4 group overflow-hidden rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:scale-105"></span>
                        <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"></span>
                        <span className="relative flex items-center justify-center gap-2 text-white font-bold tracking-wide">
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Initiate Session' : 'Create Account'}
                                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </>
                            )}
                        </span>
                    </button>
                </form>
            </div>
        </div>
    );
}
