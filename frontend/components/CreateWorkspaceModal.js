import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

import { API_URL as API } from '../utils/apiConfig';

export default function CreateWorkspaceModal({ isOpen, onClose, onCreated }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [planType, setPlanType] = useState('free');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Workspace name is required');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('tc_token');
            const resp = await fetch(`${API}/api/workspaces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    plan_type: planType
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                toast.success('Workspace created successfully!');
                onCreated(data.workspace);
                onClose();
                setName('');
                setDescription('');
                setPlanType('free');
            } else {
                const error = await resp.json();
                toast.error(error.message || 'Failed to create workspace');
            }
        } catch (error) {
            console.error('Create workspace error:', error);
            toast.error('Failed to create workspace');
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-surface rounded-card shadow-lg max-w-md w-full p-6 border border-border">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-foreground">
                        Create Workspace
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Workspace Name */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                            Workspace Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Marketing Team"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this workspace for?"
                            rows="3"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Plan Type */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-3">
                            Plan Type
                        </label>
                        <div className="space-y-2">
                            {/* Free Plan */}
                            <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'free'
                                    ? 'border-primary bg-primary-soft'
                                    : 'border-border hover:border-border-strong bg-surface'
                                }`}>
                                <input
                                    type="radio"
                                    name="plan"
                                    value="free"
                                    checked={planType === 'free'}
                                    onChange={(e) => setPlanType(e.target.value)}
                                    className="w-4 h-4 text-primary focus:ring-primary"
                                />
                                <div className="ml-3 flex-1">
                                    <div className="font-medium text-foreground">Free</div>
                                    <div className="text-sm text-muted">Personal workspace only</div>
                                </div>
                            </label>

                            {/* Paid tiers are an upsell, not a creation option.
                                The backend derives the workspace plan from the
                                owner's live subscription, so selecting these here
                                cannot grant them — it would create a free
                                workspace and silently drop the choice. */}
                            <div className="p-4 rounded-xl border border-border bg-surface">
                                <div className="font-medium text-foreground">
                                    Need more than 1 member?
                                </div>
                                <div className="text-sm text-muted mt-1">
                                    Team ($25/mo, up to 5 members) and Enterprise ($100/mo,
                                    unlimited members) are available on any workspace after
                                    you subscribe.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        window.location.assign('/pricing');
                                    }}
                                    className="mt-3 px-4 py-2 rounded-xl border border-border text-foreground bg-surface-hover hover:bg-surface font-medium transition-colors"
                                >
                                    View plans
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground bg-surface hover:bg-surface-hover font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
                        >
                            {loading ? 'Creating...' : 'Create Workspace'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
