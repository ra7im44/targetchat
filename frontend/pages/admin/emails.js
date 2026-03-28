import { useState } from 'react'; // Re-saved to clear cache
import AdminLayout from '../../components/admin/AdminLayout';
import { Mail, FileText, BarChart2, List } from 'lucide-react';

// Import our new components
import EmailTemplatesTab from '../../components/admin/email/EmailTemplatesTab';
import EmailLogsTab from '../../components/admin/email/EmailLogsTab';
import EmailAnalyticsTab from '../../components/admin/email/EmailAnalyticsTab';

export default function EmailsPage() {
    const [activeTab, setActiveTab] = useState('templates');

    const tabs = [
        { id: 'templates', label: 'Templates', icon: <FileText size={18} />, color: 'blue' },
        { id: 'logs', label: 'Delivery Logs', icon: <List size={18} />, color: 'purple' },
        { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={18} />, color: 'green' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'templates': return <EmailTemplatesTab />;
            case 'logs': return <EmailLogsTab />;
            case 'analytics': return <EmailAnalyticsTab />;
            default: return <EmailTemplatesTab />;
        }
    };

    return (
        <AdminLayout title="Email Management">
            <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                        <Mail size={120} />
                    </div>

                    <div className="relative z-10">
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30">
                                <Mail size={32} />
                            </div>
                            Email Engine
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-3 text-lg font-medium max-w-xl leading-relaxed">
                            Control your global communication system. Manage templates, track delivery status, and analyze engagement in real-time.
                        </p>
                    </div>

                    {/* Tab Switcher - Premium Card Style */}
                    <div className="relative z-10 flex p-1.5 bg-gray-100/80 dark:bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 font-bold text-sm ${activeTab === tab.id
                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xl scale-[1.02] ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <span className={`${activeTab === tab.id ?
                                    (tab.color === 'blue' ? 'text-blue-500' : tab.color === 'purple' ? 'text-purple-500' : 'text-green-500')
                                    : 'text-gray-400'}`}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm p-2 rounded-[2.5rem] border border-gray-100 dark:border-gray-700/50">
                    <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 min-h-[600px] shadow-2xl shadow-black/5 relative overflow-hidden">
                        {/* Decorative Background for inner content */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-b from-gray-50/50 dark:from-gray-900/20 to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            {renderContent()}
                        </div>
                    </div>
                </div>

                {/* Logic/Tips area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 flex gap-4">
                        <div className="text-blue-500"><FileText size={24} /></div>
                        <div>
                            <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm">Dynamic Variables</h4>
                            <p className="text-xs text-blue-700/70 dark:text-blue-400/60 mt-1">Use `{"{{name}}"}` or `{"{{cta_link}}"}` in your templates to personalize communication.</p>
                        </div>
                    </div>
                    <div className="p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100/50 dark:border-purple-900/20 flex gap-4">
                        <div className="text-purple-500"><Mail size={24} /></div>
                        <div>
                            <h4 className="font-bold text-purple-900 dark:text-purple-300 text-sm">Retry Policy</h4>
                            <p className="text-xs text-purple-700/70 dark:text-purple-400/60 mt-1">Failed emails can be re-sent manually from the delivery logs tab within 24 hours.</p>
                        </div>
                    </div>
                    <div className="p-6 bg-green-50/50 dark:bg-green-900/10 rounded-2xl border border-green-100/50 dark:border-green-900/20 flex gap-4">
                        <div className="text-green-500"><BarChart2 size={24} /></div>
                        <div>
                            <h4 className="font-bold text-green-900 dark:text-green-300 text-sm">Real-time stats</h4>
                            <p className="text-xs text-green-700/70 dark:text-green-400/60 mt-1">Analytics are updated instantly as webhooks from providers (Postmark/SES) are received.</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
