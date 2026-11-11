import React, { useState } from 'react';
import { Check } from 'lucide-react';

export default function CodeBlock({ children, language = 'javascript' }) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-6">
            <div className="absolute top-3 right-3 z-10">
                <button
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-foreground border border-border text-xs rounded-button transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                >
                    {copied ? <span className="flex items-center gap-1 text-success"><Check size={14} /> Copied!</span> : 'Copy'}
                </button>
            </div>
            <pre className="bg-surface-elevated text-foreground border border-border p-4 rounded-card overflow-x-auto font-mono text-xs">
                <code className={`language-${language}`}>{children}</code>
            </pre>
        </div>
    );
}
