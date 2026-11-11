import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { MessageSquare, ChevronDown, Check, Users, Plus } from 'lucide-react';
import { API_URL as API } from '../utils/apiConfig';

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
            <div className="p-3 border-b border-border">
                <div className="animate-pulse flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-surface-elevated rounded-md"></div>
                    <div className="flex-1 space-y-1">
                        <div className="h-3 bg-surface-elevated rounded w-3/4"></div>
                        <div className="h-2.5 bg-surface-elevated rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border-b border-border relative">
            {/* TargetChat Branding */}
            <div className="flex items-center gap-2.5 px-3.5 py-3.5 border-b border-border">
                <div className="w-7 h-7 rounded-md bg-surface-elevated border border-border flex items-center justify-center text-primary shrink-0">
                    <MessageSquare size={15} />
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground tracking-tight leading-none">
                            TargetChat
                        </span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-surface-elevated text-muted border border-border leading-normal">
                            AI
                        </span>
                    </div>
                    <span className="text-[11px] text-muted leading-tight mt-0.5">
                        Conversational Ops
                    </span>
                </div>
            </div>

            {/* Current Workspace Selector */}
            <div className="p-2">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    aria-expanded={showDropdown}
                    aria-label="Select workspace"
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-surface-hover transition-colors text-left group border border-transparent hover:border-border"
                    title={currentWorkspace?.name || 'Personal Space'}
                >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-md bg-surface-elevated border border-border flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0">
                            {currentWorkspace ? currentWorkspace.name?.charAt(0)?.toUpperCase() : 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs text-foreground truncate" title={currentWorkspace?.name || 'Personal Space'}>
                                {currentWorkspace?.name || 'Personal Space'}
                            </div>
                            <div className="text-[10px] text-muted capitalize truncate leading-tight">
                                {currentWorkspace?.role || 'Personal Account'}
                            </div>
                        </div>
                    </div>
                    <ChevronDown size={13} className={`text-muted group-hover:text-secondary transition-transform shrink-0 ml-1 ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute top-full left-2 right-2 mt-1 bg-surface rounded-lg shadow-xl border border-border py-1.5 z-50 max-h-80 overflow-y-auto animate-scaleIn">
                    {/* Workspaces List */}
                    <div className="px-1 space-y-0.5">
                        {workspaces.map((workspace) => (
                            <button
                                key={workspace.id}
                                onClick={() => handleWorkspaceSelect(workspace)}
                                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-left ${currentWorkspace?.id === workspace.id
                                    ? 'bg-primary-soft text-primary font-medium'
                                    : 'hover:bg-surface-hover text-secondary'
                                    }`}
                            >
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0 ${currentWorkspace?.id === workspace.id
                                    ? 'bg-primary text-white'
                                    : 'bg-surface-elevated border border-border text-muted'
                                    }`}>
                                    {workspace.name.charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-xs truncate">{workspace.name}</div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted">
                                        <span className="capitalize">{workspace.role}</span>
                                        <span>•</span>
                                        <span>{workspace.plan_type || 'Free'}</span>
                                    </div>
                                </div>

                                {currentWorkspace?.id === workspace.id && (
                                    <Check size={13} className="text-primary shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="my-1.5 border-t border-border"></div>

                    {/* Manage Members */}
                    {currentWorkspace && (
                        <div className="px-1">
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    onManageMembers?.();
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-hover text-secondary text-xs transition-colors"
                            >
                                <Users size={14} className="text-muted" />
                                <span>Manage Members</span>
                            </button>
                        </div>
                    )}

                    {/* Create New Workspace */}
                    <div className="px-1">
                        <button
                            onClick={() => {
                                setShowDropdown(false);
                                onCreateWorkspace?.();
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary-soft text-primary text-xs font-medium transition-colors"
                        >
                            <Plus size={14} />
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
