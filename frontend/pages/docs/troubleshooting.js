import React from 'react';
import DocsLayout from '../../components/docs/DocsLayout';
import Callout from '../../components/docs/Callout';
import CodeBlock from '../../components/docs/CodeBlock';

export default function Troubleshooting() {
    return (
        <DocsLayout
            title="Troubleshooting"
            description="Solutions to common TargetChat issues"
        >
            <h1 id="troubleshooting">Troubleshooting Guide</h1>
            <p className="lead">
                Having issues? Find solutions to common problems here.
            </p>

            <Callout type="tip">
                Can't find a solution? Contact support at <a href="mailto:support@targetchat.ai" className="text-blue-600 dark:text-blue-400 hover:underline">support@targetchat.ai</a>
            </Callout>

            <h2 id="widget-issues">Widget Issues</h2>

            <h3 id="widget-not-showing">Widget Not Showing on Website</h3>
            <p><strong>Possible causes:</strong></p>
            <ul>
                <li>Widget status is "Inactive" or "Draft"</li>
                <li>Installation code not added correctly</li>
                <li>JavaScript errors on page</li>
                <li>Ad blocker blocking the widget</li>
                <li>Browser cache needs clearing</li>
            </ul>

            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Check widget status in dashboard - should be "Active"</li>
                <li>Verify installation code is before &lt;/body&gt; tag</li>
                <li>Open browser console (F12) and check for errors</li>
                <li>Test in incognito mode (bypasses ad blockers)</li>
                <li>Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)</li>
            </ol>

            <CodeBlock language="javascript">
                {`// Check if widget loaded
console.log(window.TargetChat);
// Should show: {init: ƒ, ...}

// If undefined, widget didn't load`}
            </CodeBlock>

            <h3 id="widget-wrong-position">Widget in Wrong Position</h3>
            <p><strong>Solution:</strong></p>
            <ol>
                <li>Go to <strong>Widgets → Your Widget → Settings</strong></li>
                <li>Under "Appearance", change position</li>
                <li>Options: bottom-right, bottom-left, custom</li>
                <li>Save changes</li>
            </ol>

            <h3 id="widget-conflicts">Widget Conflicts with Other Scripts</h3>
            <p><strong>Symptoms:</strong></p>
            <ul>
                <li>Widget loads but doesn't open</li>
                <li>JavaScript errors in console</li>
                <li>Other website features broken</li>
            </ul>

            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Move TargetChat code to bottom of &lt;body&gt; (load last)</li>
                <li>Check for jQuery version conflicts</li>
                <li>Disable other chat widgets temporarily</li>
                <li>Contact support with console errors</li>
            </ol>

            <h2 id="messaging-issues">Messaging Issues</h2>

            <h3 id="messages-not-sending">Messages Not Sending</h3>
            <p><strong>Possible causes:</strong></p>
            <ul>
                <li>Internet connection lost</li>
                <li>Server maintenance</li>
                <li>Message too long (5000 characters)</li>
                <li>Rate limiting (too many messages)</li>
            </ul>

            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Check internet connection</li>
                <li>Refresh the page</li>
                <li>Shorten message if very long</li>
                <li>Wait 30 seconds and try again</li>
                <li>Check <a href="https://status.targetchat.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">status page</a></li>
            </ol>

            <h3 id="ai-not-responding">AI Not Responding</h3>
            <p><strong>Possible causes:</strong></p>
            <ul>
                <li>AI is disabled for this widget</li>
                <li>Outside business hours (if configured)</li>
                <li>Message contains blocked words</li>
                <li>API quota exceeded</li>
            </ul>

            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Check widget status - should be "Active"</li>
                <li>Verify your Workflow is active in the dashboard</li>
                <li>Check if your n8n workflow is running correctly (if custom)</li>
                <li>Upgrade plan if API quota exceeded</li>
            </ol>

            <h3 id="notifications-not-working">Not Receiving Notifications</h3>
            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Go to <strong>Settings</strong></li>
                <li>Ensure your email address is correct</li>
                <li>Check spam folder for emails</li>
            </ol>

            <h2 id="integration-issues">Integration Issues</h2>

            <h3 id="crm-not-syncing">CRM Not Syncing Leads</h3>
            <p><strong>Possible causes:</strong></p>
            <ul>
                <li>Integration disconnected</li>
                <li>API credentials expired</li>
                <li>Required fields not mapped</li>
                <li>CRM API limits reached</li>
                <li>Duplicate detection blocking</li>
            </ul>

            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Check integration status (should be "Connected")</li>
                <li>Reconnect integration if disconnected</li>
                <li>Verify all required fields are mapped</li>
                <li>Check CRM API usage limits</li>
                <li>Review sync logs for specific errors</li>
            </ol>

            <h3 id="zapier-not-triggering">Zapier Zaps Not Triggering</h3>
            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Check Zap is turned ON</li>
                <li>Test trigger manually in Zapier</li>
                <li>Verify API key is correct</li>
                <li>Check Zapier task history for errors</li>
                <li>Ensure trigger conditions are met</li>
            </ol>

            <h3 id="webhook-failures">Webhook Failures</h3>
            <p><strong>Common errors:</strong></p>
            <ul>
                <li>404 Not Found - URL is incorrect</li>
                <li>401 Unauthorized - Authentication failed</li>
                <li>500 Server Error - Receiving server issue</li>
                <li>Timeout - Server took too long to respond</li>
            </ul>

            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Verify webhook URL is correct</li>
                <li>Check authentication headers</li>
                <li>Test webhook with a tool like webhook.site</li>
                <li>Check receiving server logs</li>
                <li>Enable webhook retry on failure</li>
            </ol>

            <h2 id="account-issues">Account Issues</h2>

            <h3 id="cant-login">Can't Log In</h3>
            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Reset password using "Forgot Password"</li>
                <li>Check email for verification link</li>
                <li>Clear browser cookies and cache</li>
                <li>Try different browser</li>
                <li>Contact support if account locked</li>
            </ol>

            <h3 id="email-not-verified">Email Not Verified</h3>
            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Check spam/junk folder</li>
                <li>Request new verification email from login page</li>
                <li>Add noreply@targetchat.ai to contacts</li>
                <li>Wait 5 minutes and check again</li>
                <li>Contact support if still not received</li>
            </ol>

            <h3 id="billing-issues">Billing Issues</h3>
            <p><strong>Payment Failed:</strong></p>
            <ol>
                <li>Verify card details are correct</li>
                <li>Check card has sufficient funds</li>
                <li>Contact your bank (may be blocking charge)</li>
                <li>Try different payment method</li>
                <li>Contact support for manual payment</li>
            </ol>

            <p><strong>Wrong Amount Charged:</strong></p>
            <ol>
                <li>Check billing history in dashboard</li>
                <li>Verify plan and add-ons</li>
                <li>Contact support with invoice number</li>
            </ol>

            <h2 id="performance-issues">Performance Issues</h2>

            <h3 id="slow-loading">Dashboard Loading Slowly</h3>
            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Clear browser cache</li>
                <li>Disable browser extensions</li>
                <li>Check internet speed</li>
                <li>Try different browser</li>
                <li>Close unnecessary tabs</li>
            </ol>

            <h3 id="widget-slow">Widget Loading Slowly</h3>
            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Ensure widget code is at bottom of page</li>
                <li>Check website's overall performance</li>
                <li>Optimize images on your site</li>
                <li>Use CDN for faster delivery</li>
                <li>Contact support if persistent</li>
            </ol>

            <h2 id="data-issues">Data Issues</h2>

            <h3 id="missing-leads">Leads Missing from Dashboard</h3>
            <p><strong>Possible causes:</strong></p>
            <ul>
                <li>Filtered view active</li>
                <li>Wrong workspace selected</li>
                <li>Leads archived</li>
                <li>Date range filter applied</li>
            </ul>

            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Clear all filters</li>
                <li>Check "All Leads" view</li>
                <li>Select correct workspace</li>
                <li>Expand date range to "All Time"</li>
                <li>Check archived leads</li>
            </ol>

            <h3 id="data-export">Can't Export Data</h3>
            <p><strong>Solutions:</strong></p>
            <ol>
                <li>Check you're on a paid plan (required for export)</li>
                <li>Reduce date range if too large</li>
                <li>Try CSV instead of Excel</li>
                <li>Disable pop-up blocker</li>
                <li>Contact support for bulk export</li>
            </ol>

            <h2 id="browser-specific">Browser-Specific Issues</h2>

            <h3 id="safari">Safari Issues</h3>
            <ul>
                <li>Enable cookies: Safari → Preferences → Privacy → Uncheck "Block all cookies"</li>
                <li>Disable "Prevent cross-site tracking"</li>
                <li>Clear website data</li>
            </ul>

            <h3 id="firefox">Firefox Issues</h3>
            <ul>
                <li>Disable Enhanced Tracking Protection for TargetChat</li>
                <li>Clear cookies and cache</li>
                <li>Check if extensions are blocking</li>
            </ul>

            <h3 id="chrome">Chrome Issues</h3>
            <ul>
                <li>Disable ad blockers for your site</li>
                <li>Clear browsing data</li>
                <li>Try incognito mode</li>
            </ul>

            <h2 id="still-stuck">Still Stuck?</h2>
            <Callout type="note">
                <p>If you're still experiencing issues:</p>
                <ol>
                    <li>Take a screenshot of the error</li>
                    <li>Note what you were trying to do</li>
                    <li>Check browser console for errors (F12)</li>
                    <li>Email all details to <a href="mailto:support@targetchat.ai" className="text-blue-600 dark:text-blue-400 hover:underline">support@targetchat.ai</a></li>
                </ol>
                <p>Our support team typically responds within 24 hours!</p>
            </Callout>
        </DocsLayout>
    );
}
