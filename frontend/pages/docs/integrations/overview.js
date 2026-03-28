import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';
import CodeBlock from '../../../components/docs/CodeBlock';

export default function IntegrationsOverview() {
    return (
        <DocsLayout
            title="Integrations & API"
            description="Connecting TargetChat with your existing tools"
        >
            <h1 id="integrations">Integrations & API</h1>
            <p className="lead">
                TargetChat is designed to play nicely with your existing stack. Use Webhooks and API Tokens to connect seamlessly.
            </p>

            <h2 id="webhooks">Webhooks</h2>
            <p>
                Webhooks allow TargetChat to send real-time data to other applications whenever specific events happen.
            </p>

            <h3 id="supported-events">Supported Events</h3>
            <ul>
                <li><code>lead.created</code>: Triggered when a new lead is captured.</li>
                <li><code>chat.started</code>: Triggered when a visitor starts a conversation.</li>
                <li><code>message.received</code>: Triggered on every new message.</li>
            </ul>

            <h3 id="use-cases">Common Use Cases</h3>
            <ul>
                <li><strong>Sync to CRM:</strong> Send new leads automatically to Salesforce, HubSpot, or Pipedrive.</li>
                <li><strong>Notifications:</strong> Send alerts to Slack or Microsoft Teams.</li>
                <li><strong>Email Marketing:</strong> Add emails to Mailchimp or Klaviyo lists.</li>
            </ul>

            <h2 id="api-access">API Access</h2>
            <p>
                Developers can full access to the TargetChat API to build custom integrations.
            </p>

            <h3 id="generating-tokens">Generating API Tokens</h3>
            <ol>
                <li>Go to <strong>Settings</strong> in your dashboard.</li>
                <li>Navigate to the <strong>API Tokens</strong> section.</li>
                <li>Click <strong>"Generate New Token"</strong>.</li>
                <li>Select the permissions scope (Read-Only vs. Full Access).</li>
                <li>Copy your token immediately (it won't be shown again).</li>
            </ol>

            <Callout type="warning">
                Keep your API tokens secret! Never share them in public code repositories or client-side code.
            </Callout>

            <h2 id="n8n-automation">Advanced Automation (n8n)</h2>
            <p>
                For complex workflows, TargetChat integrates deeply with automation platforms like n8n.
            </p>
            <p>
                Your AI workflows can be configured to:
            </p>
            <ul>
                <li>Look up order status in your database.</li>
                <li>Book appointments in your calendar.</li>
                <li>Process file uploads and analyze documents.</li>
            </ul>
            <p>
                <i>Contact your workspace administrator to configure advanced n8n workflows.</i>
            </p>
        </DocsLayout>
    );
}
