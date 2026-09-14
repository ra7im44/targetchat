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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div
                className="bg-white dark:bg-surface rounded-modal shadow-lg w-full max-w-md border border-gray-100 dark:border-border transform scale-100 transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                        {isDangerous && <AlertTriangle className="text-danger" size={24} />}
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-secondary transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-surface-hover"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-600 dark:text-secondary leading-relaxed text-base">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-secondary bg-gray-100 dark:bg-surface-elevated hover:bg-gray-200 dark:hover:bg-surface-hover transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center gap-2 ${isDangerous
                                ? 'bg-red-600 hover:bg-red-700
                                : 'bg-accent hover:bg-accent-hover'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
