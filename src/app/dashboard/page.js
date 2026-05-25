'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ChatMessage from '@/components/ChatMessage';
import SettingsContent from '@/components/dashboard/SettingsContent';
import LeadsWorkspace from '@/components/dashboard/LeadsWorkspace';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useDashboard } from './layout';

import './dashboard.css';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const { updateCredits, refreshUser, addChat, activeTab, setActiveTab } = useDashboard() || {};
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Monitor States
  const [monitors, setMonitors] = useState([]);
  const [loadingMonitors, setLoadingMonitors] = useState(false);
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [monitorGoal, setMonitorGoal] = useState('');
  const [creatingMonitor, setCreatingMonitor] = useState(false);
  
  // New Monitor Settings
  const [monitorFrequency, setMonitorFrequency] = useState(60); // minutes
  const [emailAlertEnabled, setEmailAlertEnabled] = useState(false);
  const [emailAlertThreshold, setEmailAlertThreshold] = useState(10);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // monitorId
  const [monitorActionMenu, setMonitorActionMenu] = useState(null); // monitorId of open menu
  const [destroyConfirm, setDestroyConfirm] = useState(null); // monitorId
  const [finishConfirm, setFinishConfirm] = useState(null); // monitorId

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

  // Handle hash-based tab navigation when coming from another page
  useEffect(() => {
    const hash = window.location.hash?.replace('#', '');
    if (hash && ['discovery', 'leads', 'monitors'].includes(hash)) {
      setActiveTab?.(hash);
      // Clean the hash without causing a re-render
      history.replaceState(null, '', window.location.pathname);
    }
    // Also handle ?tab= query param for backward compatibility
    const tab = searchParams.get('tab');
    if (tab && ['discovery', 'leads', 'monitors'].includes(tab)) {
      setActiveTab?.(tab);
    }
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
    refreshUser?.(); // Early refresh to show the 1-credit deduction

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
    // Directly call sendMessage with the prompt as override
    // Don't set input state first - it causes stale closure issues
    sendMessage(q);
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
                  {msg.role === 'user' ? (
                    <p className="text-on-surface text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : msg.error ? (
                    <div className="p-4 bg-red-950/20 border border-red-800/30 rounded-2xl">
                      <p className="text-red-400 text-sm font-medium">{msg.error}</p>
                    </div>
                  ) : msg.status === 'chat' || (!msg.leads && !msg.status) ? (
                    <p className="text-on-surface text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <ChatMessage message={msg} onSave={handleSaveLead} />
                  )}
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

  // Monitors Logic

  const fetchMonitors = useCallback(async () => {
    setLoadingMonitors(true);
    try {
      const res = await fetch('/api/monitors');
      const data = await res.json();
      if (res.ok) setMonitors(data.monitors || []);
    } catch { showToast('Failed to load monitors', 'error'); }
    finally { setLoadingMonitors(false); }
  }, []);


  const handleCreateMonitor = async () => {
    if (!monitorGoal.trim()) return;
    setCreatingMonitor(true);
    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goal: monitorGoal,
          frequency: monitorFrequency,
          emailAlert: {
            enabled: emailAlertEnabled,
            threshold: emailAlertThreshold
          }
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMonitors(prev => [data.monitor, ...prev]);
        setShowMonitorModal(false);
        setMonitorGoal('');
        setMonitorFrequency(60);
        setEmailAlertEnabled(false);
        showToast('Monitor initiated successfully!');
        // Trigger background processor immediately for better UX
        fetch('/api/monitors/process');
      } else {
        throw new Error(data.error || 'Failed to create monitor');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreatingMonitor(false);
    }
  };

  const handleToggleMonitor = async (monitorId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/monitors/${monitorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMonitors(prev => prev.map(m => m._id === monitorId ? { ...m, status: newStatus } : m));
        showToast(`Monitor ${newStatus === 'active' ? 'resumed' : 'stopped'}.`);
      }
    } catch { showToast('Failed to update monitor', 'error'); }
  };

  const handleDeleteMonitor = async (monitorId) => {
    try {
      const res = await fetch(`/api/monitors/${monitorId}`, { method: 'DELETE' });
      if (res.ok) {
        setMonitors(prev => prev.filter(m => m._id !== monitorId));
        showToast('Monitor removed.');
      }
    } catch { showToast('Failed to delete monitor', 'error'); }
  };

  // Destroy: delete monitor + all its leads
  const handleDestroyMonitor = async (monitorId) => {
    try {
      const res = await fetch(`/api/monitors/${monitorId}?destroyLeads=true`, { method: 'DELETE' });
      if (res.ok) {
        setMonitors(prev => prev.filter(m => m._id !== monitorId));
        showToast('Monitor destroyed and all leads purged.');
      }
    } catch { showToast('Failed to destroy monitor', 'error'); }
  };

  // Finish: mark as finished (keep leads), remove from active view
  const handleFinishMonitor = async (monitorId) => {
    try {
      const res = await fetch(`/api/monitors/${monitorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finished' }),
      });
      if (res.ok) {
        setMonitors(prev => prev.filter(m => m._id !== monitorId));
        showToast('Mission complete. All leads preserved in your workspace.');
      }
    } catch { showToast('Failed to finish monitor', 'error'); }
  };

  useEffect(() => {
    // Initial fetch
    fetchMonitors();
  }, [fetchMonitors]);

  // Real-time polling: while on monitors tab, refresh every 15s to show live lead counts
  useEffect(() => {
    if (activeTab !== 'monitors') return;
    const pollInterval = setInterval(() => {
      fetchMonitors();
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [activeTab, fetchMonitors]);

  const renderLeads = () => <LeadsWorkspace />;

  const renderMonitors = () => (
    <div className="p-8 max-w-7xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Surveillance Monitors</h2>
          <p className="text-sm text-on-surface-variant mt-1">Real-time background listeners watching subreddits for buying signals.</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 bg-[#28cd41] rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Auto-refreshing every 15s</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchMonitors(); fetch('/api/monitors/process?secret=leadlinx-monitor-run').catch(() => {}); }}
            className="px-4 py-2.5 border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-2xl text-sm font-semibold transition-all flex items-center gap-2"
            title="Trigger extraction now"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Run Now
          </button>
          <button 
            onClick={() => setShowMonitorModal(true)}
            className="px-6 py-3 bg-[#ff3b30] text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">sensors</span> Create Live Monitor
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loadingMonitors ? (
          <div className="col-span-full py-20 text-center text-on-surface-variant">Waking up surveillance agents...</div>
        ) : monitors.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-outline-variant rounded-[32px] bg-surface-dim">
             <span className="material-symbols-outlined text-[48px] text-[#e5e5e7] mb-4">sensors_off</span>
             <p className="text-on-surface-variant">No active surveillance. Create your first monitor to find leads 24/7.</p>
          </div>
        ) : (
          monitors.map((monitor) => (
            <div key={monitor._id} className={`bg-surface p-6 rounded-[28px] border ${monitor.status === 'active' ? 'border-[#ff3b30]/20 shadow-red-500/5' : 'border-outline-variant'} shadow-sm relative overflow-hidden group hover:shadow-xl transition-all`}>
              <div className="absolute top-0 right-0 p-4 flex gap-2">
                 {monitor.status === 'active' && (
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-[#28cd41]/10 rounded-full border border-[#28cd41]/20">
                     <span className="w-1.5 h-1.5 bg-[#28cd41] rounded-full animate-pulse" />
                     <span className="text-[9px] font-bold text-[#28cd41] uppercase tracking-widest">Live</span>
                   </div>
                 )}
                 {monitor.status === 'paused' && (
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-low rounded-full border border-outline-variant">
                     <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                     <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Paused</span>
                   </div>
                 )}
              </div>
              <div className="w-12 h-12 bg-surface-container-low rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[#ff3b30]">search</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-1 line-clamp-1">{monitor.goal}</h3>
              <p className="text-[11px] text-on-surface-variant mb-6 font-medium line-clamp-1">
                {monitor.strategy?.subreddits?.length > 0 
                  ? `Watching: ${monitor.strategy.subreddits.join(', ')}` 
                  : 'Identifying target subreddits...'}
              </p>
              
              <div className="flex items-center justify-between pt-6 border-t border-surface-container-highest">
                <div className="flex flex-col">
                  <div className="text-xl font-bold text-on-surface">{monitor.stats?.leadsFound || 0}</div>
                  <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Leads Found</div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="text-[10px] font-bold text-on-surface">{monitor.frequency || 60}m</div>
                   <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Frequency</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-[10px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">history</span>
                  {monitor.stats?.lastRun ? new Date(monitor.stats.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never run'}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleMonitor(monitor._id, monitor.status)}
                    className="w-10 h-10 rounded-xl bg-surface-container-low hover:bg-[#ff3b30]/10 flex items-center justify-center transition-all group/btn"
                    title={monitor.status === 'active' ? 'Pause monitor' : 'Resume monitor'}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${monitor.status === 'active' ? 'text-[#ff3b30]' : 'text-on-surface-variant'} group-hover/btn:text-[#ff3b30]`}>
                      {monitor.status === 'active' ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  {/* Action Menu */}
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMonitorActionMenu(monitorActionMenu === monitor._id ? null : monitor._id); }}
                      className="w-10 h-10 rounded-xl bg-surface-container-low hover:bg-red-50 flex items-center justify-center transition-all group/del"
                      title="More actions"
                    >
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover/del:text-red-500">more_vert</span>
                    </button>
                    {monitorActionMenu === monitor._id && (
                      <div className="absolute right-0 bottom-12 z-[60] bg-surface rounded-2xl shadow-2xl border border-outline-variant overflow-hidden min-w-[180px] animate-in zoom-in-95 duration-100">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMonitorActionMenu(null); setFinishConfirm(monitor._id); }}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-on-surface hover:bg-surface-container-low active:scale-95 active:bg-surface-container-high flex items-center gap-3 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px] text-green-500">check_circle</span>
                          Finish
                          <span className="ml-auto text-[9px] font-bold text-on-surface-variant uppercase">Keep Leads</span>
                        </button>
                        <div className="h-px bg-surface-container-high" />
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMonitorActionMenu(null); setDestroyConfirm(monitor._id); }}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-[#ff3b30] hover:bg-red-50 active:scale-95 active:bg-red-100 flex items-center gap-3 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                          Destroy
                          <span className="ml-auto text-[9px] font-bold text-red-300 uppercase">Wipe Leads</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        <button 
          onClick={() => setShowMonitorModal(true)}
          className="bg-surface-dim p-8 rounded-[28px] border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-center hover:bg-surface hover:border-[#ff3b30]/40 transition-all group"
        >
          <div className="w-14 h-14 rounded-full bg-surface border border-outline-variant flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-[#ff3b30]">add_circle</span>
          </div>
          <h4 className="text-sm font-bold text-on-surface">Create New Monitor</h4>
          <p className="text-[11px] text-on-surface-variant mt-1 max-w-[180px]">Automate your growth by listening to specific communities 24/7.</p>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full bg-background">
      <div className="h-[72px] shrink-0 border-b border-outline-variant flex items-center px-8 bg-background/80 backdrop-blur-md sticky top-0 z-40">
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

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'discovery' && renderDiscovery()}
          {activeTab === 'leads' && renderLeads()}
          {activeTab === 'monitors' && renderMonitors()}
        </div>

        {activeTab === 'discovery' && (
          <div className="input-container shrink-0"> 
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
            </div>
          </div>
        )}
      </div>

      {/* Create Monitor Modal */}
      {showMonitorModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1d1d1f]/40 backdrop-blur-sm" onClick={() => !creatingMonitor && setShowMonitorModal(false)} />
          <div className="bg-surface rounded-[32px] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-surface-container-highest">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-[#ff3b30] flex items-center justify-center shadow-lg shadow-red-500/20">
                  <span className="material-symbols-outlined text-white text-[24px]">sensors</span>
                </div>
                <h3 className="text-2xl font-bold text-on-surface">New Surveillance Mission</h3>
              </div>
              <p className="text-sm text-on-surface-variant">Describe your business goal, and our engine will find the best subreddits to monitor 24/7.</p>
            </div>
            
            <div className="p-8">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Business Goal / Target Audience</label>
              <textarea 
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ff3b30]/20 focus:border-[#ff3b30] transition-all min-h-[100px]"
                placeholder="e.g., I sell a website builder for lawyers and I'm looking for people complaining about their current slow sites."
                value={monitorGoal}
                onChange={(e) => setMonitorGoal(e.target.value)}
                disabled={creatingMonitor}
              />

              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 block">Extraction Frequency</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { val: 10, label: '10m', cost: '60c/h' },
                      { val: 30, label: '30m', cost: '20c/h' },
                      { val: 60, label: '1h', cost: '10c/h' },
                      { val: 120, label: '2h', cost: '5c/h' },
                      { val: 180, label: '3h', cost: '3c/h' },
                      { val: 240, label: '4h', cost: '2c/h' }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        onClick={() => setMonitorFrequency(opt.val)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                          monitorFrequency === opt.val 
                            ? 'bg-[#ff3b30] border-[#ff3b30] text-white shadow-md' 
                            : 'bg-surface border-outline-variant text-on-surface hover:border-[#ff3b30]/40'
                        }`}
                      >
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className={`text-[8px] font-medium ${monitorFrequency === opt.val ? 'text-white/80' : 'text-on-surface-variant'}`}>
                          {opt.cost}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Email Notifications</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={emailAlertEnabled}
                        onChange={(e) => setEmailAlertEnabled(e.target.checked)}
                      />
                      <div className="w-10 h-5 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-outline after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ff3b30]"></div>
                    </label>
                  </div>
                  {emailAlertEnabled && (
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant animate-in slide-in-from-top-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-on-surface-variant">Alert me when leads reach:</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="w-16 bg-surface border border-outline-variant rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                            value={emailAlertThreshold}
                            onChange={(e) => setEmailAlertThreshold(parseInt(e.target.value))}
                          />
                          <span className="text-[11px] font-bold text-on-surface">leads</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-surface-dim border-t border-surface-container-highest flex gap-3">
               <button 
                 onClick={() => setShowMonitorModal(false)}
                 disabled={creatingMonitor}
                 className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleCreateMonitor}
                 disabled={creatingMonitor || !monitorGoal.trim()}
                 className="flex-1 px-6 py-3 rounded-2xl bg-[#ff3b30] text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
               >
                 {creatingMonitor ? (
                   <>
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     Initializing...
                   </>
                 ) : (
                   <>Start Surveillance</>
                 )}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Close action menu on outside click */}
      {monitorActionMenu && (
        <div className="fixed inset-0 z-[55]" onClick={() => setMonitorActionMenu(null)} />
      )}

      {/* Monitor Finish Confirmation */}
      <ConfirmationModal 
        isOpen={!!finishConfirm}
        onClose={() => setFinishConfirm(null)}
        onConfirm={() => {
          handleFinishMonitor(finishConfirm);
          setFinishConfirm(null);
        }}
        title="Finish Mission"
        message="This will end the active monitor and mark it as finished. All extracted leads will be preserved in your workspace."
        confirmText="Finish & Keep Leads"
        type="success"
      />

      {/* Monitor Destroy Confirmation */}
      <ConfirmationModal 
        isOpen={!!destroyConfirm}
        onClose={() => setDestroyConfirm(null)}
        onConfirm={() => {
          handleDestroyMonitor(destroyConfirm);
          setDestroyConfirm(null);
        }}
        title="Destroy Operation"
        message="This will permanently delete this monitor AND all leads collected during this surveillance mission. This cannot be undone."
        confirmText="Destroy Everything"
        type="danger"
      />

      {toast && (
        <div className={`fixed bottom-12 right-6 z-[120] px-6 py-4 rounded-2xl text-sm font-bold shadow-2xl animate-in border ${
          toast.type === 'error' 
            ? 'bg-red-50 text-red-600 border-red-100' 
            : 'bg-[#1d1d1f] text-white border-outline-variant'
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
