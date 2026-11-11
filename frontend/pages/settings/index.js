import React, { useState } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [user, setUser] = useState({ name: 'Admin User', email: 'admin@targetchat.com' });

    // Tabs configuration
    const tabs = [
        {
            id: 'profile', label: 'Profile Settings', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )
        },
        {
            id: 'notifications', label: 'Notifications', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            )
        },
    ];

    return (
        <DashboardLayout title="Settings">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Settings</h1>
                    <p className="text-muted mt-1.5 text-sm font-medium">Manage your account preferences.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:w-60 flex-shrink-0">
                        <nav className="space-y-1.5 sticky top-24">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === tab.id
                                        ? 'bg-primary text-white shadow-xs'
                                        : 'text-secondary hover:bg-surface hover:text-foreground'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="bg-surface rounded-card shadow-xs border border-border p-6 sm:p-8">
                                <div className="flex items-center gap-5 mb-8 border-b border-border pb-6">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-16 h-16 rounded-full bg-primary-soft border border-primary/20 flex items-center justify-center text-primary text-xl font-bold">
                                            {user.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground">Profile Picture</h3>
                                        <p className="text-muted text-xs mt-0.5">PNG, JPG up to 5MB</p>
                                    </div>
                                </div>

                                <form className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Full Name</label>
                                            <input type="text" defaultValue={user.name} className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="Your Name" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Email Address</label>
                                            <input type="email" defaultValue={user.email} className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-elevated text-muted text-sm cursor-not-allowed" disabled />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Company Name</label>
                                        <input type="text" className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-elevated text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="Your Company" />
                                    </div>

                                    <div className="pt-4 border-t border-border flex justify-end">
                                        <button type="button" className="px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-button font-semibold text-sm shadow-xs transition-all" onClick={() => toast.success('Profile updated!')}>
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <div className="bg-surface rounded-card shadow-xs border border-border p-6 sm:p-8">
                                <h2 className="text-lg font-bold text-foreground mb-5">Notification Preferences</h2>
                                <div className="space-y-3">
                                    {['Email Notifications', 'Desktop Push Notifications', 'Marketing Updates'].map((item) => (
                                        <div key={item} className="flex items-center justify-between p-3.5 bg-surface-elevated rounded-xl border border-border">
                                            <span className="font-medium text-sm text-foreground">{item}</span>
                                            <div className="relative inline-block w-11 align-middle select-none">
                                                <input type="checkbox" name="toggle" id={item} className="w-5 h-5 accent-primary rounded cursor-pointer" defaultChecked />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
