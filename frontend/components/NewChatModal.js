import React from 'react';
import WorkflowSelector from './WorkflowSelector';

export default function NewChatModal({ isOpen, onClose, selectedWorkflow, onSelectWorkflow, onCreate }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div className="relative">
                {/* Modal Content */}
                <div
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scaleIn"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Create New Chat
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Select an AI model to start chatting
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <WorkflowSelector
                            selected={selectedWorkflow}
                            onSelect={onSelectWorkflow}
                        />
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
                                onCreate();
                                onClose();
                            }}
                            disabled={!selectedWorkflow}
                            className="px-5 py-2.5 rounded-xl font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Chat
                        </button>
                    </div>
                </div>

                {/* Close Button (Outside Modal) */}
                <button
                    onClick={onClose}
                    className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                    aria-label="Close"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
