import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ChatBubble({ sender, message }) {
  const isUser = sender === 'user';
  const { type, text, image, audio, video, file, time, filename } = message;

  // State to hold the current URL (which might be refreshed)
  const [currentUrl, setCurrentUrl] = useState(null);

  useEffect(() => {
    // Initialize with the URL from props
    if (type === 'image') setCurrentUrl(image);
    else if (type === 'audio') setCurrentUrl(audio);
    else if (type === 'video') setCurrentUrl(video);
    else if (type === 'file') setCurrentUrl(file?.url);
  }, [message, type, image, audio, video, file]);

  const refreshUrl = async () => {
    const targetFilename = filename || (currentUrl ? currentUrl.split('/').pop().split('?')[0] : null);
    if (!targetFilename) return;

    try {
      const token = localStorage.getItem('tc_token');
      if (!token) return;

      const res = await fetch(`${API}/api/file/refresh-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ filename: targetFilename })
      });

      if (res.ok) {
        const data = await res.json();
        const newUrl = `${API}${data.url}`;
        setCurrentUrl(newUrl);
      }
    } catch (err) {
      console.error('Failed to refresh URL', err);
    }
  };

  const renderContent = () => {
    if (type === 'image' && currentUrl) {
      return (
        <img
          src={currentUrl}
          alt="User upload"
          className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-md"
          onClick={() => window.open(currentUrl, '_blank')}
          onError={(e) => {
            if (!e.target.dataset.retried) {
              e.target.dataset.retried = "true";
              refreshUrl();
            }
          }}
        />
      );
    }
    if (type === 'audio' && currentUrl) {
      return (
        <div className="flex items-center gap-2 min-w-[200px]">
          <audio controls src={currentUrl} className="w-full h-8" onError={refreshUrl} />
        </div>
      );
    }
    if (type === 'video' && currentUrl) {
      return (
        <div className="max-w-full">
          <video controls src={currentUrl} className="max-w-full rounded-xl shadow-md" onError={refreshUrl} />
        </div>
      );
    }
    if (type === 'file' && currentUrl) {
      return (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-500 hover:underline font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          {file?.name || 'Download File'}
        </a>
      );
    }

    // Render text with markdown for AI messages
    if (!isUser && text) {
      return (
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Custom renderers for better styling
              p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-7" {...props} />,
              code: ({ node, inline, className, children, ...props }) => {
                if (inline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono text-pink-600 dark:text-pink-400" {...props}>
                      {children}
                    </code>
                  );
                }

                // Extract code text for copying
                const codeText = String(children).replace(/\n$/, '');
                const [copied, setCopied] = React.useState(false);

                const handleCopy = () => {
                  navigator.clipboard.writeText(codeText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                };

                return (
                  <div className="relative group">
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Copy
                        </>
                      )}
                    </button>
                    <code className={`${className} block p-4 rounded-xl bg-[#1e1e1e] text-gray-100 text-sm overflow-x-auto my-3 font-mono`} {...props}>
                      {children}
                    </code>
                  </div>
                );
              },
              pre: ({ node, ...props }) => <pre className="my-3 rounded-xl overflow-hidden bg-[#1e1e1e]" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
              li: ({ node, ...props }) => <li className="leading-7" {...props} />,
              h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-3 mt-4" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-2 mt-3" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 mt-3" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
              em: ({ node, ...props }) => <em className="italic" {...props} />,
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-3 italic text-gray-600 dark:text-gray-400" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      );
    }

    // Plain text for user messages
    return (
      <div className="leading-7 whitespace-pre-wrap break-words">
        {text || (type === 'text' ? '' : `[${type} message]`)}
      </div>
    );
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>

        {/* Avatar */}
        <div className={`
          w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-md transition-transform group-hover:scale-110
          ${isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
            : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
          }
        `}>
          {isUser ? 'Y' : '✨'}
        </div>

        {/* Message Container */}
        <div className="flex flex-col gap-1 min-w-0">
          {/* Bubble */}
          <div className={`
            relative px-5 py-4 shadow-md transition-all
            ${isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl rounded-tr-md'
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-3xl rounded-tl-md'
            }
          `}>
            {renderContent()}
          </div>

          {/* Timestamp */}
          {time && (
            <div className={`
              text-[11px] font-medium px-2 opacity-0 group-hover:opacity-100 transition-opacity
              ${isUser ? 'text-gray-500 text-right' : 'text-gray-400 text-left'}
            `}>
              {time}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
