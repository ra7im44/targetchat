import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';
import CodeBlock from '../../../components/docs/CodeBlock';

export default function ChatInterface() {
    return (
        <DocsLayout
            title="Chat Interface"
            description="Mastering the TargetChat real-time AI conversation interface"
        >
            <h1 id="chat-interface">Chat Interface</h1>
            <p className="lead">
                The <strong>Chat Interface</strong> is the heart of TargetChat. It's where you interact with your AI workflows, manage conversations, and get work done.
            </p>

            <h2 id="overview">Interface Overview</h2>
            <p>
                The chat screen is divided into three main areas:
            </p>
            <ul>
                <li><strong>Sidebar (Left):</strong> Your available workflows and history.</li>
                <li><strong>Chat Area (Center):</strong> The active conversation stream.</li>
                <li><strong>Input Area (Bottom):</strong> Where you type your messages or upload files.</li>
            </ul>

            <h2 id="starting-chat">Starting a New Chat</h2>
            <ol>
                <li>Navigate to <strong>/chat</strong>.</li>
                <li>Select a **Workflow** from the sidebar (e.g., "General Assistant", "Support Bot").</li>
                <li>The chat window will refresh with a new session for that workflow.</li>
                <li>Type your message and hit **Enter** or click the **Send** button.</li>
            </ol>

            <h2 id="features">Key Features</h2>

            <h3 id="markdown-support">Rich Text & Markdown</h3>
            <p>
                TargetChat supports Markdown formatting. You can use:
            </p>
            <ul>
                <li>**Bold** text for emphasis.</li>
                <li>*Italic* text.</li>
                <li>Lists (bullet points and numbered).</li>
                <li>`Code blocks` for snippets.</li>
            </ul>

            <h3 id="code-highlighting">Code Highlighting</h3>
            <p>
                When the AI shares code (Python, JavaScript, SQL, etc.), it will be automatically formatted with syntax highlighting and a **Copy** button.
            </p>

            <h3 id="history">Chat History</h3>
            <p>
                Your past conversations are saved automatically. You can access them from the **History** tab in the sidebar (if enabled for your workspace).
            </p>

            <h3 id="language-support">Multi-Language Support</h3>
            <p>
                The interface fully supports **Right-to-Left (RTL)** languages like Arabic. The layout will automatically adjust based on your language settings.
            </p>

            <h2 id="pro-tips">Pro Tips</h2>
            <Callout type="tip">
                <strong>Shift + Enter:</strong> Creates a new line without sending the message. Useful for writing long prompts!
            </Callout>

            <Callout type="note">
                <strong>Attachments:</strong> You can drag and drop files into the chat area to upload them (if the selected workflow supports file processing).
            </Callout>

            <h2 id="switching-workflows">Switching Workflows</h2>
            <p>
                You can switch between different AI assistants seamlessly.
            </p>
            <ul>
                <li>Click the **Workflow Name** at the top of the chat or in the sidebar.</li>
                <li>Select a different workflow.</li>
                <li><strong>Note:</strong> Switching workflows starts a new context. The new AI won't "remember" the previous chat unless specifically designed to.</li>
            </ul>

        </DocsLayout>
    );
}
