import React from 'react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-modal shadow-lg max-w-md w-full overflow-hidden border border-border"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border">
                    <h3 className="text-xl font-bold text-foreground">
                        {title || 'Confirm Action'}
                    </h3>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-secondary leading-relaxed">
                        {message || 'Are you sure you want to proceed?'}
                    </p>
                </div>

                {/* Actions */}
                <div className="p-6 bg-surface-elevated flex gap-3 justify-end border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-foreground bg-surface hover:bg-surface-hover border border-border transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-5 py-2.5 rounded-xl font-medium bg-danger hover:bg-danger/90 active:bg-danger/80 text-white shadow-xs transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
