'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatMessage from '@/components/ChatMessage';
import { useDashboard } from './layout';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { updateCredits, addChat, user } = useDashboard() || {};

  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Listen for sidebar events: new chat, load chat, use prompt
  useEffect(() => {
    const onNewChat = () => { setActiveChatId(null); setMessages([]); setInput(''); };
    const onLoadChat = async (e) => {
      const { chatId } = e.detail;
      try {
        const res = await fetch(`/api/chats/${chatId}`);
        const data = await res.json();
        setActiveChatId(chatId);
        setMessages(data.chat?.messages || []);
      } catch { showToast('Failed to load chat', 'error'); }
    };
    const onUsePrompt = (e) => {
      setInput(e.detail.prompt);
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    window.addEventListener('newChat', onNewChat);
    window.addEventListener('loadChat', onLoadChat);
    window.addEventListener('usePrompt', onUsePrompt);
    return () => {
      window.removeEventListener('newChat', onNewChat);
      window.removeEventListener('loadChat', onLoadChat);
      window.removeEventListener('usePrompt', onUsePrompt);
    };
  }, []);

  // Auto-run ?q= from landing page
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      window.history.replaceState({}, '', '/dashboard');
      setTimeout(() => sendMessage(q), 300);
    }
  }, []); // eslint-disable-line

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (overrideInput) => {
    const query = (overrideInput || input).trim();
    if (!query || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { id: Date.now().toString(), role: 'user', content: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    let chatId = activeChatId;
    if (!chatId) {
      try {
        const res = await fetch('/api/chats', { method: 'POST' });
        const data = await res.json();
        chatId = data.chatId;
        setActiveChatId(chatId);
        addChat?.({ _id: chatId, title: query.substring(0, 45), updatedAt: new Date() });
      } catch { /* continue without persisting */ }
    }

    try {
      const res = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, chatId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Search failed');

      if (data.creditsRemaining !== undefined) updateCredits?.(data.creditsRemaining);

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: query,
        leads: data.leads || [],
        insights: data.insights || null,
        selectedSubreddits: data.selectedSubreddits || [],
        expandedQueries: data.expandedQueries || [],
        totalScanned: data.totalPostsScanned || 0,
        suggestedQueries: data.suggestedQueries || [],
        planLimit: data.planLimit || 10,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Persist to DB
      if (chatId) {
        const allMessages = [...messagesRef.current.filter(m => m.id !== userMsg.id), userMsg, assistantMsg];
        fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages, title: query.substring(0, 50) }),
        }).catch(() => {});
        addChat?.({ _id: chatId, title: query.substring(0, 45), updatedAt: new Date() });
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: query,
        error: err.message,
        leads: [],
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeChatId, updateCredits, addChat]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const exportCSV = (leads) => {
    if (!leads?.length) return;
    const headers = ['Title', 'Score', 'Reason', 'Subreddit', 'Link', 'Urgency', 'User Type'];
    const rows = leads.map(l => [
      `"${(l.title || '').replace(/"/g, '""')}"`,
      l.intentScore || '',
      `"${(l.intentReason || '').replace(/"/g, '""')}"`,
      l.subreddit || '',
      l.link || '',
      l.urgency || '',
      l.userType || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leads.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${leads.length} leads`);
  };

  const saveLead = async (lead) => {
    try {
      const res = await fetch('/api/leads/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const d = await res.json();
      showToast(res.ok ? (d.message || 'Saved!') : (d.error || 'Failed'), res.ok ? 'success' : 'error');
    } catch { showToast('Failed to save', 'error'); }
  };

  const handleSuggestionClick = useCallback((q) => {
    setInput(q);
    setTimeout(() => sendMessage(q), 100);
  }, [sendMessage]);

  return (
    <div className="flex flex-col h-full bg-surface-dim">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestion={handleSuggestionClick} />
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSave={saveLead}
                onExport={exportCSV}
                onSuggestionClick={handleSuggestionClick}
              />
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full gradient-purple flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                </div>
                <div className="bento-card px-5 py-4 flex items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <span className="text-sm text-on-surface-variant">AI selecting subreddits and scanning...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border-glass bg-white px-4 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 focus-within:border-primary focus-within:shadow-sm transition-all">
            <textarea
              ref={inputRef}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-on-surface text-sm font-body placeholder:text-on-surface-variant max-h-32"
              placeholder="Describe the buyers you're looking for... e.g. 'people frustrated with Shopify fees'"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl gradient-purple flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-white text-sm">send</span>
              }
            </button>
          </div>
          <p className="text-center text-xs text-on-surface-variant mt-2">
            AI automatically selects buyer communities on Reddit
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-scale-in ${
          toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>{toast.msg}</div>
      )}
    </div>
  );
}

function WelcomeScreen({ onSuggestion }) {
  const examples = [
    { icon: '🔍', text: 'People frustrated with Salesforce pricing', label: 'CRM' },
    { icon: '🎨', text: 'Looking for AI image generation tools', label: 'AI Tools' },
    { icon: '🛒', text: 'Switching from Shopify to alternatives', label: 'Ecommerce' },
    { icon: '📊', text: 'Need a better analytics dashboard', label: 'Analytics' },
    { icon: '📧', text: 'Email marketing platform too expensive', label: 'Marketing' },
    { icon: '🚀', text: 'Looking for project management tool', label: 'Productivity' },
  ];
  return (
    <div className="flex-1 flex items-center justify-center min-h-full py-12 px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <div className="w-16 h-16 rounded-2xl gradient-purple flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="material-symbols-outlined text-white text-3xl">smart_toy</span>
          </div>
          <h1 className="text-2xl font-headline text-on-surface mb-2">Find Your Best Leads</h1>
          <p className="text-on-surface-variant">Tell me what kind of buyers you&apos;re looking for. I&apos;ll find the right Reddit communities and surface high-intent prospects.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {examples.map((ex) => (
            <button
              key={ex.text}
              onClick={() => onSuggestion(ex.text)}
              className="bento-card p-4 text-left hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{ex.icon}</span>
                <div>
                  <div className="text-xs font-data-label text-primary mb-1">{ex.label}</div>
                  <div className="text-sm text-on-surface group-hover:text-primary transition-colors">{ex.text}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
