import React from 'react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {title || 'Confirm Action'}
                    </h3>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {message || 'Are you sure you want to proceed?'}
                    </p>
                </div>

                {/* Actions */}
                <div className="p-6 bg-gray-50 dark:bg-slate-900/50 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-5 py-2.5 rounded-xl font-medium bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-200"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
