import React, { useState, useEffect } from 'react';

export default function CouponModal({ isOpen, onClose, onSubmit, editingCoupon }) {
    const [formData, setFormData] = useState({
        code: '',
        discountType: 'percentage',
        discountValue: 0,
        maxRedemptions: '',
        expiresAt: '',
        description: '',
        isActive: true
    });

    useEffect(() => {
        if (editingCoupon) {
            setFormData({
                code: editingCoupon.code,
                discountType: editingCoupon.discountType,
                discountValue: editingCoupon.discountValue,
                maxRedemptions: editingCoupon.maxRedemptions || '',
                expiresAt: editingCoupon.expiresAt ? new Date(editingCoupon.expiresAt).toISOString().split('T')[0] : '',
                description: editingCoupon.description || '',
                isActive: editingCoupon.isActive
            });
        } else {
            setFormData({
                code: '',
                discountType: 'percentage',
                discountValue: 0,
                maxRedemptions: '',
                expiresAt: '',
                description: '',
                isActive: true
            });
        }
    }, [editingCoupon, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : null,
            expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-surface rounded-card p-6 w-full max-w-md border border-border shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-foreground">
                    {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-secondary">Code</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-xl bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none uppercase font-mono"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-secondary">Type</label>
                            <select
                                className="w-full px-3 py-2 border border-border rounded-xl bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount ($)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-secondary">Value</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-border rounded-xl bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                                required
                                min="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1 text-secondary">Limit Redemptions (Optional)</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 border border-border rounded-xl bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted"
                            value={formData.maxRedemptions}
                            onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                            placeholder="Unlimited"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1 text-secondary">Expiration Date (Optional)</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-border rounded-xl bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            value={formData.expiresAt}
                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1 text-secondary">Description</label>
                        <textarea
                            className="w-full px-3 py-2 border border-border rounded-xl bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="e.g. 20% off for winter sale"
                            rows="2"
                        />
                    </div>

                    <div>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="rounded accent-primary w-4 h-4"
                            />
                            <span className="text-sm font-medium text-secondary">Is Active</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-secondary hover:text-foreground hover:bg-surface-hover transition-colors font-medium border border-border text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover active:bg-primary-active transition-colors shadow-xs text-sm"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
