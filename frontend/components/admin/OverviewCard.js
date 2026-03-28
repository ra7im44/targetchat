import React from 'react';

const OverviewCard = ({ title, value, subtext, icon, gradient }) => (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-lg transition-all duration-300">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`}></div>
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-indigo-500/20`}>
                    {icon}
                </div>
            </div>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">{value}</h3>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">{title}</p>
            {subtext && (
                <p className="text-xs text-emerald-500 font-bold mt-1 bg-emerald-50 dark:bg-emerald-900/20 inline-block px-2 py-0.5 rounded-full">{subtext}</p>
            )}

            {/* Sparkline decoration */}
            <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${gradient} w-2/3 rounded-full opacity-50`}></div>
            </div>
        </div>
    </div>
);

export default OverviewCard;
