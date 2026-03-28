import React from 'react';

const typeStyles = {
    note: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        icon: '📝',
        title: 'Note'
    },
    tip: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        icon: '💡',
        title: 'Tip'
    },
    warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: '⚠️',
        title: 'Warning'
    },
    danger: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: '🚨',
        title: 'Important'
    }
};

export default function Callout({ type = 'note', title, children }) {
    const style = typeStyles[type] || typeStyles.note;

    return (
        <div className={`my-6 p-4 rounded-xl border-l-4 ${style.bg} ${style.border}`}>
            <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{style.icon}</span>
                <div className="flex-1">
                    {title && (
                        <p className="font-bold text-gray-900 dark:text-white mb-2">
                            {title}
                        </p>
                    )}
                    <div className="text-gray-700 dark:text-gray-300 text-sm">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
