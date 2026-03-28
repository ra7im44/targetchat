import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';
import CodeBlock from '../../../components/docs/CodeBlock';

// Force refresh: Verified Export
export default function PrivateWorkflows() {
    return (
        <DocsLayout
            title="Private Workflows"
            description="Connect your own n8n workflows to TargetChat"
        >
            <h1 id="private-workflows">Private Workflows</h1>
            <p className="lead">
                Private Workflows allow you to connect your own custom AI logic (running on n8n) to your TargetChat widgets. Unlike public system templates, these workflows are visible only to you and your workspace members.
            </p>

            <h2 id="creating-workflow">Creating a Custom Workflow</h2>
            <p>
                You can create unlimited custom workflows to handle different tasks (e.g., Sales Support, Tech Support, Booking Agent).
            </p>
            <ol>
                <li>Go to <strong>Dashboard → Workspaces</strong> (or My Workflows).</li>
                <li>Click the <strong>"+ New Workflow"</strong> button.</li>
                <li><strong>Name:</strong> Give your bot a name.</li>
                <li><strong>Webhook URL:</strong> Paste the production webhook URL from your n8n workflow.</li>
                <li><strong>Icon:</strong> Choose an emoji to represent this bot.</li>
            </ol>

            <Callout type="warning" title="Important Requirement">
                Your n8n workflow must accept a JSON POST request and return a JSON response with a `reply` or `text` field.
            </Callout>

            <h2 id="n8n-setup">Setting up n8n</h2>
            <p>
                To make your workflow compatible with TargetChat:
            </p>
            <ol>
                <li>Start with a <strong>Webhook</strong> node (Method: POST).</li>
                <li>Process the incoming `message` text.</li>
                <li>End your workflow with a <strong>Respond to Webhook</strong> node.</li>
            </ol>

            <CodeBlock language="json">
                {`// Example Response Format
{
  "reply": "Hello! I am your custom AI agent. How can I help?"
}`}
            </CodeBlock>

            <h2 id="access-control">Access & Sharing</h2>
            <p>
                <strong>Private</strong> means this workflow is not available to the general public or other companies using TargetChat.
            </p>
            <ul>
                <li>If you create it in your <strong>Personal Workspace</strong>, only you can see it.</li>
                <li>If you create it in a <strong>Shared Workspace</strong>, all team members in that workspace can use it for their chats.</li>
            </ul>

            <h2 id="next-steps">Next Steps</h2>
            <ul>
                <li><a href="/docs/widgets/creating" className="text-blue-600 dark:text-blue-400 hover:underline">Connect Workflow to Widget</a></li>
                <li><a href="/docs/integrations/overview" className="text-blue-600 dark:text-blue-400 hover:underline">Learn about APIs</a></li>
            </ul>
        </DocsLayout>
    );
}
