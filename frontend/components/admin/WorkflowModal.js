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
            <div className="bg-surface w-full max-w-2xl rounded-card shadow-lg max-h-[90vh] overflow-y-auto border border-border">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface-elevated sticky top-0 z-10">
                    <h2 className="text-xl font-semibold text-foreground">
                        {workflow ? 'Edit Workflow' : 'Create New Workflow'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 bg-surface">
                    {/* Icon Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-secondary mb-3 ml-1">
                            Choose an Icon
                        </label>
                        <div className="grid grid-cols-6 gap-3">
                            {iconOptions.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon })}
                                    className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center ${formData.icon === icon
                                        ? 'border-primary bg-primary-soft text-primary scale-110 shadow-xs'
                                        : 'border-border hover:border-primary/50 bg-surface-elevated text-secondary'
                                        }`}
                                >
                                    {(() => { const Glyph = ICON_COMPONENTS[icon] || Bot; return <Glyph size={18} />; })()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Visibility Toggle */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-secondary ml-1">
                            Visibility
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isPublic: true })}
                                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${formData.isPublic
                                    ? 'border-success bg-success-soft text-success font-semibold'
                                    : 'border-border bg-surface-elevated text-secondary'
                                    }`}
                            >
                                <div className="mb-1 flex justify-center"><Globe size={18} /></div>
                                <div className="font-semibold text-sm">Public</div>
                                <div className="text-xs opacity-70">All users</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isPublic: false })}
                                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${!formData.isPublic
                                    ? 'border-warning bg-warning-soft text-warning font-semibold'
                                    : 'border-border bg-surface-elevated text-secondary'
                                    }`}
                            >
                                <div className="mb-1 flex justify-center"><Lock size={18} /></div>
                                <div className="font-semibold text-sm">Private</div>
                                <div className="text-xs opacity-70">Specific users</div>
                            </button>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-secondary ml-1">
                            Workflow Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted"
                            placeholder="e.g., GPT-4 Support Agent"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-secondary ml-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none placeholder:text-muted"
                            placeholder="Briefly describe what this workflow does..."
                        />
                    </div>

                    {/* Webhook URL */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-secondary ml-1">
                            Webhook URL *
                        </label>
                        <div className="relative">
                            <input
                                type="url"
                                required
                                value={formData.webhookUrl}
                                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono text-sm placeholder:text-muted"
                                placeholder="https://n8n.your-domain.com/webhook/..."
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"><Link2 size={16} /></span>
                        </div>
                        <p className="mt-1.5 text-xs text-muted ml-1">
                            The endpoint where TargetChat will send user messages for processing.
                        </p>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface-elevated">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <div>
                            <span className="block text-sm font-semibold text-foreground">Active Status</span>
                            <span className="text-xs text-muted">If disabled, this workflow won't be available to users.</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-secondary hover:bg-surface-hover hover:text-foreground transition-all font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {saving ? 'Saving...' : workflow ? 'Update Workflow' : 'Create Workflow'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
