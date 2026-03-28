import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';

export default function HumanHandoff() {
    return (
        <DocsLayout
            title="Human Handoff"
            description="Seamlessly transition conversations from AI to human agents"
        >
            <h1 id="human-handoff">Human Handoff</h1>
            <p className="lead">
                TargetChat allows you to monitor conversations in real-time and intervene whenever necessary. This "Human in the Loop" approach ensures complex queries are handled by your team.
            </p>

            <h2 id="manual-takeover">Manual Takeover</h2>
            <p>
                You can take control of any active conversation from the Dashboard Inbox.
            </p>
            <ol>
                <li>Navigate to <strong>Inbox</strong> in the dashboard sidebar.</li>
                <li>Select the active chat you want to manage.</li>
                <li>Click the <strong>"Take Over"</strong> (or "Pause AI") button in the chat header.</li>
            </ol>
            <p>
                Once clicked, the AI will stop responding to this specific chat, allowing you to type replies manually.
            </p>

            <h2 id="resuming-automation">Resuming Automation</h2>
            <p>
                When you have resolved the user's issue, you can hand control back to the AI.
            </p>
            <ol>
                <li>Click the <strong>"Resume AI"</strong> button.</li>
                <li>The AI will listen for the next user message and respond according to its workflow.</li>
            </ol>

            <Callout type="tip">
                Admins receive desktop notifications for new messages in the Inbox, making it easy to spot when a user needs help.
            </Callout>

            <h2 id="automated-handoff">Automated Handoff (n8n)</h2>
            <p>
                To trigger a handoff automatically from your n8n workflow (e.g., when sentiment is negative):
            </p>
            <p>
                <em>Currently, automated tagging is done by sending a notification to your team (via Slack/Email nodes in n8n) alerting them to jump into the Inbox and take over manually.</em>
            </p>
        </DocsLayout>
    );
}
