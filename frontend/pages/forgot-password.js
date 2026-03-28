import { useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { LocaleContext } from './_app';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ForgotPassword() {
    const { t } = useContext(LocaleContext); // Assuming t has translations or fallback
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch(`${API}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            setMessage(data.message);
        } catch (err) {
            setMessage('Network error');
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
            {/* Background blobs (simplified from login) */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-50">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                </div>
            </div>

            <div className="relative w-full max-w-md">
                <div className="w-full bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    <div className="p-8 text-center border-b border-white/10">
                        <h1 className="text-3xl font-bold text-white mb-2">Recovery</h1>
                        <p className="text-blue-200">Reset your password</p>
                    </div>

                    <form onSubmit={submit} className="p-8 space-y-6">
                        {message && (
                            <div className={`p-4 rounded-xl text-sm ${message.includes('sent') ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
                                {message}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-blue-100 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/50 hover:shadow-blue-500/75 transition-all duration-200 disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="px-8 pb-8 text-center">
                        <button
                            onClick={() => router.push('/login')}
                            className="text-blue-300 hover:text-blue-200 transition-colors text-sm"
                        >
                            ← Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
