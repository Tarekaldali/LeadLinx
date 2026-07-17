'use client';
import Image from 'next/image';

export default function ChatSidebar({ chats, activeChatId, onNewChat, onLoadChat, onDeleteChat, credits, isOpen, onClose }) {
  return (
    <aside className={`
      fixed md:relative z-40 md:z-auto
      w-72 h-full flex flex-col
      bg-surface-container border-r border-border-glass
      transition-transform duration-300
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border-glass">
        <div className="flex items-center gap-2">
          <Image src="/logo-new.png" alt="LeadLinx" width={32} height={32} className="object-contain" />
          <span className="font-bold text-on-surface text-sm">LeadLinx AI</span>
        </div>
        <button onClick={onClose} className="md:hidden text-on-surface-variant">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {/* New Chat button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          id="new-chat-btn"
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-sm text-primary">add</span>
          New Chat
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {chats.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-6 px-4">
            No chats yet. Start a conversation!
          </p>
        ) : (
          chats.map(chat => (
            <div
              key={chat._id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                activeChatId === chat._id
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
              onClick={() => onLoadChat(chat._id)}
            >
              <span className="material-symbols-outlined text-sm opacity-50 shrink-0">chat_bubble</span>
              <span className="text-sm truncate flex-1">{chat.title || 'New Chat'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteChat(chat._id); }}
                className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-opacity ml-1 shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Credits + nav */}
      <div className="p-3 border-t border-border-glass space-y-1">
        {credits !== null && (
          <div className="px-3 py-2 rounded-lg bg-primary-container/40 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-data-label">CREDITS</span>
            <span className="text-sm font-data-value text-primary">{credits}</span>
          </div>
        )}
        <a href="/dashboard/saved" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined text-sm text-secondary">bookmark</span>
          Saved Leads
        </a>
        <a href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined text-sm">settings</span>
          Settings
        </a>
        {(!user?.plan || user.plan === 'free') && (
          <a href="/pricing" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-sm text-tertiary">upgrade</span>
            Upgrade Plan
          </a>
        )}
      </div>
    </aside>
  );
}
