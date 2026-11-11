import React from 'react';

const TONES = {
    primary: {
        bg: 'bg-primary-soft',
        text: 'text-primary',
        border: 'border-primary/20'
    },
    success: {
        bg: 'bg-success-soft',
        text: 'text-success',
        border: 'border-success/20'
    },
    warning: {
        bg: 'bg-warning-soft',
        text: 'text-warning',
        border: 'border-warning/20'
    },
    info: {
        bg: 'bg-info-soft',
        text: 'text-info',
        border: 'border-info/20'
    }
};

const OverviewCard = ({ title, value, subtext, icon, tone = 'primary', isLive = false }) => {
    const activeTone = TONES[tone] || TONES.primary;

    return (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs hover:border-border-strong hover:shadow-raise transition-all duration-200 group flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted group-hover:text-secondary transition-colors">
                    {title}
                </span>
                {icon && (
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${activeTone.bg} ${activeTone.text} ${activeTone.border} transition-transform duration-200 group-hover:scale-105`}>
                        {icon}
                    </div>
                )}
            </div>

            <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                    {value ?? 0}
                </div>
                {subtext && (
                    <div className="flex items-center gap-1.5 text-xs mt-1.5">
                        {isLive && (
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                            </span>
                        )}
                        <span className={isLive ? 'text-success font-medium' : 'text-muted'}>
                            {subtext}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OverviewCard;
