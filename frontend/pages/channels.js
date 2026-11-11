import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';
import {
    Share2, Plus, Facebook, Instagram, MessageCircle,
    Settings, Trash2, Zap, User,
    AlertCircle, CheckCircle2, Clock, X, Loader2,
    ShieldCheck, ArrowRight, Check, Eye, EyeOff, RotateCw
} from 'lucide-react';

import { API_URL as API } from '../utils/apiConfig';
// Backend origin — OAuth popup messages are only trusted from here.
const API_ORIGIN = (() => {
    try { return new URL(API).origin; } catch { return API; }
})();

export default function UserChannels() {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [showToken, setShowToken] = useState(false);
    const [formData, setFormData] = useState({
        type: 'facebook',
        name: '',
        externalId: '',
        accessToken: '',
        mode: 'workflow',
        workflowUrl: '',
        isActive: true
    });

    const [wizardStep, setWizardStep] = useState(1);
    const [availablePages, setAvailablePages] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const popupRef = useRef(null);
    const expectedJtiRef = useRef(null);
    const initiatingUserIdRef = useRef(null);

    useEffect(() => {
        fetchChannels();

        // Listen for OAuth messages from popup.
        // SECURITY: strictly validate origin and require exact event.source === popupRef.current
        const handleOAuthMessage = (event) => {
            if (event.origin !== API_ORIGIN) return;
            if (!popupRef.current || event.source !== popupRef.current) return;
            if (!event.data || typeof event.data !== 'object') return;

            // Only recognize terminal messages
            if (event.data.type !== 'META_AUTH_SUCCESS' && event.data.type !== 'META_AUTH_ERROR') {
                return;
            }

            const popup = popupRef.current;
            popupRef.current = null; // Single-use consumption
            const expectedJti = expectedJtiRef.current;
            expectedJtiRef.current = null;
            const initiatingUserId = initiatingUserIdRef.current;
            initiatingUserIdRef.current = null;

            if (popup && !popup.closed) {
                try { popup.close(); } catch (e) {}
            }
            setIsConnecting(false);

            if (event.data.type === 'META_AUTH_SUCCESS') {
                const token = event.data.accessToken;
                if (!token || typeof token !== 'string') {
                    toast.error('Invalid token received from Meta authorization.');
                    return;
                }
                // Strictly enforce non-empty exact JTI correlation
                if (!event.data.jti || !expectedJti || event.data.jti !== expectedJti) {
                    toast.error('OAuth transaction verification mismatch.');
                    return;
                }
                // Strictly enforce non-empty initiating user correlation
                if (!initiatingUserId || !event.data.userId || String(event.data.userId) !== String(initiatingUserId)) {
                    toast.error('OAuth user mismatch: transaction initiated by another account.');
                    return;
                }
                toast.success('Meta accounts synced successfully!');
                discoverPages(token);
            } else {
                const errorMsg = event.data.error || 'Meta authorization failed. Please try again.';
                toast.error(errorMsg);
            }
        };

        window.addEventListener('message', handleOAuthMessage);
        return () => window.removeEventListener('message', handleOAuthMessage);
    }, []);

    // Close the modal with Escape (overlay click is handled on the backdrop).
    useEffect(() => {
        if (!isModalOpen) return;
        const onKey = (e) => { if (e.key === 'Escape' && !isSaving) setIsModalOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isModalOpen, isSaving]);

    const fetchChannels = async () => {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/channels`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setChannels(data);
            } else if (res.status !== 401) {
                // 401 is handled globally (DashboardLayout redirects to login).
                toast.error('Failed to load channels');
            }
        } catch (error) {
            console.error('Failed to fetch channels:', error);
            toast.error('Failed to load channels');
        } finally {
            setLoading(false);
        }
    };

    const discoverPages = async (token) => {
        setIsConnecting(true);
        try {
            // Meta user token goes in a header so it never lands in URLs/logs.
            const res = await fetch(`${API}/api/auth/meta/discover`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('tc_token')}`,
                    'X-Meta-Token': token
                }
            });
            if (res.ok) {
                const data = await res.json();
                setAvailablePages(data);
                setWizardStep(2); // Move to Account Selection
            } else {
                toast.error('Failed to discover pages from Meta.');
            }
        } catch (error) {
            toast.error('Failed to discover pages');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleMetaLogin = async () => {
        const token = localStorage.getItem('tc_token');
        const storedUser = localStorage.getItem('tc_user');
        let parsedUserId = null;
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                if (parsed?.id) parsedUserId = String(parsed.id);
            } catch (e) {}
        }

        if (!token || !parsedUserId) {
            toast.error('Authentication session is missing. Please log in again.');
            return;
        }

        const width = 600, height = 700;
        const left = (window.innerWidth / 2) - (width / 2);
        const top = (window.innerHeight / 2) - (height / 2);

        // Open placeholder popup synchronously in direct user click event to prevent popup blockers
        const popup = window.open(
            'about:blank',
            'MetaLogin',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
            toast.error('Popup blocked — please allow popups for this site and try again.');
            return;
        }

        popupRef.current = popup;
        initiatingUserIdRef.current = parsedUserId;
        setIsConnecting(true);
        toast('Preparing secure authorization…', { icon: '⏳' });

        try {
            // Obtain a stateless, cryptographically signed state token
            const res = await fetch(`${API}/api/auth/meta/prepare`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                setIsConnecting(false);
                popup.close();
                popupRef.current = null;
                expectedJtiRef.current = null;
                initiatingUserIdRef.current = null;
                toast.error('Failed to initiate Meta authorization.');
                return;
            }

            const data = await res.json();
            expectedJtiRef.current = data.jti || null;
            popup.location.href = `${API}/api/auth/meta/login?state=${encodeURIComponent(data.state)}`;
            toast('Waiting for Meta authorization…', { icon: '⏳' });
        } catch (err) {
            setIsConnecting(false);
            try { popup.close(); } catch (e) {}
            popupRef.current = null;
            expectedJtiRef.current = null;
            initiatingUserIdRef.current = null;
            console.error('Meta login error:', err);
            toast.error('An error occurred while connecting to Meta.');
        }
    };

    const handleSelectMetaAccount = (page) => {
        const isIG = formData.type === 'instagram';

        if (isIG && !page.instagram_business_account) {
            toast.error('This page does not have a linked Instagram Business account.');
            return;
        }

        setFormData({
            ...formData,
            name: isIG ? page.instagram_business_account.name : page.name,
            externalId: isIG ? page.instagram_business_account.id : page.id,
            accessToken: page.access_token
        });
        setWizardStep(3); // Move to final config
    };

    const getChannelIcon = (type, size = 18) => {
        switch (type) {
            case 'facebook':
                return <Facebook size={size} className="text-[#1877F2]" />;
            case 'instagram':
                return <Instagram size={size} className="text-[#E1306C]" />;
            case 'whatsapp':
                return <MessageCircle size={size} className="text-[#25D366]" />;
            default:
                return <Share2 size={size} className="text-primary" />;
        }
    };

    const handleOpenModal = (channel = null, presetType = null) => {
        setWizardStep(1);
        setShowToken(false);
        if (channel) {
            setIsEditing(true);
            setSelectedChannel(channel);
            setFormData({
                type: channel.type,
                name: channel.name,
                externalId: channel.externalId,
                accessToken: '',
                mode: channel.mode || 'workflow',
                workflowUrl: channel.workflowUrl || '',
                isActive: channel.isActive ?? true
            });
            setWizardStep(3); // Skip to config for editing
        } else {
            setIsEditing(false);
            setSelectedChannel(null);
            setFormData({
                type: presetType || 'facebook',
                name: '',
                externalId: '',
                accessToken: '',
                mode: 'workflow',
                workflowUrl: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEditing && !formData.accessToken) {
            toast.error('Access token is required to connect a channel.');
            return;
        }
        const token = localStorage.getItem('tc_token');
        const url = isEditing ? `${API}/api/channels/${selectedChannel.id}` : `${API}/api/channels`;
        const method = isEditing ? 'PATCH' : 'POST';

        setIsSaving(true);
        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success(isEditing ? 'Channel updated successfully' : 'Channel connected successfully');
                setIsModalOpen(false);
                fetchChannels();
            } else {
                toast.error(data.message || 'Failed to save channel');
            }
        } catch (error) {
            toast.error('Connection failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this channel? Active conversation syncing will stop.')) return;
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/channels/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Channel disconnected');
                fetchChannels();
            } else {
                toast.error('Failed to delete channel');
            }
        } catch (error) {
            toast.error('Failed to delete channel');
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Channels">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="animate-spin text-primary" />
                        <p className="text-xs font-semibold text-muted">Loading communication channels...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const platformOptions = [
        {
            id: 'facebook',
            name: 'Facebook Pages',
            tag: 'Messenger & Posts',
            badge: 'Meta Graph API',
            icon: <Facebook size={22} className="text-[#1877F2]" />,
            borderColor: 'border-[#1877F2]/40',
            bgGlow: 'bg-[#1877F2]/5'
        },
        {
            id: 'instagram',
            name: 'Instagram Direct',
            tag: 'Business DMs',
            badge: 'Creator / Business',
            icon: <Instagram size={22} className="text-[#E1306C]" />,
            borderColor: 'border-[#E1306C]/40',
            bgGlow: 'bg-[#E1306C]/5'
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp Cloud',
            tag: 'Customer Chats',
            badge: 'Official Cloud API',
            icon: <MessageCircle size={22} className="text-[#25D366]" />,
            borderColor: 'border-[#25D366]/40',
            bgGlow: 'bg-[#25D366]/5'
        }
    ];

    return (
        <DashboardLayout title="Channels">
            <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
                {/* Header Strip */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                                <Share2 className="text-primary" size={28} />
                                <span>Channel Control</span>
                            </h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-elevated text-secondary border border-border">
                                {channels.length} {channels.length === 1 ? 'Connected' : 'Connected'}
                            </span>
                        </div>
                        <p className="text-xs md:text-sm text-muted mt-1 max-w-2xl">
                            Connect your social accounts and messaging platforms to sync real-time conversations directly into your unified Inbox.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="group inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-button text-xs md:text-sm shadow-xs transition-all"
                    >
                        <Plus size={16} />
                        <span>Connect New Channel</span>
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>

                {/* Info Notice Banner */}
                <div className="bg-surface border border-border/80 rounded-xl p-4 shadow-xs flex items-start gap-3.5 relative overflow-hidden">
                    <div className="w-1 absolute left-0 top-0 bottom-0 bg-primary" />
                    <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0 border border-primary/20 mt-0.5">
                        <Zap size={16} />
                    </div>
                    <div className="text-xs text-secondary leading-relaxed">
                        <span className="font-bold text-foreground">Intelligent Omnichannel Routing: </span>
                        Incoming messages from connected channels can be dispatched to an automated AI workflow (such as n8n or LangChain) or routed directly to human agents inside your Inbox.
                    </div>
                </div>

                {/* Channels Grid / Empty State */}
                {channels.length === 0 ? (
                    <div className="bg-surface rounded-2xl p-10 md:p-14 text-center border border-border shadow-xs max-w-3xl mx-auto">
                        <div className="w-16 h-16 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-xs">
                            <Share2 size={28} />
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">No channels connected yet</h3>
                        <p className="text-xs md:text-sm text-muted max-w-md mx-auto mb-8 leading-relaxed">
                            Pick a platform below to initiate authorization. Once connected, customer inquiries will immediately stream into your workspace.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                            <button
                                onClick={() => handleOpenModal(null, 'facebook')}
                                className="group p-4 bg-surface-elevated/50 hover:bg-surface-elevated rounded-xl border border-border hover:border-[#1877F2]/50 transition-all flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-9 h-9 rounded-lg bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                                        <Facebook size={18} />
                                    </div>
                                    <span className="text-[10px] font-semibold text-[#1877F2] bg-[#1877F2]/10 px-2 py-0.5 rounded-full">
                                        Meta
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Facebook Page</h4>
                                    <p className="text-[11px] text-muted mt-0.5">Messenger & post comments</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleOpenModal(null, 'instagram')}
                                className="group p-4 bg-surface-elevated/50 hover:bg-surface-elevated rounded-xl border border-border hover:border-[#E1306C]/50 transition-all flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-9 h-9 rounded-lg bg-[#E1306C]/10 flex items-center justify-center text-[#E1306C]">
                                        <Instagram size={18} />
                                    </div>
                                    <span className="text-[10px] font-semibold text-[#E1306C] bg-[#E1306C]/10 px-2 py-0.5 rounded-full">
                                        Direct
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Instagram</h4>
                                    <p className="text-[11px] text-muted mt-0.5">Direct messages & stories</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleOpenModal(null, 'whatsapp')}
                                className="group p-4 bg-surface-elevated/50 hover:bg-surface-elevated rounded-xl border border-border hover:border-[#25D366]/50 transition-all flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-9 h-9 rounded-lg bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                                        <MessageCircle size={18} />
                                    </div>
                                    <span className="text-[10px] font-semibold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">
                                        Cloud API
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">WhatsApp</h4>
                                    <p className="text-[11px] text-muted mt-0.5">Official Cloud API integration</p>
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {channels.map((channel) => (
                            <div
                                key={channel.id}
                                className="bg-surface rounded-xl p-5 shadow-xs border border-border hover:border-border-strong hover:shadow-raise transition-all group relative overflow-hidden flex flex-col justify-between"
                            >
                                {/* Top Platform Brand Line */}
                                <div
                                    className={`h-1 absolute top-0 left-0 right-0 ${
                                        channel.type === 'facebook'
                                            ? 'bg-[#1877F2]'
                                            : channel.type === 'instagram'
                                            ? 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]'
                                            : channel.type === 'whatsapp'
                                            ? 'bg-[#25D366]'
                                            : 'bg-primary'
                                    }`}
                                />

                                <div>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-11 h-11 rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            {getChannelIcon(channel.type, 20)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {channel.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-success-soft text-success border border-success/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-elevated text-muted border border-border">
                                                    Paused
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-5">
                                        <h3 className="text-base font-bold text-foreground capitalize truncate">{channel.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-[11px] text-muted font-mono bg-surface-elevated px-2 py-0.5 rounded border border-border/60 truncate max-w-[200px]">
                                                {channel.externalId}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        <div className="p-3 bg-surface-elevated/60 rounded-lg border border-border/70">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-1">Routing</p>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                {channel.mode === 'workflow' ? (
                                                    <>
                                                        <Zap size={13} className="text-primary" />
                                                        <span>AI Workflow</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <User size={13} className="text-info" />
                                                        <span>Human Inbox</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-3 bg-surface-elevated/60 rounded-lg border border-border/70">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-1">Token Status</p>
                                            {channel.hasToken ? (
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                                                    <CheckCircle2 size={13} />
                                                    <span>Verified</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                                                    <AlertCircle size={13} />
                                                    <span>Missing</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                                    <button
                                        onClick={() => handleOpenModal(channel)}
                                        className="flex-1 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-foreground border border-border rounded-button text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Settings size={13} />
                                        <span>Configure</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(channel.id)}
                                        className="p-2 text-muted hover:text-danger hover:bg-danger-soft border border-transparent hover:border-danger/20 rounded-button transition-all"
                                        title="Disconnect channel"
                                        aria-label="Disconnect channel"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Connect / Edit Modal */}
                {isModalOpen && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => { if (!isSaving) setIsModalOpen(false); }}
                    >
                        <div
                            className="bg-surface w-full max-w-xl rounded-2xl border border-border/80 shadow-modal overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-border bg-surface-elevated/50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center border border-border shadow-xs shrink-0">
                                        {getChannelIcon(formData.type, 20)}
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-foreground">
                                            {isEditing ? 'Channel Configuration' :
                                                wizardStep === 1 ? 'Connect Channel' :
                                                wizardStep === 2 ? 'Select Account' : 'Finalize Setup'}
                                        </h2>
                                        <p className="text-xs text-muted mt-0.5">
                                            {isEditing ? 'Update routing options and credentials' :
                                                wizardStep === 1 ? 'Step 1 of 3: Choose platform' :
                                                wizardStep === 2 ? 'Step 2 of 3: Choose account or page' : 'Step 3 of 3: Configure routing'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => { if (!isSaving) setIsModalOpen(false); }}
                                    className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-50"
                                    aria-label="Close modal"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6">
                                {/* Wizard Step 1: Platform Selection */}
                                {wizardStep === 1 && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2.5">
                                                Select Messaging Platform
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {platformOptions.map((plat) => {
                                                    const isSelected = formData.type === plat.id;
                                                    return (
                                                        <button
                                                            key={plat.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, type: plat.id })}
                                                            className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                                                isSelected
                                                                    ? 'border-primary bg-primary-soft/30 ring-2 ring-primary/20 shadow-xs'
                                                                    : 'border-border bg-surface-elevated/40 hover:bg-surface-hover hover:border-border-strong'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 shadow-2xs">
                                                                    {plat.icon}
                                                                </div>
                                                                {isSelected ? (
                                                                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-2xs">
                                                                        <Check size={12} strokeWidth={3} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-5 h-5 rounded-full border border-border/80" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-foreground">{plat.name}</div>
                                                                <div className="text-[11px] text-muted mt-0.5">{plat.tag}</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Platform specific action */}
                                        {formData.type === 'whatsapp' ? (
                                            <div className="p-5 bg-surface-elevated/60 rounded-xl border border-border space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <MessageCircle size={17} className="text-[#25D366]" />
                                                    <h3 className="text-xs font-bold text-foreground">WhatsApp Cloud API Credentials</h3>
                                                </div>
                                                <p className="text-xs text-muted leading-relaxed">
                                                    Enter the credentials provided in your Meta Developer Portal under the WhatsApp Cloud API app settings.
                                                </p>
                                                <div className="space-y-3 pt-1">
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                                                            Phone Number ID
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.externalId}
                                                            onChange={(e) => setFormData({ ...formData, externalId: e.target.value.trim() })}
                                                            className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs text-foreground placeholder:text-muted"
                                                            placeholder="e.g. 109283746592831"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                                                            Permanent Access Token
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showToken ? 'text' : 'password'}
                                                                value={formData.accessToken}
                                                                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value.trim() })}
                                                                className="w-full pl-3.5 pr-10 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs text-foreground placeholder:text-muted"
                                                                placeholder="EAAG..."
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowToken(!showToken)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                                                                aria-label="Toggle token visibility"
                                                            >
                                                                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setWizardStep(3)}
                                                        disabled={!formData.externalId || !formData.accessToken}
                                                        className="w-full mt-2 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-button text-xs transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        <span>Continue to Configuration</span>
                                                        <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-surface-elevated/40 rounded-xl border border-border text-center space-y-4">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-soft text-primary border border-primary/20">
                                                    <ShieldCheck size={14} />
                                                    <span>Official Meta Graph API Integration</span>
                                                </div>

                                                <div className="max-w-sm mx-auto">
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        Connect {formData.type === 'facebook' ? 'Facebook Pages' : 'Instagram Business'}
                                                    </h3>
                                                    <p className="text-xs text-muted mt-1 leading-relaxed">
                                                        Click below to open Meta's secure authorization popup. TargetChat will automatically discover your verified accounts.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleMetaLogin}
                                                    disabled={isConnecting}
                                                    className="w-full max-w-sm mx-auto py-3 px-5 bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1464cc] text-white font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2.5 text-xs md:text-sm disabled:opacity-60"
                                                >
                                                    {isConnecting ? (
                                                        <>
                                                            <Loader2 size={16} className="animate-spin" />
                                                            <span>Connecting to Meta...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Facebook size={18} />
                                                            <span>Connect Meta Account</span>
                                                            <ArrowRight size={14} />
                                                        </>
                                                    )}
                                                </button>

                                                {isConnecting && (
                                                    <p className="text-[11px] text-muted animate-pulse">
                                                        Complete the permissions inside the Meta popup window...
                                                    </p>
                                                )}

                                                <div className="pt-2 text-[11px] text-muted flex items-center justify-center gap-4">
                                                    <span>✓ Encrypted tokens</span>
                                                    <span>✓ Instant webhook sync</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Wizard Step 2: Account Selection */}
                                {wizardStep === 2 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">
                                                    Select {formData.type === 'facebook' ? 'Facebook Page' : 'Instagram Account'}
                                                </h3>
                                                <p className="text-xs text-muted mt-0.5">
                                                    Choose the account you want to link to TargetChat
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleMetaLogin}
                                                disabled={isConnecting}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                                            >
                                                <RotateCw size={12} className={isConnecting ? 'animate-spin' : ''} />
                                                <span>Resync</span>
                                            </button>
                                        </div>

                                        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {availablePages.map((page) => {
                                                const isIG = formData.type === 'instagram';
                                                const accountName = isIG
                                                    ? page.instagram_business_account?.name || page.instagram_business_account?.username
                                                    : page.name;
                                                const accountId = isIG ? page.instagram_business_account?.id : page.id;
                                                const avatarUrl = isIG
                                                    ? page.instagram_business_account?.profile_picture_url
                                                    : page.picture?.data?.url;

                                                return (
                                                    <button
                                                        key={page.id}
                                                        type="button"
                                                        onClick={() => handleSelectMetaAccount(page)}
                                                        className="w-full flex items-center justify-between p-3.5 bg-surface-elevated/60 hover:bg-primary-soft/30 rounded-xl transition-all border border-border hover:border-primary/40 text-left group"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {avatarUrl ? (
                                                                <img
                                                                    src={avatarUrl}
                                                                    className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                                                                    alt={accountName || 'Account'}
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                                                                    {accountName ? accountName.substring(0, 2).toUpperCase() : 'AC'}
                                                                </div>
                                                            )}
                                                            <div className="truncate">
                                                                <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                                                                    {accountName || 'Unnamed Account'}
                                                                </p>
                                                                <p className="text-[11px] text-muted font-mono truncate mt-0.5">
                                                                    ID: {accountId}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                            <span>Connect</span>
                                                            <ArrowRight size={13} />
                                                        </span>
                                                    </button>
                                                );
                                            })}

                                            {availablePages.length === 0 && (
                                                <div className="text-center py-8 bg-surface-elevated/40 rounded-xl border border-dashed border-border">
                                                    <Clock className="mx-auto text-muted mb-2" size={24} />
                                                    <p className="text-xs font-semibold text-foreground">No accounts found</p>
                                                    <p className="text-[11px] text-muted mt-1 max-w-xs mx-auto">
                                                        Ensure your Meta account has Admin access to at least one Facebook Page or Instagram Business Account.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-border/60">
                                            <button
                                                type="button"
                                                onClick={() => setWizardStep(1)}
                                                className="text-xs font-semibold text-muted hover:text-foreground transition-colors"
                                            >
                                                ← Back to Platform Selection
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Wizard Step 3: Final Configuration */}
                                {wizardStep === 3 && (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Linked Account Banner */}
                                        <div className="p-3.5 bg-surface-elevated/60 rounded-xl border border-border flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center border border-border shrink-0">
                                                    {getChannelIcon(formData.type, 18)}
                                                </div>
                                                <div className="truncate">
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                                        Linked Account
                                                    </span>
                                                    <h4 className="font-bold text-xs text-foreground truncate">{formData.name || 'Custom Channel'}</h4>
                                                </div>
                                            </div>
                                            {!isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardStep(1)}
                                                    className="text-[11px] font-semibold text-primary hover:underline shrink-0"
                                                >
                                                    Change
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                                                    Internal Display Name
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground font-medium"
                                                    placeholder="e.g. Main Support Page"
                                                />
                                            </div>

                                            {/* Routing Mode Selector */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                                                    Routing Strategy
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, mode: 'workflow' })}
                                                        className={`p-3 rounded-xl border text-left transition-all ${
                                                            formData.mode === 'workflow'
                                                                ? 'border-primary bg-primary-soft/30 ring-1 ring-primary/30 text-foreground'
                                                                : 'border-border bg-surface-elevated/40 hover:bg-surface-hover text-muted'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground mb-1">
                                                            <Zap size={14} className="text-primary" />
                                                            <span>AI Workflow</span>
                                                        </div>
                                                        <p className="text-[10px] text-muted leading-tight">
                                                            Forward chats to n8n AI webhook or custom automation
                                                        </p>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, mode: 'human' })}
                                                        className={`p-3 rounded-xl border text-left transition-all ${
                                                            formData.mode === 'human'
                                                                ? 'border-primary bg-primary-soft/30 ring-1 ring-primary/30 text-foreground'
                                                                : 'border-border bg-surface-elevated/40 hover:bg-surface-hover text-muted'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground mb-1">
                                                            <User size={14} className="text-info" />
                                                            <span>Human Inbox</span>
                                                        </div>
                                                        <p className="text-[10px] text-muted leading-tight">
                                                            Route directly to human agents in Inbox
                                                        </p>
                                                    </button>
                                                </div>
                                            </div>

                                            {formData.mode === 'workflow' && (
                                                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                                                        External Workflow Webhook URL
                                                    </label>
                                                    <input
                                                        type="url"
                                                        value={formData.workflowUrl}
                                                        onChange={(e) => setFormData({ ...formData, workflowUrl: e.target.value })}
                                                        placeholder="https://n8n.u-axis.com/webhook/..."
                                                        className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground font-mono"
                                                    />
                                                </div>
                                            )}

                                            {/* Live Status Toggle */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                                                    Live Status
                                                </label>
                                                <div className="flex items-center justify-between p-3 bg-surface-elevated/40 border border-border rounded-xl">
                                                    <div>
                                                        <div className="text-xs font-bold text-foreground">
                                                            {formData.isActive ? 'Active & Receiving Messages' : 'Paused / Inactive'}
                                                        </div>
                                                        <div className="text-[11px] text-muted mt-0.5">
                                                            {formData.isActive
                                                                ? 'Webhooks will process and store incoming chats'
                                                                : 'Incoming events will be temporarily suspended'}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                                                            formData.isActive ? 'bg-success' : 'bg-surface-elevated border border-border'
                                                        }`}
                                                        aria-label="Toggle active status"
                                                    >
                                                        <div
                                                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                                                formData.isActive ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Token field */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                                                        Access Token {isEditing && <span className="normal-case font-normal text-muted">(blank = keep current)</span>}
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowToken(!showToken)}
                                                        className="text-[11px] text-muted hover:text-foreground flex items-center gap-1"
                                                    >
                                                        {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
                                                        <span>{showToken ? 'Hide' : 'Show'}</span>
                                                    </button>
                                                </div>
                                                <input
                                                    type={showToken ? 'text' : 'password'}
                                                    value={formData.accessToken}
                                                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                                    required={!isEditing}
                                                    placeholder={isEditing ? '•••••••• (unchanged)' : 'Paste permanent access token'}
                                                    autoComplete="off"
                                                    className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground font-mono"
                                                />
                                                {isEditing && !formData.accessToken && (
                                                    <p className="text-[11px] text-muted mt-1">
                                                        {selectedChannel?.hasToken ? '✓ A token is securely configured for this channel.' : '⚠️ No token configured — messaging will fail until provided.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Form Actions */}
                                        <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border/60">
                                            <button
                                                type="button"
                                                onClick={() => setIsModalOpen(false)}
                                                disabled={isSaving}
                                                className="px-4 py-2 bg-surface hover:bg-surface-hover text-secondary hover:text-foreground border border-border rounded-button text-xs font-semibold transition-all disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="px-5 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-button text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-60"
                                            >
                                                {isSaving && <Loader2 size={14} className="animate-spin" />}
                                                <span>{isEditing ? 'Save Changes' : 'Finish & Connect'}</span>
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
