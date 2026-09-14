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
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-surface p-8 rounded-card border border-gray-100 dark:border-border shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                        <Mail size={120} />
                    </div>

                    <div className="relative z-10">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-foreground tracking-tight flex items-center gap-4">
                            <div className="p-3 bg-accent text-background rounded-card shadow-lg">
                                <Mail size={32} />
                            </div>
                            Email Engine
                        </h1>
                      <p className="text-gray-500 dark:text-muted mt-3 text-lg font-medium max-w-xl leading-relaxed">
                            Control your global communication system. Manage templates, track delivery status, and analyze engagement in real-time.
                        </p>
                    </div>

                    {/* Tab Switcher - Premium Card Style */}
                    <div className="relative z-10 flex p-1.5 bg-gray-100/80 dark:bg-surface backdrop-blur-md rounded-card border border-gray-200/50 dark:border-border">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 font-bold text-sm ${activeTab === tab.id
                                    ? 'bg-white dark:bg-surface text-gray-900 dark:text-foreground shadow-lg ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-secondary'
                                    }`}
                            >
                                <span className={`${activeTab === tab.id ?
                                    (tab.color === 'blue' ? 'text-primary-700' : tab.color === 'purple' ? 'text-purple-500' : 'text-success-ink dark:text-success')
                                    : 'text-gray-500 dark:text-muted'}`}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white/50 dark:bg-surface backdrop-blur-sm p-2 rounded-[2.5rem] border border-gray-100 dark:border-border">
                    <div className="bg-white dark:bg-surface rounded-[2rem] p-8 min-h-[600px] shadow-lg shadow-black/5 relative overflow-hidden">
                        {/* Decorative Background for inner content */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-accent/5 pointer-events-none" />

                        <div className="relative z-10">
                            {renderContent()}
                        </div>
                    </div>
                </div>

                {/* Logic/Tips area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="p-6 bg-accent/10 dark:bg-accent/20 rounded-card border border-accent/30 dark:border-accent/30 flex gap-4">
                        <div className="text-primary-700 dark:text-accent"><FileText size={24} /></div>
                        <div>
                            <h4 className="font-bold text-accent-active dark:text-info text-sm">Dynamic Variables</h4>
                            <p className="text-xs text-accent-active/70 dark:text-info/60 mt-1">Use `{"{{name}}"}` or `{"{{cta_link}}"}` in your templates to personalize communication.</p>
                        </div>
                    </div>
                    <div className="p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-card border border-purple-100/50 dark:border-purple-900/20 flex gap-4">
                        <div className="text-purple-500"><Mail size={24} /></div>
                        <div>
                            <h4 className="font-bold text-purple-900 dark:text-purple-300 text-sm">Retry Policy</h4>
                            <p className="text-xs text-purple-700/70 dark:text-purple-400/60 mt-1">Failed emails can be re-sent manually from the delivery logs tab within 24 hours.</p>
                        </div>
                    </div>
                    <div className="p-6 bg-success/50 dark:bg-success/10 rounded-card border border-success/50 dark:border-success/20 flex gap-4">
                        <div className="text-success-ink dark:text-success"><BarChart2 size={24} /></div>
                        <div>
                            <h4 className="font-bold text-success-ink dark:text-success text-sm">Real-time stats</h4>
                            <p className="text-xs text-success/70 dark:text-success/60 mt-1">Analytics are updated instantly as webhooks from providers (Postmark/SES) are received.</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
