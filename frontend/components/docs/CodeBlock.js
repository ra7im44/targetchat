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
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                    {copied ? <span className="flex items-center gap-1"><Check size={16} /> Copied!</span> : 'Copy'}
                </button>
            </div>
            <pre className="bg-gray-900 dark:bg-background text-gray-100 p-4 rounded-xl overflow-x-auto">
                <code className={`language-${language}`}>{children}</code>
            </pre>
        </div>
    );
}
