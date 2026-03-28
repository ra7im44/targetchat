import React from 'react';

const AdminChart = ({ data, color = '#6366f1' }) => {
    if (!data || data.length === 0) return (
        <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No chart data</div>
    );

    // Normalize data
    const max = Math.max(...data.map(d => d.count), 5);
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (d.count / max) * 100;
        return `${x},${y}`;
    }).join(' ');

    if (data.length === 1) return null;

    const areaPath = `M0,100 L0,${100 - (data[0].count / max) * 100} ${points.split(' ').map((p, i) => `L${p}`).join(' ')} L100,100 Z`;

    return (
        <div className="w-full h-32 relative group">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible preserve-3d">
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill={`url(#gradient-${color})`} className="transition-all duration-500 ease-in-out" />
                <polyline fill="none" stroke={color} strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" className="transition-all duration-500 ease-in-out" />

                {/* Tooltip circles */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * 100;
                    const y = 100 - (d.count / max) * 100;
                    return (
                        <circle key={i} cx={x} cy={y} r="2" fill="#fff" stroke={color} strokeWidth="1" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    );
                })}
            </svg>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                {data.map((d, i) => (
                    <span key={i}>{d.date}</span>
                ))}
            </div>
        </div>
    );
};

export default AdminChart;
