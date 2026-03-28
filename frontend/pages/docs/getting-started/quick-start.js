import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';
import CodeBlock from '../../../components/docs/CodeBlock';
import Link from 'next/link';

export default function QuickStart() {
    return (
        <DocsLayout
            title="Quick Start Guide"
            description="Set up your first TargetChat widget in 5 minutes"
        >
            <h1 id="quick-start">Quick Start Guide</h1>
            <p className="lead">
                Get your AI-powered sales agent up and running in just 5 minutes. This guide will walk you through creating your first widget and installing it on your website.
            </p>

            <Callout type="tip">
                <strong>New to TargetChat?</strong> This is the perfect place to start! We'll have you capturing leads in no time.
            </Callout>

            <h2 id="step-1">Step 1: Create Your Account</h2>
            <p>
                If you haven't already, <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">sign up for a free TargetChat account</Link>. You'll receive a verification email - click the link to activate your account.
            </p>

            <h2 id="step-2">Step 2: Create Your First Widget</h2>
            <ol>
                <li>Log in to your TargetChat dashboard</li>
                <li>Click <strong>"+ New Widget"</strong> in the top right corner</li>
                <li>Give your widget a name (e.g., "Main Website Chat")</li>
                <li>Customize the appearance:
                    <ul>
                        <li>Choose your brand colors</li>
                        <li>Set the widget position (bottom-right recommended)</li>
                        <li>Upload your logo or avatar</li>
                    </ul>
                </li>
                <li>Set your greeting message (e.g., "Hi! How can I help you today?")</li>
                <li>Click <strong>"Create Widget"</strong></li>
            </ol>

            <Callout type="note">
                You can always customize your widget later in the Widget Settings page.
            </Callout>

            <h2 id="step-3">Step 3: Install the Widget</h2>
            <p>
                After creating your widget, you'll see the installation code. Copy this snippet and add it to your website:
            </p>

            <h3 id="html-installation">For HTML Websites</h3>
            <p>
                Paste this code just before the closing <code>&lt;/body&gt;</code> tag:
            </p>

            <CodeBlock language="html">
                {`<!-- TargetChat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://targetchat.ai/widget.js';
    script.setAttribute('data-widget-id', 'YOUR_WIDGET_ID');
    document.body.appendChild(script);
  })();
</script>`}
            </CodeBlock>

            <h3 id="wordpress-installation">For WordPress</h3>
            <ol>
                <li>Go to <strong>Appearance → Theme Editor</strong></li>
                <li>Select <strong>footer.php</strong></li>
                <li>Paste the code before <code>&lt;/body&gt;</code></li>
                <li>Click <strong>"Update File"</strong></li>
            </ol>

            <Callout type="warning">
                Make sure to replace <code>YOUR_WIDGET_ID</code> with your actual widget ID from the dashboard!
            </Callout>

            <h2 id="step-4">Step 4: Test Your Widget</h2>
            <p>
                Visit your website and you should see the chat widget in the bottom-right corner. Click it to test:
            </p>
            <ul>
                <li>Send a test message</li>
                <li>Check if the AI responds correctly</li>
                <li>Verify the widget appearance matches your brand</li>
            </ul>

            <h2 id="next-steps">Next Steps</h2>
            <p>
                Congratulations! Your AI sales agent is now live. Here's what to do next:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                <Link href="/docs/automation/private-workflows" className="block p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">⚡ Private Workflows</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Discover personalized AI bots for your team</p>
                </Link>

                <Link href="/docs/integrations/overview" className="block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">🔌 Integrations</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Connect to your stack via Webhooks & API</p>
                </Link>

                <Link href="/docs/widgets/creating" className="block p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">🎨 Customize Your Widget</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Match your brand with advanced styling options</p>
                </Link>

                <Link href="/docs/chat" className="block p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 transition-colors">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">💬 Chat Interface</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Master the real-time chat dashboard</p>
                </Link>
            </div>

            <Callout type="tip" title="Need Help?">
                Join our community or contact support at <a href="mailto:support@targetchat.ai" className="text-blue-600 dark:text-blue-400 hover:underline">support@targetchat.ai</a>
            </Callout>
        </DocsLayout>
    );
}
