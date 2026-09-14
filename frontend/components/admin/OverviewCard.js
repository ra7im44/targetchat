import React from 'react';

/* Flat stat readout. Same props as before (icon/gradient accepted, not rendered)
   so existing call sites keep working. No blobs, tiles, pills or sparklines. */
const OverviewCard = ({ title, value, subtext }) => (
    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-card px-5 py-4">
        <div className="text-2xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-foreground">{value ?? 0}</div>
        <div className="text-[13px] text-gray-500 dark:text-muted mt-1">{title}</div>
        {subtext && (
            <div className="text-xs text-success-ink dark:text-success mt-1.5">{subtext}</div>
        )}
    </div>
);

export default OverviewCard;
