import React from 'react';
import DocsLayout from '../../components/docs/DocsLayout';
import Callout from '../../components/docs/Callout';

export default function FAQ() {
    return (
        <DocsLayout
            title="Frequently Asked Questions"
            description="Common questions about TargetChat"
        >
            <h1 id="faq">Frequently Asked Questions</h1>
            <p className="lead">
                Find answers to the most common questions about TargetChat.
            </p>

            <h2 id="general">General Questions</h2>

            <h3 id="what-is-targetchat">What is TargetChat?</h3>
            <p>
                TargetChat is an AI-powered sales agent that lives on your website. It engages visitors 24/7, qualifies leads automatically, and books appointments - all without human intervention.
            </p>

            <h3 id="how-does-ai-work">How does the AI work?</h3>
            <p>
                Our AI uses advanced natural language processing to understand visitor questions and respond intelligently. It learns from your business information, qualification criteria, and past conversations to improve over time.
            </p>

            <h3 id="languages">What languages does TargetChat support?</h3>
            <p>
                TargetChat currently supports English, Spanish, French, German, Portuguese, and Italian. More languages are coming soon!
            </p>

            <h3 id="industries">What industries is TargetChat best for?</h3>
            <p>
                TargetChat works great for:
            </p>
            <ul>
                <li>B2B SaaS companies</li>
                <li>Professional services (agencies, consultants)</li>
                <li>E-commerce stores</li>
                <li>Real estate</li>
                <li>Healthcare providers</li>
                <li>Financial services</li>
            </ul>

            <h2 id="pricing-billing">Pricing & Billing</h2>

            <h3 id="free-plan">Is there a free plan?</h3>
            <p>
                Yes! Our free plan includes:
            </p>
            <ul>
                <li>1 widget</li>
                <li>100 conversations/month</li>
                <li>Basic AI responses</li>
                <li>Email support</li>
            </ul>

            <h3 id="paid-plans">What are the paid plans?</h3>
            <p>
                We offer multiple paid plans:
            </p>
            <ul>
                <li><strong>Starter</strong>: More widgets and higher message limits</li>
                <li><strong>Pro</strong>: Advanced workflows, API access, and priority support</li>
                <li><strong>Enterprise</strong>: Custom solutions, dedicated support, and unlimited scalability</li>
            </ul>

            <h3 id="billing-cycle">How does billing work?</h3>
            <p>
                You're billed monthly or annually (save 20% with annual billing). You can upgrade, downgrade, or cancel anytime. No long-term contracts required.
            </p>

            <h3 id="refunds">Do you offer refunds?</h3>
            <p>
                Yes! We offer a 14-day money-back guarantee. If you're not satisfied, contact us for a full refund.
            </p>

            <h2 id="features">Features</h2>

            <h3 id="widgets-limit">How many widgets can I create?</h3>
            <p>
                Depends on your plan. Free plans start with 1 widget, while paid plans offer significantly more.
            </p>

            <h3 id="customize-ai">Can I customize the AI responses?</h3>
            <p>
                Yes! Your AI's behavior is determined by its <strong>Workflow</strong>.
            </p>
            <ul>
                <li><strong>Simple Chat:</strong> Uses standard AI responses.</li>
                <li><strong>Advanced Flows:</strong> Connect to n8n to build custom logic, qualification steps, and database lookups.</li>
                <li><strong>Tone & Style:</strong> Can be configured within your workflow prompt settings.</li>
            </ul>

            <h3 id="human-takeover">Can I take over from the AI?</h3>
            <p>
                Absolutely! You can jump into any conversation at any time. The AI will automatically hand off to you when:
            </p>
            <ul>
                <li>You send a message</li>
                <li>Visitor requests a human</li>
                <li>AI can't answer a question</li>
                <li>Lead is qualified (configurable)</li>
            </ul>



            <h2 id="integrations">Integrations</h2>

            <h3 id="which-crms">Which CRMs do you integrate with?</h3>
            <p>
                TargetChat is "CRM Agnostic". You can connect it to <strong>any CRM</strong> (Salesforce, HubSpot, Pipedrive, etc.) using our <strong>Webhooks</strong> or <strong>API</strong>.
            </p>
            <p>
                For advanced users, your custom AI workflows (built in n8n) can directly push data to your CRM without any limitations.
            </p>

            <h3 id="zapier">How can I connect to Zapier?</h3>
            <p>
                You can connect TargetChat to Zapier using <strong>Webhooks</strong>. Set up a "Catch Hook" trigger in Zapier and paste the URL into your TargetChat workflow configuration.
            </p>

            <h3 id="calendar">Can I integrate with my calendar?</h3>
            <p>
                Yes! We integrate with:
            </p>
            <ul>
                <li>Google Calendar</li>
                <li>Outlook Calendar</li>
                <li>Calendly</li>
                <li>Cal.com</li>
            </ul>
            <p>
                The AI can automatically book appointments based on your availability!
            </p>

            <h2 id="technical">Technical Questions</h2>

            <h3 id="installation">How do I install the widget?</h3>
            <p>
                Just copy a small JavaScript snippet and paste it into your website's HTML (before the closing &lt;/body&gt; tag). It works on any platform: WordPress, Shopify, Wix, custom websites, etc.
            </p>

            <h3 id="performance">Will the widget slow down my website?</h3>
            <p>
                No! The widget loads asynchronously and is optimized for performance. It typically adds less than 50KB to your page size and loads in under 100ms.
            </p>

            <h3 id="mobile">Does it work on mobile?</h3>
            <p>
                Yes! The widget is fully responsive and works perfectly on mobile devices, tablets, and desktops.
            </p>

            <h3 id="api">Is there an API?</h3>
            <p>
                Yes! We provide a REST API for custom integrations. API access is available on Pro and Enterprise plans.
            </p>

            <h2 id="security-privacy">Security & Privacy</h2>

            <h3 id="data-storage">Where is my data stored?</h3>
            <p>
                All data is stored securely on AWS servers in the US (with EU options available for Enterprise customers). We use encryption at rest and in transit.
            </p>

            <h3 id="gdpr">Is TargetChat GDPR compliant?</h3>
            <p>
                Yes! We're fully GDPR compliant. We provide:
            </p>
            <ul>
                <li>Data processing agreements (DPA)</li>
                <li>Right to access and delete data</li>
                <li>Cookie consent integration</li>
                <li>Data export functionality</li>
            </ul>

            <h3 id="data-ownership">Who owns the data?</h3>
            <p>
                You do! All lead data, conversations, and analytics belong to you. We never sell or share your data with third parties.
            </p>

            <h3 id="delete-account">Can I delete my account and data?</h3>
            <p>
                Yes, you can delete your account and all associated data at any time from Settings → Account → Delete Account.
            </p>

            <h2 id="support">Support</h2>

            <h3 id="support-hours">What are your support hours?</h3>
            <p>
                Email support: Monday-Friday, 9am-6pm EST<br />
                Live chat support: Available on Pro and Enterprise plans<br />
                Response time: Within 24 hours (priority support for paid plans)
            </p>

            <h3 id="contact-support">How do I contact support?</h3>
            <p>
                Email: <a href="mailto:support@targetchat.ai" className="text-blue-600 dark:text-blue-400 hover:underline">support@targetchat.ai</a><br />
                Live chat: Click the chat icon in your dashboard<br />
                Help center: <a href="/docs" className="text-blue-600 dark:text-blue-400 hover:underline">docs.targetchat.ai</a>
            </p>

            <Callout type="tip">
                Can't find your answer? <a href="mailto:support@targetchat.ai" className="text-blue-600 dark:text-blue-400 hover:underline">Contact our support team</a> - we're here to help!
            </Callout>
        </DocsLayout>
    );
}
