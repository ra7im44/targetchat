import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

import { Settings, CreditCard, ShieldCheck, User, TriangleAlert, Lock } from 'lucide-react';
import { API_URL as API } from '../utils/apiConfig';

export default function SettingsPanel({ isOpen, onClose }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('general');
    const [user, setUser] = useState(null);
    const [preferences, setPreferences] = useState(null);

    // General tab
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [theme, setTheme] = useState('system');
    const [language, setLanguage] = useState('en');

    // Security tab
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Account tab
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    // Billing tab
    const [subscription, setSubscription] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [billingLoading, setBillingLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadUserData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && activeTab === 'billing') {
            loadBillingData();
        }
    }, [isOpen, activeTab]);

    async function loadUserData() {
        const token = localStorage.getItem('tc_token');
        if (!token) return;

        try {
            const [userRes, prefsRes] = await Promise.all([
                fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/api/user/preferences`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (userRes.ok) {
                const userData = await userRes.json();
                setUser(userData.user);
                setName(userData.user.name || '');
                setEmail(userData.user.email || '');
            }

            if (prefsRes.ok) {
                const prefs = await prefsRes.json();
                setPreferences(prefs);
                setTheme(prefs.theme || 'system');
                setLanguage(prefs.language || 'en');
            }
        } catch (err) {
            console.error('Error loading data:', err);
        }
    }

    async function loadBillingData() {
        setBillingLoading(true);
        const token = localStorage.getItem('tc_token');
        try {
            const [subRes, invRes] = await Promise.all([
                fetch(`${API}/api/billing/subscription`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/api/billing/invoices`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (subRes.ok) {
                const data = await subRes.json();
                setSubscription(data.subscription);
            }
            if (invRes.ok) {
                const data = await invRes.json();
                setInvoices(data.invoices || []);
            }
        } catch (err) {
            console.error('Error loading billing:', err);
        } finally {
            setBillingLoading(false);
        }
    }

    async function saveProfile() {
        setLoading(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/auth/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name, email })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Profile updated!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to update' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Server error' });
        } finally {
            setLoading(false);
        }
    }

    async function savePreferences() {
        setLoading(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/user/preferences`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ theme, language })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Preferences saved!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to save' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Server error' });
        } finally {
            setLoading(false);
        }
    }

    async function changePassword() {
        setLoading(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Password changed!' });
                setCurrentPassword('');
                setNewPassword('');
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Server error' });
        } finally {
            setLoading(false);
        }
    }

    async function deleteAccount() {
        if (confirmText !== 'DELETE') return;

        try {
            const token = localStorage.getItem('tc_token');
            await fetch(`${API}/api/auth/me`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            localStorage.removeItem('tc_token');
            router.replace('/login');
        } catch (err) {
            console.error('Error:', err);
        }
    }

    // Billing Actions
    async function openCustomerPortal() {
        setProcessing(true);
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/billing/portal`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const { url } = await res.json();
                window.location.href = url;
            } else {
                alert('Failed to open customer portal');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
        }
    }

    async function cancelSubscription() {
        if (!confirm('Are you sure? You will retain access until the period ends.')) return;
        setProcessing(true);
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/billing/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ immediate: false })
            });
            if (res.ok) {
                alert('Subscription canceled.');
                loadBillingData();
            } else {
                alert('Failed to cancel.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
        }
    }

    async function resumeSubscription() {
        setProcessing(true);
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/billing/resume`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Subscription resumed!');
                loadBillingData();
            } else {
                alert('Failed to resume.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: 'bg-success-soft text-success border-success/20',
            trialing: 'bg-info-soft text-info border-info/20',
            past_due: 'bg-danger-soft text-danger border-danger/20',
            canceled: 'bg-surface-elevated text-muted border-border'
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badges[status] || badges.active}`}>
                {status?.toUpperCase()}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Settings Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-background shadow-2xl z-50 flex overflow-hidden border-l border-border animate-scaleIn">
                {/* Sidebar */}
                <div className="w-64 bg-surface border-r border-border p-6 flex flex-col">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-muted hover:text-foreground mb-8 transition-colors text-sm font-medium"
                    >
                        <span>←</span>
                        <span>Back to Chat</span>
                    </button>

                    <h2 className="text-2xl font-bold text-foreground mb-6">Settings</h2>

                    <nav className="space-y-1 flex-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all ${activeTab === 'general'
                                ? 'bg-primary-soft text-primary font-semibold'
                                : 'text-secondary hover:bg-surface-hover hover:text-foreground'
                                }`}
                        >
                            <Settings size={18} />
                            <span>General</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all ${activeTab === 'billing'
                                ? 'bg-primary-soft text-primary font-semibold'
                                : 'text-secondary hover:bg-surface-hover hover:text-foreground'
                                }`}
                        >
                            <CreditCard size={18} />
                            <span>Billing</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all ${activeTab === 'security'
                                ? 'bg-primary-soft text-primary font-semibold'
                                : 'text-secondary hover:bg-surface-hover hover:text-foreground'
                                }`}
                        >
                            <ShieldCheck size={18} />
                            <span>Security</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('account')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all ${activeTab === 'account'
                                ? 'bg-primary-soft text-primary font-semibold'
                                : 'text-secondary hover:bg-surface-hover hover:text-foreground'
                                }`}
                        >
                            <User size={18} />
                            <span>Account</span>
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8">
                    {message && (
                        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success'
                            ? 'bg-success dark:bg-success/20 text-success-ink dark:text-success'
                            : 'bg-danger/10 dark:bg-danger/20 text-danger-ink dark:text-danger'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div>
                            <h3 className="text-3xl font-bold text-foreground mb-2">General</h3>
                            <p className="text-secondary mb-8">Manage your profile and preferences</p>

                            <div className="bg-surface rounded-xl p-6 mb-6 border border-border shadow-xs">
                                <h4 className="text-xl font-semibold text-foreground mb-4">Profile Information</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-elevated text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-elevated text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        />
                                    </div>
                                    <button onClick={saveProfile} disabled={loading} className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-lg disabled:opacity-50 transition-colors font-semibold shadow-xs">
                                        {loading ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-surface rounded-xl p-6 border border-border shadow-xs">
                                <h4 className="text-xl font-semibold text-foreground mb-4">Appearance</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-2">Theme</label>
                                        <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                                            <option value="system">System</option>
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-2">Language</label>
                                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                                            <option value="en">English</option>
                                            <option value="ar">العربية</option>
                                        </select>
                                    </div>
                                    <button onClick={savePreferences} disabled={loading} className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-lg disabled:opacity-50 transition-colors font-semibold shadow-xs">
                                        {loading ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div>
                            <h3 className="text-3xl font-bold text-foreground mb-2">Billing</h3>
                            <p className="text-secondary mb-8">Manage subscriptions and invoices</p>

                            <div className="bg-surface rounded-xl p-6 mb-6 shadow-xs border border-border">
                                <h4 className="text-xl font-bold text-foreground mb-4">Current Plan</h4>
                                {billingLoading ? (
                                    <div className="flex justify-center p-4"><div className="w-8 h-8 border-4 border-primary/25 border-t-primary rounded-full animate-spin"></div></div>
                                ) : subscription ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-2xl font-bold text-foreground">{subscription.plan?.name || 'Unknown Plan'}</h3>
                                                <p className="text-secondary">${subscription.plan?.priceMonthly}/month</p>
                                            </div>
                                            {getStatusBadge(subscription.status)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                                            <div>
                                                <p className="text-sm text-muted">Current Period</p>
                                                <p className="font-medium text-foreground">{formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}</p>
                                            </div>
                                            {subscription.trialEnd && (
                                                <div>
                                                    <p className="text-sm text-muted">Trial Ends</p>
                                                    <p className="font-medium text-foreground">{formatDate(subscription.trialEnd)}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <button onClick={openCustomerPortal} disabled={processing} className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-lg disabled:opacity-50 font-semibold shadow-xs">Manage Payment Method</button>
                                            {subscription.cancelAtPeriodEnd ? (
                                                <button onClick={resumeSubscription} disabled={processing} className="flex-1 px-4 py-2.5 bg-success hover:bg-success/90 text-white rounded-lg disabled:opacity-50 font-semibold shadow-xs">Resume Subscription</button>
                                            ) : subscription.status === 'active' && (
                                                <button onClick={cancelSubscription} disabled={processing} className="flex-1 px-4 py-2.5 bg-danger-soft text-danger hover:bg-danger hover:text-white border border-danger/20 rounded-lg disabled:opacity-50 font-semibold transition-colors">Cancel Subscription</button>
                                            )}
                                        </div>
                                        {subscription.cancelAtPeriodEnd && (
                                            <div className="bg-warning-soft border border-warning/30 rounded-lg p-3">
                                                <p className="text-sm text-warning flex items-center gap-1.5"><TriangleAlert size={16} /> Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-muted mb-4">No active subscription</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-surface rounded-xl p-6 shadow-xs border border-border">
                                <h4 className="text-xl font-bold text-foreground mb-4">Invoice History</h4>
                                {invoices.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="border-b border-border">
                                                <tr>
                                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted">Date</th>
                                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted">Amount</th>
                                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted">Status</th>
                                                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted">PDF</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoices.map((inv) => (
                                                    <tr key={inv.id} className="border-b border-border/60 hover:bg-surface-hover/50 transition-colors">
                                                        <td className="py-3 px-4 text-foreground font-mono text-xs">{formatDate(inv.createdAt)}</td>
                                                        <td className="py-3 px-4 text-foreground font-semibold">${parseFloat(inv.amount).toFixed(2)}</td>
                                                        <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                                                        <td className="py-3 px-4 text-right">
                                                            {inv.invoicePdf && (
                                                                <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Download</a>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center text-muted py-6">No invoices yet</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div>
                            <h3 className="text-3xl font-bold text-foreground mb-2">Security</h3>
                            <p className="text-secondary mb-8">Manage your password and security settings</p>
                            <div className="bg-surface rounded-xl p-6 border border-border shadow-xs">
                                <h4 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Lock size={18} className="text-primary" /> Change Password</h4>
                                <div className="space-y-4">
                                    <div><label className="block text-sm font-medium text-secondary mb-2">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" /></div>
                                    <div><label className="block text-sm font-medium text-secondary mb-2">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-elevated text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" /></div>
                                    <button onClick={changePassword} disabled={loading} className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-lg disabled:opacity-50 transition-colors font-semibold shadow-xs">{loading ? 'Updating...' : 'Update Password'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Account Tab */}
                    {activeTab === 'account' && (
                        <div>
                            <h3 className="text-3xl font-bold text-foreground mb-2">Account</h3>
                            <p className="text-secondary mb-8">Manage your account settings</p>
                            <div className="bg-surface rounded-xl p-6 mb-6 border border-border shadow-xs">
                                <h4 className="text-xl font-semibold text-foreground mb-4">Account Information</h4>
                                <div className="space-y-3 text-secondary">
                                    <div className="flex justify-between items-center"><span className="font-medium">Account ID:</span><span className="text-muted font-mono text-xs">{user?.id}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium">Role:</span><span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-primary-soft text-primary border border-primary/20">{user?.role === 'admin' ? 'Admin' : 'User'}</span></div>
                                </div>
                            </div>
                            <div className="bg-danger-soft rounded-xl p-6 border border-danger/30">
                                <h4 className="text-xl font-semibold text-danger mb-2 flex items-center gap-2"><TriangleAlert size={18} /> DANGER ZONE</h4>
                                <p className="text-danger mb-4 text-sm">Permanently remove your account and all associated data. This action cannot be undone.</p>
                                <button onClick={() => setShowDeleteModal(true)} className="px-6 py-2.5 bg-danger hover:bg-danger/90 text-white rounded-lg transition-colors font-semibold shadow-xs">Delete My Account</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fadeIn">
                    <div className="bg-surface rounded-card p-6 max-w-md w-full border border-border shadow-2xl">
                        <h3 className="text-xl font-bold text-foreground mb-3">Delete Account</h3>
                        <p className="text-secondary mb-3 text-sm">Type <strong>DELETE</strong> to confirm:</p>
                        <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-elevated text-foreground focus:border-danger focus:ring-2 focus:ring-danger/20 outline-none mb-4 transition-all" />
                        <div className="flex gap-3">
                            <button onClick={() => { setShowDeleteModal(false); setConfirmText(''); }} className="flex-1 px-4 py-2.5 bg-surface-elevated border border-border text-foreground rounded-lg hover:bg-surface-hover font-medium transition-colors">Cancel</button>
                            <button onClick={deleteAccount} disabled={confirmText !== 'DELETE'} className="flex-1 px-4 py-2.5 bg-danger hover:bg-danger/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xs transition-colors">Delete Account</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
