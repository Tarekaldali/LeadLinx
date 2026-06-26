'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, createContext, useContext, useCallback, Suspense } from 'react';
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
  const [activeTab, setActiveTab] = useState('discovery');
  const [activeSidebarChatId, setActiveSidebarChatId] = useState(null);

  // Feature flag: toggle Monitors visibility without deleting code
  const SHOW_MONITORS = process.env.NEXT_PUBLIC_SHOW_MONITORS === 'true';

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
    
    // Initial fetch
    fetch('/api/chats')
      .then(r => r.json())
      .then(d => setChats(d.chats || []))
      .catch(() => { });
    // NOTE: No periodic polling here — calling update() on a timer causes
    // full page re-renders which breaks the UX. Credits are refreshed
    // reactively via updateCredits() when an action returns new values.
  }, [loading, session]);

  const handleLogout = async () => {
    localStorage.removeItem('leadlinx.activeChatId');
    await signOut({ redirect: false, callbackUrl: '/' });
    router.replace('/');
    router.refresh();
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
        setShowConfirmDelete(null); // close modal immediately
        // If we are currently in this chat, navigate to a new chat state
        if (activeSidebarChatId === chatId) {
          setActiveSidebarChatId(null);
          window.dispatchEvent(new CustomEvent('newChat'));
        }
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      setShowConfirmDelete(null);
    }
  };

  useEffect(() => {
    const onSwitchTab = (e) => { setActiveTab(e.detail.tab); };
    window.addEventListener('switchTab', onSwitchTab);
    return () => window.removeEventListener('switchTab', onSwitchTab);
  }, []);

  const tierConfig = getTierConfig(user?.plan);
  const maxCredits = tierConfig.maxCredits;
  const currentCredits = localCredits !== null ? localCredits : (user?.credits || 0);
  const creditsPercent = Math.min(100, Math.round((currentCredits / maxCredits) * 100));
  const filteredPrompts = promptFilter === 'All' ? PROMPT_LIBRARY : PROMPT_LIBRARY.filter(p => p.category === promptFilter);

  const Sidebar = (
    <aside className="w-72 h-full bg-sidebar flex flex-col border-r border-sidebar-border overflow-hidden">
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <Link href="/">
          <div className="flex items-center gap-3 group">
            <span className="font-extrabold text-2xl tracking-tight flex items-center">
              <span className="text-[#ff3b30]">Lead</span>
              <span className="text-on-surface">Linx</span>
            </span>
          </div>
        </Link>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-2 px-4 space-y-1 custom-scrollbar">

        {/* New Chat */}
        <Link
          href="/dashboard"
          id="new-chat-btn"
          onClick={() => { setSidebarOpen(false); window.dispatchEvent(new CustomEvent('newChat')); }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-outline-variant hover:border-[#d2d2d7] hover:bg-surface transition-all mb-6 group shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px] text-[#ff3b30] group-hover:rotate-90 transition-transform">add_circle</span>
          <span className="text-sm font-semibold text-on-surface">New Extraction Chat</span>
        </Link>

        {/* Navigation Section */}
        <div className="pb-4">
          <div className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-2">Navigation</div>
          
          <button
            onClick={() => { 
              setSidebarOpen(false); 
              if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/')) {
                window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'discovery' } }));
              } else {
                router.push('/dashboard#discovery');
              }
            }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left transition-all ${pathname === '/dashboard' && activeTab === 'discovery' ? 'text-on-surface bg-surface shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">explore</span>
            <span className="text-sm font-medium">Find Leads</span>
          </button>

          <button
            onClick={() => { 
              setSidebarOpen(false); 
              if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/')) {
                window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'leads' } }));
              } else {
                router.push('/dashboard#leads');
              }
            }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left transition-all mt-1 ${pathname.startsWith('/dashboard/saved') || (pathname === '/dashboard' && activeTab === 'leads') ? 'text-on-surface bg-surface shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span className="text-sm font-medium">Leads</span>
          </button>

          {SHOW_MONITORS && (
            <button
              onClick={() => { 
                setSidebarOpen(false); 
                if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/')) {
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'monitors' } }));
                } else {
                  router.push('/dashboard#monitors');
                }
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left transition-all mt-1 ${pathname === '/dashboard' && activeTab === 'monitors' ? 'text-on-surface bg-surface shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'}`}
            >
              <span className="material-symbols-outlined text-[20px]">sensors</span>
              <span className="text-sm font-medium">Monitors</span>
            </button>
          )}

          <Link
            href="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left transition-all mt-1 ${pathname.startsWith('/dashboard/settings') ? 'text-on-surface bg-surface shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-sm font-medium">Settings</span>
          </Link>
        </div>

        {/* Chats Section */}
        <div className="pb-4">
          <div className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-2 flex items-center justify-between">
            <span>Recent History</span>
            <button onClick={() => setChatsCollapsed(p => !p)} className="hover:text-on-surface">
              <span className={`material-symbols-outlined text-[14px] transition-transform ${chatsCollapsed ? '' : 'rotate-180'}`}>expand_less</span>
            </button>
          </div>

          {!chatsCollapsed && (
            <div className="space-y-0.5">
              {chats.length === 0 ? (
                <p className="text-[11px] text-on-surface-variant px-4 py-2 italic font-mono text-center">Empty history</p>
              ) : (
                chats.slice(0, 8).map(chat => (
                  <div key={chat._id} className={`group flex items-center justify-between rounded-xl transition-colors ${activeSidebarChatId === chat._id ? 'bg-surface border border-outline-variant' : 'hover:bg-surface/50'}`}>
                    <Link
                      href="/dashboard"
                      onClick={() => {
                        setSidebarOpen(false);
                        setActiveSidebarChatId(chat._id);
                        window.dispatchEvent(new CustomEvent('loadChat', { detail: { chatId: chat._id } }));
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 flex-1 min-w-0 ${activeSidebarChatId === chat._id ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      <span className={`material-symbols-outlined text-[18px] shrink-0 ${activeSidebarChatId === chat._id ? 'text-[#ff3b30] opacity-100' : 'opacity-40'}`}>chat_bubble</span>
                      <span className="truncate text-xs font-medium flex-1">{chat.title || 'New Chat'}</span>
                      {activeSidebarChatId === chat._id && (
                        <span className="w-1.5 h-1.5 bg-[#ff3b30] rounded-full shrink-0" />
                      )}
                    </Link>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirmDelete(chat._id); }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-on-surface-variant hover:text-[#ff3b30] transition-all mr-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {user?.role === 'admin' && (
          <div className="pb-4">
            <div className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-2">Admin</div>
            <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#ff3b30] hover:bg-[#ff3b30]/5 transition-all">
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              <span className="text-sm font-bold">Admin Console</span>
            </Link>
          </div>
        )}
      </div>

      {/* Credits + User footer */}
      <div className="shrink-0 border-t border-sidebar-border p-6 space-y-6 bg-sidebar">
        {/* Credits bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Growth Engine</span>
            <span className="text-[10px] font-bold text-[#ff3b30] uppercase tracking-widest">{user?.plan || 'free'}</span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-xl font-bold text-on-surface">{currentCredits.toLocaleString()}</span>
            <span className="text-[11px] text-on-surface-variant font-medium">/ {maxCredits.toLocaleString()} credits</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${creditsPercent}%`,
                background: `#ff3b30`,
              }}
            />
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface/30 border border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-surface border border-sidebar-border flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-on-surface uppercase">
              {(user?.name || user?.email || 'U').substring(0, 1)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-on-surface truncate">{user?.name}</div>
            <div className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#28cd41] rounded-full" />
              Active Now
            </div>
          </div>
          <button onClick={handleLogout} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-all">
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <DashboardContext.Provider value={{ user, refreshUser, updateCredits, addChat, activeTab, setActiveTab }}>
      <div className="flex h-screen overflow-hidden bg-background text-on-surface selection:bg-[#ff3b30]/10 selection:text-[#ff3b30]">
        
        {loading && (
          <div className="absolute inset-0 z-50 bg-sidebar flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sidebar-muted text-sm">Loading LeadLinx...</span>
            </div>
          </div>
        )}

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Desktop sidebar */}
        <div className="hidden md:flex shrink-0">{Sidebar}</div>

        {/* Mobile sidebar */}
        <div className={`fixed inset-y-0 left-0 z-[70] md:hidden transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {Sidebar}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center gap-3 px-6 py-4 bg-sidebar border-b border-sidebar-border shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="text-on-surface">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <Link href="/" className="flex-1 flex items-center">
              <span className="font-extrabold text-xl tracking-tight">
                <span className="text-[#ff3b30]">Lead</span>
                <span className="text-on-surface">Linx</span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low rounded-full border border-outline-variant">
              <span className="material-symbols-outlined text-[14px] text-[#ff3b30]">bolt</span>
              <span className="text-[10px] font-bold text-on-surface">{currentCredits}</span>
            </div>
          </div>

          {/* Page content */}
          {pathname === '/dashboard' ? (
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative z-10">
              <Suspense fallback={<div>Loading...</div>}>
                {children}
              </Suspense>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
              <div className="max-w-7xl mx-auto p-6 md:p-10">
                <Suspense fallback={<div>Loading...</div>}>
                  {children}
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prompt Library Modal - Optimized for Light Theme */}
      {promptLibraryOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setPromptLibraryOpen(false)}>
          <div className="bg-surface border border-outline-variant rounded-[32px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-10 border-b border-surface-container-highest relative bg-surface-dim">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#ff3b30] flex items-center justify-center shadow-lg shadow-red-500/20">
                    <span className="material-symbols-outlined text-white text-[24px]">auto_awesome</span>
                  </div>
                  <div>
                    <h2 className="font-bold text-2xl text-on-surface tracking-tight">Intelligence Library</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Battle-tested prompts for elite lead extraction.</p>
                  </div>
                </div>
                <button onClick={() => setPromptLibraryOpen(false)} className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              {/* Filters */}
              <div className="flex gap-2 mt-8 flex-wrap relative z-10">
                {PROMPT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPromptFilter(cat)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${promptFilter === cat
                        ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-lg shadow-black/10'
                        : 'bg-surface border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-[#d2d2d7]'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-surface">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPrompts.map((p, i) => (
                  <div key={i} className="group relative bg-surface-dim border border-outline-variant rounded-2xl p-6 hover:bg-surface hover:border-[#ff3b30]/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    onClick={() => {
                      setPromptLibraryOpen(false);
                      router.push('/dashboard');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('usePrompt', { detail: { prompt: p.prompt } })), 200);
                    }}
                  >
                    <div className="text-[10px] font-black text-[#ff3b30] mb-3 uppercase tracking-widest">{p.category}</div>
                    <div className="text-base font-bold text-on-surface mb-2 group-hover:text-[#ff3b30] transition-colors">{p.title}</div>
                    <div className="text-xs text-on-surface-variant line-clamp-2 italic leading-relaxed font-medium">"{p.prompt}"</div>
                    <div className="mt-6 flex items-center gap-2 text-[10px] text-[#ff3b30] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                      <span>Inject into engine</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
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
        title="Delete History"
        message="Are you sure you want to purge this intelligence data? This action is irreversible."
        confirmText="Confirm Deletion"
        type="danger"
      />
    </DashboardContext.Provider>
  );
}
