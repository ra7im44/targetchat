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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-surface rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 dark:text-foreground">
                    {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 dark:text-secondary">Code</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded dark:bg-surface-elevated dark:border-border dark:text-foreground uppercase"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-secondary">Type</label>
                            <select
                                className="w-full p-2 border rounded dark:bg-surface-elevated dark:border-border dark:text-foreground"
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount ($)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-secondary">Value</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded dark:bg-surface-elevated dark:border-border dark:text-foreground"
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                                required
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 dark:text-secondary">Limit Redemptions (Optional)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded dark:bg-surface-elevated dark:border-border dark:text-foreground"
                            value={formData.maxRedemptions}
                            onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                            placeholder="Unlimited"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 dark:text-secondary">Expiration Date (Optional)</label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded dark:bg-surface-elevated dark:border-border dark:text-foreground"
                            value={formData.expiresAt}
                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 dark:text-secondary">Description</label>
                        <textarea
                            className="w-full p-2 border rounded dark:bg-surface-elevated dark:border-border dark:text-foreground"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="e.g. 20% off for winter sale"
                            rows="2"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="rounded text-info"
                            />
                            <span className="text-sm font-medium dark:text-secondary">Is Active</span>
                        </label>
                    </div>

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-muted dark:hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-accent text-background rounded hover:bg-accent-hover"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
