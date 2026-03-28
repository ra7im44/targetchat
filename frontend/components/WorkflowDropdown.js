import React, { useState, useEffect, useRef } from 'react';

export default function WorkflowDropdown({ workflows, selected, onSelect, loading }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    console.log('🔍 WorkflowDropdown props:', {
        workflows,
        workflowsLength: workflows?.length,
        selected,
        loading
    });

    const selectedWorkflow = workflows.find(w => w.id === selected);

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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all duration-200 border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
            >
                <span className="text-lg">{selectedWorkflow?.icon || '🤖'}</span>
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {selectedWorkflow?.name || 'Select Model'}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-scaleIn">
                    <div className="p-2 max-h-96 overflow-y-auto">
                        {workflows.map(workflow => (
                            <button
                                key={workflow.id}
                                onClick={() => {
                                    onSelect(workflow.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 ${selected === workflow.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                <span className="text-2xl mt-0.5">{workflow.icon}</span>
                                <div className="flex-1 text-left">
                                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        {!workflow.isPublic && <span className="text-sm">🔒</span>}
                                        {workflow.name}
                                        {selected === workflow.id && (
                                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {workflow.description}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
