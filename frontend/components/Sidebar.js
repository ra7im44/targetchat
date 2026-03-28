import React, { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import WorkspaceSwitcher from './WorkspaceSwitcher';

export default function Sidebar({ chats, activeId, onSelect, onNew, onDelete, collapsed, onToggleCollapse, currentWorkspace, onWorkspaceChange, onCreateWorkspace, onManageMembers }) {
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, chatId: null });

  const Icon = ({ name, className }) => {
    switch (name) {
      case 'new':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        );
      case 'delete':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        );
      case 'chat':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        );
      case 'collapse':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        );
      case 'expand':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <aside className={`h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 relative transition-all duration-300 ${collapsed ? 'w-20' : 'w-80'}`}>
        {/* Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-6 z-10 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 transition-all shadow-md"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? 'expand' : 'collapse'} className="w-3 h-3" />
        </button>

        {/* Workspace Switcher */}
        {!collapsed && (
          <WorkspaceSwitcher
            currentWorkspace={currentWorkspace}
            onWorkspaceChange={onWorkspaceChange}
            onCreateWorkspace={onCreateWorkspace}
            onManageMembers={onManageMembers}
          />
        )}

        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={onNew}
            className={`w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] ${collapsed ? 'p-3' : 'p-3.5'}`}
            title={collapsed ? "New Chat" : ""}
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-center gap-2'} relative z-10`}>
              <Icon name="new" className="w-5 h-5" />
              {!collapsed && <span className="font-semibold">New Chat</span>}
            </div>
            {/* Shine effect */}
            {!collapsed && <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>}
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          {chats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-4 text-gray-400">
                <Icon name="chat" className="w-8 h-8" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold mb-1">No conversations yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Click "New Chat" to start</p>
            </div>
          )}

          {chats
            .filter(c => !currentWorkspace || c.workspace_id === currentWorkspace.id)
            .map((c) => (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`
                group relative p-3.5 rounded-xl cursor-pointer transition-all duration-200
                ${c.id === activeId
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 shadow-md border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                  }
              `}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`
                  w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200
                  ${c.id === activeId
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-gradient-to-br group-hover:from-gray-200 group-hover:to-gray-300 dark:group-hover:from-gray-700 dark:group-hover:to-gray-600'
                    }
                `}>
                    {(c.title || 'C').charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-semibold truncate pr-2 ${c.id === activeId ? 'text-blue-900 dark:text-blue-100' : 'text-gray-800 dark:text-gray-200'}`}>
                        {c.title || 'New Chat'}
                      </h3>
                      {c.id === activeId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ isOpen: true, chatId: c.id });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg transition-all hover:scale-110"
                          title="Delete Chat"
                        >
                          <Icon name="delete" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs ${c.id === activeId ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                        {c.messages?.length ? `${c.messages.length} messages` : 'Empty'}
                      </p>
                      {c.id === activeId && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
              <span className="font-medium">Online</span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {chats.length} {chats.length === 1 ? 'chat' : 'chats'}
            </div>
          </div>
        </div>
      </aside>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, chatId: null })}
        onConfirm={() => onDelete(deleteConfirm.chatId)}
        title="Delete Chat?"
        message="Are you sure you want to delete this chat? All messages will be permanently removed and this action cannot be undone."
      />
    </>
  );
}
