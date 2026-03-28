import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LocaleContext } from './_app';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ResetPassword() {
    const { t } = useContext(LocaleContext);
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
                setMessage('Password reset successfully! Redirecting to login...');
                setTimeout(() => router.push('/login'), 2000);
            } else {
                setError(data.message || 'Failed to reset password');
            }
        } catch (err) {
            setError('Network error');
        }
        setLoading(false);
    }

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <p>Invalid link. Please check your email.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-50">
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                    <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                </div>
            </div>

            <div className="relative w-full max-w-md">
                <div className="w-full bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    <div className="p-8 text-center border-b border-white/10">
                        <h1 className="text-3xl font-bold text-white mb-2">New Password</h1>
                        <p className="text-blue-200">Enter your new password below</p>
                    </div>

                    <form onSubmit={submit} className="p-8 space-y-6">
                        {message && <div className="p-4 rounded-xl bg-green-500/20 text-green-200 text-sm">{message}</div>}
                        {error && <div className="p-4 rounded-xl bg-red-500/20 text-red-200 text-sm">{error}</div>}

                        <div>
                            <label className="block text-sm font-medium text-blue-100 mb-2">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-blue-100 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/50 hover:shadow-blue-500/75 transition-all duration-200 disabled:opacity-50"
                        >
                            {loading ? 'Resetting...' : 'Set New Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
