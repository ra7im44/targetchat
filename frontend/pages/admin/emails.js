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
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-surface p-8 rounded-card border border-border shadow-xs overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none text-foreground">
                        <Mail size={120} />
                    </div>

                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-4">
                            <div className="p-3 bg-primary text-white rounded-card shadow-xs">
                                <Mail size={28} />
                            </div>
                            Email Engine
                        </h1>
                        <p className="text-secondary mt-2 text-base font-normal max-w-xl leading-relaxed">
                            Control your global communication system. Manage templates, track delivery status, and analyze engagement in real-time.
                        </p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="relative z-10 flex p-1.5 bg-surface-elevated rounded-card border border-border">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm ${activeTab === tab.id
                                    ? 'bg-surface text-foreground shadow-xs border border-border'
                                    : 'text-secondary hover:text-foreground hover:bg-surface-hover'
                                    }`}
                            >
                                <span className={activeTab === tab.id ? 'text-primary' : 'text-muted'}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-surface rounded-card p-6 min-h-[600px] border border-border shadow-xs">
                    {renderContent()}
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-info-soft rounded-card border border-info/20 flex gap-4">
                        <div className="text-info"><FileText size={24} /></div>
                        <div>
                            <h4 className="font-semibold text-info text-sm">Dynamic Variables</h4>
                            <p className="text-xs text-secondary mt-1">Use `{"{{name}}"}` or `{"{{cta_link}}"}` in your templates to personalize communication.</p>
                        </div>
                    </div>
                    <div className="p-6 bg-primary-soft rounded-card border border-primary/20 flex gap-4">
                        <div className="text-primary"><Mail size={24} /></div>
                        <div>
                            <h4 className="font-semibold text-primary text-sm">Retry Policy</h4>
                            <p className="text-xs text-secondary mt-1">Failed emails can be re-sent manually from the delivery logs tab within 24 hours.</p>
                        </div>
                    </div>
                    <div className="p-6 bg-success-soft rounded-card border border-success/20 flex gap-4">
                        <div className="text-success"><BarChart2 size={24} /></div>
                        <div>
                            <h4 className="font-semibold text-success text-sm">Real-time stats</h4>
                            <p className="text-xs text-secondary mt-1">Analytics are updated instantly as webhooks from providers (Postmark/SES) are received.</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
