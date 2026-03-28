import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';
import CodeBlock from '../../../components/docs/CodeBlock';

export default function CreatingWidgets() {
    return (
        <DocsLayout
            title="Creating Widgets"
            description="Learn how to create and configure your TargetChat widget"
        >
            <h1 id="creating-widgets">Creating Widgets</h1>
            <p className="lead">
                Widgets are the bridge between your website visitors and your AI workflows. A widget embeds a chat bubble on your site that connects to a specific TargetChat workflow.
            </p>

            <h2 id="creating-first-widget">Creating a Widget</h2>

            <h3 id="step-1-navigate">Step 1: Go to Widgets</h3>
            <p>
                From your dashboard, click on <strong>"Widgets"</strong> in the sidebar menu, then click the <strong>"+ New Widget"</strong> button.
            </p>

            <h3 id="step-2-configuration">Step 2: Configuration</h3>
            <p>
                Fill in the basic details:
            </p>
            <ul>
                <li><strong>Widget Name</strong>: A descriptive name (e.g., "Homepage Sales Bot").</li>
                <li><strong>Workflow</strong>: Select which AI workflow this widget should connect to. This determines <em>how</em> the bot behaves and responds.</li>
                <li><strong>Website URL</strong>: The domain where you will install this widget.</li>
            </ul>

            <Callout type="important">
                The <strong>Workflow</strong> is the brain of the widget. If you want the widget to ask qualification questions or look up order status, that logic lives in the selected Workflow (built in n8n/backend), not in the widget settings.
            </Callout>

            <h3 id="step-3-appearance">Step 3: Appearance</h3>
            <p>
                Customize how the widget looks to match your brand:
            </p>
            <ul>
                <li><strong>Primary Color</strong>: The color of the chat bubble and buttons.</li>
                <li><strong>Position</strong>: Bottom-Right or Bottom-Left.</li>
                <li><strong>Logo</strong>: Upload your brand icon.</li>
                <li><strong>Theme</strong>: Toggle between Light or Dark mode defaults.</li>
            </ul>

            <h3 id="step-4-settings">Step 4: Greeting</h3>
            <p>
                <strong>Welcome Message:</strong> The initial text bubble the user sees before they type anything.
            </p>
            <CodeBlock language="text">
                {`Hi there! 👋 How can I help you today?`}
            </CodeBlock>

            <h2 id="installing">Next Steps</h2>
            <p>
                Once created, you need to install the widget code on your website.
            </p>
            <p>
                <a href="/docs/widgets/installation" className="text-blue-600 dark:text-blue-400 hover:underline">Go to Installation Guide →</a>
            </p>
        </DocsLayout>
    );
}
