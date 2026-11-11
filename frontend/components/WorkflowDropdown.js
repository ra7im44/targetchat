import React, { useState, useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';

export default function WorkflowDropdown({ workflows, selected, onSelect, loading }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    console.log('WorkflowDropdown props:', {
        workflows,
        workflowsLength: workflows?.length,
        selected,
        loading
    });

    const selectedWorkflow = (workflows || []).find(w => w.id === selected) || (workflows && workflows.length > 0 ? workflows[0] : null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-medium text-muted">Loading...</span>
            </div>
        );
    }

    const availableWorkflows = workflows || [];

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover transition-all duration-200 border border-border shadow-xs"
                title={selectedWorkflow?.description || 'Select AI Model'}
            >
                <span className="text-base flex items-center">{selectedWorkflow?.icon || <Bot size={18} />}</span>
                <span className="font-semibold text-xs sm:text-sm text-foreground max-w-[120px] sm:max-w-[160px] truncate">
                    {selectedWorkflow?.name || 'Select Model'}
                </span>
                <svg
                    className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full ltr:left-0 rtl:right-0 mt-2 w-80 bg-surface rounded-card shadow-lg border border-border overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-border bg-surface-elevated">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Available Models
                        </p>
                    </div>

                    <div className="p-1.5 max-h-80 overflow-y-auto space-y-1 scrollbar-thin">
                        {availableWorkflows.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted">
                                No models configured
                            </div>
                        ) : (
                            availableWorkflows.map(workflow => {
                                const isSelected = (selectedWorkflow?.id === workflow.id) || (selected === workflow.id);
                                return (
                                    <button
                                        key={workflow.id}
                                        type="button"
                                        onClick={() => {
                                            onSelect(workflow.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-start transition-all duration-150 ${isSelected
                                            ? 'bg-primary-soft text-primary border border-primary/30'
                                            : 'hover:bg-surface-hover text-secondary hover:text-foreground border border-transparent'
                                            }`}
                                    >
                                        <span className="text-xl p-1.5 rounded-lg bg-surface-elevated shrink-0">
                                            {workflow.icon || <Bot size={18} />}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-xs sm:text-sm text-foreground flex items-center justify-between gap-1">
                                                <span className="truncate">{workflow.name}</span>
                                                {isSelected && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                                                )}
                                            </div>
                                            {workflow.description && (
                                                <div className="text-[11px] text-muted line-clamp-2 mt-0.5">
                                                    {workflow.description}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
