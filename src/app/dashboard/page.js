'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ChatMessage from '@/components/ChatMessage';
import { useDashboard } from './layout';

import './dashboard.css';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const { updateCredits, addChat, activeTab, setActiveTab } = useDashboard() || {};
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

  // Sidebar listeners
  useEffect(() => {
    const onNewChat = () => { setActiveTab('discovery'); setActiveChatId(null); setMessages([]); setInput(''); };
    const onLoadChat = async (e) => {
      const { chatId } = e.detail;
      try {
        const res = await fetch(`/api/chats/${chatId}`);
        const data = await res.json();
        setActiveTab('discovery');
        setActiveChatId(chatId);
        setMessages(data.chat?.messages || []);
      } catch { showToast('Failed to load chat', 'error'); }
    };
    const onUsePrompt = (e) => {
      setActiveTab('discovery');
      setInput(e.detail.prompt);
      setTimeout(() => textareaRef.current?.focus(), 100);
    };

    const onSwitchTab = (e) => { setActiveTab?.(e.detail.tab); };

    window.addEventListener('newChat', onNewChat);
    window.addEventListener('loadChat', onLoadChat);
    window.addEventListener('usePrompt', onUsePrompt);
    window.addEventListener('switchTab', onSwitchTab);
    return () => {
      window.removeEventListener('newChat', onNewChat);
      window.removeEventListener('loadChat', onLoadChat);
      window.removeEventListener('usePrompt', onUsePrompt);
      window.removeEventListener('switchTab', onSwitchTab);
    };
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab?.(tab);
  }, [searchParams, setActiveTab]);

  // Scroll logic
  useEffect(() => {
    if (activeTab === 'discovery') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, activeTab]);

  const hasAutoFired = useRef(false);
  const sendMessage = useCallback(async (overrideInput) => {
    const query = (typeof overrideInput === 'string' ? overrideInput : input).trim();
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
      } catch { /* fail silent */ }
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
        content: data.status === 'chat' ? data.message : query,
        searchId: data.searchId,
        status: data.status || 'processing',
        leads: data.leads || [],
        insights: data.insights || null,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (chatId) {
        const allMessages = [...messagesRef.current.filter(m => m.id !== userMsg.id), userMsg, assistantMsg];
        fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages, title: query.substring(0, 50) }),
        }).catch(() => { });
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: query,
        error: err.message,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeChatId, updateCredits, addChat]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !hasAutoFired.current) {
      hasAutoFired.current = true;
      setInput(q);
      router.replace('/dashboard', { scroll: false });
      setTimeout(() => sendMessage(q), 100);
    }
  }, [searchParams, sendMessage]);

  const handleSuggestionClick = (q) => {
    setInput(q);
    setTimeout(() => sendMessage(q), 100);
  };

  const handleSaveLead = async (lead) => {
    try {
      const res = await fetch('/api/leads/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Lead saved successfully!');
      } else {
        throw new Error(data.error || 'Failed to save lead');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const renderDiscovery = () => (
    <div className="messages-area">
      <div className="chat-max-width">
        {messages.length === 0 ? (
          <div className="welcome-focus animate-in">
            <h1 className="welcome-title">How can I help you today?</h1>
            <p className="welcome-subtitle">Search for leads, ask about business automation, or explore growth strategies.</p>

            <div className="suggestion-grid-minimal">
              <div className="suggestion-item" onClick={() => handleSuggestionClick("Find real estate agents in New York")}>
                <div className="suggestion-header">Find Prospects</div>
                <div className="suggestion-body">"Find real estate agents in New York looking for automation."</div>
              </div>
              <div className="suggestion-item" onClick={() => handleSuggestionClick("How can I automate my sales follow-ups?")}>
                <div className="suggestion-header">Automation Strategy</div>
                <div className="suggestion-body">"How can I automate my sales follow-ups with LeadLinx?"</div>
              </div>
              <div className="suggestion-item" onClick={() => handleSuggestionClick("Analyze r/SaaS for growth hacks")}>
                <div className="suggestion-header">Market Analysis</div>
                <div className="suggestion-body">"Analyze r/SaaS for the latest growth hacks and trends."</div>
              </div>
              <div className="suggestion-item" onClick={() => handleSuggestionClick("Write a cold email for digital agencies")}>
                <div className="suggestion-header">Content Creation</div>
                <div className="suggestion-body">"Write a high-converting cold email for digital agencies."</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="message-bubble-human animate-in">
                <div className={`avatar-minimal ${msg.role === 'assistant' ? 'avatar-ai' : ''}`}>
                  {msg.role === 'assistant' ? 'AI' : (session?.user?.name?.[0] || 'U')}
                </div>
                <div className="message-text">
                  <ChatMessage message={msg} onSave={handleSaveLead} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-bubble-human animate-in">
                <div className="avatar-minimal avatar-ai">AI</div>
                <div className="message-text">
                  <div className="flex gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );

  const [savedLeads, setSavedLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const fetchSavedLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/leads/saved');
      const data = await res.json();
      if (res.ok) setSavedLeads(data.leads || []);
    } catch { showToast('Failed to load leads', 'error'); }
    finally { setLoadingLeads(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'leads') fetchSavedLeads();
  }, [activeTab, fetchSavedLeads]);

  const renderLeads = () => (
    <div className="p-8 max-w-7xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#1d1d1f]">Leads CRM</h2>
          <p className="text-sm text-[#86868b] mt-1">Every prospect extracted across all intelligence sessions.</p>
        </div>
        <button className="px-4 py-2 bg-[#ff3b30] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[#d72f25] transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">download</span> Export All
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#e5e5e7] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5f5f7] border-b border-[#e5e5e7]">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prospect</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Intent</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subreddit</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e7]">
              {loadingLeads ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-sm text-[#86868b]">Loading intelligence data...</td></tr>
              ) : savedLeads.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-sm text-[#86868b]">No prospects saved yet. Use Discovery to find leads.</td></tr>
              ) : (
                savedLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-[#fbfbfd] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#1d1d1f]">u/{lead.author}</div>
                      <div className="text-[11px] text-[#86868b] line-clamp-1 italic">"{lead.postTitle || lead.content}"</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 ${lead.score >= 8 ? 'bg-[#28cd41]/10 text-[#28cd41] border-[#28cd41]/20' : 'bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/20'} text-[10px] font-bold rounded-full border`}>
                        {lead.score || lead.intentScore || '0'}/10
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-[#86868b]">r/{lead.subreddit}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/5 rounded-lg">
                        <span className="material-symbols-outlined text-[20px]">edit_note</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMonitors = () => (
    <div className="p-8 max-w-7xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-2xl font-bold text-[#1d1d1f]">Surveillance Monitors</h2>
          <p className="text-sm text-[#86868b] mt-1">Real-time background listeners watching subreddits for buying signals.</p>
        </div>
        <button className="px-6 py-3 bg-[#ff3b30] text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">sensors</span> Create Live Monitor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-[28px] border border-[#e5e5e7] shadow-sm relative overflow-hidden group hover:border-[#0071e3]/30 transition-all">
          <div className="absolute top-0 right-0 p-4">
             <div className="flex items-center gap-1.5 px-2 py-1 bg-[#28cd41]/10 rounded-full border border-[#28cd41]/20">
               <span className="w-1.5 h-1.5 bg-[#28cd41] rounded-full animate-pulse" />
               <span className="text-[9px] font-bold text-[#28cd41] uppercase">Live</span>
             </div>
          </div>
          <div className="w-12 h-12 bg-[#f5f5f7] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[#ff3b30]">search</span>
          </div>
          <h3 className="text-lg font-bold text-[#1d1d1f] mb-1">r/SaaS Keywords</h3>
          <p className="text-[11px] text-[#86868b] mb-6 font-medium">Watching: "CRM", "Email Marketing", "Frustrated"</p>
          
          <div className="flex items-center justify-between pt-6 border-t border-[#f2f2f2]">
            <div>
              <div className="text-xl font-bold text-[#1d1d1f]">24</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Leads Today</div>
            </div>
            <button className="w-10 h-10 rounded-xl bg-[#f5f5f7] hover:bg-[#e5e5e7] flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[18px] text-[#1d1d1f]">settings</span>
            </button>
          </div>
        </div>

        <button className="bg-[#fbfbfd] p-8 rounded-[28px] border-2 border-dashed border-[#e5e5e7] flex flex-col items-center justify-center text-center hover:bg-white hover:border-[#0071e3]/40 transition-all group">
          <div className="w-14 h-14 rounded-full bg-white border border-[#e5e5e7] flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[#86868b] group-hover:text-[#ff3b30]">add_circle</span>
          </div>
          <h4 className="text-sm font-bold text-[#1d1d1f]">Monitor a Subreddit</h4>
          <p className="text-[11px] text-[#86868b] mt-1 max-w-[180px]">Automate your growth by listening to specific communities 24/7.</p>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      <div className="h-[72px] shrink-0 border-b border-[#e5e5e7] flex items-center px-8 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="tab-container">
          <div onClick={() => setActiveTab('discovery')} className={`tab-item ${activeTab === 'discovery' ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-[20px]">explore</span>
            Discovery
          </div>
          <div onClick={() => setActiveTab('leads')} className={`tab-item ${activeTab === 'leads' ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-[20px]">group</span>
            Leads
          </div>
          <div onClick={() => setActiveTab('monitors')} className={`tab-item ${activeTab === 'monitors' ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-[20px]">sensors</span>
            Monitors
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'discovery' && renderDiscovery()}
          {activeTab === 'leads' && renderLeads()}
          {activeTab === 'monitors' && renderMonitors()}
        </div>

        {activeTab === 'discovery' && (
          <div className="input-container">
            <div className="chat-max-width">
              <div className="input-wrapper">
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  placeholder="Find leads for my SaaS in specific subreddits..."
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 192) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  className="send-btn shadow-lg shadow-red-500/20"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 px-1">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-[#28cd41] rounded-full" />
                  Neural Extraction Engine Active
                </div>
                <div className="text-[9px] font-bold text-gray-400 font-mono">v3.0.0-LIGHT</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-12 right-6 z-[100] px-6 py-4 rounded-2xl text-sm font-bold shadow-2xl animate-in border ${
          toast.type === 'error' 
            ? 'bg-red-50 text-red-600 border-red-100' 
            : 'bg-[#1d1d1f] text-white border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
