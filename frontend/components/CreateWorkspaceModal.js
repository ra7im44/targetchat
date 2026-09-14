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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface rounded-card shadow-lg max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
                        Create Workspace
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-surface-hover rounded-lg transition-colors"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">
                            Workspace Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Marketing Team"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-strong bg-white dark:bg-surface-elevated text-gray-900 dark:text-foreground focus:ring-2 focus:ring-accent/60 focus:border-transparent transition-all"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this workspace for?"
                            rows="3"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-strong bg-white dark:bg-surface-elevated text-gray-900 dark:text-foreground focus:ring-2 focus:ring-accent/60 focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    {/* Plan Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-secondary mb-3">
                            Plan Type
                        </label>
                        <div className="space-y-2">
                            {/* Free Plan */}
                            <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'free'
                                    ? 'border-accent bg-accent/10 dark:bg-accent/20'
                                    : 'border-gray-200 dark:border-border hover:border-gray-300 dark:hover:border-gray-600'
                                }`}>
                                <input
                                    type="radio"
                                    name="plan"
                                    value="free"
                                    checked={planType === 'free'}
                                    onChange={(e) => setPlanType(e.target.value)}
                                    className="w-4 h-4 text-accent"
                                />
                                <div className="ml-3 flex-1">
                                    <div className="font-medium text-gray-900 dark:text-foreground">Free</div>
                                    <div className="text-sm text-gray-500 dark:text-muted">Personal workspace only</div>
                                </div>
                            </label>

                            {/* Team Plan */}
                            <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'team'
                                    ? 'border-accent bg-accent/10 dark:bg-accent/20'
                                    : 'border-gray-200 dark:border-border hover:border-gray-300 dark:hover:border-gray-600'
                                }`}>
                                <input
                                    type="radio"
                                    name="plan"
                                    value="team"
                                    checked={planType === 'team'}
                                    onChange={(e) => setPlanType(e.target.value)}
                                    className="w-4 h-4 text-accent"
                                />
                                <div className="ml-3 flex-1">
                                    <div className="font-medium text-gray-900 dark:text-foreground">Team - $25/month</div>
                                    <div className="text-sm text-gray-500 dark:text-muted">Up to 5 members</div>
                                </div>
                            </label>

                            {/* Enterprise Plan */}
                            <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'enterprise'
                                    ? 'border-accent bg-accent/10 dark:bg-accent/20'
                                    : 'border-gray-200 dark:border-border hover:border-gray-300 dark:hover:border-gray-600'
                                }`}>
                                <input
                                    type="radio"
                                    name="plan"
                                    value="enterprise"
                                    checked={planType === 'enterprise'}
                                    onChange={(e) => setPlanType(e.target.value)}
                                    className="w-4 h-4 text-accent"
                                />
                                <div className="ml-3 flex-1">
                                    <div className="font-medium text-gray-900 dark:text-foreground">Enterprise - $100/month</div>
                                    <div className="text-sm text-gray-500 dark:text-muted">Unlimited members</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-strong text-gray-700 dark:text-secondary font-medium hover:bg-gray-50 dark:hover:bg-surface-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            {loading ? 'Creating...' : 'Create Workspace'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
