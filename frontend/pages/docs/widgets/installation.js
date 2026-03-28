import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';
import CodeBlock from '../../../components/docs/CodeBlock';

export default function WidgetInstallation() {
    return (
        <DocsLayout
            title="Widget Installation"
            description="Install your TargetChat widget on any website platform"
        >
            <h1 id="installation">Widget Installation</h1>
            <p className="lead">
                Once you've created your widget, it's time to install it on your website. This guide covers installation for all major platforms.
            </p>

            <Callout type="note">
                You'll need access to your website's code or admin panel to install the widget.
            </Callout>

            <h2 id="get-code">Getting Your Widget Code</h2>
            <ol>
                <li>Go to <strong>Widgets</strong> in your dashboard</li>
                <li>Click on your widget</li>
                <li>Click the <strong>"Installation"</strong> tab</li>
                <li>Copy the embed code</li>
            </ol>

            <p>Your widget code will look like this:</p>
            <CodeBlock language="html">
                {`<!-- TargetChat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://targetchat.ai/widget.js';
    script.setAttribute('data-widget-id', 'wgt_abc123xyz');
    document.body.appendChild(script);
  })();
</script>`}
            </CodeBlock>

            <h2 id="html-websites">HTML/Static Websites</h2>
            <p>
                For plain HTML websites:
            </p>
            <ol>
                <li>Open your website's HTML file</li>
                <li>Find the closing <code>&lt;/body&gt;</code> tag</li>
                <li>Paste the widget code just before it</li>
                <li>Save and upload the file</li>
            </ol>

            <CodeBlock language="html">
                {`<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <!-- Your website content -->
    
    <!-- TargetChat Widget - Add before </body> -->
    <script>
      (function() {
        var script = document.createElement('script');
        script.src = 'https://targetchat.ai/widget.js';
        script.setAttribute('data-widget-id', 'wgt_abc123xyz');
        document.body.appendChild(script);
      })();
    </script>
</body>
</html>`}
            </CodeBlock>

            <h2 id="wordpress">WordPress</h2>

            <h3 id="wordpress-method-1">Method 1: Theme Editor (Recommended)</h3>
            <ol>
                <li>Go to <strong>Appearance → Theme Editor</strong></li>
                <li>Select <strong>footer.php</strong> from the right sidebar</li>
                <li>Find the <code>&lt;/body&gt;</code> tag</li>
                <li>Paste the widget code before it</li>
                <li>Click <strong>"Update File"</strong></li>
            </ol>

            <Callout type="warning">
                Editing theme files directly can break your site if done incorrectly. Always backup first!
            </Callout>

            <h3 id="wordpress-method-2">Method 2: Plugin (Safer)</h3>
            <ol>
                <li>Install the <strong>"Insert Headers and Footers"</strong> plugin</li>
                <li>Go to <strong>Settings → Insert Headers and Footers</strong></li>
                <li>Paste the widget code in the <strong>"Scripts in Footer"</strong> section</li>
                <li>Click <strong>"Save"</strong></li>
            </ol>

            <h2 id="shopify">Shopify</h2>
            <ol>
                <li>Go to <strong>Online Store → Themes</strong></li>
                <li>Click <strong>"Actions → Edit code"</strong></li>
                <li>Find and open <strong>theme.liquid</strong></li>
                <li>Scroll to the bottom and find <code>&lt;/body&gt;</code></li>
                <li>Paste the widget code before it</li>
                <li>Click <strong>"Save"</strong></li>
            </ol>

            <h2 id="wix">Wix</h2>
            <ol>
                <li>Go to your Wix Editor</li>
                <li>Click <strong>"Settings"</strong> in the left menu</li>
                <li>Click <strong>"Custom Code"</strong></li>
                <li>Click <strong>"+ Add Custom Code"</strong></li>
                <li>Paste the widget code</li>
                <li>Set it to load on <strong>"All Pages"</strong></li>
                <li>Place code in <strong>"Body - end"</strong></li>
                <li>Click <strong>"Apply"</strong></li>
            </ol>

            <h2 id="squarespace">Squarespace</h2>
            <ol>
                <li>Go to <strong>Settings → Advanced → Code Injection</strong></li>
                <li>Paste the widget code in the <strong>"Footer"</strong> section</li>
                <li>Click <strong>"Save"</strong></li>
            </ol>

            <h2 id="webflow">Webflow</h2>
            <ol>
                <li>Go to <strong>Project Settings → Custom Code</strong></li>
                <li>Paste the widget code in the <strong>"Footer Code"</strong> section</li>
                <li>Click <strong>"Save Changes"</strong></li>
                <li>Publish your site</li>
            </ol>

            <h2 id="react-nextjs">React / Next.js</h2>
            <p>
                For React or Next.js apps, add the widget to your layout component:
            </p>

            <CodeBlock language="javascript">
                {`// In your _app.js or layout component
import { useEffect } from 'react';

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Load TargetChat widget
    const script = document.createElement('script');
    script.src = 'https://targetchat.ai/widget.js';
    script.setAttribute('data-widget-id', 'wgt_abc123xyz');
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      document.body.removeChild(script);
    };
  }, []);

  return <Component {...pageProps} />;
}`}
            </CodeBlock>

            <h2 id="google-tag-manager">Google Tag Manager</h2>
            <ol>
                <li>Go to <strong>Tags → New</strong></li>
                <li>Click <strong>"Tag Configuration"</strong></li>
                <li>Choose <strong>"Custom HTML"</strong></li>
                <li>Paste the widget code</li>
                <li>Set trigger to <strong>"All Pages"</strong></li>
                <li>Click <strong>"Save"</strong> and <strong>"Submit"</strong></li>
            </ol>

            <h2 id="testing">Testing Your Installation</h2>
            <p>
                After installing, verify the widget is working:
            </p>
            <ol>
                <li>Visit your website</li>
                <li>Look for the chat icon in the bottom-right corner</li>
                <li>Click it to open the widget</li>
                <li>Send a test message</li>
                <li>Check your TargetChat inbox for the message</li>
            </ol>

            <Callout type="tip">
                Use your browser's incognito/private mode to test as a new visitor!
            </Callout>

            <h2 id="troubleshooting">Troubleshooting</h2>

            <h3 id="widget-not-showing">Widget Not Showing?</h3>
            <ul>
                <li>Check that the widget status is <strong>"Active"</strong> in your dashboard</li>
                <li>Clear your browser cache and hard refresh (Ctrl+Shift+R)</li>
                <li>Check browser console for JavaScript errors (F12)</li>
                <li>Verify the widget ID in the code matches your dashboard</li>
            </ul>

            <h3 id="widget-wrong-position">Widget in Wrong Position?</h3>
            <ul>
                <li>Go to <strong>Widget Settings → Appearance</strong></li>
                <li>Change the position setting</li>
                <li>Adjust custom CSS if needed</li>
            </ul>

            <h3 id="conflicts">Conflicts with Other Scripts?</h3>
            <ul>
                <li>Try loading the widget code last (bottom of <code>&lt;/body&gt;</code>)</li>
                <li>Check for JavaScript errors in console</li>
                <li>Contact support if issues persist</li>
            </ul>

            <h2 id="next-steps">Next Steps</h2>
            <ul>
                <li><a href="/docs/widgets/creating#step-3-appearance" className="text-blue-600 dark:text-blue-400 hover:underline">Customize widget appearance</a></li>
                <li><a href="/docs/automation/private-workflows" className="text-blue-600 dark:text-blue-400 hover:underline">Set up automation</a></li>
                <li><a href="/docs/troubleshooting" className="text-blue-600 dark:text-blue-400 hover:underline">Troubleshooting guide</a></li>
            </ul>
        </DocsLayout>
    );
}
