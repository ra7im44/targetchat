import { useState, useEffect } from 'react';
import Head from 'next/head';
import AuthForm from '../components/AuthForm';
import CyberRobot from '../components/CyberRobot';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('tc_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden selection:bg-accent/30">
      <Head>
        <title>TargetChat - Next-Gen AI Sales Agent</title>
        <meta name="description" content="Automate lead qualification and booking with the world's most advanced AI chat agent." />
      </Head>

      {/* Navbar */}
      <nav className="absolute top-0 left-0 w-full p-6 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-background font-bold text-xl shadow-lg shadow-cyan-500/20">T</div>
            <span className="text-xl font-bold text-white tracking-wide">TargetChat <span className="text-cyan-400 text-xs font-mono ml-1 px-2 py-0.5 bg-cyan-900/30 rounded-full border border-cyan-500/20">v1.0 BETA</span></span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/docs" className="text-gray-500 dark:text-muted hover:text-white font-medium transition-colors">
              Docs
            </Link>
            <a href="#features" className="text-gray-500 dark:text-muted hover:text-white font-medium transition-colors">
              Features
            </a>
            <Link href="/pricing" className="text-gray-500 dark:text-muted hover:text-white font-medium transition-colors">
              Pricing
            </Link>
          </div>

          {/* Auth Button (Mobile/Desktop) */}
          <div>
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <Link href="/chat" className="hidden md:block text-gray-500 dark:text-muted hover:text-white font-medium transition-colors">
                  Chat
                </Link>
                <Link href="/dashboard" className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg font-medium transition-all backdrop-blur-sm">
                  Dashboard
                </Link>
              </div>
            ) : (
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hidden md:block px-6 py-2.5 bg-accent text-background rounded-lg font-bold shadow-lg hover:shadow-cyan-500/20 transition-all transform">
                Start Free
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <main className="relative z-10 w-full">

        {/* HERO SECTION */}
        <section className="container mx-auto px-6 pt-32 lg:pt-40 pb-20 lg:min-h-screen flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Left: Content */}
          <div className="flex-1 text-center lg:text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 border border-strong backdrop-blur-md animate-fadeIn">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              <span className="text-xs font-semibold text-gray-600 dark:text-secondary tracking-wider uppercase">System Operational</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
              Automate Your <br />
              <span className="text-transparent bg-clip-text bg-accent animate-gradient">Sales Pipeline.</span>
            </h1>

            <p className="text-lg text-gray-500 dark:text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
              Deploy an intelligent AI agent that qualifies visitors, answers queries, and books meetings 24/7. No sleep, no downtime, just results.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-muted font-medium bg-surface/60 px-4 py-2 rounded-lg border border-white/5">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Instant Setup
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-muted font-medium bg-surface/60 px-4 py-2 rounded-lg border border-white/5">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                High Performance
              </div>
            </div>
          </div>

          {/* Right: Robot + Auth */}
          <div className="flex-1 w-full max-w-xl relative flex flex-col items-center lg:items-end">

            {/* The Cyber Robot (Absolute Positioned for visual flair) */}
            <div className="absolute -top-32 left-1/2 lg:-left-12 transform -translate-x-1/2 lg:translate-x-0 z-0 scale-75 lg:scale-100 opacity-60 lg:opacity-100 pointer-events-none">
              <CyberRobot />
            </div>

            {/* Auth Card or Welcome Card (Relative z-10) */}
            <div className="relative z-10 w-full mt-24 lg:mt-0">
              {isLoggedIn ? (
                <div className="w-full max-w-md bg-background/80 backdrop-blur-xl rounded-card shadow-lg border border-white/10 p-10 text-center animate-slideIn">
                  <div className="w-20 h-20 bg-accent rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Welcome Back!</h2>
                  <p className="text-gray-500 dark:text-muted mb-8">Your command center is ready.</p>

                  <div className="flex flex-col gap-4">
                    <Link href="/dashboard" className="block w-full py-4 bg-accent text-background rounded-xl font-bold text-lg shadow-lg hover:bg-accent-hover transition-all">
                      Open Dashboard
                    </Link>
                    <Link href="/chat" className="block w-full py-3 bg-surface-elevated hover:bg-surface-hover text-white rounded-xl font-semibold transition-all border border-white/10">
                      Launch Chat Interface
                    </Link>
                  </div>

                  <button
                    onClick={() => {
                      localStorage.removeItem('tc_token');
                      localStorage.removeItem('tc_user');
                      setIsLoggedIn(false);
                      window.location.reload();
                    }}
                    className="mt-6 text-sm text-gray-500 dark:text-muted hover:text-secondary transition-colors"
                  >
                    Sign out of this device
                  </button>
                </div>
              ) : (
                <AuthForm />
              )}
            </div>
          </div>
        </section>

        {/* FEATURES SECTION BELOW FOLD */}
        <section id="features" className="py-24 relative z-10">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-card bg-surface/60 border border-white/5 hover:border-accent/30 transition-all duration-300 group">
                <div className="w-12 h-12 bg-accent/10 rounded-card flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                  <svg className="w-6 h-6 text-info-ink dark:text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Auto-Qualification</h3>
                <p className="text-gray-500 dark:text-muted leading-relaxed">The AI asks the right questions to qualify leads before they ever reach your inbox.</p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-card bg-surface/60 border border-white/5 hover:border-accent/30 transition-all duration-300 group">
                <div className="w-12 h-12 bg-purple-500/10 rounded-card flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Instant Booking</h3>
                <p className="text-gray-500 dark:text-muted leading-relaxed">Seamlessly integrates with your calendar to book meetings with qualified leads instantly.</p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-card bg-surface/60 border border-white/5 hover:border-accent/30 transition-all duration-300 group">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-card flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Live Handoff</h3>
                <p className="text-gray-500 dark:text-muted leading-relaxed">Take over chats anytime. The AI seamlessly hands off context so you never miss a beat.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-white/5 text-center text-gray-500 dark:text-muted text-sm">
          © 2025 TargetChat AI. All systems operational.
        </footer>
      </main>

      <style jsx global>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient { background-size: 200% 200%; animation: gradient 8s ease infinite; }
            `}</style>
    </div>
  );
}
