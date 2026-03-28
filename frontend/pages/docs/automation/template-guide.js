import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';
import CodeBlock from '../../../components/docs/CodeBlock';

export default function N8nTemplateGuide() {
  return (
    <DocsLayout
      title="n8n Workflow Template"
      description="The official TargetChat AI automation template"
    >
      <h1 id="n8n-template">TargetChat n8n Template</h1>
      <p className="lead">
        This is the standard automation workflow used to power TargetChat agents. It handles message processing, memory management (context), and AI response generation.
      </p>

      <h2 id="workflow-logic">How It Works</h2>
      <div className="my-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-mono">
        <div className="flex flex-col gap-4 text-center">
          <div className="p-3 bg-white dark:bg-gray-900 rounded shadow">
            <strong>Webhook (POST)</strong><br />
            <span className="text-gray-500">Receives `message` & `chat_id`</span>
          </div>
          <div className="text-gray-400">↓</div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded shadow border border-indigo-100 dark:border-indigo-800">
            <strong>AI Agent (LangChain)</strong><br />
            <span className="text-indigo-600 dark:text-indigo-400">Processes logic + System Prompt</span>
          </div>
          <div className="text-gray-400">↓</div>
          <div className="p-3 bg-white dark:bg-gray-900 rounded shadow">
            <strong>Respond to Webhook</strong><br />
            <span className="text-gray-500">Returns JSON reply</span>
          </div>
        </div>
      </div>

      <h2 id="node-configuration">Node Configuration</h2>

      <h3 id="1-webhook-node">1. Webhook Node</h3>
      <ul>
        <li><strong>Method:</strong> POST</li>
        <li><strong>Path:</strong> Any unique string (e.g., `targetchat-agent`)</li>
        <li><strong>Response Mode:</strong> "Using 'Respond to Webhook' Node"</li>
      </ul>

      <h3 id="2-memory-node">2. Memory (Context)</h3>
      <p>To enable the AI to remember the conversation:</p>
      <ul>
        <li><strong>Type:</strong> Window Buffer Memory</li>
        <li><strong>Session Key:</strong> <code>{`{{ $json.body.chat_id }}`}</code></li>
        <li><strong>Context Window:</strong> 50 (Adjust as needed)</li>
      </ul>
      <Callout type="note">
        The `chat_id` is automatically sent by TargetChat with every message.
      </Callout>

      <h3 id="3-ai-agent">3. AI Agent</h3>
      <ul>
        <li><strong>System Message:</strong> Defines the persona (e.g., "You are Target, an advanced AI assistant...").</li>
        <li><strong>Model:</strong> OpenAI GPT-4o-mini (or any preferred model).</li>
      </ul>

      <h2 id="template-json">Template Code</h2>
      <p>
        Copy the JSON below and paste it into your n8n canvas (Ctrl+V) to instantly recreate the workflow.
      </p>

      <CodeBlock language="json">
        {`{
  "name": "TargetChat Webhook Template",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "your-webhook-path",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [-660, -1080]
    },
    {
      "parameters": {
        "options": {}
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [-80, -1080]
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.body.message }}",
        "options": {
          "systemMessage": "You are a helpful AI assistant.\\n\\nYour goal is to answer user questions clearly based on the provided context."
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1,
      "position": [-430, -1080],
      "name": "AI Agent"
    },
    {
      "parameters": {
        "sessionIdType": "customKey",
        "sessionKey": "={{ $json.body.chat_id }}",
        "contextWindowLength": 10
      },
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1,
      "position": [-300, -860],
      "name": "Memory"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]]
    },
    "AI Agent": {
      "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
    },
    "Memory": {
      "ai_memory": [[{ "node": "AI Agent", "type": "ai_memory", "index": 0 }]]
    }
  }
}`}
      </CodeBlock>
    </DocsLayout>
  );
}
