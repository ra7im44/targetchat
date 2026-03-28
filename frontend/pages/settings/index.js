import React, { useState } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [user, setUser] = useState({ name: 'Admin User', email: 'admin@targetchat.com' }); // Mock data for now

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
                <div className="mb-10">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage your account preferences.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:w-64 flex-shrink-0">
                        <nav className="space-y-2 sticky top-24">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex items-center gap-6 mb-8 border-b border-gray-100 dark:border-gray-700 pb-8">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                            {user.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Profile Picture</h3>
                                        <p className="text-gray-500 text-sm mt-1">PNG, JPG up to 5MB</p>
                                    </div>
                                </div>

                                <form className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                                            <input type="text" defaultValue={user.name} className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" placeholder="Your Name" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                                            <input type="email" defaultValue={user.email} className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed" disabled />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
                                        <input type="text" className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" placeholder="Your Company" />
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                        <button type="button" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-0.5" onClick={() => toast.success('Profile updated!')}>
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Notifications Tab Placeholder */}
                        {activeTab === 'notifications' && (
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Notification Preferences</h2>
                                <div className="space-y-4">
                                    {['Email Notifications', 'Desktop Push Notifications', 'Marketing Updates'].map((item) => (
                                        <div key={item} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <span className="font-bold text-gray-700 dark:text-gray-200">{item}</span>
                                            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                                <input type="checkbox" name="toggle" id={item} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-600" defaultChecked />
                                                <label htmlFor={item} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer checked:bg-blue-600"></label>
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
