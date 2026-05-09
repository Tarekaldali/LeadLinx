'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import ConfirmationModal from '@/components/ConfirmationModal';
import Modal from '@/components/Modal';

const DashboardContext = createContext(null);
export function useDashboard() { return useContext(DashboardContext); }

// ── Prompt Library data (LeadLinx-specific, not copied from reference) ───────
const PROMPT_LIBRARY = [
  { category: 'Find Buyers', title: 'People frustrated with their current CRM', prompt: 'find people complaining about their CRM or looking for a better sales tool' },
  { category: 'Find Buyers', title: 'Entrepreneurs looking for automation tools', prompt: 'find founders or small business owners looking to automate repetitive tasks' },
  { category: 'Pain Points', title: 'Users struggling with expensive SaaS', prompt: 'find people saying their current software is too expensive and looking for alternatives' },
  { category: 'Pain Points', title: 'Designers overwhelmed with client work', prompt: 'find freelance designers who are overwhelmed and looking for tools to save time' },
  { category: 'High Intent', title: 'Switching from Shopify to alternatives', prompt: 'find people who want to leave Shopify or are comparing ecommerce platforms' },
  { category: 'High Intent', title: 'Looking for AI image generation tools', prompt: 'find people asking for recommendations on AI tools to generate or edit images' },
  { category: 'High Intent', title: 'Need a project management tool', prompt: 'find teams looking for a new project management or task tracking tool' },
  { category: 'High Intent', title: 'Marketing tools for small business', prompt: 'find small business owners looking for affordable marketing or email tools' },
];

const PROMPT_CATEGORIES = ['All', 'Find Buyers', 'Pain Points', 'High Intent'];

