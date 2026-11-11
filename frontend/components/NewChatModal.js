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
                    className="bg-surface rounded-card shadow-lg max-w-2xl w-full overflow-hidden border border-border"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-border">
                        <h3 className="text-2xl font-bold text-foreground">
                            Create New Chat
                        </h3>
                        <p className="text-sm text-secondary mt-1">
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
                    <div className="p-6 bg-surface-elevated border-t border-border flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl font-medium text-foreground bg-surface hover:bg-surface-hover border border-border transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onCreate();
                                onClose();
                            }}
                            disabled={!selectedWorkflow}
                            className="px-5 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary-hover active:bg-primary-active text-white shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Chat
                        </button>
                    </div>
                </div>

                {/* Close Button (Outside Modal) */}
                <button
                    onClick={onClose}
                    className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-surface-elevated hover:bg-surface-hover border border-border flex items-center justify-center text-foreground transition-all duration-200 hover:scale-110 shadow-md"
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
