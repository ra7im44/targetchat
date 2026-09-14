import { useState } from 'react';
import { X, Globe, Lock, Link2, Bot, PenLine, BarChart3, Palette, Code2, Microscope, Target, Rocket, Zap, Sparkles, Brain, Lightbulb } from 'lucide-react';

const ICON_COMPONENTS = {
    '🤖': Bot, '✍️': PenLine, '📊': BarChart3, '🎨': Palette, '💻': Code2,
    '🔬': Microscope, '🎯': Target, '🚀': Rocket, '⚡': Zap, '🦙': Sparkles,
    '🧠': Brain, '💡': Lightbulb
};

export default function WorkflowModal({ workflow, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: workflow?.name || '',
        description: workflow?.description || '',
        webhookUrl: workflow?.webhookUrl || '',
        icon: workflow?.icon || '🤖',
        isActive: workflow?.isActive !== undefined ? workflow.isActive : true,
        isPublic: workflow?.isPublic !== undefined ? workflow.isPublic : true
    });

    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(formData);
        } finally {
            setSaving(false);
        }
    };

    const iconOptions = ['🤖', '✍️', '📊', '🎨', '💻', '🔬', '🎯', '🚀', '⚡', '🦙', '🧠', '💡'];


    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="glass-panel w-full max-w-2xl rounded-card shadow-lg max-h-[90vh] overflow-y-auto border border-white/20">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-border/50 flex items-center justify-between bg-white/50 dark:bg-surface backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
                        {workflow ? 'Edit Workflow' : 'Create New Workflow'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-surface-hover text-gray-500 dark:text-muted transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Icon Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-secondary mb-3 ml-1">
                            Choose an Icon
                        </label>
                        <div className="grid grid-cols-6 gap-3">
                            {iconOptions.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon })}
                                    className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center ${formData.icon === icon
                                        ? 'border-accent bg-accent/10 dark:bg-accent/10 scale-110 shadow-md'
                                        : 'border-gray-100 dark:border-border hover:border-accent dark:hover:border-border bg-white/50 dark:bg-surface/50'
                                        }`}
                                >
                                    {(() => { const Glyph = ICON_COMPONENTS[icon] || Bot; return <Glyph size={18} />; })()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Visibility Toggle */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-secondary ml-1">
                            Visibility
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isPublic: true })}
                                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${formData.isPublic
                                    ? 'border-success bg-success dark:bg-success/20 text-success dark:text-success'
                                    : 'border-gray-200 dark:border-border bg-white/50 dark:bg-surface/50 text-gray-600 dark:text-muted'
                                    }`}
                            >
                                <div className="mb-1"><Globe size={18} /></div>
                                <div className="font-semibold text-sm">Public</div>
                                <div className="text-xs opacity-70">All users</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isPublic: false })}
                                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${!formData.isPublic
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/20 text-warning dark:text-warning'
                                    : 'border-gray-200 dark:border-border bg-white/50 dark:bg-surface/50 text-gray-600 dark:text-muted'
                                    }`}
                            >
                                <div className="mb-1"><Lock size={18} /></div>
                                <div className="font-semibold text-sm">Private</div>
                                <div className="text-xs opacity-70">Specific users</div>
                            </button>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-secondary ml-1">
                            Workflow Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-border bg-white/50 dark:bg-background/50 text-gray-900 dark:text-foreground focus:ring-2 focus:ring-accent/50 outline-none transition-all placeholder:text-gray-400"
                            placeholder="e.g., GPT-4 Support Agent"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-secondary ml-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-border bg-white/50 dark:bg-background/50 text-gray-900 dark:text-foreground focus:ring-2 focus:ring-accent/50 outline-none resize-none placeholder:text-gray-400"
                            placeholder="Briefly describe what this workflow does..."
                        />
                    </div>

                    {/* Webhook URL */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-secondary ml-1">
                            Webhook URL *
                        </label>
                        <div className="relative">
                            <input
                                type="url"
                                required
                                value={formData.webhookUrl}
                                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-border bg-white/50 dark:bg-background/50 text-gray-900 dark:text-foreground focus:ring-2 focus:ring-accent/50 outline-none font-mono text-sm placeholder:text-gray-400"
                                placeholder="https://n8n.your-domain.com/webhook/..."
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Link2 size={16} /></span>
                        </div>
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-muted ml-1">
                            The endpoint where TargetChat will send user messages for processing.
                        </p>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-border bg-gray-50/50 dark:bg-surface">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-surface-elevated rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-border peer-checked:bg-accent"></div>
                        </label>
                        <div>
                            <span className="block text-sm font-semibold text-gray-900 dark:text-foreground">Active Status</span>
                            <span className="text-xs text-gray-500 dark:text-muted">If disabled, this workflow won't be available to users.</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-border/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-border text-gray-600 dark:text-secondary hover:bg-gray-50 dark:hover:bg-surface-hover transition-all font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-3 rounded-xl bg-accent text-background font-medium hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {saving ? 'Saving...' : workflow ? 'Update Workflow' : 'Create Workflow'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
