import React from 'react';

/* TargetChat shared UI primitives.
   Visual-only building blocks on the semantic token system.
   Rules: radius 6/8/10/12 (controls/inputs/cards/modals), borders over shadows,
   U-Axis Soft Indigo (#6875F5) for primary actions with white text, monochrome icons. */

const btnBase =
    'inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

const btnVariants = {
    primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-active shadow-sm',
    secondary:
        'bg-white dark:bg-surface-elevated text-gray-800 dark:text-foreground ' +
        'border border-gray-300/80 dark:border-border hover:bg-gray-100 dark:hover:bg-surface-hover',
    ghost: 'text-gray-600 dark:text-secondary hover:bg-gray-100 dark:hover:bg-surface-hover hover:text-gray-900 dark:hover:text-foreground',
    danger:
        'bg-danger/10 text-danger-ink dark:text-danger hover:bg-danger hover:text-white ' +
        'dark:bg-danger/15 dark:text-danger border border-danger/30',
};

const btnSizes = {
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
    return (
        <button
            className={`${btnBase} ${btnVariants[variant] || btnVariants.primary} ${btnSizes[size] || btnSizes.md} ${className}`}
            {...props}
        />
    );
}

export function IconButton({ label, size = 18, className = '', children, ...props }) {
    const sized = React.isValidElement(children) && children.props.size == null && children.props.width == null
        ? React.cloneElement(children, { size, width: size, height: size })
        : children;
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={
                'p-2 rounded-lg text-gray-500 dark:text-muted hover:text-gray-700 dark:hover:text-foreground ' +
                'hover:bg-gray-100 dark:hover:bg-surface-hover transition-colors ' +
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ' +
                'disabled:opacity-50 disabled:cursor-not-allowed ' +
                className
            }
            {...props}
        >
            {sized}
        </button>
    );
}

export const inputCls =
    'w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-surface-elevated ' +
    'border border-gray-300/80 dark:border-border text-gray-900 dark:text-foreground ' +
    'placeholder:text-gray-400 dark:placeholder:text-muted ' +
    'hover:border-gray-400 dark:hover:border-strong ' +
    'focus:border-accent focus:ring-1 focus:ring-accent/40 outline-none transition-colors ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

export function Input({ className = '', ...props }) {
    return <input className={`${inputCls} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }) {
    return <textarea className={`${inputCls} resize-y ${className}`} {...props} />;
}

export function FieldLabel({ children, hint }) {
    return (
        <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-muted mb-1.5">
            {children}
            {hint && <span className="normal-case font-normal"> ({hint})</span>}
        </span>
    );
}

const badgeTones = {
    neutral: 'bg-gray-100 dark:bg-surface-elevated text-gray-600 dark:text-secondary border-gray-200 dark:border-border',
    accent: 'bg-accent/10 text-accent-active dark:text-accent border-accent/30',
    success: 'bg-success/10 text-green-700 dark:text-success border-success/30',
    warning: 'bg-warning/10 text-yellow-700 dark:text-warning border-warning/30',
    danger: 'bg-danger/10 text-danger-ink dark:text-danger border-danger/30',
    info: 'bg-info/10 text-info-ink dark:text-info border-info/30',
};

export function Badge({ tone = 'neutral', className = '', children }) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border ${badgeTones[tone] || badgeTones.neutral} ${className}`}
        >
            {children}
        </span>
    );
}

export function Card({ className = '', children }) {
    return (
        <div className={`bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-card ${className}`}>
            {children}
        </div>
    );
}

export function PageHeader({ eyebrow, title, description, actions }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                {eyebrow && (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-accent-active dark:text-accent mb-1.5">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-foreground">{title}</h1>
                {description && <p className="text-sm text-gray-500 dark:text-muted mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2.5">{actions}</div>}
        </div>
    );
}

export function EmptyState({ icon, title, hint, action }) {
    return (
        <div className="text-center py-12 px-6">
            {icon && <div className="mx-auto mb-3 text-gray-300 dark:text-muted flex justify-center">{icon}</div>}
            <p className="font-semibold text-gray-900 dark:text-foreground">{title}</p>
            {hint && <p className="text-sm text-gray-500 dark:text-muted mt-1">{hint}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function Spinner({ label = 'Loading' }) {
    return (
        <div className="flex justify-center py-12" role="status" aria-label={label}>
            <div className="w-8 h-8 border-[3px] border-accent/25 border-t-accent rounded-full animate-spin" />
        </div>
    );
}
