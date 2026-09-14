import React, { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import WorkspaceSwitcher from './WorkspaceSwitcher';

export default function Sidebar({ chats, activeId, onSelect, onNew, onDelete, collapsed, onToggleCollapse, currentWorkspace, onWorkspaceChange, onCreateWorkspace, onManageMembers, onRename, onTogglePin }) {
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, chatId: null });
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const startRename = (chat, e) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitleValue(chat.title || '');
  };

  const saveRename = (chatId, e) => {
    e.preventDefault();
    if (editTitleValue.trim()) {
      onRename?.(chatId, editTitleValue.trim());
    }
    setEditingChatId(null);
  };

  const Icon = ({ name, className, filled }) => {
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
      case 'pin':
        return (
          <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
        );
      case 'edit':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
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
      <aside className={`h-full flex flex-col bg-white dark:bg-background border-r border-gray-200 dark:border-border relative transition-all duration-300 ${collapsed ? 'w-20' : 'w-80'}`}>
        {/* Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-accent"></div>

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-6 z-10 w-6 h-6 bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-full flex items-center justify-center text-gray-600 dark:text-muted hover:text-accent-active dark:hover:text-info hover:border-accent transition-all shadow-md"
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
        <div className="p-4 border-b border-gray-200 dark:border-border">
          <button
            onClick={onNew}
            className={`w-full group relative overflow-hidden bg-accent text-background rounded-lg transition-colors shadow-sm ${collapsed ? 'p-3' : 'p-3.5'}`}
            title={collapsed ? "New Chat" : ""}
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-center gap-2'} relative z-10`}>
              <Icon name="new" className="w-5 h-5" />
              {!collapsed && <span className="font-semibold">New Chat</span>}
            </div>
            {/* Shine effect */}
            {!collapsed && <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-white/20"></div>}
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          {chats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <div className="w-16 h-16 rounded-card bg-gray-100 dark:bg-surface-elevated flex items-center justify-center mb-4 text-gray-500 dark:text-muted">
                <Icon name="chat" className="w-8 h-8" />
              </div>
              <p className="text-sm text-gray-600 dark:text-secondary font-semibold mb-1">No conversations yet</p>
              <p className="text-xs text-gray-500 dark:text-muted">Click "New Chat" to start</p>
            </div>
          )}

          {[...chats]
            .filter(c => !currentWorkspace || c.workspace_id === currentWorkspace.id)
            .sort((a, b) => {
              if (Boolean(b.pinned) !== Boolean(a.pinned)) {
                return b.pinned ? 1 : -1;
              }
              return new Date(b.updated_at || b.updatedAt || 0) - new Date(a.updated_at || a.updatedAt || 0);
            })
            .map((c) => (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`
                group relative p-3 rounded-xl cursor-pointer transition-all duration-200
                ${c.id === activeId
                    ? 'bg-accent/10 dark:bg-accent/10 border border-accent/30 dark:border-accent/30'
                    : 'hover:bg-gray-50 dark:hover:bg-surface-hover/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                  }
                ${c.pinned ? 'ring-1 ring-amber-400/40 dark:ring-amber-500/30' : ''}
              `}
              >
                <div className="flex items-start gap-2.5">
                  {/* Avatar */}
                  <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                  ${c.id === activeId
                      ? 'bg-accent text-background'
                      : 'bg-gray-100 dark:bg-surface-elevated text-gray-600 dark:text-muted'
                    }
                `}>
                    {(c.title || 'C').charAt(0).toUpperCase()}
                    {c.pinned && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-warning text-white flex items-center justify-center shadow-xs">
                        <Icon name="pin" filled className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      {editingChatId === c.id ? (
                        <form onSubmit={(e) => saveRename(c.id, e)} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 w-full">
                          <input
                            autoFocus
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape') setEditingChatId(null); }}
                            className="w-full px-2 py-0.5 text-xs rounded border border-accent/30 dark:border-accent/30 bg-white dark:bg-surface text-gray-900 dark:text-foreground outline-none focus:ring-1 focus:ring-accent/60"
                          />
                          <button type="submit" className="p-1 text-success-ink dark:text-success hover:bg-success dark:hover:bg-success/30 rounded" title="Save">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button type="button" onClick={() => setEditingChatId(null)} className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded" title="Cancel">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </form>
                      ) : (
                        <>
                          <h3 className={`text-sm font-semibold truncate ${c.id === activeId ? 'text-accent-active dark:text-foreground' : 'text-gray-800 dark:text-secondary'}`}>
                            {c.title || 'New Chat'}
                          </h3>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {/* Pin / Unpin Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin?.(c.id, !c.pinned);
                              }}
                              className={`p-1 rounded-md transition-all hover:scale-110 ${
                                c.pinned
                                  ? 'text-warning-ink dark:text-warning hover:bg-warning dark:hover:bg-warning/30'
                                  : 'text-gray-500 dark:text-muted hover:text-warning hover:bg-gray-100 dark:hover:bg-surface-hover'
                              }`}
                              title={c.pinned ? "Unpin" : "Pin"}
                            >
                              <Icon name="pin" filled={c.pinned} className="w-3.5 h-3.5" />
                            </button>

                            {/* Rename Button */}
                            <button
                              type="button"
                              onClick={(e) => startRename(c, e)}
                              className="p-1 text-gray-500 dark:text-muted hover:text-accent dark:hover:text-info hover:bg-accent/10 dark:hover:bg-surface-elevated rounded-md transition-all hover:scale-110"
                              title="Rename"
                            >
                              <Icon name="edit" className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ isOpen: true, chatId: c.id });
                              }}
                              className="p-1 text-gray-500 dark:text-muted hover:text-danger hover:bg-danger/10 dark:hover:bg-red-900/30 rounded-md transition-all hover:scale-110"
                              title="Delete"
                            >
                              <Icon name="delete" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs truncate ${c.id === activeId ? 'text-primary-700 dark:text-info font-medium' : 'text-gray-500 dark:text-muted'}`}>
                        {c.messages?.length ? `${c.messages.length} messages` : 'New conversation'}
                      </p>
                      {c.id === activeId && (
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-border bg-gray-50 dark:bg-surface">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-muted">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <span className="font-medium">Online</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-muted">
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
