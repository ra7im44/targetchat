import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function WorkspaceSwitcher({ currentWorkspace, onWorkspaceChange, onCreateWorkspace, onManageMembers }) {
    const router = useRouter();
    const [workspaces, setWorkspaces] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWorkspaces();
    }, []);

    // Reload workspaces when dropdown opens
    useEffect(() => {
        if (showDropdown) {
            loadWorkspaces();
        }
    }, [showDropdown]);

    async function loadWorkspaces() {
        try {
            const token = localStorage.getItem('tc_token');
            if (!token) return;

            const resp = await fetch(`${API}/api/workspaces`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (resp.ok) {
                const data = await resp.json();
                setWorkspaces(data.workspaces || []);

                // Set first workspace as current if none selected
                if (!currentWorkspace && data.workspaces.length > 0) {
                    onWorkspaceChange(data.workspaces[0]);
                    localStorage.setItem('current_workspace_id', data.workspaces[0].id);
                }
            }
        } catch (error) {
            console.error('Load workspaces error:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleWorkspaceSelect(workspace) {
        onWorkspaceChange(workspace);
        localStorage.setItem('current_workspace_id', workspace.id);
        setShowDropdown(false);
    }

    if (loading) {
        return (
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="animate-pulse">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 relative">
            {/* TargetChat Branding */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </div>
                <div>
                    <h2 className="font-bold text-lg text-gray-900 dark:text-white">TargetChat</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</p>
                </div>
            </div>

            {/* Current Workspace Button */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Workspace Icon */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                        {currentWorkspace?.name?.charAt(0)?.toUpperCase() || 'W'}
                    </div>

                    {/* Workspace Info */}
                    <div className="flex-1 min-w-0 text-left">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                            {currentWorkspace?.name || 'Select Workspace'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {currentWorkspace?.role || 'Member'}
                        </div>
                    </div>
                </div>

                {/* Dropdown Arrow */}
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute top-full left-4 right-4 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-96 overflow-y-auto">
                    {/* Workspaces List */}
                    <div className="px-2">
                        {workspaces.map((workspace) => (
                            <button
                                key={workspace.id}
                                onClick={() => handleWorkspaceSelect(workspace)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentWorkspace?.id === workspace.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                {/* Workspace Icon */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${currentWorkspace?.id === workspace.id
                                    ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                                    : 'bg-gray-400 dark:bg-gray-600'
                                    }`}>
                                    {workspace.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Workspace Info */}
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="font-medium truncate">{workspace.name}</div>
                                    <div className="flex items-center gap-2 text-xs opacity-60">
                                        <span className="capitalize">{workspace.role}</span>
                                        <span>•</span>
                                        <span className="capitalize px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                            {workspace.plan_type || 'Free'}
                                        </span>
                                    </div>
                                </div>

                                {/* Active Indicator */}
                                {currentWorkspace?.id === workspace.id && (
                                    <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Divider */}
                    {workspaces.length > 0 && (
                        <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
                    )}

                    {/* Manage Members */}
                    {currentWorkspace && (
                        <div className="px-2 mb-2">
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    onManageMembers?.();
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors font-medium"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span>Manage Members</span>
                            </button>
                        </div>
                    )}

                    {/* Create New Workspace */}
                    <div className="px-2">
                        <button
                            onClick={() => {
                                setShowDropdown(false);
                                onCreateWorkspace?.();
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors font-medium"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Create Workspace</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop */}
            {showDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                />
            )}
        </div>
    );
}
