import React from 'react';
import { StickyNote, Lightbulb, AlertTriangle, Siren } from 'lucide-react';

const typeStyles = {
    note: {
        bg: 'bg-info-soft',
        border: 'border-info',
        Icon: StickyNote,
        iconClass: 'text-info',
        title: 'Note'
    },
    tip: {
        bg: 'bg-success-soft',
        border: 'border-success',
        Icon: Lightbulb,
        iconClass: 'text-success',
        title: 'Tip'
    },
    warning: {
        bg: 'bg-warning-soft',
        border: 'border-warning',
        Icon: AlertTriangle,
        iconClass: 'text-warning',
        title: 'Warning'
    },
    danger: {
        bg: 'bg-danger-soft',
        border: 'border-danger',
        Icon: Siren,
        iconClass: 'text-danger',
        title: 'Important'
    }
};

export default function Callout({ type = 'note', title, children }) {
    const style = typeStyles[type] || typeStyles.note;
    const Icon = style.Icon;

    return (
        <div className={`my-6 p-4 rounded-card border-l-4 ${style.bg} ${style.border}`}>
            <div className="flex items-start gap-3">
                <Icon size={18} className={`flex-shrink-0 ${style.iconClass}`} />
                <div className="flex-1">
                    {title && (
                        <p className="font-bold text-foreground mb-2">
                            {title}
                        </p>
                    )}
                    <div className="text-secondary text-sm">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}