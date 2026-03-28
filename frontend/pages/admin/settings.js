import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import {
    Settings, Save, Globe, Database, Mail,
    Plug, Cpu, Shield, AlertTriangle, Facebook, Instagram
} from 'lucide-react';

import { API_URL as API } from '../../utils/apiConfig';

export default function AdminSettings() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('general');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('tc_token');
            const res = await fetch(`${API}/api/admin/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                console.log('[DEBUG] Settings received:', data);
                setSettings(data);
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error('[DEBUG] Settings fetch failed:', res.status, errData);
                toast.error(`Error ${res.status}: ${errData.message || 'Failed to load settings'}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updates = Object.fromEntries(formData.entries());

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
                toast.success('Settings updated successfully');
            } else {
                toast.error('Failed to update settings');
            }
        } catch (error) {
            toast.error('Server error');
        }
    };

    // Helper to get section icon
    const getSectionIcon = (section) => {
        switch (section) {
            case 'general': return Globe;
            case 'ai': return Cpu;
            case 'meta': return Facebook; // Add Facebook from lucide if available, or Settings
            case 'features': return Plug;
            case 'email': return Mail;
            case 'integrations': return Plug;
            case 'database': return Database;
            case 'payment': return Shield;
            case 'system': return AlertTriangle;
            default: return Settings;
        }
    };

    const sectionOrder = ['general', 'ai', 'features', 'payment', 'email', 'email_features', 'integrations', 'database', 'system'];
    const sortedSections = Object.entries(settings).sort(([a], [b]) => {
        const indexA = sectionOrder.indexOf(a);
        const indexB = sectionOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;

    return (
        <AdminLayout title="Settings">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                            <Settings className="text-blue-600" size={32} />
                            System Settings
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Configure global application preferences and connections.
                        </p>
                    </div>
                    <button
                        form="settings-form"
                        type="submit"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
                    >
                        <Save size={20} />
                        Save Changes
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Tabs */}
                    <div className="space-y-2">
                        {sortedSections.map(([section]) => {
                            const Icon = getSectionIcon(section);
                            return (
                                <button
                                    key={section}
                                    onClick={() => setActiveSection(section)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${activeSection === section
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-gray-100 dark:ring-gray-700'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="capitalize">{section}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Form Area */}
                    <div className="lg:col-span-3">
                        <form id="settings-form" onSubmit={handleUpdate} className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 animate-fadeIn">

                            <div className="mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                                    {React.createElement(getSectionIcon(activeSection), { size: 24, className: "text-blue-500" })}
                                    {activeSection} Settings
                                </h2>
                            </div>

                            <div className="space-y-6">
                                {settings[activeSection]?.map((setting) => (
                                    <div key={setting.key} className="grid gap-2">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {setting.key.replace(/_/g, ' ').toUpperCase()}
                                        </label>

                                        {setting.type === 'boolean' ? (
                                            <div className="flex items-center gap-3">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name={setting.key}
                                                        defaultChecked={setting.value === 'true'}
                                                        value="true"
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                </label>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {setting.description || 'Enable or disable this feature'}
                                                </span>
                                            </div>
                                        ) : setting.type === 'textarea' ? (
                                            <textarea
                                                name={setting.key}
                                                defaultValue={setting.value}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                rows={4}
                                            />
                                        ) : (
                                            <div>
                                                <input
                                                    type={setting.key.includes('password') || setting.key.includes('secret') ? 'password' : 'text'}
                                                    name={setting.key}
                                                    defaultValue={setting.value}
                                                    placeholder={`Enter ${setting.key.replace(/_/g, ' ')}...`}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                />
                                                {setting.description && (
                                                    <p className="text-xs text-gray-500 mt-1.5">{setting.description}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
