import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDangerous = false
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div
                className="bg-surface rounded-modal shadow-lg w-full max-w-md border border-border transform scale-100 transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        {isDangerous && <AlertTriangle className="text-danger" size={24} />}
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-foreground transition-colors p-1 rounded-full hover:bg-surface-hover"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-secondary leading-relaxed text-base">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-foreground bg-surface-elevated hover:bg-surface-hover border border-border transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-xs transition-all transform active:scale-95 flex items-center gap-2 ${isDangerous
                                ? 'bg-danger hover:bg-danger/90 active:bg-danger/80'
                                : 'bg-primary hover:bg-primary-hover active:bg-primary-active'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
