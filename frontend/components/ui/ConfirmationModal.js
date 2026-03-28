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
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700 transform scale-100 transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {isDangerous && <AlertTriangle className="text-red-500" size={24} />}
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 ${isDangerous
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
