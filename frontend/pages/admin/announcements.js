import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { toast } from 'react-hot-toast';
import { Megaphone, Send, Clock, CheckCircle, AlertCircle, RefreshCw, Mail } from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

export default function AdminAnnouncements() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        audience: 'all', // all, active, inactive
        testEmail: ''
    });

    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/announcements/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setHistory(await res.json());
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendClick = (isTest = false) => {
        if (!formData.subject || !formData.message) {
            toast.error('Subject and message are required');
            return;
        }

        if (isTest) {
            if (!formData.testEmail) {
                toast.error('Enter a test email address');
                return;
            }
            // Send test email directly
            executeSend(true);
        } else {
            // Open confirmation modal for broadcast
            setShowConfirmModal(true);
        }
    };

    const executeSend = async (isTest = false) => {
        try {
            setSending(true);
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/announcements/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    testEmail: isTest ? formData.testEmail : undefined
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                if (!isTest) {
                    setFormData({ ...formData, subject: '', message: '' });
                    fetchHistory();
                }
            } else {
                toast.error(data.message || 'Failed to send');
            }
        } catch (error) {
            console.error('Error sending:', error);
            // Show the actual error message if available, otherwise generic
            toast.error(error.message || 'Connection failed');
        } finally {
            setSending(false);
            if (!isTest) setShowConfirmModal(false);
        }
    };

    return (
        <AdminLayout title="Announcements Center">
            <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Megaphone size={18} />
                            Announcements Center
                        </h1>
                        <p className="text-muted mt-2">
                            Broadcast updates, news, and offers to your user base.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Composer */}
                    <div className="lg:col-span-2">
                        <div className="bg-surface border border-border p-8 rounded-xl shadow-sm">
                            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                <Send size={18} />
                                Compose Email
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-2">Subject Line</label>
                                    <input
                                        type="text"
                                        className="w-full p-3.5 bg-surface-elevated border border-border rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-foreground font-medium shadow-sm placeholder:text-muted"
                                        placeholder="e.g. Big Update: New Features Added!"
                                        value={formData.subject}
                                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-2">Message (HTML Supported)</label>
                                    <textarea
                                        className="w-full p-4 h-64 bg-surface-elevated border border-border rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-foreground font-mono text-sm shadow-sm placeholder:text-muted"
                                        placeholder="<h1>Hello!</h1><p>We have some news...</p>"
                                        value={formData.message}
                                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    />
                                    <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
                                        <span className="font-semibold bg-surface-elevated border border-border px-1.5 py-0.5 rounded text-secondary">Tip:</span>
                                        Basic HTML tags allowed. Use <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono">{`{{name}}`}</code> to insert user's name.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-elevated p-6 rounded-xl border border-border">
                                    <div>
                                        <label className="block text-sm font-semibold text-secondary mb-2">Audience</label>
                                        <select
                                            className="w-full p-3 bg-surface border border-border rounded-xl outline-none text-foreground cursor-pointer focus:border-primary"
                                            value={formData.audience}
                                            onChange={e => setFormData({ ...formData, audience: e.target.value })}
                                        >
                                            <option value="all">All Users</option>
                                            <option value="active">Active Users Only</option>
                                            <option value="inactive">Inactive Users Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-secondary mb-2">Send Test To</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                className="w-full p-3 bg-surface border border-border rounded-xl outline-none text-foreground placeholder:text-muted focus:border-primary"
                                                placeholder="me@example.com"
                                                value={formData.testEmail}
                                                onChange={e => setFormData({ ...formData, testEmail: e.target.value })}
                                            />
                                            <button
                                                onClick={() => handleSendClick(true)}
                                                disabled={sending}
                                                className="px-4 py-2 bg-surface hover:bg-surface-hover text-foreground border border-border rounded-xl transition-colors font-medium whitespace-nowrap disabled:opacity-50"
                                            >
                                                Test
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={() => handleSendClick(false)}
                                        disabled={sending}
                                        className={`w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2.5 ${sending ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {sending ? (
                                            <>
                                                <RefreshCw size={18} className="animate-spin" /> Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} /> Send Broadcast
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / History */}
                    <div className="space-y-6">
                        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm h-full max-h-[800px] flex flex-col">
                            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                                <Clock size={18} />
                                Recent History
                            </h3>
                            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-muted">
                                        <RefreshCw className="animate-spin mb-2" />
                                        <span className="text-sm">Loading history...</span>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-muted text-center">
                                        <Mail size={18} className="mb-2 opacity-30" />
                                        <span className="text-sm">No announcements sent yet.</span>
                                    </div>
                                ) : (
                                    history.map(log => (
                                        <div key={log.id} className="p-4 bg-surface-elevated rounded-xl border border-border hover:bg-surface-hover transition-colors shadow-sm text-left">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full flex items-center gap-1 ${log.status === 'sent' || log.status === 'delivered'
                                                    ? 'bg-success/10 text-success'
                                                    : log.status === 'failed'
                                                        ? 'bg-danger/10 text-danger'
                                                        : 'bg-primary/10 text-primary'
                                                    }`}>
                                                    {log.status === 'sent' && <CheckCircle size={10} />}
                                                    {log.status === 'failed' && <AlertCircle size={10} />}
                                                    {log.status}
                                                </span>
                                                <span className="text-xs text-muted">{new Date(log.createdAt || log.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{log.subject}</p>
                                            <p className="text-xs text-muted truncate mt-1">
                                                <span className="font-medium text-secondary">To:</span> {log.recipientEmail}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <ConfirmationModal
                    isOpen={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    onConfirm={() => executeSend(false)}
                    title="Send Broadcast?"
                    message={`You are about to send this announcement to ${formData.audience.toUpperCase()} users. This action cannot be undone.`}
                    confirmText="Send Now"
                    isDangerous={false} // Use primary color, not red
                />
            </div>
        </AdminLayout>
    );
}