import { PRICING_CONFIG, getTierConfig } from '@/lib/pricingConfig';
import { useSession, signOut } from "next-auth/react";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  const [promptFilter, setPromptFilter] = useState('All');
  const [chatsCollapsed, setChatsCollapsed] = useState(false);

  const user = session?.user;
  const loading = status === "loading";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const refreshUser = useCallback(async () => {
    await update();
  }, [update]);

  // Load chat list for sidebar
  useEffect(() => {
    if (loading || !session) return;
    fetch('/api/chats')
      .then(r => r.json())
      .then(d => setChats(d.chats || []))
      .catch(() => {});
  }, [loading, session]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const [localCredits, setLocalCredits] = useState(null);

  const updateCredits = useCallback(async (newCredits) => {
    setLocalCredits(newCredits);
    // Don't call update() from next-auth as it forces a hard refresh on some versions.
  }, []);

  const addChat = useCallback((chat) => {
    setChats(prev => [chat, ...prev.filter(c => c._id !== chat._id)]);
  }, []);

  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  const handleDeleteChat = async (chatId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (res.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        // If we are currently in this chat, navigate to a new chat state
        window.dispatchEvent(new CustomEvent('newChat'));
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sidebar-muted text-sm">Loading LeadLinx...</span>
        </div>
      </div>
    );
  }

  const tierConfig = getTierConfig(user?.plan);
  const maxCredits = tierConfig.maxCredits;
  const currentCredits = localCredits !== null ? localCredits : (user?.credits || 0);
  const creditsPercent = Math.min(100, Math.round((currentCredits / maxCredits) * 100));
  const filteredPrompts = promptFilter === 'All' ? PROMPT_LIBRARY : PROMPT_LIBRARY.filter(p => p.category === promptFilter);

  const Sidebar = (
    <aside className="w-72 h-full bg-sidebar flex flex-col border-r border-sidebar-border overflow-hidden">
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border shrink-0">
        <a href="/">
        <div className="flex items-center gap-2.5" >
          <div className="w-7 h-7 rounded-lg gradient-purple flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">bolt</span>
          </div>
          <span className="font-bold text-sidebar-fg text-base tracking-tight">LeadLinx</span>
        </div>
        </a>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-sidebar-muted hover:text-sidebar-fg transition-colors">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">

        {/* New Chat */}
        <Link
          href="/dashboard"
          id="new-chat-btn"
          onClick={() => { setSidebarOpen(false); window.dispatchEvent(new CustomEvent('newChat')); }}
          className="sidebar-item sidebar-item-action w-full flex items-center gap-2.5 mb-3"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
          <span className="text-sm font-semibold">New Chat</span>
        </Link>

        {/* Chats Section */}
        <div className="pb-1">
          <button
            onClick={() => setChatsCollapsed(p => !p)}
            className="flex items-center gap-2 px-2 py-1.5 w-full text-left group"
          >
            <span className="material-symbols-outlined text-[14px] text-sidebar-muted">folder_open</span>
            <span className="text-xs font-semibold text-sidebar-muted tracking-widest uppercase flex-1">Recent Chats</span>
            <span className={`material-symbols-outlined text-[14px] text-sidebar-muted transition-transform ${chatsCollapsed ? '' : 'rotate-180'}`}>expand_less</span>
          </button>

          {!chatsCollapsed && (
            <div className="mt-1 space-y-0.5">
              {chats.length === 0 ? (
                <p className="text-xs text-sidebar-muted px-3 py-2 italic">No chats yet</p>
              ) : (
                chats.slice(0, 8).map(chat => (
                  <div key={chat._id} className="group relative">
                    <Link
                      href="/dashboard"
                      onClick={() => { setSidebarOpen(false); window.dispatchEvent(new CustomEvent('loadChat', { detail: { chatId: chat._id } })); }}
                      className={`sidebar-item flex items-center gap-2 px-3 py-2 rounded-lg text-sm pr-10 ${pathname === '/dashboard' ? 'text-sidebar-fg hover:bg-sidebar-hover' : 'text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover'}`}
                    >
                      <span className="material-symbols-outlined text-[16px] shrink-0 opacity-50">chat_bubble</span>
                      <span className="truncate text-xs flex-1 min-w-0">{chat.title || 'New Chat'}</span>
                    </Link>
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirmDelete(chat._id); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-sidebar-muted hover:text-red-400 transition-all rounded-md hover:bg-red-400/10"
                      title="Delete chat"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="sidebar-divider" />

        {/* Saved Leads */}
        <Link
          href="/dashboard/saved"
          onClick={() => setSidebarOpen(false)}
          className={`sidebar-item flex items-center gap-2.5 ${pathname.startsWith('/dashboard/saved') ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined text-[18px]">bookmark</span>
          <span className="text-sm">Saved Leads</span>
        </Link>

        {/* Prompt Library */}
        <button
          onClick={() => setPromptLibraryOpen(true)}
          className="sidebar-item flex items-center gap-2.5 w-full text-left"
        >
          <span className="material-symbols-outlined text-[18px]">library_books</span>
          <span className="text-sm">Prompt Library</span>
        </button>

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          onClick={() => setSidebarOpen(false)}
          className={`sidebar-item flex items-center gap-2.5 ${pathname.startsWith('/dashboard/settings') ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span className="text-sm">Settings</span>
        </Link>

        {/* Admin Panel (admins only) */}
        {user?.role === 'admin' && (
          <>
            <div className="sidebar-divider" />
            <Link href="/admin" className="sidebar-item flex items-center gap-2.5 text-primary">
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              <span className="text-sm font-semibold">Admin Panel</span>
            </Link>
          </>
        )}

        <div className="sidebar-divider" />

        {/* Upgrade */}
        <Link href="/pricing" className="sidebar-item flex items-center gap-2.5 text-secondary hover:text-secondary">
          <span className="material-symbols-outlined text-[18px]">upgrade</span>
          <span className="text-sm">Upgrade Plan</span>
        </Link>
      </div>

      {/* Credits + User footer */}
      <div className="shrink-0 border-t border-sidebar-border px-4 py-4 space-y-4">
        {/* Credits bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-sidebar-muted">Credits remaining</span>
            <Link href="/pricing" className="text-xs text-primary font-medium hover:underline">Upgrade</Link>
          </div>
          <div className="text-lg font-bold text-sidebar-fg mb-1.5">
            {currentCredits.toLocaleString()}
            <span className="text-sidebar-muted font-normal text-sm"> / {maxCredits.toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full bg-sidebar-hover overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${creditsPercent}%`,
                background: creditsPercent > 30 ? 'var(--color-primary)' : creditsPercent > 10 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <div className="text-[10px] text-sidebar-muted mt-1 capitalize">{user?.plan || 'free'} plan</div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary uppercase">
              {(user?.name || user?.email || 'U').substring(0, 1)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-sidebar-fg truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} title="Logout" className="text-sidebar-muted hover:text-red-400 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <DashboardContext.Provider value={{ user, refreshUser, updateCredits, addChat }}>
      <div className="flex h-screen overflow-hidden bg-surface-dim">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Desktop sidebar — always visible */}
        <div className="hidden md:flex shrink-0">{Sidebar}</div>

        {/* Mobile sidebar — slide in */}
        <div className={`fixed inset-y-0 left-0 z-40 md:hidden transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {Sidebar}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="text-sidebar-fg">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="font-bold text-sidebar-fg flex-1 text-sm">LeadLinx</span>
            <span className="text-xs text-sidebar-muted">{currentCredits} credits</span>
          </div>

          {/* Page content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Library Modal */}
      {promptLibraryOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPromptLibraryOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-border-glass">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-headline text-xl text-on-surface">Prompt Library</h2>
                <button onClick={() => setPromptLibraryOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-sm text-on-surface-variant">Ready-to-use prompts for finding high-intent leads. Click any prompt to use it.</p>
              {/* Filters */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {PROMPT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPromptFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      promptFilter === cat
                        ? 'bg-primary text-white border-primary'
                        : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPrompts.map((p, i) => (
                  <div key={i} className="bento-card p-4 hover:border-primary/30 transition-all cursor-pointer group"
                    onClick={() => {
                      setPromptLibraryOpen(false);
                      router.push('/dashboard');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('usePrompt', { detail: { prompt: p.prompt } })), 200);
                    }}
                  >
                    <div className="text-xs font-data-label text-primary mb-2">{p.category}</div>
                    <div className="text-sm font-semibold text-on-surface mb-1 group-hover:text-primary transition-colors">{p.title}</div>
                    <div className="text-xs text-on-surface-variant line-clamp-2 italic">"{p.prompt}"</div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-[14px]">send</span>
                      Use this prompt
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modals */}
      <ConfirmationModal 
        isOpen={!!showConfirmDelete}
        onClose={() => setShowConfirmDelete(null)}
        onConfirm={() => handleDeleteChat(showConfirmDelete)}
        title="Delete Chat"
        message="Are you sure you want to delete this chat history? This cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </DashboardContext.Provider>
  );
}
