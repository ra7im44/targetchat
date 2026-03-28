import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
            active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            past_due: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            canceled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${badges[status] || badges.active}`}>
                {status?.toUpperCase()}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/30 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Settings Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-white dark:bg-gray-900 shadow-2xl z-50 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
                    >
                        <span>←</span>
                        <span>Back to Chat</span>
                    </button>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>

                    <nav className="space-y-1 flex-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'general'
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <span>⚙️</span>
                            <span>General</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'billing'
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <span>💳</span>
                            <span>Billing</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'security'
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <span>🛡️</span>
                            <span>Security</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('account')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'account'
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <span>👤</span>
                            <span>Account</span>
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8">
                    {message && (
                        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">General</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">Manage your profile and preferences</p>

                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <button onClick={saveProfile} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                        {loading ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Appearance</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                                        <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="system">System</option>
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
                                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="en">English</option>
                                            <option value="ar">العربية</option>
                                        </select>
                                    </div>
                                    <button onClick={savePreferences} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                        {loading ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Billing</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">Manage subscriptions and invoices</p>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Current Plan</h4>
                                {billingLoading ? (
                                    <div className="flex justify-center p-4"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                                ) : subscription ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{subscription.plan?.name || 'Unknown Plan'}</h3>
                                                <p className="text-gray-600 dark:text-gray-400">${subscription.plan?.priceMonthly}/month</p>
                                            </div>
                                            {getStatusBadge(subscription.status)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Current Period</p>
                                                <p className="font-medium text-gray-900 dark:text-white">{formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}</p>
                                            </div>
                                            {subscription.trialEnd && (
                                                <div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Trial Ends</p>
                                                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(subscription.trialEnd)}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <button onClick={openCustomerPortal} disabled={processing} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium">Manage Payment Method</button>
                                            {subscription.cancelAtPeriodEnd ? (
                                                <button onClick={resumeSubscription} disabled={processing} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium">Resume Subscription</button>
                                            ) : subscription.status === 'active' && (
                                                <button onClick={cancelSubscription} disabled={processing} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium">Cancel Subscription</button>
                                            )}
                                        </div>
                                        {subscription.cancelAtPeriodEnd && (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                                <p className="text-sm text-yellow-800 dark:text-yellow-300">⚠️ Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">No active subscription</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Invoice History</h4>
                                {invoices.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="border-b border-gray-200 dark:border-gray-700">
                                                <tr>
                                                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400">Date</th>
                                                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400">Amount</th>
                                                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400">Status</th>
                                                    <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">PDF</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoices.map((inv) => (
                                                    <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-700/50">
                                                        <td className="py-3 px-4 text-gray-900 dark:text-white">{formatDate(inv.createdAt)}</td>
                                                        <td className="py-3 px-4 text-gray-900 dark:text-white">${parseFloat(inv.amount).toFixed(2)}</td>
                                                        <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                                                        <td className="py-3 px-4 text-right">
                                                            {inv.invoicePdf && (
                                                                <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">Download</a>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-600 dark:text-gray-400 py-6">No invoices yet</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Security</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">Manage your password and security settings</p>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><span>🔐</span> Change Password</h4>
                                <div className="space-y-4">
                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                    <button onClick={changePassword} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">{loading ? 'Updating...' : 'Update Password'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Account Tab */}
                    {activeTab === 'account' && (
                        <div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Account</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">Manage your account settings</p>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Information</h4>
                                <div className="space-y-3 text-gray-700 dark:text-gray-300">
                                    <div className="flex justify-between"><span className="font-medium">Account ID:</span><span className="text-gray-600 dark:text-gray-400">{user?.id}</span></div>
                                    <div className="flex justify-between"><span className="font-medium">Role:</span><span className="px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{user?.role === 'admin' ? 'Admin' : 'User'}</span></div>
                                </div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-6 border border-red-200 dark:border-red-800">
                                <h4 className="text-xl font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2"><span>⚠️</span> DANGER ZONE</h4>
                                <p className="text-red-700 dark:text-red-400 mb-4 text-sm">Permanently remove your account and all associated data. This action cannot be undone.</p>
                                <button onClick={() => setShowDeleteModal(true)} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete My Account</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Delete Account</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">Type <strong>DELETE</strong> to confirm:</p>
                        <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => { setShowDeleteModal(false); setConfirmText(''); }} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                            <button onClick={deleteAccount} disabled={confirmText !== 'DELETE'} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">Delete Account</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
