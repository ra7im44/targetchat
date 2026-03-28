import React from 'react';

export default function CyberRobot() {
    return (
        <div className="relative w-80 h-80 flex items-center justify-center animate-float">
            {/* Holographic Rings */}
            <div className="absolute w-full h-full border-2 border-cyan-500/20 rounded-full animate-spin-slow"></div>
            <div className="absolute w-[90%] h-[90%] border border-blue-500/30 rounded-full animate-reverse-spin border-dashed"></div>

            {/* Glow Core */}
            <div className="absolute w-48 h-48 bg-blue-500/10 blur-3xl rounded-full animate-pulse-slow"></div>

            {/* Robot Container */}
            <div className="relative z-10 w-40 h-48 flex flex-col items-center">

                {/* Antenna */}
                <div className="w-1 h-6 bg-cyan-400/50 relative overflow-hidden">
                    <div className="absolute top-0 w-full h-full bg-cyan-200 animate-slideDown"></div>
                </div>

                {/* Head */}
                <div className="w-32 h-24 bg-slate-800 rounded-2xl border border-cyan-500/30 flex items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-gradient-to-b from-slate-700 to-slate-900">
                    {/* Screen Scanline */}
                    <div className="absolute w-full h-1 bg-cyan-400/30 top-0 animate-scan"></div>

                    {/* Eyes Container */}
                    <div className="flex gap-6 z-10">
                        {/* Left Eye */}
                        <div className="w-8 h-5 bg-cyan-900 rounded-full relative overflow-hidden flex items-center justify-center border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                            <div className="w-6 h-3 bg-cyan-400 rounded-full animate-blink shadow-[0_0_15px_#22d3ee]"></div>
                        </div>
                        {/* Right Eye */}
                        <div className="w-8 h-5 bg-cyan-900 rounded-full relative overflow-hidden flex items-center justify-center border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                            <div className="w-6 h-3 bg-cyan-400 rounded-full animate-blink shadow-[0_0_15px_#22d3ee]"></div>
                        </div>
                    </div>

                    {/* Mouth Line */}
                    <div className="absolute bottom-4 w-12 h-1 bg-cyan-500/20 rounded-full"></div>
                </div>

                {/* Neck */}
                <div className="w-8 h-4 bg-slate-700 mt-[-2px] z-0 border-x border-slate-600"></div>

                {/* Body */}
                <div className="w-20 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl rounded-b-3xl border border-slate-600 shadow-xl flex items-center justify-center relative">
                    {/* Chest Arc Reactor (Iron Man style but simpler) */}
                    <div className="w-8 h-8 rounded-full border-2 border-cyan-500/50 bg-cyan-900/50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        <div className="w-4 h-4 bg-white rounded-full animate-pulse shadow-[0_0_10px_#fff]"></div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-15px); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }

                @keyframes spin-slow {
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow { animation: spin-slow 20s linear infinite; }

                @keyframes reverse-spin {
                    to { transform: rotate(-360deg); }
                }
                .animate-reverse-spin { animation: reverse-spin 25s linear infinite; }

                @keyframes scan {
                    0% { top: -10%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 110%; opacity: 0; }
                }
                .animate-scan { animation: scan 3s linear infinite; }

                @keyframes blink {
                    0%, 48%, 52%, 100% { height: 12px; }
                    50% { height: 1px; }
                }
                .animate-blink { animation: blink 4s infinite; }

                @keyframes slideDown {
                    0% { top: -100%; }
                    100% { top: 100%; }
                }
                .animate-slideDown { animation: slideDown 2s linear infinite; }
            `}</style>
        </div>
    );
}
