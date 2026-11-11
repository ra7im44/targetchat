import React from 'react';

/* TargetChat shared UI primitives.
   Visual-only building blocks on the semantic token system.
   Rules: radius 6/8/10/12 (controls/inputs/cards/modals), borders over shadows,
   U-Axis Soft Indigo (#6875F5) for primary actions with white text, monochrome icons. */

const btnBase =
    'inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-md transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

const btnVariants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active font-semibold',
    secondary:
        'bg-surface text-foreground ' +
        'border border-border hover:bg-surface-hover active:bg-surface-elevated',
    ghost: 'text-secondary hover:bg-surface-hover hover:text-foreground active:bg-surface-elevated',
    danger:
        'bg-danger-soft text-danger hover:bg-danger hover:text-white ' +
        'border border-danger/20 active:bg-danger/90',
};

const btnSizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
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
                'p-2 rounded-lg text-muted hover:text-foreground ' +
                'hover:bg-surface-hover active:bg-surface-elevated transition-colors ' +
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ' +
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
    'w-full px-3.5 py-2.5 rounded-lg bg-surface-elevated ' +
    'border border-border text-foreground ' +
    'placeholder:text-muted ' +
    'hover:border-border-strong ' +
    'focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

export function Input({ className = '', error = false, ...props }) {
    const errorCls = error ? 'border-danger focus:border-danger focus:ring-danger/20' : '';
    return <input className={`${inputCls} ${errorCls} ${className}`} {...props} />;
}

export function Textarea({ className = '', error = false, ...props }) {
    const errorCls = error ? 'border-danger focus:border-danger focus:ring-danger/20' : '';
    return <textarea className={`${inputCls} resize-y ${errorCls} ${className}`} {...props} />;
}

export function Select({ className = '', error = false, children, ...props }) {
    const errorCls = error ? 'border-danger focus:border-danger focus:ring-danger/20' : '';
    return (
        <select className={`${inputCls} ${errorCls} ${className}`} {...props}>
            {children}
        </select>
    );
}

export function FieldLabel({ children, hint }) {
    return (
        <span className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
            {children}
            {hint && <span className="normal-case font-normal text-muted/80"> ({hint})</span>}
        </span>
    );
}

const badgeTones = {
    neutral: 'bg-surface-elevated text-muted border-border',
    accent: 'bg-primary-soft text-primary border-primary/20',
    primary: 'bg-primary-soft text-primary border-primary/20',
    success: 'bg-success-soft text-success border-success/20',
    warning: 'bg-warning-soft text-warning border-warning/20',
    danger: 'bg-danger-soft text-danger border-danger/20',
    info: 'bg-info-soft text-info border-info/20',
};

export function Badge({ tone = 'neutral', className = '', children }) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${badgeTones[tone] || badgeTones.neutral} ${className}`}
        >
            {children}
        </span>
    );
}

export function Card({ className = '', hoverable = false, children, ...props }) {
    return (
        <div
            className={`bg-surface border border-border rounded-xl ${hoverable ? 'hover:bg-surface-hover transition-colors' : ''} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function PageHeader({ eyebrow, title, description, actions }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                {eyebrow && (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary mb-1.5">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                {description && <p className="text-sm text-secondary mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2.5">{actions}</div>}
        </div>
    );
}

export function EmptyState({ icon, title, hint, action }) {
    return (
        <div className="text-center py-12 px-6">
            {icon && <div className="mx-auto mb-3 text-muted flex justify-center">{icon}</div>}
            <p className="font-semibold text-foreground">{title}</p>
            {hint && <p className="text-sm text-muted mt-1">{hint}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function Spinner({ label = 'Loading' }) {
    return (
        <div className="flex justify-center py-12" role="status" aria-label={label}>
            <div className="w-8 h-8 border-[3px] border-primary/25 border-t-primary rounded-full animate-spin" />
        </div>
    );
}
