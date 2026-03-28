import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';
import CodeBlock from '../../../components/docs/CodeBlock';

export default function DashboardOverview() {
    return (
        <DocsLayout
            title="Dashboard Overview"
            description="Understanding your command center metrics and activity"
        >
            <h1 id="dashboard">Dashboard Overview</h1>
            <p className="lead">
                The Dashboard is your command center. It provides real-time analytics on your AI agent's performance, lead generation, and recent activity.
            </p>

            <h2 id="key-metrics">Key Metrics</h2>
            <p>
                At the top of the dashboard, you will see four key performance indicators (KPIs):
            </p>
            <ul>
                <li><strong>Total Widgets:</strong> The number of active chat widgets you have deployed.</li>
                <li><strong>Active Chats:</strong> The number of conversations currently happening or recently active.</li>
                <li><strong>Total Leads:</strong> The number of visitors who have provided contact information (Email/Phone).</li>
                <li><strong>Messages (Mo):</strong> total number of messages exchanged in the current month.</li>
            </ul>

            <h2 id="analytics-chart">Analytics Chart</h2>
            <p>
                The <strong>Message Activity</strong> chart shows the volume of conversations over the last 7 days. This helps you track engagement trends and identify peak days.
            </p>

            <h2 id="recent-leads">Recent Leads</h2>
            <p>
                A quick snapshot of the latest 5 leads captured by your bots.
            </p>
            <ul>
                <li><strong>User:</strong> Name and Avatar (if available)</li>
                <li><strong>Source:</strong> Which widget captured the lead</li>
                <li><strong>Status:</strong> New, Contacted, or Qualified</li>
            </ul>
            <Callout type="tip">
                Click "View All Leads" to access the full CRM view where you can export data to CSV.
            </Callout>

            <h2 id="live-activity">Live Activity Feed</h2>
            <p>
                The <strong>Live Activity</strong> section provides a real-time audit log of what's happening in your account:
            </p>
            <ul>
                <li>New chats started</li>
                <li>Leads captured</li>
                <li>Workflows created or modified</li>
                <li>Widgets updated</li>
            </ul>

            <h2 id="widget-status">Widget Status</h2>
            <p>
                The "Your Widgets" panel shows the health status of your deployed bots.
            </p>
            <ul>
                <li><span className="text-green-600 font-bold">Active:</span> Widget is live and responding.</li>
                <li><span className="text-gray-500 font-bold">Inactive:</span> Widget is disabled.</li>
            </ul>

            <h2 id="next-steps">Next Steps</h2>
            <ul>
                <li><a href="/docs/features/workspaces" className="text-blue-600 dark:text-blue-400 hover:underline">Manage Workspaces</a></li>
                <li><a href="/docs/widgets/creating" className="text-blue-600 dark:text-blue-400 hover:underline">Create a Widget</a></li>
            </ul>
        </DocsLayout>
    );
}
