import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import Head from 'next/head';
import CyberRobot from '../components/CyberRobot';

import { API_URL as API } from '../utils/apiConfig';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('tc_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

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
        toast.success('Welcome back!');
        router.push('/dashboard');
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (err) {
      toast.error('Network error');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 overflow-x-hidden selection:bg-cyan-500/30">
      <Head>
        <title>Login - TargetChat</title>
        <meta name="description" content="Sign in to your TargetChat account" />
      </Head>

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <nav className="absolute top-0 left-0 w-full p-6 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/20">T</div>
            <span className="text-xl font-bold text-white tracking-wide">TargetChat</span>
          </button>
        </div>
      </nav>

      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: Robot Animation */}
          <div className="hidden lg:flex justify-center items-center">
            <CyberRobot />
          </div>

          {/* Right: Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>

              <div className="relative">
                {/* Header */}
                <div className="p-8 text-center border-b border-white/5">
                  <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h1>
                  <p className="text-sm text-slate-400 font-medium">Command center access</p>
                </div>

                {/* Form */}
                <form onSubmit={submit} className="p-8 space-y-6">
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
                      <button
                        type="button"
                        onClick={() => router.push('/forgot-password')}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        Recover?
                      </button>
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
                          Initiate Session
                          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>

                {/* Footer */}
                <div className="px-8 pb-8 text-center">
                  <p className="text-sm text-slate-400">
                    Don't have an account?{' '}
                    <button
                      onClick={() => router.push('/register')}
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
