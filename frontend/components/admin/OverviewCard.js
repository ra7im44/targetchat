import React from 'react';

/* Flat stat readout. Same props as before (icon/gradient accepted, not rendered)
   so existing call sites keep working. No blobs, tiles, pills or sparklines. */
const OverviewCard = ({ title, value, subtext }) => (
    <div className="bg-surface border border-border rounded-xl px-5 py-4 shadow-sm">
        <div className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value ?? 0}</div>
        <div className="text-[13px] text-muted mt-1">{title}</div>
        {subtext && (
            <div className="text-xs text-success mt-1.5 font-medium">{subtext}</div>
        )}
    </div>
);

export default OverviewCard;
