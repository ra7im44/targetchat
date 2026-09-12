import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';
import {
    Share2, Plus, Facebook, Instagram, MessageCircle,
    Settings, Trash2, Zap, User,
    AlertCircle, CheckCircle2, Clock, X, Loader2
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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

    useEffect(() => {
        fetchChannels();

        // Listen for OAuth messages from popup.
        // SECURITY: only accept messages posted by our own backend origin —
        // any embedded iframe could otherwise inject a forged token.
        const handleOAuthMessage = (event) => {
            if (event.origin !== API_ORIGIN) return;
            if (event.data.type === 'META_AUTH_SUCCESS') {
                const token = event.data.accessToken;
                toast.success('Meta accounts synced!');
                discoverPages(token);
            } else if (event.data.type === 'META_AUTH_ERROR') {
                setIsConnecting(false);
                toast.error(`Auth failed: ${event.data.error}`);
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

    const handleMetaLogin = () => {
        const width = 600, height = 700;
        const left = (window.innerWidth / 2) - (width / 2);
        const top = (window.innerHeight / 2) - (height / 2);

        const popup = window.open(
            `${API}/api/auth/meta/login?token=${localStorage.getItem('tc_token')}`,
            'MetaLogin',
            `width=${width},height=${height},left=${left},top=${top}`
        );
        if (!popup) {
            toast.error('Popup blocked — please allow popups for this site and try again.');
            return;
        }
        setIsConnecting(true);
        toast('Waiting for Meta authorization…', { icon: '⏳' });
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

    const getChannelIcon = (type) => {
        switch (type) {
            case 'facebook': return <Facebook className="text-blue-600" />;
            case 'instagram': return <Instagram className="text-pink-600" />;
            case 'whatsapp': return <MessageCircle className="text-green-600" />;
            default: return <Share2 />;
        }
    };

    const handleOpenModal = (channel = null, presetType = null) => {
        setWizardStep(1);
        if (channel) {
            setIsEditing(true);
            setSelectedChannel(channel);
            setFormData({
                type: channel.type,
                name: channel.name,
                externalId: channel.externalId,
                // The API never returns tokens — blank means "keep current".
                accessToken: '',
                mode: channel.mode,
                workflowUrl: channel.workflowUrl || '',
                isActive: channel.isActive
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
        // A new channel is useless without credentials — stop early with a
        // clear message instead of a raw server error.
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
                toast.success(isEditing ? 'Channel updated' : 'Channel connected');
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
        if (!confirm('Are you sure you want to delete this channel?')) return;
        const token = localStorage.getItem('tc_token');
        try {
            const res = await fetch(`${API}/api/channels/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Channel deleted');
                fetchChannels();
            }
        } catch (error) {
            toast.error('Failed to delete channel');
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout title="Channels">
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            <Share2 className="text-blue-600" size={32} />
                            Channel Control
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Connect your social accounts to sync conversations into your Inbox.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 font-sans"
                    >
                        <Plus size={20} />
                        Connect New Channel
                    </button>
                </div>

                {/* Info Alert */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-semibold">Automated Routing</p>
                        <p>Incoming messages from these channels will follow your workflow settings or appear directly in your Inbox.</p>
                    </div>
                </div>

                {/* Channels Grid */}
                {channels.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Share2 className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Channels Connected</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                            Select a platform below to start receiving messages on TargetChat.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <button onClick={() => handleOpenModal(null, 'facebook')} className="flex items-center gap-2 px-4 py-2.5 bg-[#1877F2] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-sm">
                                <Facebook size={18} /> Connect Facebook
                            </button>
                            <button onClick={() => handleOpenModal(null, 'instagram')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-sm">
                                <Instagram size={18} /> Connect Instagram
                            </button>
                            <button onClick={() => handleOpenModal(null, 'whatsapp')} className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-sm">
                                <MessageCircle size={18} /> Connect WhatsApp
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {channels.map(channel => (
                            <div key={channel.id} className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group relative overflow-hidden">
                                {/* Platform Branding Bar */}
                                <div className={`h-1.5 absolute top-0 left-0 right-0 ${channel.type === 'facebook' ? 'bg-blue-600' :
                                    channel.type === 'instagram' ? 'bg-pink-600' :
                                        channel.type === 'whatsapp' ? 'bg-green-600' : 'bg-gray-400'
                                    }`} />

                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                        {getChannelIcon(channel.type)}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${channel.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700'}`}>
                                        {channel.isActive ? 'Active' : 'Paused'}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{channel.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{channel.externalId}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 font-sans">Routing</p>
                                        <div className="flex items-center gap-1.5 font-bold text-sm text-blue-600">
                                            {channel.mode === 'workflow' ? <Zap size={14} /> : <User size={14} />}
                                            <span className="capitalize">{channel.mode}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 font-sans">Token</p>
                                        {channel.hasToken ? (
                                            <div className="flex items-center gap-1.5 font-bold text-sm text-green-600">
                                                <CheckCircle2 size={14} />
                                                <span>Configured</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 font-bold text-sm text-amber-600">
                                                <AlertCircle size={14} />
                                                <span>Missing</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenModal(channel)}
                                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 outline-none"
                                    >
                                        <Settings size={14} /> Configure
                                    </button>
                                    <button
                                        onClick={() => handleDelete(channel.id)}
                                        className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-red-500 dark:hover:bg-red-500 hover:text-white rounded-xl transition-all outline-none"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => { if (!isSaving) setIsModalOpen(false); }}
                    >
                        <div
                            className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                                        {getChannelIcon(formData.type)}
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {isEditing ? 'Channel Settings' :
                                            wizardStep === 1 ? 'Select Platform' :
                                                wizardStep === 2 ? 'Choose Account' : 'Configuration'}
                                    </h2>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Close">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6">
                                {wizardStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'facebook', icon: <Facebook size={18} />, label: 'Facebook', color: 'hover:bg-blue-600 hover:text-white' },
                                                { id: 'instagram', icon: <Instagram size={18} />, label: 'Instagram', color: 'hover:bg-pink-600 hover:text-white' },
                                                { id: 'whatsapp', icon: <MessageCircle size={18} />, label: 'WhatsApp', color: 'hover:bg-green-600 hover:text-white' }
                                            ].map(plat => (
                                                <button
                                                    key={plat.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: plat.id })}
                                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${formData.type === plat.id
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 ' + plat.color
                                                        }`}
                                                >
                                                    {plat.icon}
                                                    <span className="text-[10px] font-bold uppercase">{plat.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {formData.type === 'whatsapp' ? (
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">Enter your WhatsApp Cloud API details to continue.</p>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone Number ID</label>
                                                        <input
                                                            type="text"
                                                            value={formData.externalId}
                                                            onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                                            placeholder="e.g. 1092837465"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Permanent Access Token</label>
                                                        <input
                                                            type="password"
                                                            value={formData.accessToken}
                                                            onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                                            placeholder="EAAG...."
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => setWizardStep(3)}
                                                        disabled={!formData.externalId || !formData.accessToken}
                                                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        Continue
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-4">
                                                <p className="text-sm text-gray-500">Connect your Meta account to select your Page or Instagram account.</p>
                                                <button
                                                    onClick={handleMetaLogin}
                                                    disabled={isConnecting}
                                                    className="w-full py-4 bg-[#1877F2] text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
                                                >
                                                    {isConnecting ? (
                                                        <><Loader2 size={24} className="animate-spin" /> Waiting for Meta…</>
                                                    ) : (
                                                        <><Facebook size={24} /> Connect Meta Account</>
                                                    )}
                                                </button>
                                                {isConnecting && (
                                                    <p className="text-xs text-gray-400">Complete the authorization in the popup — your accounts will appear here automatically.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {wizardStep === 2 && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-500 mb-4">Select the {formData.type === 'facebook' ? 'Facebook Page' : 'Instagram account'} you want to connect:</p>
                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                            {availablePages.map(page => (
                                                <button
                                                    key={page.id}
                                                    onClick={() => handleSelectMetaAccount(page)}
                                                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-2xl transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                                                >
                                                    <div className="flex items-center gap-3 text-left">
                                                        <img
                                                            src={formData.type === 'instagram' ? page.instagram_business_account?.profile_picture_url : page.picture?.data?.url}
                                                            className="w-10 h-10 rounded-xl"
                                                            alt={page.name}
                                                        />
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-900 dark:text-white">
                                                                {formData.type === 'instagram' ? (page.instagram_business_account?.name || page.instagram_business_account?.username) : page.name}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                                                                {formData.type === 'instagram' ? `@${page.instagram_business_account?.username}` : `ID: ${page.id}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <CheckCircle2 className="text-blue-500 opacity-0 group-hover:opacity-100" size={18} />
                                                </button>
                                            ))}
                                            {availablePages.length === 0 && (
                                                <div className="text-center py-8">
                                                    <Clock className="mx-auto text-gray-300 mb-2" size={32} />
                                                    <p className="text-sm text-gray-500">No available pages found.</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <button onClick={() => setWizardStep(1)} className="text-xs font-bold text-blue-600 uppercase hover:underline">← Change Platform</button>
                                            <button onClick={handleMetaLogin} disabled={isConnecting} className="text-xs font-bold text-gray-500 uppercase hover:text-blue-600 hover:underline disabled:opacity-50 flex items-center gap-1">
                                                {isConnecting ? <Loader2 size={12} className="animate-spin" /> : null}
                                                Resync Accounts
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 3 && (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                                                {getChannelIcon(formData.type)}
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Linked Account</p>
                                                <h4 className="font-bold text-gray-900 dark:text-white">{formData.name}</h4>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Internal Display Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-sans"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Routing Mode</label>
                                                    <select
                                                        value={formData.mode}
                                                        onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                                    >
                                                        <option value="workflow">AI Workflow</option>
                                                        <option value="human">Human Only</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Live Status</label>
                                                    <select
                                                        value={formData.isActive ? 'true' : 'false'}
                                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                                    >
                                                        <option value="true">Live ON ✅</option>
                                                        <option value="false">Live OFF ❌</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {formData.mode === 'workflow' && (
                                                <div className="animate-in fade-in slide-in-from-top-2">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">External Workflow URL</label>
                                                    <input
                                                        type="url"
                                                        value={formData.workflowUrl}
                                                        onChange={(e) => setFormData({ ...formData, workflowUrl: e.target.value })}
                                                        placeholder="https://n8n.yourdomain.com/webhook/..."
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                    Access Token {isEditing && <span className="normal-case font-medium text-gray-400">(leave blank to keep current)</span>}
                                                </label>
                                                <input
                                                    type="password"
                                                    value={formData.accessToken}
                                                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                                    required={!isEditing}
                                                    placeholder={isEditing ? '•••••••• (unchanged)' : 'Paste the access token'}
                                                    autoComplete="off"
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-mono text-sm"
                                                />
                                                {isEditing && !formData.accessToken && (
                                                    <p className="text-xs text-gray-400 mt-1.5">
                                                        {selectedChannel?.hasToken ? 'A token is already configured for this channel.' : 'No token configured — messaging will fail until you set one.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsModalOpen(false)}
                                                disabled={isSaving}
                                                className="flex-1 px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-sans disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="flex-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
                                            >
                                                {isSaving && <Loader2 size={18} className="animate-spin" />}
                                                {isEditing ? 'Save Changes' : 'Finish Setup'}
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
