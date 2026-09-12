import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import {
    Settings, Save, Globe, Database, Mail,
    Plug, Cpu, Shield, AlertTriangle, Eye, EyeOff,
    RefreshCw, CheckCircle2, Lock, Sliders, Share2
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

export default function AdminSettings() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [activeSection, setActiveSection] = useState('general');
    const [showPasswords, setShowPasswords] = useState({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                const sections = Object.keys(data);
                if (sections.length > 0) {
                    setActiveSection(prev => (sections.includes(prev) ? prev : sections[0]));
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(`Error ${res.status}: ${errData.message || 'Failed to load settings'}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to connect to backend');
        } finally {
            setLoading(false);
        }
    };

    const handleSeedDefaults = async () => {
        try {
            setIsSeeding(true);
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/settings/seed-defaults`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Default settings initialized successfully!');
                await fetchSettings();
            } else {
                toast.error('Failed to seed default settings');
            }
        } catch (error) {
            console.error(error);
            toast.error('Network error seeding settings');
        } finally {
            setIsSeeding(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData(e.target);
        const updates = Object.fromEntries(formData.entries());

        // Ensure boolean fields in the active section are explicitly sent as 'true' or 'false'
        const currentItems = settings[activeSection] || [];
        currentItems.forEach(item => {
            if (item.type === 'boolean') {
                updates[item.key] = formData.has(item.key) ? 'true' : 'false';
            }
        });

        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                toast.success('Settings saved successfully!');
                // Update local state without full reload
                setSettings(prev => ({
                    ...prev,
                    [activeSection]: prev[activeSection]?.map(s =>
                        updates[s.key] !== undefined ? { ...s, value: updates[s.key] } : s
                    )
                }));
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.message || 'Failed to update settings');
            }
        } catch (error) {
            console.error(error);
            toast.error('Server error saving settings');
        } finally {
            setIsSaving(false);
        }
    };

    const togglePasswordVisibility = (key) => {
        setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const formatSettingLabel = (key) => {
        return String(key || '')
            .replace(/[_-]+/g, ' ')
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const getSectionIcon = (section) => {
        switch (section) {
            case 'general': return Globe;
            case 'ai': return Cpu;
            case 'features': return Plug;
            case 'payment': return Shield;
            case 'email': return Mail;
            case 'integrations': return Share2;
            case 'security': return Lock;
            case 'database': return Database;
            case 'system': return Sliders;
            default: return Settings;
        }
    };

    const sectionDescriptions = {
        general: 'Brand identity, public application URLs, and global configuration.',
        ai: 'AI providers, model parameters, thinking state, and n8n webhook routing.',
        features: 'Enable or disable core platform capabilities like file uploads and audio.',
        payment: 'PayPal API integration, live/sandbox mode, and mock billing testing.',
        email: 'SMTP server credentials, service providers, and default sender addresses.',
        integrations: 'Meta, Facebook, WhatsApp Business, and external partner credentials.',
        security: 'Login attempt thresholds, JWT session expiration, and signed media URLs.',
        system: 'System maintenance mode, diagnostic flags, and platform health switches.'
    };

    const sectionOrder = ['general', 'ai', 'features', 'payment', 'email', 'integrations', 'security', 'system', 'database'];
    const sortedSections = Object.entries(settings).sort(([a], [b]) => {
        const indexA = sectionOrder.indexOf(a);
        const indexB = sectionOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <AdminLayout title="System Settings">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            <Settings className="text-blue-600" size={32} />
                            System Settings
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Configure global application preferences, intelligence routing, and API connections.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSeedDefaults}
                            disabled={isSeeding || loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all text-sm"
                            title="Reload or reset defaults"
                        >
                            <RefreshCw size={16} className={isSeeding ? 'animate-spin' : ''} />
                            {isSeeding ? 'Syncing...' : 'Reset Defaults'}
                        </button>

                        <button
                            form="settings-form"
                            type="submit"
                            disabled={isSaving || loading || sortedSections.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 text-sm"
                        >
                            {isSaving ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[350px] bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm font-medium">Loading system settings...</p>
                    </div>
                ) : sortedSections.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Settings size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No System Settings Configured</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6 text-sm">
                            The database settings table is currently empty. Click below to initialize all standard platform settings.
                        </p>
                        <button
                            onClick={handleSeedDefaults}
                            disabled={isSeeding}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md inline-flex items-center gap-2 text-sm"
                        >
                            <RefreshCw size={18} className={isSeeding ? 'animate-spin' : ''} />
                            {isSeeding ? 'Initializing...' : 'Initialize Default Settings'}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Sidebar Tabs */}
                        <div className="space-y-2">
                            {sortedSections.map(([section, items]) => {
                                const Icon = getSectionIcon(section);
                                const isCurrent = activeSection === section;
                                return (
                                    <button
                                        key={section}
                                        type="button"
                                        onClick={() => setActiveSection(section)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-medium text-left ${isCurrent
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={18} className={isCurrent ? 'text-white' : 'text-gray-400 dark:text-gray-500'} />
                                            <span className="capitalize text-sm font-semibold">{section}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${isCurrent
                                            ? 'bg-blue-700/60 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                            }`}>
                                            {items.length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Main Form Area */}
                        <div className="lg:col-span-3">
                            <form
                                id="settings-form"
                                onSubmit={handleUpdate}
                                className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700"
                            >
                                <div className="mb-8 border-b border-gray-100 dark:border-gray-700 pb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                                            {React.createElement(getSectionIcon(activeSection), { size: 22 })}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                                                {activeSection} Settings
                                            </h2>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {sectionDescriptions[activeSection] || 'Configure section properties and operational settings.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {settings[activeSection]?.map((setting) => (
                                        <div
                                            key={setting.key}
                                            className="p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/80 transition-all hover:border-gray-200 dark:hover:border-gray-700"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    {formatSettingLabel(setting.key)}
                                                </label>
                                                <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${setting.isPublic
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {setting.isPublic ? 'Public' : 'Server Only'}
                                                </span>
                                            </div>

                                            {setting.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                    {setting.description}
                                                </p>
                                            )}

                                            {setting.type === 'boolean' ? (
                                                <div className="flex items-center gap-3 pt-1">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            name={setting.key}
                                                            defaultChecked={setting.value === 'true' || setting.value === '1'}
                                                            value="true"
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                    </label>
                                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                        Enabled
                                                    </span>
                                                </div>
                                            ) : setting.type === 'textarea' ? (
                                                <textarea
                                                    name={setting.key}
                                                    defaultValue={setting.value || ''}
                                                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-mono text-gray-800 dark:text-gray-200"
                                                    rows={4}
                                                />
                                            ) : setting.type === 'password' || setting.key.toLowerCase().includes('secret') || setting.key.toLowerCase().includes('pass') ? (
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords[setting.key] ? 'text' : 'password'}
                                                        name={setting.key}
                                                        defaultValue={setting.value || ''}
                                                        placeholder={`Enter ${setting.key.toLowerCase().replace(/_/g, ' ')}...`}
                                                        className="w-full pl-4 pr-11 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-gray-800 dark:text-gray-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePasswordVisibility(setting.key)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                    >
                                                        {showPasswords[setting.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <input
                                                    type={setting.type === 'number' ? 'number' : 'text'}
                                                    name={setting.key}
                                                    defaultValue={setting.value || ''}
                                                    placeholder={`Enter ${setting.key.toLowerCase().replace(/_/g, ' ')}...`}
                                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-gray-800 dark:text-gray-200"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
